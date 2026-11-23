---
title: Case Studies IV — Hotel Booking, Car Rental and a Stock Exchange Order Book
summary: Three machine-coding problems built around reservations and matching — a hotel booking system that never double-books a room, a car rental system with pricing strategies and a vehicle state machine, and a stock exchange order book that matches buy and sell orders by price-time priority — each with a class diagram, core code and the design decisions interviewers probe.
---

## How to approach these

Each case study follows the LLD method from chapter 4: clarify requirements, identify the entities and their responsibilities, draw the classes (click any class in the diagram for its role), write the core logic, then discuss extensions and concurrency. Code is in Python for brevity; the design carries over to Java, C++ or Go.

## Case study 16: Hotel booking

> [!STORY] Two travellers on different booking sites click "Reserve" for the last sea-view room in a Goa hotel for New Year's Eve, a fraction of a second apart. Both get a confirmation email. On 31 December, one of them is standing at reception with nowhere to sleep. Preventing exactly this — a double booking across overlapping dates — is the heart of the problem.

### Requirements

- Hotels have rooms of different **types** (standard, deluxe, suite) with prices that vary by date.
- Guests **search** availability for a date range and room type, **book**, and **cancel** (with a cancellation policy).
- A room can never have two overlapping bookings.
- Bookings go through states: held → confirmed → checked in → checked out, or cancelled.

### The design

::widget ClassDiagram {"title":"Hotel booking — class diagram","what":"The classes of a hotel booking system. The booking service coordinates; availability is decided by checking date overlaps per room; pricing and cancellation rules are pluggable strategies.","steps":["Click BookingService first — every use case starts there.","Find where the 'no overlapping bookings' rule lives.","Notice which classes would change if the hotel introduced weekend pricing."],"classes":[{"name":"BookingService","col":1,"row":0,"fields":["- inventory: RoomInventory","- pricing: PricingStrategy","- payments: PaymentGateway"],"methods":["+ search(hotelId, type, stay): List<RoomOffer>","+ book(guest, roomId, stay): Booking","+ cancel(bookingId): Refund"],"desc":"The entry point. Orchestrates search, holding a room, pricing, payment and confirmation. Contains no overlap or pricing rules itself."},{"name":"RoomInventory","col":0,"row":1,"fields":["- rooms: Map<RoomId, Room>","- bookings: Map<RoomId, List<Booking>>"],"methods":["+ available(type, stay): List<Room>","+ reserve(roomId, stay, booking): bool"],"desc":"Owns the 'no overlap' invariant. reserve() checks and records atomically (a per-room lock here; a database exclusion constraint or conditional insert in production)."},{"name":"Room","col":0,"row":2,"fields":["- id: RoomId","- number: str","- type: RoomType","- hotelId"],"methods":[],"desc":"A physical room. RoomType (STANDARD, DELUXE, SUITE) determines capacity and base price."},{"name":"Booking","col":1,"row":2,"fields":["- id","- guest: Guest","- roomId","- stay: DateRange","- status: BookingStatus","- amount: Money"],"methods":["+ confirm()","+ cancel()"],"desc":"A reservation with a small state machine: HELD → CONFIRMED → CHECKED_IN → CHECKED_OUT, or CANCELLED. Illegal transitions raise errors."},{"name":"DateRange","col":2,"row":2,"fields":["- check_in: date","- check_out: date"],"methods":["+ overlaps(other): bool","+ nights(): int"],"desc":"Half-open interval [check_in, check_out): a guest leaving on the 3rd doesn't clash with one arriving on the 3rd (Algorithms track, intervals)."},{"name":"PricingStrategy","stereo":"interface","col":2,"row":0,"fields":[],"methods":["+ price(room, stay): Money"],"desc":"Strategy pattern. Implementations: base rate, weekend/seasonal rates, dynamic pricing by occupancy."},{"name":"SeasonalPricing","col":3,"row":0,"fields":["- rates: Map<RoomType, Money>","- multipliers: Map<date, float>"],"methods":["+ price(room, stay)"],"desc":"Sums the nightly rate for each night in the stay, applying date multipliers (New Year's Eve ×2)."},{"name":"CancellationPolicy","stereo":"interface","col":2,"row":1,"fields":[],"methods":["+ refund(booking, now): Money"],"desc":"Another strategy: free cancellation until 48 h before check-in, 50% after, non-refundable rates, etc."}],"relations":[["BookingService","RoomInventory","uses"],["BookingService","PricingStrategy","uses"],["BookingService","CancellationPolicy","uses"],["RoomInventory","Room","composition"],["RoomInventory","Booking","aggregation"],["Booking","DateRange","composition"],["SeasonalPricing","PricingStrategy","implements"]]}

### Core logic

```python
from dataclasses import dataclass
from datetime import date
from threading import Lock

@dataclass(frozen=True)
class DateRange:
    check_in: date
    check_out: date                      # exclusive
    def overlaps(self, other):
        return self.check_in < other.check_out and other.check_in < self.check_out

class RoomInventory:
    def __init__(self, rooms):
        self.rooms = {r.id: r for r in rooms}
        self.bookings = {r.id: [] for r in rooms}
        self.locks = {r.id: Lock() for r in rooms}

    def is_free(self, room_id, stay):
        return all(not b.stay.overlaps(stay) for b in self.bookings[room_id]
                   if b.status != "CANCELLED")

    def available(self, room_type, stay):
        return [r for r in self.rooms.values() if r.type == room_type and self.is_free(r.id, stay)]

    def reserve(self, room_id, stay, booking) -> bool:
        with self.locks[room_id]:                      # check-and-insert must be atomic
            if not self.is_free(room_id, stay):
                return False
            self.bookings[room_id].append(booking)
            return True

class BookingService:
    def book(self, guest, room_type, stay):
        for room in self.inventory.available(room_type, stay):
            booking = Booking(guest, room.id, stay, status="HELD",
                              amount=self.pricing.price(room, stay))
            if self.inventory.reserve(room.id, stay, booking):    # may lose a race → try next room
                self.payments.charge(guest, booking.amount, idempotency_key=booking.id)
                booking.confirm()
                return booking
        raise NoAvailability(room_type, stay)
```

### Discussion points

- **Concurrency:** the check and the insert must be one atomic step. In memory, a per-room lock; in a database, a conditional insert or PostgreSQL's exclusion constraint (`EXCLUDE USING gist (room_id WITH =, stay WITH &&)` — Algorithms track, chapter 9).
- **Holds:** while the guest pays, the room is HELD with an expiry (e.g. 10 minutes); a background job releases expired holds.
- **Room types vs specific rooms:** many hotels sell a **type** and assign the actual room at check-in — then availability is a **count** per type per night rather than per room.
- **Extensions:** overbooking policies, group bookings, multiple hotels and a search index, channel managers syncing availability with external booking sites.

## Case study 17: Car rental

> [!STORY] A rental company has 300 cars across 12 city branches. Customers book online, pick up in Pune, drop off in Mumbai. Cars go for servicing, get damaged, or are returned late. The pricing team wants to try weekend discounts and per-kilometre charges without rewriting the booking code. A good design isolates each of those changes.

### Requirements

- Vehicles of different categories (hatchback, sedan, SUV) at branches; search by branch, category and dates; reserve; pick up; return (possibly at another branch); pay.
- A vehicle's status: available, reserved, rented, in maintenance.
- Pricing may be per day, per km, with weekend or loyalty discounts; late returns incur fees.

### The design

::widget ClassDiagram {"title":"Car rental — class diagram","what":"The classes of a car rental system. A vehicle hierarchy, a state machine for vehicle status, reservations linking customers to vehicles, and a pricing strategy chain.","steps":["Click RentalService first.","Follow a reservation from creation to return.","Find how a new 'per-km pricing' option would be added without changing RentalService."],"classes":[{"name":"RentalService","col":1,"row":0,"fields":["- branches: Map<BranchId, Branch>","- reservations: ReservationRepo","- pricing: PricingStrategy"],"methods":["+ search(branch, category, period)","+ reserve(customer, vehicleId, period)","+ pickUp(reservationId)","+ return(reservationId, branch, odometer): Invoice"],"desc":"Coordinates the use cases. Delegates availability to branches, price calculation to the pricing strategy, and status changes to the vehicle."},{"name":"Branch","col":0,"row":1,"fields":["- id","- city","- vehicles: List<Vehicle>"],"methods":["+ available(category, period): List<Vehicle>"],"desc":"A location holding vehicles. One-way rentals move a vehicle from one branch's fleet to another's on return."},{"name":"Vehicle","stereo":"abstract","col":1,"row":1,"fields":["- id","- plate","- category","- status: VehicleStatus","- odometer: int"],"methods":["+ reserve()","+ rent()","+ return()","+ sendToMaintenance()"],"desc":"Base class for vehicle types. Status transitions are validated: AVAILABLE → RESERVED → RENTED → AVAILABLE; any → MAINTENANCE when not rented."},{"name":"Car","col":0,"row":2,"fields":["- seats","- transmission"],"methods":[],"desc":"A car subtype. Others (Bike, Van) add their own attributes. Only add subclasses when behaviour actually differs; otherwise a category field is enough."},{"name":"Reservation","col":2,"row":1,"fields":["- id","- customer","- vehicle","- period: DateRange","- pickupBranch","- status"],"methods":["+ isLate(now): bool"],"desc":"Links a customer, a vehicle and a period. Records actual pickup and return times and branches."},{"name":"PricingStrategy","stereo":"interface","col":2,"row":0,"fields":[],"methods":["+ quote(reservation, km): Money"],"desc":"Strategy for pricing. Implementations can be combined with decorators for discounts."},{"name":"DailyRate","col":3,"row":0,"fields":["- ratePerDay: Map<Category, Money>"],"methods":["+ quote(r, km)"],"desc":"Base price: days × category rate."},{"name":"WeekendDiscount","col":3,"row":1,"fields":["- inner: PricingStrategy","- percent"],"methods":["+ quote(r, km)"],"desc":"Decorator pattern: wraps another strategy and reduces the price for weekend days. Discounts stack by wrapping."}],"relations":[["RentalService","Branch","aggregation"],["RentalService","PricingStrategy","uses"],["Branch","Vehicle","aggregation"],["Car","Vehicle","inherits"],["Reservation","Vehicle","association"],["DailyRate","PricingStrategy","implements"],["WeekendDiscount","PricingStrategy","implements"],["WeekendDiscount","PricingStrategy","aggregation","wraps"]]}

### Core logic

```python
from enum import Enum

class VehicleStatus(Enum):
    AVAILABLE = "available"; RESERVED = "reserved"; RENTED = "rented"; MAINTENANCE = "maintenance"

ALLOWED = {
    VehicleStatus.AVAILABLE:   {VehicleStatus.RESERVED, VehicleStatus.MAINTENANCE},
    VehicleStatus.RESERVED:    {VehicleStatus.RENTED, VehicleStatus.AVAILABLE},
    VehicleStatus.RENTED:      {VehicleStatus.AVAILABLE},
    VehicleStatus.MAINTENANCE: {VehicleStatus.AVAILABLE},
}

class Vehicle:
    def _move(self, new):
        if new not in ALLOWED[self.status]:
            raise InvalidTransition(self.status, new)
        self.status = new

class WeekendDiscount:                      # decorator over any PricingStrategy
    def __init__(self, inner, percent):
        self.inner, self.percent = inner, percent
    def quote(self, reservation, km):
        base = self.inner.quote(reservation, km)
        weekend_days = sum(1 for d in reservation.period.days() if d.weekday() >= 5)
        per_day = base / max(1, reservation.period.nights())
        return base - per_day * weekend_days * self.percent / 100

pricing = WeekendDiscount(PerKmSurcharge(DailyRate(rates), per_km=8), percent=15)
```

### Discussion points

- **State pattern / transition table** for vehicle status prevents illegal moves (renting a car in maintenance).
- **Strategy + decorator** for pricing: add per-km, loyalty or seasonal pricing by composing objects, not editing `RentalService` (open/closed principle — chapter 2).
- **Availability by period** reuses the interval-overlap logic from the hotel design; reservations by **category** with car assignment at pickup gives the company flexibility.
- **Late returns and damage:** the return step computes extra charges through a separate `FeePolicy`.

## Case study 18: Stock exchange order book

> [!STORY] At 9:15 am, when the market opens, thousands of buy and sell orders for one stock arrive within milliseconds. A buyer willing to pay ₹101 must be matched with the cheapest seller asking ₹101 or less; if two sellers ask the same price, the one who placed the order first goes first. Exchanges process millions of orders per second with this logic, and fairness rules mean the order of matching must be exactly right.

### Requirements

- Accept **limit orders** (buy/sell a quantity at a price or better) and **market orders** (buy/sell immediately at the best available price), and **cancel** orders.
- Match by **price-time priority**: best price first; among equal prices, earliest order first.
- Partial fills: an order for 500 shares can be filled by several smaller opposing orders.
- Produce **trades** and an up-to-date view of the best bid and ask.

### The design

::widget ClassDiagram {"title":"Order book — class diagram","what":"The classes of a matching engine for one stock. Each side of the book keeps price levels in sorted order, and each level is a first-in-first-out queue of orders.","steps":["Click OrderBook first.","Find the data structures that give 'best price first' and 'earliest order first'.","Follow an incoming buy order through matching to the trades it creates."],"classes":[{"name":"MatchingEngine","col":1,"row":0,"fields":["- books: Map<Symbol, OrderBook>","- listeners: List<TradeListener>"],"methods":["+ submit(order): List<Trade>","+ cancel(orderId)"],"desc":"Routes each order to the book for its symbol and publishes resulting trades to listeners (market data, clearing). Each book is processed by one thread in sequence."},{"name":"OrderBook","col":1,"row":1,"fields":["- bids: BookSide (highest first)","- asks: BookSide (lowest first)","- index: Map<OrderId, Order>"],"methods":["+ match(order): List<Trade>","+ cancel(orderId)","+ bestBid() / bestAsk()"],"desc":"Matches an incoming order against the opposite side, then rests any unfilled remainder of a limit order on its own side. The index allows O(1) cancel lookups."},{"name":"BookSide","col":0,"row":2,"fields":["- levels: SortedMap<Price, PriceLevel>"],"methods":["+ best(): PriceLevel","+ add(order)","+ remove(order)"],"desc":"Price levels kept sorted (a tree map / heap). Bids sort descending, asks ascending, so the best price is always at the front."},{"name":"PriceLevel","col":1,"row":2,"fields":["- price","- orders: Deque<Order>","- totalQty"],"methods":["+ enqueue(order)","+ peek()","+ pop()"],"desc":"All resting orders at one price, in arrival order — a FIFO queue gives time priority."},{"name":"Order","col":2,"row":2,"fields":["- id","- side: BUY|SELL","- type: LIMIT|MARKET","- price","- qty","- remaining","- timestamp"],"methods":["+ fill(qty)"],"desc":"An instruction from a trader. remaining tracks partial fills."},{"name":"Trade","col":2,"row":1,"fields":["- buyOrderId","- sellOrderId","- price","- qty","- time"],"methods":[],"desc":"An execution. The price is the RESTING order's price (the one already in the book)."},{"name":"TradeListener","stereo":"interface","col":2,"row":0,"fields":[],"methods":["+ onTrade(trade)"],"desc":"Observer pattern: market-data feeds, risk checks and settlement subscribe to trades."}],"relations":[["MatchingEngine","OrderBook","composition"],["MatchingEngine","TradeListener","aggregation"],["OrderBook","BookSide","composition"],["BookSide","PriceLevel","composition"],["PriceLevel","Order","aggregation"],["OrderBook","Trade","uses","creates"]]}

### Core logic

```python
import heapq
from collections import deque

class OrderBook:
    def __init__(self):
        self.bids, self.asks = {}, {}            # price -> deque of orders
        self.bid_prices, self.ask_prices = [], []  # heaps: -price for bids, price for asks

    def _best(self, side):
        heap, levels, sign = ((self.ask_prices, self.asks, 1) if side == "SELL"
                              else (self.bid_prices, self.bids, -1))
        while heap and not levels.get(sign * heap[0]):   # skip empty (lazily deleted) levels
            heapq.heappop(heap)
        return sign * heap[0] if heap else None

    def submit(self, order):
        trades = []
        opposite = "SELL" if order.side == "BUY" else "BUY"
        levels = self.asks if order.side == "BUY" else self.bids
        while order.remaining > 0:
            best = self._best(opposite)
            if best is None: break
            crosses = (order.type == "MARKET" or
                       (order.side == "BUY" and best <= order.price) or
                       (order.side == "SELL" and best >= order.price))
            if not crosses: break
            queue = levels[best]
            resting = queue[0]                              # earliest order at the best price
            qty = min(order.remaining, resting.remaining)
            trades.append(Trade(order, resting, price=best, qty=qty))
            order.remaining -= qty; resting.remaining -= qty
            if resting.remaining == 0: queue.popleft()
        if order.remaining > 0 and order.type == "LIMIT":   # rest the remainder
            own, heap, key = ((self.bids, self.bid_prices, -order.price) if order.side == "BUY"
                              else (self.asks, self.ask_prices, order.price))
            if order.price not in own or not own[order.price]:
                own[order.price] = deque(); heapq.heappush(heap, key)
            own[order.price].append(order)
        return trades
```

### Discussion points

- **Data structures:** sorted price levels (tree map or heap) + a FIFO queue per level = price-time priority. A hash map from order ID to its node gives O(1) cancellation (real engines use intrusive linked lists).
- **Trade price** is the resting order's price — the incoming order gets that price or better.
- **Concurrency:** exchanges process each instrument's book on a **single thread** in strict sequence (no locks, deterministic replay from an input log) and shard instruments across cores — the LMAX "disruptor" architecture.
- **Determinism and recovery:** all inputs are written to a log first; replaying the log rebuilds the exact book state.
- **Extensions:** stop orders, iceberg orders, self-trade prevention, circuit breakers that halt trading on big price moves.

> [!RECAP]
> - **Hotel booking:** half-open `DateRange.overlaps`, an atomic check-and-reserve per room (or a DB exclusion constraint), holds with expiry, pricing and cancellation as strategies.
> - **Car rental:** a vehicle status state machine, availability by period, pricing via **strategy + decorator** for composable discounts.
> - **Order book:** sorted price levels with FIFO queues give **price-time priority**; partial fills; trades at the resting price; single-threaded deterministic matching per instrument.

> [!INTERVIEW] Interviewers probe concurrency (two bookings at once), extensibility (new pricing rules), and data-structure choices (why a heap or tree map plus a queue for the order book). State the invariants your classes protect.

::quiz {"q":"Where should the 'no overlapping bookings for a room' rule be enforced?","options":["In the UI","In one place that checks and records atomically — the inventory (or a DB constraint)","In the pricing strategy","In the email service"],"answer":1,"explain":"Check-then-insert must be atomic to avoid races."}

::quiz {"q":"How do you add stackable weekend and loyalty discounts without editing RentalService?","options":["if/else in RentalService","Decorators wrapping a PricingStrategy","A bigger Vehicle class","Global variables"],"answer":1,"explain":"Each decorator adds one adjustment and can be combined freely."}

::quiz {"q":"In an order book, two sell orders rest at ₹100. Which fills first against a new buy at ₹101?","options":["The larger one","The one placed earlier (time priority), at ₹100","Both equally","The newer one"],"answer":1,"explain":"Price first, then time; the trade happens at the resting price."}
