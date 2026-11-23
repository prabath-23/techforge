---
title: "Case Studies I: Parking Lot, Elevator System, Vending Machine"
summary: Three classic machine-coding problems solved end to end — requirements, entities, class design, patterns (Strategy, State, Factory, Singleton-by-injection), complete Java code, concurrency handling, and extension questions.
---

## Case study 1: Parking lot

> [!STORY] You drive into a mall's multi-level car park on a busy Saturday. A machine at the gate hands you a ticket and a board tells you "Level 2: 14 free". Three hours later you pay at the exit and the barrier lifts. Behind that experience are a few clear responsibilities: knowing which spots are free, picking one, timing your stay, pricing it and taking payment — with several gates doing this at the same moment.


### Requirements

- Multiple **floors**; each has spots of types **BIKE, COMPACT, LARGE, EV** (EV spots have chargers).
- Vehicles: bike, car, truck, electric car. A vehicle fits certain spot types (bike → BIKE or bigger; car → COMPACT or LARGE; truck → LARGE; EV car → EV first, else COMPACT/LARGE).
- **Multiple entry and exit gates** operating concurrently.
- Entry issues a **ticket**; exit computes the **fee** (pricing rules vary: hourly per vehicle type, flat weekend rate…) and accepts **payment** (cash, card, UPI).
- Display free spots per floor and type.
- Out of scope: reservations, license-plate cameras (mention as extensions).

### Entities and responsibilities

::widget Stepper {"type":"hub","title":"Parking lot class design — click each","nodes":[["ParkingLotService (controller)","Entry point for use cases: park(vehicle, gate) → Ticket, unpark(ticketId, paymentMethod) → Receipt. Coordinates the others; holds no business rules itself."],["ParkingFloor / ParkingSpot","Floors own spots (composition). A spot knows its type and occupant and can atomically assign/release. Floors expose free counts for the display board."],["SpotAllocationStrategy","Strategy: which free spot to give (nearest to gate, lowest floor first, EV-preferring). Swappable without touching the service."],["Ticket","Immutable record: id, vehicle, spot, entry time, gate."],["FeeStrategy","Strategy: hourly per type, flat weekend, first-15-min-free, composite rules."],["PaymentProcessor + PaymentMethod","Interface with Cash/Card/UPI implementations (Adapter over real gateways); returns a Payment result."],["Vehicle / VehicleType / SpotType","Enums and a mapping of which spot types fit which vehicle, in preference order."]]}

### The design

Before any code, here's the class diagram. Click each class to read its job. Notice the two interfaces in the middle: allocation and pricing are the parts most likely to change, so they're isolated behind interfaces.

::widget ClassDiagram {"title": "Parking lot \u2014 class diagram", "classes": [{"name": "ParkingLotService", "col": 1, "row": 0, "fields": ["- floors: List<ParkingFloor>", "- activeTickets: Map<String,Ticket>"], "methods": ["+ park(Vehicle): Ticket", "+ unpark(ticketId, PaymentMethod): Receipt", "+ availability(): Map"], "desc": "The front desk. Every use case starts here: a car arrives (park) or leaves (unpark). It coordinates the other classes but contains no pricing or allocation rules itself \u2014 those are delegated, so they can change independently."}, {"name": "ParkingFloor", "col": 0, "row": 1, "fields": ["- number: int", "- spots: List<ParkingSpot>"], "methods": ["+ freeSpots(SpotType)", "+ freeCount(SpotType): long"], "desc": "One level of the building. Owns its spots (if the floor is removed, so are its spots \u2014 composition). Answers 'how many free spots of each type?' for the display board."}, {"name": "ParkingSpot", "col": 0, "row": 2, "fields": ["- id: String", "- type: SpotType", "- occupant: AtomicReference<Vehicle>"], "methods": ["+ tryOccupy(Vehicle): boolean", "+ release()"], "desc": "One painted bay. Claiming it is atomic (compare-and-set), so two entry gates can never give the same spot to two cars at the same instant."}, {"name": "SpotAllocationStrategy", "stereo": "interface", "col": 1, "row": 1, "fields": [], "methods": ["+ allocate(floors, Vehicle): Optional<ParkingSpot>"], "desc": "Decides WHICH free spot a vehicle gets. It's an interface so the policy can change (nearest to the entrance, fill the lowest floor first, prefer EV chargers) without editing ParkingLotService."}, {"name": "NearestSpotStrategy", "col": 1, "row": 2, "fields": [], "methods": ["+ allocate(floors, Vehicle)"], "desc": "One concrete policy: try the vehicle's preferred spot types in order, nearest spot first; if another gate grabs a spot first, try the next one."}, {"name": "FeeStrategy", "stereo": "interface", "col": 2, "row": 1, "fields": [], "methods": ["+ fee(Ticket, exitTime): Money"], "desc": "Decides HOW MUCH to charge. Another interface, because pricing rules change all the time (hourly rates, weekend flat fee, first 15 minutes free)."}, {"name": "HourlyFeeStrategy", "col": 2, "row": 2, "fields": ["- ratePerHour: Map<VehicleType,Money>"], "methods": ["+ fee(Ticket, exitTime)"], "desc": "Charges a per-hour rate for each vehicle type, rounding up to whole hours with a minimum of one."}, {"name": "Ticket", "col": 2, "row": 0, "fields": ["- id: String", "- vehicle: Vehicle", "- spot: ParkingSpot", "- entryTime: Instant"], "methods": [], "desc": "An immutable record of one parking session: who, where, and since when. Created on entry, used to compute the fee on exit."}, {"name": "Vehicle", "col": 3, "row": 0, "fields": ["- plate: String", "- type: VehicleType"], "methods": [], "desc": "A car, bike, truck or electric car. Its type decides which spot types it can use."}, {"name": "PaymentProcessor", "stereo": "interface", "col": 3, "row": 1, "fields": [], "methods": ["+ pay(Money, PaymentMethod): boolean"], "desc": "Takes payment by cash, card or UPI. In practice each real payment provider is wrapped in an adapter that implements this interface."}], "relations": [["ParkingLotService", "ParkingFloor", "composition", "owns floors"], ["ParkingFloor", "ParkingSpot", "composition", "owns spots"], ["ParkingLotService", "SpotAllocationStrategy", "uses"], ["ParkingLotService", "FeeStrategy", "uses"], ["ParkingLotService", "PaymentProcessor", "uses"], ["ParkingLotService", "Ticket", "association", "issues"], ["NearestSpotStrategy", "SpotAllocationStrategy", "implements"], ["HourlyFeeStrategy", "FeeStrategy", "implements"], ["Ticket", "Vehicle", "association", "for"]]}

### Code

```java
enum VehicleType { BIKE, CAR, TRUCK, EV_CAR }
enum SpotType { BIKE, COMPACT, LARGE, EV }

record Vehicle(String plate, VehicleType type) {}

final class SpotCompatibility {
    private static final Map<VehicleType, List<SpotType>> FITS = Map.of(
        VehicleType.BIKE,   List.of(SpotType.BIKE, SpotType.COMPACT, SpotType.LARGE),
        VehicleType.CAR,    List.of(SpotType.COMPACT, SpotType.LARGE),
        VehicleType.TRUCK,  List.of(SpotType.LARGE),
        VehicleType.EV_CAR, List.of(SpotType.EV, SpotType.COMPACT, SpotType.LARGE));
    static List<SpotType> preferredSpots(VehicleType t) { return FITS.get(t); }
}

final class ParkingSpot {
    private final String id; private final SpotType type; private final int distanceFromGate;
    private final AtomicReference<Vehicle> occupant = new AtomicReference<>();
    ParkingSpot(String id, SpotType type, int distance) { this.id = id; this.type = type; this.distanceFromGate = distance; }
    boolean tryOccupy(Vehicle v) { return occupant.compareAndSet(null, v); }   // atomic: no double assignment
    void release() { occupant.set(null); }
    boolean isFree() { return occupant.get() == null; }
    String id() { return id; } SpotType type() { return type; } int distance() { return distanceFromGate; }
}

final class ParkingFloor {
    private final int number; private final List<ParkingSpot> spots;
    ParkingFloor(int number, List<ParkingSpot> spots) { this.number = number; this.spots = List.copyOf(spots); }
    Stream<ParkingSpot> freeSpots(SpotType t) { return spots.stream().filter(s -> s.type() == t && s.isFree()); }
    long freeCount(SpotType t) { return freeSpots(t).count(); }
    int number() { return number; }
}

interface SpotAllocationStrategy { Optional<ParkingSpot> allocate(List<ParkingFloor> floors, Vehicle v); }

final class NearestSpotStrategy implements SpotAllocationStrategy {
    public Optional<ParkingSpot> allocate(List<ParkingFloor> floors, Vehicle v) {
        for (SpotType type : SpotCompatibility.preferredSpots(v.type())) {          // honor preference order
            List<ParkingSpot> candidates = floors.stream().flatMap(f -> f.freeSpots(type))
                .sorted(Comparator.comparingInt(ParkingSpot::distance)).toList();
            for (ParkingSpot s : candidates) if (s.tryOccupy(v)) return Optional.of(s);   // lost a race? try the next
        }
        return Optional.empty();
    }
}

record Ticket(String id, Vehicle vehicle, ParkingSpot spot, Instant entryTime) {}
record Money(long paise) {
    static Money rupees(long r) { return new Money(r * 100); }
    Money times(long n) { return new Money(paise * n); }
}

interface FeeStrategy { Money fee(Ticket t, Instant exit); }

final class HourlyFeeStrategy implements FeeStrategy {
    private final Map<VehicleType, Money> hourly;
    HourlyFeeStrategy(Map<VehicleType, Money> hourly) { this.hourly = Map.copyOf(hourly); }
    public Money fee(Ticket t, Instant exit) {
        long minutes = Duration.between(t.entryTime(), exit).toMinutes();
        long hours = Math.max(1, (minutes + 59) / 60);                              // round up, min 1 hour
        return hourly.get(t.vehicle().type()).times(hours);
    }
}

interface PaymentProcessor { boolean pay(Money amount, PaymentMethod method); }
enum PaymentMethod { CASH, CARD, UPI }
record Receipt(String ticketId, Money amount, Instant exit) {}

final class ParkingLotService {
    private final List<ParkingFloor> floors;
    private final SpotAllocationStrategy allocator; private final FeeStrategy fees; private final PaymentProcessor payments;
    private final Clock clock;
    private final Map<String, Ticket> activeTickets = new ConcurrentHashMap<>();
    private final Set<String> parkedPlates = ConcurrentHashMap.newKeySet();

    ParkingLotService(List<ParkingFloor> floors, SpotAllocationStrategy allocator, FeeStrategy fees, PaymentProcessor payments, Clock clock) {
        this.floors = floors; this.allocator = allocator; this.fees = fees; this.payments = payments; this.clock = clock;
    }

    public Ticket park(Vehicle v) {
        if (!parkedPlates.add(v.plate())) throw new IllegalStateException("vehicle already inside: " + v.plate());
        try {
            ParkingSpot spot = allocator.allocate(floors, v).orElseThrow(() -> new LotFullException(v.type()));
            Ticket t = new Ticket(UUID.randomUUID().toString(), v, spot, clock.instant());
            activeTickets.put(t.id(), t);
            return t;
        } catch (RuntimeException e) { parkedPlates.remove(v.plate()); throw e; }
    }

    public Receipt unpark(String ticketId, PaymentMethod method) {
        Ticket t = activeTickets.get(ticketId);
        if (t == null) throw new IllegalArgumentException("unknown or already used ticket");
        Instant exit = clock.instant();
        Money amount = fees.fee(t, exit);
        if (!payments.pay(amount, method)) throw new PaymentFailedException();
        if (activeTickets.remove(ticketId) == null) throw new IllegalStateException("ticket already processed");  // idempotency guard
        t.spot().release();
        parkedPlates.remove(t.vehicle().plate());
        return new Receipt(ticketId, amount, exit);
    }

    public Map<Integer, Map<SpotType, Long>> availability() {
        return floors.stream().collect(Collectors.toMap(ParkingFloor::number,
            f -> Arrays.stream(SpotType.values()).collect(Collectors.toMap(s -> s, f::freeCount))));
    }
}
```

### Design notes to say out loud

- **Concurrency**: spot assignment uses `compareAndSet`, so two gates can't take the same spot; the allocator retries with the next candidate if it loses a race. Tickets are in a `ConcurrentHashMap`; the remove on exit makes double processing impossible.
- **OCP**: new pricing → a new `FeeStrategy`; new allocation policy → a new `SpotAllocationStrategy`; new vehicle type → enum value + compatibility entry.
- **Testability**: `Clock` injected, so fee tests are deterministic.
- **Single instance**: the service is created once at startup and injected (rather than a static Singleton).

**Extensions**: reservations (a spot state RESERVED with expiry), EV charging billing (decorate the fee strategy), license-plate recognition at gates (an event source calling `park`), monthly passes (a fee strategy that checks a subscription repository), multiple lots (a `ParkingLot` aggregate per site), persistence (repositories for tickets), display boards updated via Observer.

## Case study 2: Elevator system

> [!STORY] Press the "up" button in a 30-floor office tower at 9 am. Somewhere, software decides which of six elevators should come for you — not necessarily the nearest one, if it's already full and heading the other way. Each elevator then visits floors in a sensible sweep instead of zig-zagging. That's two separate decisions: **which car** (a dispatch strategy) and **in what order a car serves its stops** (a scanning algorithm).

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Elevator system — class diagram", "classes": [{"name": "ElevatorController", "col": 1, "row": 0, "fields": ["- elevators: List<Elevator>", "- strategy: DispatchStrategy"], "methods": ["+ requestHall(floor, dir): int", "+ requestCar(id, floor)", "+ tick()"], "desc": "The building's brain. Receives button presses from every floor and inside every car, asks the dispatch strategy which car should answer a hall call, and advances the simulation."}, {"name": "DispatchStrategy", "col": 0, "row": 1, "fields": [], "methods": ["+ choose(elevators, call): Elevator"], "desc": "Decides WHICH elevator answers a hall call. An interface, so the building can switch strategies (nearest car, least busy, zoning for tall towers) without touching anything else.", "stereo": "interface"}, {"name": "NearestSuitableElevator", "col": 0, "row": 2, "fields": [], "methods": ["+ choose(elevators, call)"], "desc": "One strategy: prefer a car already moving toward the caller in the same direction; penalize cars moving away."}, {"name": "Elevator", "col": 2, "row": 1, "fields": ["- currentFloor: int", "- direction: Direction", "- state: ElevatorState", "- upStops, downStops: TreeSet"], "methods": ["+ addStop(floor)", "+ step()", "+ setMaintenance(on)"], "desc": "One car. Keeps its pending stops in two sorted sets and serves them with the LOOK algorithm: continue in the current direction while there are stops ahead, then reverse."}, {"name": "HallCall", "col": 1, "row": 2, "fields": ["- floor: int", "- direction: Direction"], "methods": [], "desc": "A button press on a floor: 'someone on floor 7 wants to go up'."}, {"name": "ElevatorState", "col": 2, "row": 2, "fields": ["IDLE, MOVING,", "DOORS_OPEN, MAINTENANCE"], "methods": [], "desc": "The states a car can be in. Maintenance cars are never chosen by dispatch.", "stereo": "enum"}], "relations": [["ElevatorController", "Elevator", "composition", "owns cars"], ["ElevatorController", "DispatchStrategy", "uses"], ["NearestSuitableElevator", "DispatchStrategy", "implements"], ["DispatchStrategy", "HallCall", "uses"], ["Elevator", "ElevatorState", "association", "has"]]}


### Requirements

- A building with **N floors** and **M elevators**.
- **Hall calls**: someone on floor f presses UP or DOWN. **Car calls**: someone inside presses a destination floor.
- A **dispatcher** assigns hall calls to elevators to minimize wait.
- Elevators move floor by floor, stop at requested floors, open/close doors; capacity limit; emergency stop and maintenance mode.

### Key design decisions

- Each elevator has a **state** (IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, MAINTENANCE) → **State pattern** or an enum-driven state machine.
- Each elevator serves stops using the **SCAN/LOOK algorithm** (like a disk head): keep going in the current direction while there are requests ahead, then reverse. Two sorted sets: `upStops` (ascending) and `downStops` (descending).
- The **dispatcher** chooses an elevator with a pluggable **Strategy**: nearest idle car; a car already moving toward the floor in the same direction; least-loaded; zoning for tall buildings.
- A **simulation clock/tick** drives movement (easy to test), or each elevator runs on its own thread.

```java
enum Direction { UP, DOWN, IDLE }
enum ElevatorState { IDLE, MOVING, DOORS_OPEN, MAINTENANCE }
record HallCall(int floor, Direction direction) {}

final class Elevator {
    private final int id; private int currentFloor = 0; private Direction direction = Direction.IDLE; private ElevatorState state = ElevatorState.IDLE;
    private final TreeSet<Integer> upStops = new TreeSet<>(), downStops = new TreeSet<>(Comparator.reverseOrder());
    Elevator(int id) { this.id = id; }

    synchronized void addStop(int floor) {
        if (state == ElevatorState.MAINTENANCE) throw new IllegalStateException("elevator " + id + " in maintenance");
        if (floor > currentFloor) upStops.add(floor); else if (floor < currentFloor) downStops.add(floor); else openDoors();
        if (direction == Direction.IDLE) direction = floor > currentFloor ? Direction.UP : floor < currentFloor ? Direction.DOWN : Direction.IDLE;
    }

    /** Advance one tick of simulation: move one floor or serve a stop (LOOK algorithm). */
    synchronized void step() {
        if (state == ElevatorState.MAINTENANCE) return;
        if (state == ElevatorState.DOORS_OPEN) { state = ElevatorState.MOVING; }                  // close doors after a tick
        TreeSet<Integer> ahead = direction == Direction.UP ? upStops : downStops;
        if (ahead.isEmpty()) {                                                                     // nothing ahead: reverse or idle
            TreeSet<Integer> other = direction == Direction.UP ? downStops : upStops;
            if (other.isEmpty()) { direction = Direction.IDLE; state = ElevatorState.IDLE; return; }
            direction = direction == Direction.UP ? Direction.DOWN : Direction.UP;
            return;
        }
        currentFloor += direction == Direction.UP ? 1 : -1;
        state = ElevatorState.MOVING;
        if (ahead.remove(currentFloor)) openDoors();
    }
    private void openDoors() { state = ElevatorState.DOORS_OPEN; /* notify display/observers */ }

    synchronized int floor() { return currentFloor; } synchronized Direction direction() { return direction; }
    synchronized int pendingStops() { return upStops.size() + downStops.size(); }
    synchronized boolean available() { return state != ElevatorState.MAINTENANCE; }
    synchronized void setMaintenance(boolean on) { state = on ? ElevatorState.MAINTENANCE : ElevatorState.IDLE; }
    int id() { return id; }
}

interface DispatchStrategy { Elevator choose(List<Elevator> elevators, HallCall call); }

final class NearestSuitableElevator implements DispatchStrategy {
    public Elevator choose(List<Elevator> elevators, HallCall call) {
        return elevators.stream().filter(Elevator::available)
            .min(Comparator.comparingInt(e -> cost(e, call)))
            .orElseThrow(() -> new IllegalStateException("no elevator available"));
    }
    private int cost(Elevator e, HallCall c) {
        int distance = Math.abs(e.floor() - c.floor());
        boolean onTheWay = (e.direction() == Direction.UP && c.direction() == Direction.UP && e.floor() <= c.floor())
                        || (e.direction() == Direction.DOWN && c.direction() == Direction.DOWN && e.floor() >= c.floor());
        if (e.direction() == Direction.IDLE) return distance;
        return onTheWay ? distance : distance + 2 * 20 + e.pendingStops();       // penalize cars going the other way
    }
}

final class ElevatorController {
    private final List<Elevator> elevators; private final DispatchStrategy strategy;
    ElevatorController(int count, DispatchStrategy s) { elevators = IntStream.range(0, count).mapToObj(Elevator::new).toList(); strategy = s; }
    public int requestHall(int floor, Direction dir) { Elevator e = strategy.choose(elevators, new HallCall(floor, dir)); e.addStop(floor); return e.id(); }
    public void requestCar(int elevatorId, int floor) { elevators.get(elevatorId).addStop(floor); }
    public void tick() { elevators.forEach(Elevator::step); }                 // driven by a scheduler or tests
}
```

**Discuss**: fairness (avoid starving far floors), peak modes (morning up-peak: park idle cars at the lobby), capacity/weight sensors (skip hall calls when full), destination dispatch (passengers enter the destination in the lobby, the system groups them), fire mode (all cars return to ground), and how you'd test with a deterministic `tick()`.

## Case study 3: Vending machine

> [!STORY] You put ₹20 into a vending machine and press B4. It hums, drops a bottle of water and returns ₹5. Press B4 **before** inserting money and nothing happens; press "cancel" after inserting money and you get it back. What the machine does with each button depends entirely on what state it's in — which is exactly what the **State pattern** models.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Vending machine — class diagram", "classes": [{"name": "VendingMachine", "col": 1, "row": 0, "fields": ["- state: VendingState", "- selected: Product", "- inserted: int"], "methods": ["+ select(code)", "+ insert(coin)", "+ cancel()", "~ dispense()"], "desc": "The machine itself. It doesn't contain if/else logic about states; it delegates every button press to its current state object."}, {"name": "VendingState", "col": 1, "row": 1, "fields": [], "methods": ["+ select(m, code)", "+ insert(m, coin)", "+ cancel(m)"], "desc": "What every state must handle. By default each action throws 'not allowed now'; each state overrides only what's legal in it.", "stereo": "interface"}, {"name": "IdleState", "col": 0, "row": 2, "fields": [], "methods": ["+ select(m, code)"], "desc": "Waiting for a selection. Selecting an in-stock product moves the machine to AwaitingPayment."}, {"name": "AwaitingPaymentState", "col": 2, "row": 2, "fields": [], "methods": ["+ insert(m, coin)", "+ cancel(m)"], "desc": "Collecting money. When enough is inserted, the machine dispenses and returns change; cancel refunds and goes back to Idle."}, {"name": "Inventory", "col": 0, "row": 0, "fields": ["- stock: Map<String,Integer>"], "methods": ["+ product(code)", "+ decrement(code)"], "desc": "Knows which products exist and how many are left."}, {"name": "CashBox", "col": 2, "row": 0, "fields": ["- coins: Map<Coin,Integer>"], "methods": ["+ deposit(amount)", "+ makeChange(amount)"], "desc": "Holds coins and works out change (greedy works for normal coin sets — Algorithms track)."}], "relations": [["VendingMachine", "VendingState", "association", "current state"], ["IdleState", "VendingState", "implements"], ["AwaitingPaymentState", "VendingState", "implements"], ["VendingMachine", "Inventory", "composition"], ["VendingMachine", "CashBox", "composition"]]}


### Requirements

Select a product, insert coins/notes, dispense the product and change; cancel to refund; handle out-of-stock and insufficient funds; admin restocks and collects cash.

This is the canonical **State pattern** problem.

```java
enum Coin { ONE(100), TWO(200), FIVE(500), TEN(1000); final int paise; Coin(int p) { paise = p; } }
record Product(String code, String name, int pricePaise) {}

interface VendingState {
    default void select(VendingMachine m, String code) { throw new IllegalStateException("cannot select now"); }
    default void insert(VendingMachine m, Coin c)       { throw new IllegalStateException("cannot insert now"); }
    default void cancel(VendingMachine m)               { throw new IllegalStateException("nothing to cancel"); }
}

final class IdleState implements VendingState {
    public void select(VendingMachine m, String code) {
        Product p = m.inventory().product(code);
        if (m.inventory().stock(code) == 0) throw new IllegalStateException(p.name() + " is out of stock");
        m.setSelected(p);
        m.setState(new AwaitingPaymentState());
    }
}

final class AwaitingPaymentState implements VendingState {
    public void insert(VendingMachine m, Coin c) {
        m.addInserted(c.paise);
        if (m.inserted() >= m.selected().pricePaise()) m.dispense();          // enough money → dispense + change
    }
    public void cancel(VendingMachine m) { m.refund(m.inserted()); m.reset(); }
}

final class VendingMachine {
    private VendingState state = new IdleState();
    private final Inventory inventory; private final CashBox cash;
    private Product selected; private int inserted;
    VendingMachine(Inventory inv, CashBox cash) { this.inventory = inv; this.cash = cash; }

    public synchronized void select(String code) { state.select(this, code); }
    public synchronized void insert(Coin c)      { state.insert(this, c); }
    public synchronized void cancel()            { state.cancel(this); }

    void dispense() {
        int change = inserted - selected.pricePaise();
        List<Coin> coins = cash.makeChange(change)                              // greedy works for canonical coin sets
            .orElseThrow(() -> { refund(inserted); reset(); return new IllegalStateException("exact change only"); });
        inventory.decrement(selected.code());
        cash.deposit(inserted);
        System.out.println("Dispensed " + selected.name() + ", change " + coins);
        reset();
    }
    void refund(int amount) { System.out.println("Refunded " + amount + " paise"); }
    void reset() { selected = null; inserted = 0; state = new IdleState(); }
    // accessors used by states
    Inventory inventory() { return inventory; } Product selected() { return selected; } int inserted() { return inserted; }
    void setSelected(Product p) { selected = p; } void addInserted(int p) { inserted += p; } void setState(VendingState s) { state = s; }
}
```

Points: each state permits only legal actions (illegal ones fail loudly); transitions are explicit; `synchronized` public methods since the physical machine is single-user but software may receive concurrent events; change-making is its own component (greedy for canonical denominations; DP if not — Algorithms → Greedy); admin operations (restock, collect) could be another state (MAINTENANCE).

> [!INTERVIEW] For each of these, interviewers probe extensibility ("add a new spot type / dispatch algorithm / payment method"), concurrency ("two gates at once", "two calls at the same instant"), and edge cases (lot full, lost ticket, elevator in maintenance, exact-change-only). Practice saying where each change lands in your design.

::quiz {"q":"In the parking lot design, how is double-assignment of a spot prevented when two gates race?","options":["A global lock on the whole lot for every request","Each spot is claimed with an atomic compareAndSet; the loser tries the next candidate","Gates take turns","It isn't prevented"],"answer":1,"explain":"Fine-grained, lock-free claiming scales better than a global lock."}

::quiz {"q":"Which scheduling idea does a single elevator commonly use to serve stops?","options":["FIFO order of requests","SCAN/LOOK — continue in the current direction while requests remain ahead, then reverse","Random order","Shortest job first"],"answer":1,"explain":"It's the disk-arm algorithm, minimizing direction changes and starvation."}

::quiz {"q":"Why is the vending machine a natural fit for the State pattern?","options":["It has many products","Which actions are legal (select, insert, cancel) depends on the machine's current state, and actions cause transitions","It needs a singleton","It uses inheritance for coins"],"answer":1,"explain":"State classes replace sprawling conditionals over a status field."}
