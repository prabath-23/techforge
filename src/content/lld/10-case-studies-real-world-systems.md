---
title: Case Studies VI — Ride Matching, Inventory, Coffee Machine and Traffic Signal
summary: Four more machine-coding problems — the object model behind matching riders and drivers, a warehouse inventory system that never oversells, a coffee machine driven by recipes and a state machine, and a traffic signal controller with timed phases and pedestrian requests — each with a class diagram, core code and the extensions interviewers ask about.
---

::widget Scene {"title": "State pattern: a coffee machine", "sub": "selection, payment, brewing, refunds, out-of-stock and maintenance", "nodes": [{"id": "idle", "kind": "cube", "label": "Idle", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "sel", "kind": "cube", "label": "DrinkSelected", "x": 4.5, "y": -4.5, "color": "orange"}, {"id": "paid", "kind": "cube", "label": "Paid", "x": 12.72, "y": -5.28, "color": "green"}, {"id": "brew", "kind": "cube", "label": "Brewing", "x": 17.22, "y": -9.78, "color": "purple"}, {"id": "out", "kind": "cube", "label": "OutOfStock", "x": 13.18, "y": 4.18, "color": "red"}, {"id": "mnt", "kind": "cube", "label": "Maintenance", "x": 19.23, "y": 1.23, "color": "dark"}, {"id": "inv", "kind": "doc", "label": "Inventory", "x": 11.33, "y": -15.67, "color": "teal"}], "links": [["idle", "sel", {"label": "select"}], ["sel", "paid", {"label": "pay"}], ["paid", "brew", {"label": "start"}], ["brew", "idle", {"label": "done"}], ["sel", "idle", {"label": "cancel", "dashed": true}], ["idle", "out", {"dashed": true}], ["mnt", "idle", {"dashed": true}], ["brew", "inv", {"dashed": true}]], "metrics": [["state", "Current state"], ["act", "Action"], ["res", "Machine says"]], "steps": [{"short": "Smell", "tag": "Problem", "title": "Without the pattern: if (status == ...) in every method", "body": "<p>selectDrink, insertMoney, cancel and brew each check five statuses. Adding a state means editing every method.</p>", "show": ["idle"], "metrics": {"state": ["—"], "act": ["—"], "res": ["—"]}}, {"short": "Pattern", "tag": "State", "title": "Each state is a class implementing the same interface", "body": "<p><code>select(), pay(), cancel(), brew()</code>. The machine delegates to its current state object; states decide what's legal and which state comes next.</p>", "show": ["idle", "sel", "paid", "brew"]}, {"short": "Idle", "tag": "Idle", "title": "Idle: pressing Pay is meaningless", "body": "<p>IdleState.pay() → \"Select a drink first\". No crash, no if/else.</p>", "focus": ["idle"], "metrics": {"state": ["Idle"], "act": ["pay()"], "res": ["\"select a drink first\""]}}, {"short": "Select", "tag": "Select", "title": "Select a cappuccino (₹120)", "body": "<p>IdleState checks inventory first: milk, beans and cups are available → move to DrinkSelected.</p>", "show": ["idle", "sel", "paid", "brew", "inv"], "flow": [["idle", "sel", "#f59e0b", "cappuccino"]], "focus": ["sel"], "metrics": {"state": ["DrinkSelected"], "act": ["select()"], "res": ["\"pay ₹120\""]}}, {"short": "Partial", "tag": "Pay", "title": "Insert ₹100: not enough yet", "body": "<p>Stay in DrinkSelected, remember the credit.</p>", "set": {"sel": {"badge": "credit ₹100"}}, "metrics": {"act": ["pay(100)"], "res": ["\"₹20 more\""]}}, {"short": "Paid", "tag": "Pay", "title": "Insert ₹50 → Paid, with ₹30 change due", "body": "<p>Change is calculated with integer amounts and returned now or after brewing — a design choice to state.</p>", "flow": [["sel", "paid", "#22c55e", "₹150"]], "set": {"sel": {"badge": null}, "paid": {"badge": "change ₹30"}}, "focus": ["paid"], "metrics": {"state": ["Paid"], "act": ["pay(50)"], "res": ["\"brewing soon\""]}}, {"short": "Brew", "tag": "Brew", "title": "Brewing: deduct ingredients, block every other action", "body": "<p>BrewingState.select() and .pay() → \"please wait\". Cancel is no longer allowed.</p>", "flow": [["paid", "brew", "#a855f7", "start"], ["brew", "inv", "#14b8a6", "−milk −beans −cup"]], "focus": ["brew"], "set": {"paid": {"badge": null}}, "metrics": {"state": ["Brewing"], "act": ["cancel()"], "res": ["\"please wait\""]}}, {"short": "Done", "tag": "Done", "title": "Done → dispense and return to Idle", "body": "<p>The machine is ready for the next customer.</p>", "flow": [["brew", "idle", "#3b82f6", "done"]], "focus": ["idle"], "metrics": {"state": ["Idle"], "res": ["\"enjoy!\"", "good"]}}, {"short": "Cancel", "tag": "Refund", "title": "A different customer selects, pays ₹50, then cancels", "body": "<p>DrinkSelected.cancel() refunds the credit and returns to Idle.</p>", "flow": [["sel", "idle", "#f59e0b", "refund ₹50"]], "metrics": {"act": ["cancel()"], "res": ["\"₹50 refunded\""]}}, {"short": "Empty", "tag": "Stock", "title": "Milk runs out", "body": "<p>Inventory notifies the machine (observer); it moves to OutOfStock for milk drinks. Black coffee can still be offered.</p>", "show": ["idle", "sel", "paid", "brew", "inv", "out"], "flow": [["idle", "out", "#ef4444", "no milk"]], "set": {"inv": {"badge": "milk: 0"}}, "focus": ["out"], "metrics": {"state": ["OutOfStock (milk)"], "res": ["\"milk drinks unavailable\""]}}, {"short": "Service", "tag": "Maintenance", "title": "Technician key → Maintenance; refill; back to Idle", "body": "<p>In Maintenance every customer action is rejected.</p>", "show": ["idle", "sel", "paid", "brew", "inv", "out", "mnt"], "flow": [["mnt", "idle", "#3b82f6", "refilled"]], "set": {"inv": {"badge": "milk: 2 L"}}, "metrics": {"state": ["Idle"], "res": ["ready", "good"]}}, {"short": "Recap", "tag": "Design", "title": "Design summary", "body": "<p>Machine (context) + State interface + one class per state; inventory and payment as separate collaborators; transitions live inside states, so adding \"Cleaning\" is one new class.</p>", "note": {"kind": "key", "text": "Use the State pattern for anything with a lifecycle: orders, trips, documents, vending machines, traffic lights, TCP connections."}}]}




## Case study 22: Ride matching (the object model)

> [!STORY] The System Design track's ride-hailing case study shows the distributed architecture. In a machine-coding round, the interviewer instead says: "In 60 minutes, model drivers, riders and trips, and implement requesting a ride, matching the nearest available driver, and completing a trip with a fare." The focus shifts from servers and queues to clean classes, a correct trip state machine, and pluggable matching and pricing.

### Requirements

- Drivers go online/offline and update their location; riders request a trip from A to B.
- Match the best available driver (nearest, by default); a driver can have only one active trip.
- Trip lifecycle: requested → accepted → driver arrived → in progress → completed (or cancelled).
- Fare = base + per km + per minute, times a surge multiplier; ratings after the trip.

### The design

::widget ClassDiagram {"title":"Ride matching — class diagram","what":"The object model for matching riders with drivers. A trip state machine guards the lifecycle; matching and pricing are strategies so they can change independently.","steps":["Click RideService first.","Follow requestRide through matching to driver acceptance.","Find where 'a driver can only have one active trip' is enforced."],"classes":[{"name":"RideService","col":1,"row":0,"fields":["- drivers: DriverRegistry","- trips: Map<TripId, Trip>","- matcher: MatchingStrategy","- pricing: FareStrategy"],"methods":["+ requestRide(rider, from, to): Trip","+ accept(driverId, tripId)","+ start(tripId)","+ complete(tripId): Fare","+ cancel(tripId, by)"],"desc":"Coordinates use cases; delegates choosing a driver to the matcher and calculating fares to the pricing strategy."},{"name":"DriverRegistry","col":0,"row":1,"fields":["- drivers: Map<DriverId, Driver>","- grid: Map<Cell, Set<DriverId>>"],"methods":["+ updateLocation(id, loc)","+ nearbyAvailable(loc, radius): List<Driver>","+ tryAssign(driverId, tripId): bool"],"desc":"Tracks drivers and a simple grid index for proximity. tryAssign atomically marks a driver busy only if still available."},{"name":"Driver","col":0,"row":2,"fields":["- id","- vehicle","- location","- status: OFFLINE|AVAILABLE|ON_TRIP","- rating"],"methods":[],"desc":"A driver and their current state."},{"name":"Trip","col":1,"row":1,"fields":["- id","- rider","- driver?","- pickup","- drop","- state: TripState","- timestamps"],"methods":["+ transition(event)"],"desc":"The trip state machine. Each event (ACCEPT, ARRIVE, START, COMPLETE, CANCEL) is valid only in certain states."},{"name":"MatchingStrategy","stereo":"interface","col":2,"row":0,"fields":[],"methods":["+ choose(trip, candidates): List<Driver>"],"desc":"Returns drivers in the order to offer: nearest first, best-rated, or ETA-based."},{"name":"NearestDriverMatching","col":3,"row":0,"fields":[],"methods":["+ choose(...)"],"desc":"Sorts candidates by distance (haversine — Algorithms track, chapter 11)."},{"name":"FareStrategy","stereo":"interface","col":2,"row":1,"fields":[],"methods":["+ fare(trip): Money"],"desc":"Base + distance + time, × surge; implementations per city or vehicle type."},{"name":"Rider","col":2,"row":2,"fields":["- id","- name","- paymentMethod","- rating"],"methods":[],"desc":"The passenger."}],"relations":[["RideService","DriverRegistry","composition"],["RideService","Trip","aggregation"],["RideService","MatchingStrategy","uses"],["RideService","FareStrategy","uses"],["DriverRegistry","Driver","aggregation"],["Trip","Driver","association"],["Trip","Rider","association"],["NearestDriverMatching","MatchingStrategy","implements"]]}

### Core logic

```python
TRANSITIONS = {
    ("REQUESTED", "ACCEPT"): "ACCEPTED",
    ("ACCEPTED", "ARRIVE"): "ARRIVED",
    ("ARRIVED", "START"): "IN_PROGRESS",
    ("IN_PROGRESS", "COMPLETE"): "COMPLETED",
    ("REQUESTED", "CANCEL"): "CANCELLED",
    ("ACCEPTED", "CANCEL"): "CANCELLED",
    ("ARRIVED", "CANCEL"): "CANCELLED",
}

class Trip:
    def transition(self, event):
        nxt = TRANSITIONS.get((self.state, event))
        if nxt is None:
            raise InvalidTransition(self.state, event)
        self.state = nxt

class RideService:
    def request_ride(self, rider, pickup, drop):
        trip = Trip(rider, pickup, drop)
        self.trips[trip.id] = trip
        candidates = self.drivers.nearby_available(pickup, radius_km=3)
        for driver in self.matcher.choose(trip, candidates):
            if self.drivers.try_assign(driver.id, trip.id):      # atomic: AVAILABLE -> ON_TRIP
                trip.driver = driver
                self.notify_driver(driver, trip)                  # driver must still ACCEPT in time
                return trip
        trip.transition("CANCEL")
        raise NoDriversAvailable()
```

### Discussion points

- **State machine** in one table: easy to read, test and extend (e.g. a NO_SHOW state).
- **Atomic assignment** (`try_assign`) prevents double booking a driver; if the driver declines or times out, release them and try the next candidate.
- **Strategies** for matching and fares; an **observer** for notifying rider and driver apps of state changes.
- **Proximity:** a grid map of cells → drivers, updated on location changes.

## Case study 23: Inventory management

> [!STORY] During a flash sale, a sportswear site sells 1,140 pairs of a limited sneaker — but the warehouse only had 1,000. Each checkout read "stock: 3", decided it was fine, and decremented, while hundreds of other checkouts did the same at the same moment. Refunding 140 angry customers costs money and trust. Inventory systems exist to make "never oversell" true under pressure.

### Requirements

- Products (SKUs) stocked in multiple **warehouses**; track on-hand quantity per SKU per warehouse.
- **Reserve** stock when an order is placed (with expiry if payment doesn't complete), **commit** on payment, **release** on cancellation or expiry.
- **Receive** new stock and **adjust** for damage; full **audit trail** of every movement.
- Choose the warehouse to fulfil from; alert when stock falls below a reorder level.

### The design

::widget ClassDiagram {"title":"Inventory management — class diagram","what":"Classes for tracking stock across warehouses. Available stock = on hand − reserved; every change is recorded as an immutable movement for auditing.","steps":["Click InventoryService first.","Find the formula for 'available' quantity and where it's checked atomically.","Follow a reservation through commit or expiry."],"classes":[{"name":"InventoryService","col":1,"row":0,"fields":["- stock: Map<(Sku, WarehouseId), StockLevel>","- reservations: Map<ResId, Reservation>","- allocator: AllocationStrategy","- ledger: MovementLedger"],"methods":["+ reserve(orderId, sku, qty): Reservation","+ commit(resId)","+ release(resId)","+ receive(sku, warehouse, qty)","+ adjust(sku, warehouse, delta, reason)"],"desc":"The only way stock changes. Every operation updates StockLevel atomically and appends a movement to the ledger."},{"name":"StockLevel","col":0,"row":1,"fields":["- sku","- warehouseId","- onHand: int","- reserved: int","- reorderLevel: int","- lock / version"],"methods":["+ available(): int","+ tryReserve(qty): bool"],"desc":"available = onHand − reserved. tryReserve checks and increments reserved in one atomic step (lock, or a conditional UPDATE … WHERE onHand − reserved >= qty)."},{"name":"Reservation","col":1,"row":1,"fields":["- id","- orderId","- lines: List<(sku, warehouse, qty)>","- status: HELD|COMMITTED|RELEASED","- expiresAt"],"methods":[],"desc":"A temporary hold for an order. A sweeper releases HELD reservations past their expiry."},{"name":"MovementLedger","col":2,"row":1,"fields":["- entries: List<Movement>"],"methods":["+ append(movement)"],"desc":"Append-only history: RECEIVED, RESERVED, COMMITTED (shipped), RELEASED, ADJUSTED with reason and actor. Stock can be rebuilt and audited from it."},{"name":"AllocationStrategy","stereo":"interface","col":2,"row":0,"fields":[],"methods":["+ choose(sku, qty, destination): List<(warehouse, qty)>"],"desc":"Strategy: nearest warehouse to the customer, cheapest shipping, or split across warehouses when one can't fill the order."},{"name":"ReorderObserver","stereo":"interface","col":0,"row":0,"fields":[],"methods":["+ onLowStock(sku, warehouse, available)"],"desc":"Observer: purchasing systems or alerts react when available stock falls below the reorder level."},{"name":"Warehouse","col":0,"row":2,"fields":["- id","- location"],"methods":[],"desc":"A physical location."}],"relations":[["InventoryService","StockLevel","aggregation"],["InventoryService","Reservation","aggregation"],["InventoryService","MovementLedger","composition"],["InventoryService","AllocationStrategy","uses"],["InventoryService","ReorderObserver","uses","notifies"],["StockLevel","Warehouse","association"]]}

### Core logic

```python
class StockLevel:
    def __init__(self, sku, warehouse_id, on_hand, reorder_level):
        self.sku, self.warehouse_id = sku, warehouse_id
        self.on_hand, self.reserved, self.reorder_level = on_hand, 0, reorder_level
        self.lock = threading.Lock()

    def available(self): return self.on_hand - self.reserved

    def try_reserve(self, qty):
        with self.lock:                                   # check + update atomically
            if self.available() < qty: return False
            self.reserved += qty
            return True

class InventoryService:
    def reserve(self, order_id, sku, qty, destination):
        plan = self.allocator.choose(sku, qty, destination)       # e.g. [(wh1, 2), (wh3, 1)]
        taken = []
        for wh, q in plan:
            if not self.stock[(sku, wh)].try_reserve(q):
                for wh2, q2 in taken: self._unreserve(sku, wh2, q2)   # roll back partial holds
                raise OutOfStock(sku)
            taken.append((wh, q))
        res = Reservation(order_id, [(sku, wh, q) for wh, q in taken], expires_in_minutes=15)
        self.reservations[res.id] = res
        for wh, q in taken:
            self.ledger.append(Movement("RESERVED", sku, wh, q, ref=res.id))
            self._check_reorder(sku, wh)
        return res

    def commit(self, res_id):                             # payment succeeded → ship
        res = self.reservations[res_id]
        for sku, wh, q in res.lines:
            lvl = self.stock[(sku, wh)]
            with lvl.lock:
                lvl.reserved -= q; lvl.on_hand -= q
            self.ledger.append(Movement("COMMITTED", sku, wh, q, ref=res_id))
        res.status = "COMMITTED"
```

In a database, `try_reserve` becomes one conditional statement — the fix for the flash-sale story:

```sql
UPDATE stock SET reserved = reserved + :qty
WHERE sku = :sku AND warehouse_id = :wh AND on_hand - reserved >= :qty;   -- 0 rows → out of stock
```

### Discussion points

- **Available = on hand − reserved**; reservations with **expiry** stop abandoned carts from locking stock.
- **Atomic check-and-reserve** per stock row; consistent ordering or rollback when reserving across warehouses.
- **Append-only ledger** for audit and reconciliation with physical counts (event sourcing).
- **Hot SKUs in flash sales:** split stock into several "buckets" rows to spread contention, or queue requests for that SKU.

## Case study 24: Coffee machine

> [!STORY] An office coffee machine makes espresso, cappuccino and latte. It must refuse to start a cappuccino when milk is low, show "refill water" before running dry, take payment, and never dispense while a drink is already being made. New drinks should be addable by configuration, not code. It's a small problem that tests state machines, the strategy of recipes, and clean separation of hardware from logic.

### Requirements

- Drinks defined by **recipes** (ingredient quantities); check and consume ingredients; refill.
- One drink at a time; states: idle → paid/selected → brewing → dispensing → idle; maintenance mode.
- Payment (coins/card) and refunds if a drink can't be made.
- Low-ingredient alerts; add new drinks easily.

### The design

::widget ClassDiagram {"title":"Coffee machine — class diagram","what":"A coffee machine driven by a state machine. Recipes are data; the ingredient store checks and consumes atomically; hardware is behind an interface so logic can be tested without a real machine.","steps":["Click CoffeeMachine first.","Click each state class to see which actions it allows.","Find how a new 'mocha' drink would be added."],"classes":[{"name":"CoffeeMachine","col":1,"row":0,"fields":["- state: MachineState","- recipes: Map<Drink, Recipe>","- store: IngredientStore","- payment: PaymentProcessor","- hardware: BrewingHardware"],"methods":["+ select(drink)","+ pay(amount)","+ cancel()","+ setState(state)"],"desc":"The context in the State pattern: it forwards each user action to its current state object, which decides what happens and which state comes next."},{"name":"MachineState","stereo":"interface","col":2,"row":0,"fields":[],"methods":["+ select(m, drink)","+ pay(m, amount)","+ cancel(m)"],"desc":"Each state implements the actions; invalid actions in a state give a clear message instead of corrupting the machine."},{"name":"IdleState","col":2,"row":1,"fields":[],"methods":["+ select: check ingredients → WaitingPayment"],"desc":"Accepts a selection only if the recipe can be made."},{"name":"WaitingPaymentState","col":3,"row":1,"fields":["- drink","- paid"],"methods":["+ pay: when enough → Brewing","+ cancel: refund → Idle"],"desc":"Collects payment; cancellation refunds."},{"name":"BrewingState","col":3,"row":0,"fields":[],"methods":["+ all actions: 'please wait'"],"desc":"Consumes ingredients and runs the hardware; returns to Idle (and gives change) when done."},{"name":"Recipe","col":0,"row":1,"fields":["- drink","- price","- ingredients: Map<Ingredient, qty>"],"methods":[],"desc":"Pure data loaded from configuration. A new drink = a new recipe entry."},{"name":"IngredientStore","col":0,"row":2,"fields":["- levels: Map<Ingredient, qty>","- thresholds"],"methods":["+ canMake(recipe): bool","+ consume(recipe)","+ refill(ingredient, qty)"],"desc":"Checks and consumes all ingredients of a recipe together; emits low-level alerts to observers."},{"name":"BrewingHardware","stereo":"interface","col":1,"row":2,"fields":[],"methods":["+ grind()","+ heatWater(ml)","+ steamMilk(ml)","+ dispense()"],"desc":"Abstraction over real hardware; a fake implementation makes the logic unit-testable (dependency inversion)."}],"relations":[["CoffeeMachine","MachineState","uses"],["IdleState","MachineState","implements"],["WaitingPaymentState","MachineState","implements"],["BrewingState","MachineState","implements"],["CoffeeMachine","Recipe","aggregation"],["CoffeeMachine","IngredientStore","composition"],["CoffeeMachine","BrewingHardware","uses"]]}

### Core logic

```python
class IdleState:
    def select(self, m, drink):
        recipe = m.recipes.get(drink)
        if recipe is None: return m.display("Unknown drink")
        if not m.store.can_make(recipe): return m.display(f"Sorry, {drink} unavailable")
        m.set_state(WaitingPaymentState(recipe))
    def pay(self, m, amount): m.refund(amount); m.display("Select a drink first")
    def cancel(self, m): pass

class WaitingPaymentState:
    def __init__(self, recipe): self.recipe, self.paid = recipe, 0
    def select(self, m, drink): m.display("Payment in progress")
    def pay(self, m, amount):
        self.paid += amount
        if self.paid >= self.recipe.price:
            m.set_state(BrewingState())
            m.brew(self.recipe, change=self.paid - self.recipe.price)
    def cancel(self, m):
        m.refund(self.paid); m.set_state(IdleState())

class CoffeeMachine:
    def brew(self, recipe, change):
        self.store.consume(recipe)                     # all-or-nothing
        hw = self.hardware
        hw.grind(); hw.heat_water(recipe.ingredients.get("water", 0))
        if recipe.ingredients.get("milk"): hw.steam_milk(recipe.ingredients["milk"])
        hw.dispense()
        self.refund(change)
        self.set_state(IdleState())
```

### Discussion points

- **State pattern** keeps each state's rules in one place; the alternative — a big `if state == …` in every method — grows unmanageable.
- **Recipes as data** (open/closed): new drinks without code changes. Customizations (extra shot) can be **decorators** on recipes.
- **Hardware behind an interface** for testability.
- Concurrency is simple here (one user), but the same pattern scales to vending machines (LLD case study 3) and ATMs (case study 14).

## Case study 25: Traffic signal controller

> [!STORY] A four-way junction has signals for north-south and east-west traffic plus pedestrian crossings. The controller must never show green to conflicting directions at once, must give pedestrians time to cross when someone presses the button, should extend green when sensors detect a queue, and must switch to flashing amber if something fails. It's a classic exercise in state machines, timing and safety invariants.

### Requirements

- Phases: NS green → NS amber → all red → EW green → EW amber → all red → repeat, with configurable durations.
- **Safety invariant:** conflicting directions are never green at the same time; there's always an all-red clearance between phases.
- Pedestrian requests add a walk phase on the next cycle; sensors can extend green up to a maximum.
- Emergency vehicle preemption and a fault mode (flashing amber).

### The design

::widget ClassDiagram {"title":"Traffic signal controller — class diagram","what":"A controller cycling through phases of a junction plan. Each phase sets every signal at once; transitions are timed by a clock; requests and sensors modify the next phases.","steps":["Click IntersectionController first.","Find where the 'never conflicting greens' rule is enforced.","Follow a pedestrian button press to the walk phase it causes."],"classes":[{"name":"IntersectionController","col":1,"row":0,"fields":["- plan: SignalPlan","- current: Phase","- signals: Map<Approach, Signal>","- clock: Clock","- mode: NORMAL|PREEMPT|FAULT"],"methods":["+ tick(now)","+ requestPedestrian(crossing)","+ onSensor(approach, queueLength)","+ preempt(approach)","+ fault()"],"desc":"Advances through phases when their timer expires, applying each phase to all signals. Validates every phase against the conflict table before applying it."},{"name":"SignalPlan","col":0,"row":1,"fields":["- phases: List<Phase>","- conflicts: Set<(Approach, Approach)>"],"methods":["+ next(current, requests): Phase","+ isSafe(phase): bool"],"desc":"The ordered cycle of phases and which movements conflict. Inserts a pedestrian phase when one has been requested."},{"name":"Phase","col":1,"row":1,"fields":["- name","- lights: Map<Approach, Light>","- minDuration","- maxDuration"],"methods":[],"desc":"A full assignment of lights for the junction, e.g. NS=GREEN, EW=RED, PED_NS=DONT_WALK. Green can be extended between min and max duration when sensors detect traffic."},{"name":"Signal","col":2,"row":1,"fields":["- approach","- light: RED|AMBER|GREEN|FLASHING_AMBER"],"methods":["+ set(light)"],"desc":"One signal head. In a real system this drives hardware through an interface."},{"name":"Clock","stereo":"interface","col":2,"row":0,"fields":[],"methods":["+ now()"],"desc":"Injected time source, so the controller can be tested by advancing a fake clock."},{"name":"PedestrianButton","col":0,"row":2,"fields":["- crossing"],"methods":["+ press()"],"desc":"Observer/source of requests; pressing records a request served on the next appropriate phase."},{"name":"VehicleSensor","col":1,"row":2,"fields":["- approach"],"methods":["+ report(queueLength)"],"desc":"Loop detectors or cameras reporting queues, used to extend green up to the phase's maximum."}],"relations":[["IntersectionController","SignalPlan","composition"],["IntersectionController","Signal","aggregation"],["IntersectionController","Clock","uses"],["SignalPlan","Phase","composition"],["PedestrianButton","IntersectionController","uses","requests"],["VehicleSensor","IntersectionController","uses","reports"]]}

### Core logic

```python
class IntersectionController:
    def __init__(self, plan, signals, clock):
        self.plan, self.signals, self.clock = plan, signals, clock
        self.ped_requests = set()
        self._enter(plan.phases[0])

    def _enter(self, phase):
        if not self.plan.is_safe(phase):                       # never apply conflicting greens
            return self.fault()
        self.current, self.started = phase, self.clock.now()
        self.extended_until = self.started + phase.min_duration
        for approach, light in phase.lights.items():
            self.signals[approach].set(light)

    def on_sensor(self, approach, queue_length):
        if queue_length > 0 and self.current.lights.get(approach) == "GREEN":
            self.extended_until = min(self.clock.now() + 5,                # extend by 5 s…
                                      self.started + self.current.max_duration)  # …up to the max

    def tick(self):
        if self.clock.now() >= self.extended_until:
            nxt = self.plan.next(self.current, self.ped_requests)
            self.ped_requests -= nxt.serves_pedestrians
            self._enter(nxt)

    def fault(self):
        for s in self.signals.values(): s.set("FLASHING_AMBER")
        self.mode = "FAULT"
```

### Discussion points

- **Safety invariant enforced in one place** (`is_safe` against the conflict table) before any phase is applied; amber and all-red phases are part of the plan, never skipped.
- **State machine + timing** with an injected clock makes the controller deterministic and testable.
- **Observer** inputs (buttons, sensors) influence **future** phases rather than interrupting the current one unsafely.
- **Extensions:** emergency preemption (move safely through amber/all-red to green for the emergency approach), coordinated "green waves" across junctions, time-of-day plans, and remote monitoring.

> [!RECAP]
> - **Ride matching:** trip state machine in a transition table, atomic driver assignment, matching and fare strategies, a grid index for proximity.
> - **Inventory:** available = on hand − reserved; atomic conditional reservation; expiry; append-only movement ledger; allocation strategy and low-stock observers.
> - **Coffee machine:** State pattern, recipes as data, all-or-nothing ingredient consumption, hardware behind an interface.
> - **Traffic signal:** phases as complete light assignments, a conflict table checked before every change, timed transitions with sensor extensions, safe fault mode.

> [!INTERVIEW] Across all four, interviewers look for: a clear state machine where there's a lifecycle, invariants enforced in one place, atomic check-and-update where concurrency exists, and strategies/observers where behaviour must be swappable.

::quiz {"q":"How do you prevent overselling when many checkouts reserve the same SKU at once?","options":["Check stock, then decrement in a separate step","Atomic conditional update: reserve only if on_hand − reserved ≥ qty, in one step","Cache the stock count","Ask users to retry"],"answer":1,"explain":"The check and the update must be indivisible."}

::quiz {"q":"Why use the State pattern for the coffee machine?","options":["It's faster","Each state's allowed actions live in one class, avoiding sprawling if/else on a state variable in every method","It's required by Python","To save memory"],"answer":1,"explain":"Adding a state or changing its rules touches one place."}

::quiz {"q":"Where should the traffic controller's 'no conflicting greens' rule be checked?","options":["Only in tests","Before every phase is applied, against a conflict table, with fault mode if violated","In each Signal independently","Nowhere — the plan is trusted"],"answer":1,"explain":"Safety-critical invariants are enforced centrally and defensively."}
