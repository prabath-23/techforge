---
title: SOLID and Design Principles — Writing Code That's Easy to Change
summary: The five SOLID principles, each shown as a real problem in code and its fix, plus the other principles experienced engineers rely on — DRY, KISS, YAGNI, low coupling, the Law of Demeter — and how good design makes testing easy.
---

## Why principles exist

Requirements change constantly. A new payment method next month, a new pricing rule next quarter, a new country with different tax rules next year. **Good design makes the likely changes cheap and safe**: you add a class instead of editing ten, you change one place instead of hunting for copies, and you can test each piece on its own.

The **SOLID** principles, named by Robert C. Martin, are five guidelines toward that goal. Each one is easiest to understand by first seeing the problem it prevents.

## S — Single Responsibility: one reason to change

> [!ANALOGY] A Swiss Army knife is handy for camping, but no professional kitchen uses one. When the scissors break, you lose the knife too. Chefs keep separate tools, each excellent at one job and replaceable on its own.

**The problem:**

```java
class Invoice {
    long total()               { /* pricing and tax rules */ }
    String toPdf()             { /* page layout */ }
    void save(Connection db)   { /* SQL */ }
    void email(String to)      { /* SMTP */ }
}
```

This class has four reasons to change — pricing rules (finance team), PDF layout (design team), database schema (platform team), email provider (infrastructure team). A change to the PDF font risks breaking tax calculation. And you can't test pricing without a database.

**The fix:** split by responsibility — `Invoice` (business rules only), `InvoicePdfRenderer`, `InvoiceRepository`, `InvoiceMailer`. Each is small, focused and testable alone.

Single responsibility doesn't mean "one method per class". It means everything in the class belongs together and changes for the same reason.

## O — Open/Closed: add new behavior without editing old code

> [!ANALOGY] A power strip. When you buy a new gadget, you plug it in. You don't rewire your house. The house is "closed" to modification but "open" to new appliances, because everything uses the same socket.

**The problem:** every new case means editing existing, tested code — and usually the same `switch` appears in five places.

```java
long fee(Ticket t) {
    switch (t.vehicleType()) {
        case BIKE:  return 1000 * t.hours();
        case CAR:   return 2000 * t.hours();
        case TRUCK: return 5000 * t.hours();
        // electric cars? edit this method — and every similar switch in the codebase
    }
}
```

**The fix:** an interface (the socket) and one class per behavior (the appliances):

```java
interface FeeStrategy { Money fee(Ticket t); }

final class HourlyFee implements FeeStrategy {
    private final Map<VehicleType, Money> ratePerHour;
    HourlyFee(Map<VehicleType, Money> rates) { this.ratePerHour = Map.copyOf(rates); }
    public Money fee(Ticket t) { return ratePerHour.get(t.vehicleType()).times(t.billableHours()); }
}
final class WeekendFlatFee implements FeeStrategy {
    public Money fee(Ticket t) { return Money.rupees(100); }
}
```

You can't predict every future change, so apply this where change is **likely**: pricing, payment methods, notification channels, export formats.

## L — Liskov Substitution: a subtype must work wherever its parent does

Named after computer scientist Barbara Liskov. If code works with a `Bird`, it should work with **any** kind of bird you give it — without surprises.

> [!EXAMPLE] **The famous square–rectangle trap.** Mathematically, a square *is a* rectangle, so `Square extends Rectangle` seems natural. But:

```java
class Rectangle { protected int w, h;
    void setWidth(int w) { this.w = w; }
    void setHeight(int h) { this.h = h; }
    int area() { return w * h; } }
class Square extends Rectangle {
    @Override void setWidth(int w)  { this.w = this.h = w; }   // keep it square…
    @Override void setHeight(int h) { this.w = this.h = h; }
}
void stretch(Rectangle r) { r.setWidth(5); r.setHeight(4); assert r.area() == 20; }   // fails for a Square: 16!
```

Code written for rectangles quietly breaks when handed a square. A square isn't a *behavioral* substitute for a mutable rectangle.

Other warning signs: a subclass that throws "not supported" for an inherited method (a `Penguin` whose `fly()` throws), or one that demands stricter inputs than its parent. The fix is to model what callers actually rely on — for example, separate `Flyer` and `Swimmer` capabilities instead of assuming every bird flies.

## I — Interface Segregation: don't force classes to depend on what they don't use

> [!ANALOGY] A job application form that asks a fresh graduate for "years of management experience", "previous salary" and "team size managed". Better to have different, shorter forms for different roles.

**The problem:**

```java
interface Machine { void print(Doc d); void scan(Doc d); void fax(Doc d); }
class BasicPrinter implements Machine {
    public void print(Doc d) { /* ok */ }
    public void scan(Doc d) { throw new UnsupportedOperationException(); }   // forced to pretend
    public void fax(Doc d)  { throw new UnsupportedOperationException(); }
}
```

**The fix:** small, focused interfaces — `Printer`, `Scanner`, `Fax` — and classes implement only what they truly do. Small interfaces also make testing easy: a fake `Printer` needs one method, not three.

## D — Dependency Inversion: depend on abstractions, plug in the details

> [!ANALOGY] A lamp has a standard plug; it doesn't care which power company produced the electricity. You could move house, switch providers or add solar panels, and the lamp works unchanged — because it depends on the socket standard, not on a specific power station.

**The problem:** business logic hard-wired to specific technologies.

```java
class OrderService {
    private final MySqlOrderRepository repo = new MySqlOrderRepository();   // stuck with MySQL
    private final SmtpMailer mailer = new SmtpMailer("smtp.acme.com");      // stuck with SMTP
}
```

You can't test `OrderService` without a real MySQL database and mail server, and switching to Postgres means editing business logic.

**The fix:** depend on interfaces, and pass the concrete implementations in (**dependency injection**):

```java
interface OrderRepository { void save(Order o); Optional<Order> byId(OrderId id); }
interface Notifier { void orderPlaced(Order o); }

final class OrderService {
    private final OrderRepository repo;
    private final Notifier notifier;
    OrderService(OrderRepository repo, Notifier notifier) { this.repo = repo; this.notifier = notifier; }
    public Order place(Cart cart) {
        Order order = Order.from(cart);
        repo.save(order);
        notifier.orderPlaced(order);
        return order;
    }
}
// In production: new OrderService(new PostgresOrderRepository(dataSource), new EmailNotifier(mailClient));
// In tests:      new OrderService(new InMemoryOrderRepository(), sentNotifications::add);
```

Frameworks like Spring do the "passing in" automatically, but the principle is the same done by hand.

## More principles experienced engineers live by

- **DRY (Don't Repeat Yourself):** every piece of *knowledge* — a business rule, a tax rate — should live in one place. But don't merge code that merely *looks* similar today and changes for different reasons tomorrow. As Sandi Metz puts it, "duplication is far cheaper than the wrong abstraction". A common rule: wait for the **third** copy before abstracting.
- **KISS (Keep It Simple):** the simplest design that meets the requirements wins.
- **YAGNI (You Aren't Gonna Need It):** don't build features "just in case". Make code easy to change instead.
- **High cohesion, low coupling:** each module does one thing well (cohesion) and knows as little as possible about the others (coupling).
- **Law of Demeter ("talk only to your immediate friends"):** avoid chains like `order.getCustomer().getAddress().getCity()`. If the address changes shape, every such chain breaks. Ask `order.shippingCity()` instead.
- **Fail fast:** validate input at the boundaries and fail loudly with a clear message, instead of letting bad data spread.
- **Prefer immutable objects:** they can't be changed unexpectedly and are automatically safe to share between threads.
- **Separate layers:** controllers (handle HTTP) → services (use cases) → domain (business rules) → repositories (storage). Business rules shouldn't know about HTTP or SQL.

## Good design is testable design

If a class is hard to test, that's usually a design smell. Signs of testable code:

- Dependencies are **passed in** (so tests can pass fakes).
- **Time and randomness are passed in too**, so tests are repeatable:

```java
final class TicketFactory {
    private final Clock clock; private final IdGenerator ids;
    TicketFactory(Clock clock, IdGenerator ids) { this.clock = clock; this.ids = ids; }
    Ticket issue(Vehicle v, Spot s) { return new Ticket(ids.next(), v, s, Instant.now(clock)); }
}
// Test: new TicketFactory(Clock.fixed(Instant.parse("2026-11-23T10:00:00Z"), ZoneOffset.UTC), () -> "T-1")
```

- No hidden global state (static variables holding data, singletons you can't replace).
- Business logic is kept as pure functions where possible, with side effects (database, network, email) at the edges.

> [!RECAP]
> - **S**ingle responsibility — one reason to change (separate tools, not a Swiss Army knife).
> - **O**pen/closed — add behavior by adding classes behind an interface (a power strip).
> - **L**iskov substitution — subtypes must behave correctly wherever the parent is expected (the square trap).
> - **I**nterface segregation — small, focused interfaces (role-specific forms).
> - **D**ependency inversion — depend on interfaces and inject implementations (the standard plug).
> - Plus DRY (carefully), KISS, YAGNI, low coupling, the Law of Demeter, fail fast, immutability — and design for testability.

> [!INTERVIEW] Be able to state each SOLID principle in a sentence, show a violation and its fix, and — most importantly — point them out naturally in your own design: "pricing is a strategy, so adding EV pricing doesn't touch ParkingService — that's the open/closed principle."

::quiz {"q":"The same switch on vehicle type appears in five places and must be edited for every new type. Which principle is violated, and what's the usual fix?","options":["Single responsibility — split the class","Open/closed — replace the switch with polymorphism, so a new type is a new class","Interface segregation — add interfaces","Liskov — remove inheritance"],"answer":1,"explain":"Open for extension, closed for modification."}

::quiz {"q":"A Penguin subclass of Bird throws an exception from fly(). Which principle does this break?","options":["Single responsibility","Liskov substitution","Dependency inversion","DRY"],"answer":1,"explain":"Code expecting any Bird to fly breaks; model flying as a separate capability."}

::quiz {"q":"OrderService creates `new MySqlRepository()` inside itself. What does dependency inversion suggest?","options":["Make the repository static","Depend on a Repository interface and pass the implementation in through the constructor","Put the SQL inside OrderService","Extend MySqlRepository"],"answer":1,"explain":"Then you can swap databases and test with an in-memory fake."}
