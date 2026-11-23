---
title: "Case Studies II: BookMyShow, Splitwise, Library Management, Food Delivery"
summary: Four business-domain LLD problems — movie ticket booking with seat locking and payment timeouts, expense sharing with balance simplification, a library system with reservations and fines, and food-delivery order lifecycle and assignment — with models, key algorithms and code.
---

## Case study 4: Movie ticket booking (BookMyShow)

> [!STORY] It's 10 am on the day bookings open for a blockbuster's first show. You pick seats F7 and F8 and get 10 minutes to pay. Meanwhile, thousands of others are staring at the same seat map. The system must guarantee that F7 is never sold to two people, that your hold disappears if you abandon checkout, and that everyone else sees F7 as unavailable while you decide.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Movie ticket booking — class diagram", "classes": [{"name": "BookingService", "col": 1, "row": 0, "fields": ["- shows: ShowRepository", "- payments: PaymentGateway", "- clock: Clock"], "methods": ["+ start(user, showId, seats): Booking", "+ pay(booking, details): Booking"], "desc": "Runs the booking use case: hold seats, take payment, confirm or release. Holds no seat state itself."}, {"name": "Show", "col": 0, "row": 1, "fields": ["- id, movie, screen, startTime", "- seats: Map<String,ShowSeat>", "- lock: ReentrantLock"], "methods": ["+ hold(seatIds, bookingId, ttl): bool", "+ confirm(seatIds, bookingId): bool", "+ release(seatIds, bookingId)"], "desc": "One screening of one movie. Holding several seats is all-or-nothing and done under one lock per show."}, {"name": "ShowSeat", "col": 0, "row": 2, "fields": ["- seatId", "- status: SeatStatus", "- heldBy, holdExpiry"], "methods": ["+ isAvailable(now): bool"], "desc": "A seat FOR ONE SHOW. The same physical seat can be free for the 10 am show and sold for the 7 pm show — that's why availability lives here, not on Seat."}, {"name": "Booking", "col": 2, "row": 1, "fields": ["- id, userId, showId", "- seatIds", "- status: BookingStatus", "- expiresAt"], "methods": ["+ confirmed(paymentId)", "+ failed()", "+ expired()"], "desc": "One customer's attempt: PENDING while seats are held, then CONFIRMED, CANCELLED or EXPIRED."}, {"name": "PaymentGateway", "col": 2, "row": 0, "fields": [], "methods": ["+ charge(amount, details, idemKey)", "+ refund(paymentId)"], "desc": "Wraps the real payment provider (an Adapter). Called with the booking ID as idempotency key so a retry never charges twice.", "stereo": "interface"}, {"name": "Movie", "col": 1, "row": 2, "fields": ["- title, duration, language"], "methods": [], "desc": "What's being shown. Many shows per movie."}], "relations": [["BookingService", "Show", "uses"], ["BookingService", "PaymentGateway", "uses"], ["BookingService", "Booking", "association", "creates"], ["Show", "ShowSeat", "composition", "owns"], ["Show", "Movie", "association", "of"]]}


### Requirements

- Browse cities → theatres → screens → **shows** (movie at a time on a screen).
- View the **seat map** for a show (seat categories: REGULAR, PREMIUM, RECLINER with prices).
- Select seats → seats are **temporarily held** (e.g., 10 minutes) while the user pays → **confirm** booking on payment success, **release** on failure/timeout.
- **No double booking** under heavy concurrency (a blockbuster's opening night).
- Cancel bookings with refund rules; notifications.

### Model

```text
City 1─* Theatre 1─* Screen 1─* Seat (row, number, category)
Movie 1─* Show (screen, start time, pricing)  Show 1─* ShowSeat (seat, status: AVAILABLE | HELD | BOOKED, heldBy, holdExpiry)
User 1─* Booking (show, showSeats, amount, status: PENDING | CONFIRMED | CANCELLED | EXPIRED) 1─1 Payment
```

The crucial insight: availability is per **(show, seat)** — the `ShowSeat` — not per `Seat`.

### The concurrency core: holding seats

In memory (single process), lock per show, check all requested seats, then hold them atomically:

```java
enum SeatStatus { AVAILABLE, HELD, BOOKED }
final class ShowSeat {
    final String seatId; SeatStatus status = SeatStatus.AVAILABLE; String heldBy; Instant holdExpiry;
    ShowSeat(String seatId) { this.seatId = seatId; }
    boolean isAvailable(Instant now) { return status == SeatStatus.AVAILABLE || (status == SeatStatus.HELD && now.isAfter(holdExpiry)); }
}

final class Show {
    private final String id; private final Map<String, ShowSeat> seats; private final ReentrantLock lock = new ReentrantLock();
    Show(String id, Collection<String> seatIds) { this.id = id; this.seats = seatIds.stream().collect(Collectors.toMap(s -> s, ShowSeat::new)); }

    /** All-or-nothing hold. */
    boolean hold(List<String> seatIds, String bookingId, Instant now, Duration ttl) {
        lock.lock();
        try {
            for (String s : seatIds) if (!seats.get(s).isAvailable(now)) return false;
            for (String s : seatIds) { ShowSeat ss = seats.get(s); ss.status = SeatStatus.HELD; ss.heldBy = bookingId; ss.holdExpiry = now.plus(ttl); }
            return true;
        } finally { lock.unlock(); }
    }
    boolean confirm(List<String> seatIds, String bookingId, Instant now) {
        lock.lock();
        try {
            for (String s : seatIds) { ShowSeat ss = seats.get(s);
                if (ss.status != SeatStatus.HELD || !bookingId.equals(ss.heldBy) || now.isAfter(ss.holdExpiry)) return false; }   // hold expired → fail
            for (String s : seatIds) seats.get(s).status = SeatStatus.BOOKED;
            return true;
        } finally { lock.unlock(); }
    }
    void release(List<String> seatIds, String bookingId) {
        lock.lock();
        try { for (String s : seatIds) { ShowSeat ss = seats.get(s); if (bookingId.equals(ss.heldBy) && ss.status == SeatStatus.HELD) { ss.status = SeatStatus.AVAILABLE; ss.heldBy = null; } } }
        finally { lock.unlock(); }
    }
}

final class BookingService {
    private static final Duration HOLD = Duration.ofMinutes(10);
    private final ShowRepository shows; private final PaymentGateway payments; private final Clock clock;
    BookingService(ShowRepository shows, PaymentGateway payments, Clock clock) { this.shows = shows; this.payments = payments; this.clock = clock; }

    public Booking start(String userId, String showId, List<String> seatIds) {
        String bookingId = UUID.randomUUID().toString();
        if (!shows.get(showId).hold(seatIds, bookingId, clock.instant(), HOLD)) throw new SeatsUnavailableException(seatIds);
        return Booking.pending(bookingId, userId, showId, seatIds, clock.instant().plus(HOLD));
    }
    public Booking pay(Booking b, PaymentDetails details) {
        Show show = shows.get(b.showId());
        PaymentResult r = payments.charge(b.amount(), details, /* idempotencyKey */ b.id());
        if (!r.success()) { show.release(b.seatIds(), b.id()); return b.failed(); }
        if (!show.confirm(b.seatIds(), b.id(), clock.instant())) { payments.refund(r.paymentId()); return b.expired(); }  // paid too late
        return b.confirmed(r.paymentId());
    }
}
```

**At real scale** (many app servers), the hold must live in a shared, strongly consistent store:

- **Database**: `UPDATE show_seats SET status='HELD', held_by=?, hold_expiry=now()+'10 min' WHERE show_id=? AND seat_id IN (…) AND (status='AVAILABLE' OR (status='HELD' AND hold_expiry < now()))` in a transaction, and check that the affected row count equals the number of seats (else roll back). Or `SELECT … FOR UPDATE`, or optimistic locking with a version column. A **unique constraint** on (show_id, seat_id) in a bookings table is the final safety net.
- **Redis**: `SET seat:{show}:{seat} {bookingId} NX EX 600` per seat (with a Lua script for all-or-nothing on multiple seats), with the database as the source of truth for confirmed bookings.
- Expired holds are reclaimed lazily (the availability check above) and/or by a sweeper job.

**Patterns**: Strategy (pricing: weekday/weekend/dynamic; seat category pricing), Observer (notify on confirmation), State (booking lifecycle), Factory (payment methods), idempotency keys for payments. **Extensions**: waitlists, coupons, convenience fees, seat-map caching with real-time updates via WebSockets, virtual queue for high-demand releases.

## Case study 5: Splitwise (expense sharing)

> [!STORY] Four friends go on a trip. Asha pays ₹6,000 for the hotel, Ben pays ₹1,200 for dinner (split unevenly because Chen skipped it), and Dev pays for fuel. At the end, nobody wants twelve separate repayments — they want "Chen pays Asha ₹1,750, Dev pays Asha ₹950, done." Splitwise needs exact money arithmetic, flexible ways to split, and a way to simplify debts.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Splitwise — class diagram", "classes": [{"name": "ExpenseService", "col": 1, "row": 0, "fields": ["- groups: Map<String,Group>"], "methods": ["+ addExpense(groupId, paidBy, amount, split)", "+ settle(groupId, from, to, amount)", "+ simplify(groupId): List<Transfer>"], "desc": "Entry point for adding expenses, settling up, and computing the simplest set of repayments."}, {"name": "Group", "col": 0, "row": 1, "fields": ["- members: List<User>", "- net: Map<String,Long>", "- ledger: List<Expense>"], "methods": ["+ addExpense(paidBy, total, split)", "+ balances(): Map"], "desc": "Keeps an append-only ledger of expenses and each member's net balance (positive = owed money). Balances are derived from the ledger."}, {"name": "Split", "col": 1, "row": 1, "fields": [], "methods": [], "desc": "How an expense is divided. A sealed interface with three variants, so the calculator must handle every kind.", "stereo": "interface"}, {"name": "EqualSplit", "col": 0, "row": 2, "fields": ["- userIds"], "methods": [], "desc": "Divide evenly; leftover paise go to the first few people so the shares add up exactly."}, {"name": "ExactSplit", "col": 1, "row": 2, "fields": ["- amounts: Map<String,Long>"], "methods": [], "desc": "Explicit amounts, validated to add up to the total."}, {"name": "PercentSplit", "col": 2, "row": 2, "fields": ["- percents: Map<String,Double>"], "methods": [], "desc": "Percentages, validated to total 100, with rounding fixed on the last person."}, {"name": "SplitCalculator", "col": 2, "row": 1, "fields": [], "methods": ["+ shares(total, split): Map"], "desc": "Turns any Split into exact paise per person — the one place that knows the rounding rules."}, {"name": "Transfer", "col": 2, "row": 0, "fields": ["- from, to", "- amount: long"], "methods": [], "desc": "One suggested repayment, produced by debt simplification."}], "relations": [["ExpenseService", "Group", "composition"], ["Group", "SplitCalculator", "uses"], ["SplitCalculator", "Split", "uses"], ["EqualSplit", "Split", "implements"], ["ExactSplit", "Split", "implements"], ["PercentSplit", "Split", "implements"], ["ExpenseService", "Transfer", "association", "produces"]]}


### Requirements

Users and groups; add an expense paid by one (or more) users, split **equally**, by **exact amounts**, or by **percentage**; show each user's balances ("you owe Bob ₹250"); settle up; **simplify debts** in a group to minimize the number of transactions.

### Model and splits (Strategy + validation)

```java
record User(String id, String name) {}
sealed interface Split permits EqualSplit, ExactSplit, PercentSplit {}
record EqualSplit(List<String> userIds) implements Split {}
record ExactSplit(Map<String, Long> amounts) implements Split {}
record PercentSplit(Map<String, Double> percents) implements Split {}

final class SplitCalculator {
    /** Returns how much each user owes for this expense, in paise, summing exactly to total. */
    static Map<String, Long> shares(long total, Split split) {
        return switch (split) {
            case EqualSplit e -> {
                long base = total / e.userIds().size(), remainder = total % e.userIds().size();
                Map<String, Long> m = new LinkedHashMap<>();
                for (int i = 0; i < e.userIds().size(); i++) m.put(e.userIds().get(i), base + (i < remainder ? 1 : 0));   // distribute leftover paise
                yield m;
            }
            case ExactSplit x -> {
                if (x.amounts().values().stream().mapToLong(Long::longValue).sum() != total) throw new IllegalArgumentException("exact amounts must sum to total");
                yield x.amounts();
            }
            case PercentSplit p -> {
                if (Math.abs(p.percents().values().stream().mapToDouble(Double::doubleValue).sum() - 100.0) > 1e-9) throw new IllegalArgumentException("percents must sum to 100");
                Map<String, Long> m = new LinkedHashMap<>(); long assigned = 0; var it = p.percents().entrySet().iterator();
                while (it.hasNext()) { var en = it.next(); long v = it.hasNext() ? Math.round(total * en.getValue() / 100.0) : total - assigned; m.put(en.getKey(), v); assigned += v; }
                yield m;
            }
        };
    }
}
```

Note the **money handling**: integer paise, and rounding remainders assigned so shares sum exactly to the total.

### Balances

Keep a **net balance per user** in a group: when Alice pays ₹900 split equally among Alice, Bob and Carol: Alice +600 (paid 900, owes 300), Bob −300, Carol −300. A ledger of expenses is the source of truth (an append-only log, enabling edits/deletes by reversing entries); balances are derived and cached.

```java
final class Group {
    private final Map<String, Long> net = new ConcurrentHashMap<>();   // positive = is owed money
    synchronized void addExpense(String paidBy, long total, Split split) {
        net.merge(paidBy, total, Long::sum);
        SplitCalculator.shares(total, split).forEach((u, share) -> net.merge(u, -share, Long::sum));
    }
    synchronized void settle(String from, String to, long amount) { net.merge(from, amount, Long::sum); net.merge(to, -amount, Long::sum); }
    Map<String, Long> balances() { return Map.copyOf(net); }
}
```

### Simplify debts

Given net balances, produce few transactions so everyone ends at zero. Greedy with two heaps: repeatedly match the **largest creditor** with the **largest debtor**, transfer min(credit, debt), push back any remainder.

```java
record Transfer(String from, String to, long amount) {}
static List<Transfer> simplify(Map<String, Long> net) {
    PriorityQueue<Map.Entry<String, Long>> creditors = new PriorityQueue<>((a, b) -> Long.compare(b.getValue(), a.getValue()));
    PriorityQueue<Map.Entry<String, Long>> debtors = new PriorityQueue<>((a, b) -> Long.compare(a.getValue(), b.getValue()));
    net.forEach((u, v) -> { if (v > 0) creditors.add(Map.entry(u, v)); else if (v < 0) debtors.add(Map.entry(u, v)); });
    List<Transfer> out = new ArrayList<>();
    while (!creditors.isEmpty() && !debtors.isEmpty()) {
        var c = creditors.poll(); var d = debtors.poll();
        long amt = Math.min(c.getValue(), -d.getValue());
        out.add(new Transfer(d.getKey(), c.getKey(), amt));
        if (c.getValue() - amt > 0) creditors.add(Map.entry(c.getKey(), c.getValue() - amt));
        if (d.getValue() + amt < 0) debtors.add(Map.entry(d.getKey(), d.getValue() + amt));
    }
    return out;   // at most n − 1 transfers
}
```

(Finding the true *minimum* number of transfers is NP-hard — it involves finding zero-sum subsets — so the greedy's ≤ n−1 bound is the practical answer. Saying this is a strong signal.)

## Case study 6: Library management system

> [!STORY] A city library has 40 copies of a bestseller and 200 people who want it. Members can borrow 5 books for 14 days, renew if nobody's waiting, join a waiting list when every copy is out, and pay a fine for late returns. The key modeling insight: the **book** ("Atomic Habits") and each physical **copy** on the shelf are different things.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Library — class diagram", "classes": [{"name": "LendingService", "col": 1, "row": 0, "fields": ["- loans: LoanRepository", "- fines: FinePolicy", "- reservations: Map<isbn, Deque>"], "methods": ["+ checkout(member, item): Loan", "+ checkin(item): long", "+ reserve(member, book)"], "desc": "Runs borrowing, returning and reservations, enforcing the rules (5-loan limit, no borrowing with unpaid fines, reserved copies go to the first person waiting)."}, {"name": "Book", "col": 0, "row": 1, "fields": ["- isbn, title, authors, subject"], "methods": [], "desc": "The title in the catalog. One Book has many physical copies."}, {"name": "BookItem", "col": 0, "row": 2, "fields": ["- barcode", "- status: ItemStatus", "- rack"], "methods": [], "desc": "One physical copy with its own barcode and status: AVAILABLE, LOANED, RESERVED or LOST."}, {"name": "Member", "col": 1, "row": 2, "fields": ["- id, name", "- unpaidFines"], "methods": [], "desc": "A library member."}, {"name": "Loan", "col": 2, "row": 1, "fields": ["- item, memberId", "- issued, due"], "methods": [], "desc": "One borrowing: which copy, who, and when it's due."}, {"name": "FinePolicy", "col": 2, "row": 0, "fields": [], "methods": ["+ fineFor(loan, returned): long"], "desc": "How late fees are computed — an interface, so rules can change (per day, capped, free for children).", "stereo": "interface"}, {"name": "PerDayFine", "col": 2, "row": 2, "fields": ["- perDay, cap"], "methods": ["+ fineFor(loan, returned)"], "desc": "₹X per day late, up to a maximum."}], "relations": [["Book", "BookItem", "composition", "copies"], ["LendingService", "Loan", "association", "creates"], ["Loan", "BookItem", "association", "for"], ["Loan", "Member", "association", "by"], ["LendingService", "FinePolicy", "uses"], ["PerDayFine", "FinePolicy", "implements"]]}


### Requirements

Catalog of **books** (title, authors, ISBN, subject) with multiple physical **copies** (book items with barcodes, rack location); **members** borrow up to 5 items for 14 days; **reserve** a title when no copy is available (first-come queue); renew if not reserved; **fines** for late returns; search by title/author/subject; librarians add/remove items; notifications for due dates and reservations.

### Design highlights

```java
enum ItemStatus { AVAILABLE, LOANED, RESERVED, LOST }
record Book(String isbn, String title, List<String> authors, String subject) {}
final class BookItem { final String barcode; final Book book; volatile ItemStatus status = ItemStatus.AVAILABLE; BookItem(String b, Book book) { barcode = b; this.book = book; } }
record Loan(String id, BookItem item, String memberId, LocalDate issued, LocalDate due) {}

interface FinePolicy { long fineFor(Loan loan, LocalDate returned); }
final class PerDayFine implements FinePolicy {
    private final long perDayPaise, cap;
    PerDayFine(long perDay, long cap) { this.perDayPaise = perDay; this.cap = cap; }
    public long fineFor(Loan l, LocalDate returned) { long late = Math.max(0, ChronoUnit.DAYS.between(l.due(), returned)); return Math.min(cap, late * perDayPaise); }
}

final class LendingService {
    private static final int MAX_LOANS = 5; private static final int LOAN_DAYS = 14;
    private final Map<String, Deque<String>> reservationQueue = new ConcurrentHashMap<>();   // isbn → member ids (FIFO)
    private final LoanRepository loans; private final FinePolicy fines; private final Notifier notifier; private final Clock clock;
    LendingService(LoanRepository loans, FinePolicy fines, Notifier notifier, Clock clock) { this.loans = loans; this.fines = fines; this.notifier = notifier; this.clock = clock; }

    public synchronized Loan checkout(Member m, BookItem item) {
        if (loans.activeCount(m.id()) >= MAX_LOANS) throw new LimitExceededException();
        if (m.unpaidFines() > 0) throw new FinesDueException();
        Deque<String> q = reservationQueue.getOrDefault(item.book.isbn(), new ArrayDeque<>());
        boolean reservedForOther = item.status == ItemStatus.RESERVED && !m.id().equals(q.peekFirst());
        if (item.status == ItemStatus.LOANED || reservedForOther) throw new NotAvailableException();
        if (item.status == ItemStatus.RESERVED) q.pollFirst();                     // fulfilling this member's reservation
        item.status = ItemStatus.LOANED;
        LocalDate today = LocalDate.now(clock);
        return loans.save(new Loan(UUID.randomUUID().toString(), item, m.id(), today, today.plusDays(LOAN_DAYS)));
    }

    public synchronized long checkin(BookItem item) {
        Loan loan = loans.activeFor(item.barcode).orElseThrow();
        long fine = fines.fineFor(loan, LocalDate.now(clock));
        loans.close(loan.id());
        Deque<String> q = reservationQueue.get(item.book.isbn());
        if (q != null && !q.isEmpty()) { item.status = ItemStatus.RESERVED; notifier.notify(q.peekFirst(), "Your reserved book is ready: " + item.book.title()); }
        else item.status = ItemStatus.AVAILABLE;
        return fine;
    }

    public void reserve(Member m, Book book) { reservationQueue.computeIfAbsent(book.isbn(), k -> new ConcurrentLinkedDeque<>()).addLast(m.id()); }
}
```

Discussion points: Book (title) vs BookItem (copy) distinction; reservation queue per title; fines as a Strategy; search via an inverted index (title/author tokens → ISBNs) or a search engine at scale; Observer/Notifier for due-date reminders driven by a scheduled job; reservation expiry if not collected in N days.

## Case study 7: Food delivery (Swiggy/Zomato/DoorDash) — order domain

> [!STORY] You order biryani at 8:15 pm. The restaurant accepts, the kitchen cooks, a delivery partner nearby gets the job, picks it up, and you watch the bike approach on a map. Each step can only happen after the one before it — you can't "deliver" an order nobody accepted — and the app, restaurant and rider all need to hear about every change.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Food delivery order — class diagram", "classes": [{"name": "OrderService", "col": 1, "row": 0, "fields": ["- orders: OrderRepository", "- assigner: AssignmentStrategy"], "methods": ["+ place(cart): Order", "+ accept(orderId)", "+ markReady(orderId)", "+ cancel(orderId)"], "desc": "Handles the order use cases and moves each order through its lifecycle."}, {"name": "Order", "col": 1, "row": 1, "fields": ["- id, customer, restaurant", "- items, total", "- status: OrderStatus"], "methods": ["+ transition(next)"], "desc": "One order. transition() refuses illegal moves (like DELIVERED straight after PLACED) and notifies every listener of each change."}, {"name": "OrderStatus", "col": 0, "row": 2, "fields": ["PLACED → ACCEPTED → READY", "→ PICKED_UP → DELIVERED", "(or CANCELLED)"], "methods": ["+ canMoveTo(next): bool"], "desc": "The state machine itself, encoded in the enum: each status lists which statuses may follow it.", "stereo": "enum"}, {"name": "OrderEventListener", "col": 2, "row": 2, "fields": [], "methods": ["+ onStatusChange(id, from, to)"], "desc": "Anyone who wants to hear about status changes — the customer app, the restaurant tablet, analytics (Observer pattern).", "stereo": "interface"}, {"name": "AssignmentStrategy", "col": 2, "row": 0, "fields": [], "methods": ["+ assign(order): DeliveryPartner"], "desc": "How a delivery partner is chosen: distance to the restaurant, current load, ratings, fairness.", "stereo": "interface"}, {"name": "DeliveryPartner", "col": 0, "row": 0, "fields": ["- id, location", "- status: available/busy"], "methods": ["+ tryAssign(order): boolean"], "desc": "Accepting a job must be atomic, so a partner can't accept two conflicting offers."}], "relations": [["OrderService", "Order", "association", "manages"], ["Order", "OrderStatus", "association", "has"], ["Order", "OrderEventListener", "uses", "notifies"], ["OrderService", "AssignmentStrategy", "uses"], ["AssignmentStrategy", "DeliveryPartner", "uses"]]}


### Scope

Customers order from a restaurant's menu; the restaurant accepts/prepares; a delivery partner is assigned, picks up and delivers; live status updates; cancellation rules; payments and refunds.

### Order lifecycle as a state machine

```text
PLACED ──accept──▶ ACCEPTED ──ready──▶ READY_FOR_PICKUP ──pickup──▶ PICKED_UP ──deliver──▶ DELIVERED
   │                  │                         │
   └──reject/timeout──┴──────cancel (rules)─────┴──▶ CANCELLED (refund per policy)
```

```java
enum OrderStatus {
    PLACED, ACCEPTED, READY_FOR_PICKUP, PICKED_UP, DELIVERED, CANCELLED;
    private static final Map<OrderStatus, Set<OrderStatus>> NEXT = Map.of(
        PLACED, EnumSet.of(ACCEPTED, CANCELLED),
        ACCEPTED, EnumSet.of(READY_FOR_PICKUP, CANCELLED),
        READY_FOR_PICKUP, EnumSet.of(PICKED_UP, CANCELLED),
        PICKED_UP, EnumSet.of(DELIVERED),
        DELIVERED, EnumSet.noneOf(OrderStatus.class),
        CANCELLED, EnumSet.noneOf(OrderStatus.class));
    boolean canMoveTo(OrderStatus next) { return NEXT.get(this).contains(next); }
}

final class Order {
    private final String id; private OrderStatus status = OrderStatus.PLACED; private final List<OrderEventListener> listeners;
    Order(String id, List<OrderEventListener> listeners) { this.id = id; this.listeners = listeners; }
    synchronized void transition(OrderStatus next) {
        if (!status.canMoveTo(next)) throw new IllegalStateException(status + " → " + next + " not allowed");
        OrderStatus prev = status; status = next;
        listeners.forEach(l -> l.onStatusChange(id, prev, next));            // Observer: push to customer app, restaurant, analytics
    }
}
```

**Delivery partner assignment** (Strategy): candidates within radius of the restaurant (geospatial index — System Design → case studies), scored by distance to restaurant, current load (batched orders on the way), rating and fairness of earnings; offer to one partner at a time with a timeout, then the next; assignment must be **atomic** (a partner can't accept two conflicting offers — compare-and-set on partner status).

**Other components**: `Cart` with pricing (Strategy for discounts/coupons — Specification pattern for coupon eligibility), `PaymentService` (Adapter over gateways, idempotency keys), `RestaurantService` (menu, availability, prep time), `NotificationService` (Observer → push/SMS), `EtaEstimator` (Strategy; ML at scale).

> [!INTERVIEW] Business-domain LLD rounds reward precise modeling (ShowSeat vs Seat, Book vs BookItem), explicit state machines with legal transitions, correct money arithmetic, and a crisp answer to "how do you prevent double booking/assignment?" — first in-process (locks/CAS), then at scale (DB constraints, conditional updates, Redis NX).

::quiz {"q":"In a booking system, availability should be tracked on which entity?","options":["Seat","Screen","ShowSeat — the (show, seat) pair","Theatre"],"answer":2,"explain":"The same physical seat is available for one show and booked for another."}

::quiz {"q":"How do you split ₹100.00 equally among 3 people without losing or creating paise?","options":["Give each 33.333 rupees as a double","Give each 3333 paise and assign the leftover 1 paisa to one person","Round each up to 3334 paise","Refuse the split"],"answer":1,"explain":"Use integer minor units and distribute remainders so shares sum exactly to the total."}

::quiz {"q":"Is finding the minimum number of transactions to settle a group's debts easy?","options":["Yes, greedy is optimal","No — it's NP-hard in general; greedy matching of largest creditor/debtor gives at most n−1 transfers","It's O(n log n) exactly","It requires Dijkstra"],"answer":1,"explain":"Optimal settlement relates to partitioning into zero-sum subsets."}
