---
title: Thinking in Objects — Modeling Real Problems as Classes
summary: What low-level design is and how it differs from system design, the four ideas of object-oriented programming explained with everyday examples, why "composition over inheritance" matters, how to read UML class diagrams, and a step-by-step method for LLD and machine-coding interviews.
---

::widget Scene {"title": "Modelling a parking lot with objects", "sub": "requirements → classes → a car entering, parking, paying and leaving", "nodes": [{"id": "car", "kind": "cube", "label": "Vehicle (Car/Bike/Truck)", "x": 3.72, "y": 3.72, "color": "dark"}, {"id": "gate", "kind": "cube", "label": "EntryGate", "x": 3.8, "y": -3.8, "color": "blue"}, {"id": "lot", "kind": "cube", "label": "ParkingLot", "x": 11.32, "y": -3.88, "color": "blue"}, {"id": "fl", "kind": "cube", "label": "Floor", "x": 11.4, "y": -11.4, "color": "purple"}, {"id": "sp", "kind": "cube", "label": "Spot (Compact/Large/EV)", "x": 15.2, "y": -15.2, "color": "purple"}, {"id": "st", "kind": "cube", "label": "SpotStrategy", "x": 5.12, "y": -10.08, "color": "orange"}, {"id": "tk", "kind": "doc", "label": "Ticket", "x": 18.84, "y": -3.96}, {"id": "pr", "kind": "cube", "label": "PricingStrategy", "x": 22.64, "y": -7.76, "color": "orange"}, {"id": "ex", "kind": "cube", "label": "ExitGate + Payment", "x": 11.24, "y": 3.64, "color": "green"}, {"id": "bd", "kind": "doc", "label": "DisplayBoard", "x": 18.92, "y": -11.48, "color": "teal"}], "links": [["car", "gate"], ["gate", "lot"], ["lot", "fl", {"label": "has many"}], ["fl", "sp", {"label": "has many"}], ["lot", "st"], ["lot", "tk", {"label": "issues"}], ["tk", "pr", {"dashed": true}], ["ex", "tk"], ["fl", "bd", {"dashed": true}]], "metrics": [["cls", "Class in focus"], ["job", "Its responsibility"], ["call", "Call"]], "steps": [{"short": "Reqs", "tag": "Requirements", "title": "Clarify before designing", "body": "<p>Multiple floors; spot sizes (bike, compact, large, EV); vehicles get the smallest fitting spot; hourly pricing; several entry and exit gates; boards show free spots per floor.</p>", "show": ["car"], "metrics": {"cls": ["—"], "job": ["—"], "call": ["—"]}}, {"short": "Nouns", "tag": "Classes", "title": "Nouns become classes", "body": "<p>Lot, Floor, Spot, Vehicle, Ticket, Gate, Payment, DisplayBoard. Verbs become methods: park, unpark, pay.</p>", "show": ["car", "gate", "lot", "fl", "sp", "tk", "ex", "bd"]}, {"short": "Vehicle", "tag": "Inheritance", "title": "Vehicle is abstract with a size", "body": "<p>Car, Bike and Truck extend it. The rest of the system only asks <code>vehicle.size()</code> — it never checks concrete types.</p>", "focus": ["car"], "metrics": {"cls": ["Vehicle"], "job": ["knows its size and plate"]}}, {"short": "Spot", "tag": "Encapsulation", "title": "Spot owns its own state", "body": "<p><code>canFit(v)</code>, <code>assign(v)</code>, <code>release()</code>. Nobody else flips <code>isFree</code> directly, so a spot can't be half-occupied.</p>", "focus": ["sp"], "metrics": {"cls": ["Spot"], "job": ["fit check, occupy, free"]}}, {"short": "Enter", "tag": "Flow", "title": "A car arrives at Entry Gate 2", "body": "<p>The gate asks the lot for a spot. The gate doesn't know about floors — it only talks to ParkingLot (a facade).</p>", "flow": [[["car", "gate", "lot"], "#3b82f6", "park(KA01…)"]], "metrics": {"call": ["lot.park(vehicle)"]}}, {"short": "Find", "tag": "Strategy", "title": "The lot delegates the spot choice to a SpotStrategy", "body": "<p>Nearest-to-entrance today, \"fill top floor first\" tomorrow, EV-first for electric cars. Swappable without touching ParkingLot.</p>", "show": ["car", "gate", "lot", "fl", "sp", "tk", "ex", "bd", "st"], "flow": [["lot", "st", "#f59e0b", "find(size)"]], "metrics": {"cls": ["SpotStrategy"], "job": ["choose a spot"], "call": ["strategy.find(floors, size)"]}}, {"short": "Assign", "tag": "Flow", "title": "Floor 1, spot C-14 is assigned", "body": "<p>Floors keep a set of free spots per size, so finding one is O(1) rather than scanning every spot.</p>", "flow": [[["lot", "fl", "sp"], "#a855f7", "assign"]], "set": {"sp": {"badge": "C-14 taken"}}, "metrics": {"call": ["spot.assign(vehicle)"]}}, {"short": "Race", "tag": "Concurrency", "title": "Two gates pick C-14 at the same moment?", "body": "<p>Assignment must be atomic: lock per floor (or remove from the free-set with a thread-safe operation). The loser simply asks for the next spot.</p>", "set": {"fl": {"badge": "lock floor"}}, "note": {"kind": "warn", "text": "Always mention concurrency in parking-lot LLD: multiple gates are multiple threads."}}, {"short": "Ticket", "tag": "Flow", "title": "A Ticket records vehicle, spot and entry time", "body": "<p>Returned to the driver at the gate.</p>", "flow": [["lot", "tk", "#3b82f6", "T-5531 @ 09:02"]], "set": {"fl": {"badge": null}}, "metrics": {"cls": ["Ticket"], "job": ["who, where, when"]}}, {"short": "Board", "tag": "Observer", "title": "Display boards update automatically", "body": "<p>Floors publish \"free count changed\"; boards subscribe (Observer pattern). Floors don't know how many boards exist.</p>", "flow": [["fl", "bd", "#14b8a6", "compact: 41 free"]], "metrics": {"cls": ["DisplayBoard"], "job": ["observe counts"]}}, {"short": "Exit", "tag": "Flow", "title": "Three hours later at the exit gate", "body": "<p>Scan the ticket; PricingStrategy computes the fee: first hour ₹40, then ₹30/hour → ₹100.</p>", "flow": [["ex", "tk", "#22c55e", "scan T-5531"], ["tk", "pr", "#f59e0b", "fee(3 h)"]], "metrics": {"cls": ["PricingStrategy"], "call": ["₹100"]}}, {"short": "Pay", "tag": "Flow", "title": "Payment succeeds; the spot is released", "body": "<p>Payment is an interface (cash, card, UPI). Only after success: <code>spot.release()</code>, ticket closed, boards notified.</p>", "flow": [["ex", "lot", "#22c55e", "paid"], [["lot", "fl", "sp"], "#22c55e", "release"]], "set": {"sp": {"badge": "C-14 free"}}}, {"short": "Review", "tag": "Design", "title": "Why this design holds up", "body": "<p>Each class has one job; variation points (spot choice, pricing, payment) are interfaces; shared state is protected; the gates use a single facade.</p>", "note": {"kind": "key", "text": "LLD recipe: requirements → nouns/verbs → responsibilities → relationships → one end-to-end flow → patterns at variation points → concurrency."}}]}




## High-level vs low-level design

The System Design track was about **architecture across machines**: which services, databases, caches and queues, and how they talk. That's **high-level design (HLD)**.

**Low-level design (LLD)** zooms into **one program**: which classes exist, what each is responsible for, how they relate, and how the code stays easy to change as requirements grow. If HLD is the city map, LLD is the floor plan of one building.

> [!ANALOGY] Designing a restaurant chain (HLD): how many branches, a central kitchen, delivery partners, a supply warehouse. Designing one restaurant's kitchen (LLD): who does what (chef, sous-chef, dishwasher), what equipment each uses, how orders move from the waiter to the pass, so that adding a new dish tomorrow doesn't mean rebuilding the kitchen.

In interviews, LLD rounds (often called "machine coding" or "object-oriented design") ask you to design — and often actually code — something like a parking lot, an elevator system, a movie-booking app or Splitwise, in 45–90 minutes. They test whether you can turn vague requirements into clean, extensible, working code.

## The four ideas of object-oriented programming

You've probably heard of the "four pillars". Here's what each is actually **for**.

### 1. Encapsulation — protect the rules

Group data together with the code that keeps it valid, and don't let anyone else change the data directly.

> [!ANALOGY] An ATM. You can't open the cash box and take money out; you can only use its buttons, and the machine checks your balance before dispensing. The rules (no negative balance) are protected by the only way in.

```java
// Unprotected: any code anywhere can set an invalid balance
class Account { public long balance; }

// Protected: the only way to change the balance keeps the rule "never negative"
final class Account {
    private long balancePaise;
    public void withdraw(long paise) {
        if (paise <= 0) throw new IllegalArgumentException("amount must be positive");
        if (paise > balancePaise) throw new InsufficientFundsException(balancePaise, paise);
        balancePaise -= paise;
    }
    public void deposit(long paise) {
        if (paise <= 0) throw new IllegalArgumentException("amount must be positive");
        balancePaise += paise;
    }
    public long balancePaise() { return balancePaise; }
}
```

Note what encapsulation is **not**: making every field private and adding a getter and setter for each. A public `setBalance()` lets anyone break the rule just as easily as a public field. A useful slogan is **"tell, don't ask"**: tell an object to do something (`account.withdraw(500)`), rather than asking for its data and making the decision yourself.

### 2. Abstraction — hide the how, show the what

Expose **what** something does, hide **how** it does it.

> [!ANALOGY] A car's steering wheel and pedals. You don't need to know whether the car is petrol, diesel or electric to drive it. The controls (the abstraction) stay the same while the engine underneath changes completely.

In code, abstractions are usually **interfaces**: `PaymentGateway.charge(amount, card)` works the same whether it's Stripe, Razorpay or PayPal underneath.

### 3. Inheritance — "is a kind of"

A class can **extend** another, inheriting its behavior and specializing it: a `SavingsAccount` *is a kind of* `Account`.

Inheritance is useful but easy to overuse. Deep inheritance trees become rigid, subclasses break when the parent changes, and many "is a" relationships turn out to be wrong (see the square-and-rectangle example in the next chapter).

### 4. Polymorphism — one interface, many forms

Different classes can be used through the same interface, and the right behavior is chosen automatically.

> [!ANALOGY] A universal TV remote's "power" button works on a Samsung, a Sony and an LG. You press the same button; each TV does its own thing to turn on.

This is what lets you **add new behavior without editing existing code**. A parking lot with a `FeeStrategy` interface can have `HourlyFee`, `FlatWeekendFee` and `FirstHourFreeFee`, chosen by configuration — with no `if (type == ...)` chains anywhere.

## Composition over inheritance

**Composition** means building an object out of smaller objects that each do one job ("has a"), instead of inheriting behavior ("is a").

> [!EXAMPLE] **The duck problem.** You start with `class Duck` with `fly()` and `quack()`. Then you need a rubber duck (squeaks, can't fly), a wooden decoy duck (silent, can't fly), a robot duck (flies with rockets)… With inheritance you end up with `FlyingQuackingDuck`, `NonFlyingSqueakingDuck` and a combinatorial explosion of classes. With composition, a duck simply **has** a flying behavior and a sound behavior, which you plug in:

```java
interface FlyBehavior { void fly(); }
interface SoundBehavior { void makeSound(); }

final class Duck {
    private final FlyBehavior flying;
    private final SoundBehavior sound;
    Duck(FlyBehavior flying, SoundBehavior sound) { this.flying = flying; this.sound = sound; }
    void fly() { flying.fly(); }
    void makeSound() { sound.makeSound(); }
}
// new Duck(new WingFlying(), new Quack());   new Duck(new NoFlying(), new Squeak());
```

Use inheritance for genuine, stable "is a kind of" relationships; use composition for behavior that varies.

## Interfaces vs abstract classes

- An **interface** describes a **capability** ("can be compared", "can process payments"). A class can implement many.
- An **abstract class** is a **partly-built class** that related classes share code from. A class can extend only one.

Rule of thumb: program against interfaces; add an abstract base class only when several implementations genuinely share code.

## How classes relate, and how to draw it

| Relationship | Meaning | Example |
|---|---|---|
| **Association** | Objects know about each other | A driver and their car |
| **Aggregation** ("has", loosely) | A whole contains parts that can exist on their own | A team has players; players exist without the team |
| **Composition** ("owns") | The parts live and die with the whole | A building owns its floors; no building, no floors |
| **Dependency** ("uses") | One class uses another briefly, for example as a parameter | A billing service uses a tax calculator |
| **Inheritance / implementation** | "Is a kind of" / "fulfills this interface" | `HourlyFee` implements `FeeStrategy` |

**UML class diagrams** draw these. Each class is a box with three parts: name, fields (data), methods (behavior). Here's a small one for a parking lot — click the classes:

::widget ClassDiagram {"title":"A tiny UML example","classes":[{"name":"ParkingLot","col":1,"row":0,"fields":["- floors: List<Floor>"],"methods":["+ park(vehicle): Ticket","+ unpark(ticket): Receipt"],"desc":"The front desk of the system. It owns its floors (composition: no lot, no floors) and uses a FeeStrategy to price each stay."},{"name":"Floor","col":0,"row":1,"fields":["- number: int","- spots: List<Spot>"],"methods":["+ findFreeSpot(type)"],"desc":"One level of the building, owned by the lot."},{"name":"FeeStrategy","stereo":"interface","col":2,"row":1,"fields":[],"methods":["+ fee(ticket): Money"],"desc":"A capability: 'can compute a fee'. Any pricing rule can implement it."},{"name":"HourlyFee","col":2,"row":2,"fields":["- ratePerHour"],"methods":["+ fee(ticket)"],"desc":"One pricing rule. Swapping in a weekend flat fee means writing a new class, not editing ParkingLot."}],"relations":[["ParkingLot","Floor","composition","owns"],["ParkingLot","FeeStrategy","uses"],["HourlyFee","FeeStrategy","implements"]]}

Symbols: `+` public, `-` private; a filled diamond means "owns" (composition); a hollow triangle means "is a / implements"; a dashed arrow means "uses".

## A method for LLD interviews

::widget Stepper {"type":"flow","cols":3,"title":"Six steps for any LLD problem","what":"A repeatable way to go from a vague prompt ('design a parking lot') to clean, working code in under an hour.","steps":["Press Play and read each step.","Notice that code comes only at step 5.","Try applying the steps to 'design a library system' in your head."],"nodes":[["1. Clarify requirements","Ask questions for ~5 minutes. What's in scope? How many gates? Must it handle several things happening at once? What will probably change later (new vehicle types, new pricing)?"],["2. Find the nouns and verbs","Nouns in the requirements become candidate classes (Vehicle, Spot, Ticket, Floor, Gate, Payment). Verbs become methods (park, unpark, pay)."],["3. Assign responsibilities","Who owns whom? Which class should do each job? Give a job to the class that has the information needed to do it. Sketch a class diagram."],["4. Isolate what will change","Pricing, allocation rules, payment methods and notification channels change often. Put each behind an interface (Strategy, Factory, State). Keep the core stable."],["5. Write the code","Core classes and interfaces first, then the main service, then a small demo. Use enums, immutable objects, input validation and clear exceptions."],["6. Concurrency, edge cases, extensions","Mark shared state and protect it (two gates claiming one spot). Walk through a test scenario. Then discuss: 'adding electric-vehicle charging is a new class here…'."]]}

What interviewers look for: **sensible classes with clear jobs**, sound principles (next chapter) without stuffing in every pattern you know, **working, readable code**, **easy extension**, **thread safety** where it matters, and clear explanation of your choices.

Common mistakes: one giant class that does everything; designing database tables instead of behavior; long `if/else` chains on types instead of polymorphism; shared data changed by many threads with no protection; and over-engineering.

## Java tools you'll use constantly

```java
enum VehicleType { BIKE, CAR, TRUCK, EV_CAR }                       // a fixed set of options → enum
record Money(long paise, String currency) {                          // immutable value object
    Money { if (paise < 0) throw new IllegalArgumentException(); }
    Money plus(Money other) { return new Money(paise + other.paise, currency); }
}
sealed interface PaymentMethod permits Card, Upi, Wallet {}          // a closed set of implementations
Map<String, Spot> spotsById = new ConcurrentHashMap<>();             // thread-safe map
```

> [!WARN] **Never use `double` for money.** `0.1 + 0.2` is `0.30000000000000004` in binary floating point. Store whole numbers of paise/cents (`long`) or use `BigDecimal`. A real class of billing bugs comes from this.

> [!RECAP]
> - **LLD** designs the classes inside one program; **HLD** designs services across machines.
> - **Encapsulation** protects rules ("tell, don't ask"); **abstraction** hides how; **inheritance** models "is a kind of"; **polymorphism** lets new behavior plug in without edits.
> - Prefer **composition over inheritance** for behavior that varies.
> - Relationships: association, aggregation, **composition**, dependency, inheritance — drawn in **UML class diagrams**.
> - The six-step method: clarify, find nouns/verbs, assign responsibilities, isolate change, code, then concurrency and extensions.

::quiz {"q":"A building owns its floors, and the floors can't exist without the building. Which relationship is this?","options":["Association","Aggregation","Composition","Dependency"],"answer":2,"explain":"Composition = ownership with a shared lifetime."}

::quiz {"q":"Why prefer composition over inheritance for behaviors like flying or pricing?","options":["Composition runs faster","Behaviors can be mixed and swapped freely, without an explosion of subclasses or fragile parent classes","Java doesn't support inheritance","It always needs fewer classes"],"answer":1,"explain":"Plug in the behavior you need instead of inheriting it."}

::quiz {"q":"Why is double a bad type for storing money?","options":["It uses too much memory","Binary floating point can't represent values like 0.1 exactly, causing rounding errors","It can't be negative","It's slow"],"answer":1,"explain":"Use whole paise/cents in a long, or BigDecimal."}
