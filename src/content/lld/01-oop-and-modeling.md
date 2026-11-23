---
title: Thinking in Objects — Modeling Real Problems as Classes
summary: What low-level design is and how it differs from system design, the four ideas of object-oriented programming explained with everyday examples, why "composition over inheritance" matters, how to read UML class diagrams, and a step-by-step method for LLD and machine-coding interviews.
---

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
