---
title: Design Patterns: Proven Solutions to Recurring Design Problems
summary: The design patterns that matter in practice, each introduced with an everyday analogy, the problem it solves, short code, and where you've already used it without knowing, Singleton, Factory, Builder, Adapter, Decorator, Facade, Proxy, Composite, Strategy, Observer, State, Command, Template Method, Chain of Responsibility and more.
---

::widget Scene {"title": "The Strategy pattern: swap behaviour at runtime", "sub": "Strategy, Factory, Observer and Decorator working together in one order flow", "nodes": [{"id": "api", "kind": "server", "label": "OrderController", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "ord", "kind": "cube", "label": "Order", "x": 7.92, "y": -0.48, "color": "blue"}, {"id": "ps", "kind": "doc", "label": "PricingStrategy", "x": 7.78, "y": -9.02}, {"id": "reg", "kind": "cube", "label": "Regular", "x": 9.81, "y": -15.39, "color": "purple"}, {"id": "wk", "kind": "cube", "label": "Weekend 15% off", "x": 14.15, "y": -11.05, "color": "green"}, {"id": "fac", "kind": "cube", "label": "ShipperFactory", "x": 1.41, "y": -6.99, "color": "orange"}, {"id": "bus", "kind": "queue", "label": "Event bus", "x": 16.46, "y": -0.34, "color": "pink"}, {"id": "em", "kind": "cube", "label": "EmailListener", "x": 18.8, "y": -6.4, "color": "teal"}, {"id": "pts", "kind": "cube", "label": "LoyaltyListener", "x": 23.14, "y": -2.06, "color": "teal"}, {"id": "dec", "kind": "cube", "label": "Logging → Retry → Shipper", "x": 9.3, "y": 9.3, "color": "orange"}], "links": [["api", "ord"], ["ord", "ps"], ["reg", "ps", {"dashed": true}], ["wk", "ps", {"dashed": true}], ["api", "fac"], ["ord", "bus"], ["bus", "em"], ["bus", "pts"], ["fac", "dec", {"dashed": true}]], "metrics": [["pat", "Pattern"], ["prob", "Problem it solves"]], "steps": [{"short": "Setup", "tag": "Context", "title": "An order flows through pricing, shipping and notifications", "body": "<p>Each of those keeps changing for business reasons. Patterns put those changes behind stable seams.</p>", "show": ["api", "ord"], "flow": [["api", "ord", "#3b82f6", "new order"]], "metrics": {"pat": ["-"], "prob": ["-"]}}, {"short": "Strategy", "tag": "Strategy", "title": "Pricing rules change monthly: use Strategy", "body": "<p>Order holds a PricingStrategy and calls <code>price(order)</code>. It never knows which rule is active.</p>", "show": ["api", "ord", "ps", "reg"], "flow": [["ord", "ps", "#f59e0b", "price()"]], "metrics": {"pat": ["Strategy"], "prob": ["interchangeable algorithms"]}}, {"short": "Swap", "tag": "Strategy", "title": "Saturday: plug in WeekendStrategy", "body": "<p>Chosen by config or a small selector. Order code unchanged.</p>", "show": ["api", "ord", "ps", "reg", "wk"], "set": {"reg": {"dim": true}}, "flow": [["ord", "ps", "#22c55e", "₹850 (−15%)"]]}, {"short": "Factory", "tag": "Factory", "title": "Which courier? A factory decides", "body": "<p><code>ShipperFactory.forPincode(\"560001\")</code> returns Delhivery, BlueDart or local delivery. Callers never write <code>new BlueDart()</code>, so adding a courier touches one place.</p>", "show": ["api", "ord", "ps", "reg", "wk", "fac"], "flow": [["api", "fac", "#f59e0b", "forPincode()"]], "metrics": {"pat": ["Factory"], "prob": ["hide which class gets created"]}}, {"short": "Decorator", "tag": "Decorator", "title": "Add logging and retries without editing the shipper", "body": "<p>Wrap it: RetryingShipper(LoggingShipper(BlueDart)). Each wrapper has the same interface and adds one behaviour.</p>", "show": ["api", "ord", "ps", "reg", "wk", "fac", "dec"], "flow": [["fac", "dec", "#f59e0b", "wrapped shipper"]], "metrics": {"pat": ["Decorator"], "prob": ["add behaviour by wrapping"]}}, {"short": "Placed", "tag": "Observer", "title": "Order placed: who needs to know?", "body": "<p>Email, loyalty points, analytics, fraud checks… If Order calls each directly, it depends on all of them.</p>", "show": ["api", "ord", "ps", "reg", "wk", "fac", "dec", "bus"], "flow": [["ord", "bus", "#ec4899", "OrderPlaced"]], "metrics": {"pat": ["Observer"], "prob": ["one event, many reactions"]}}, {"short": "Listeners", "tag": "Observer", "title": "Listeners subscribe; Order just publishes", "body": "<p>Add a fraud listener tomorrow without touching Order.</p>", "show": ["api", "ord", "ps", "reg", "wk", "fac", "dec", "bus", "em", "pts"], "flow": [["bus", "em", "#14b8a6", "send email"], ["bus", "pts", "#14b8a6", "+85 points"]]}, {"short": "Misuse", "tag": "Judgement", "title": "Don't add patterns before there's variation", "body": "<p>One pricing rule that never changes doesn't need a Strategy. Patterns cost indirection; pay only where change actually happens.</p>", "note": {"kind": "key", "text": "Strategy: swap algorithms. Factory: hide creation. Decorator: stack behaviours. Observer: decouple events from reactions. State, Builder, Adapter and Singleton round out the interview set."}}]}




## Why patterns?

> [!ANALOGY] Architects don't reinvent the staircase for every building. There are well-known solutions, the spiral staircase for tight spaces, the grand staircase for lobbies, each with known trade-offs. When one architect says "spiral staircase", everyone pictures the same thing. **Design patterns** are the same for software: named, proven solutions to problems that keep coming up.

The classic catalog comes from the 1994 book *Design Patterns* by four authors nicknamed the "Gang of Four". Their biggest value today is a **shared vocabulary**: saying "pricing is a Strategy and each payment provider sits behind an Adapter" communicates a whole design in one sentence.

> [!WARN] Patterns are tools, not goals. Using a pattern where a simple function would do makes code harder to read. Interviewers reward patterns that solve a real problem in your design, not pattern-stuffing.

Patterns fall into three families:

::widget Stepper {"type":"hub","title":"The three families of design patterns","what":"The center is the question 'what's making this code hard to change?'. Each box is a family of patterns that solves one kind of problem.","steps":["Click each family.","For each, think of a situation in your own code where it would help.","Notice that most patterns isolate something that varies behind an interface."],"nodes":[["What's hard to change?","Name what varies or what hurts, then pick the pattern that isolates it."],["Creating objects (creational)","When building objects is complicated, or callers shouldn't know exactly which class they get: Singleton, Factory, Abstract Factory, Builder."],["Structuring objects (structural)","Fitting pieces together: make incompatible interfaces work, add features by wrapping, simplify a messy subsystem, control access: Adapter, Decorator, Facade, Proxy, Composite."],["Swappable behavior","Choose or customize an algorithm at runtime: Strategy, Template Method."],["Communication","Decouple who sends from who receives: Observer, Command, Chain of Responsibility, Mediator."],["Behavior that depends on state","Objects that act differently in different situations, or need undo: State, Memento."]]}

## Part 1: Creating objects

### Singleton, exactly one

> [!ANALOGY] A country has exactly one president at a time. Everyone who needs "the president" gets the same person.

A **Singleton** guarantees one instance of a class, with a global way to reach it, for things like an app's configuration.

```java
public enum AppConfig {            // the simplest thread-safe singleton in Java
    INSTANCE;
    private final Properties props = loadFromFile();
    public String get(String key) { return props.getProperty(key); }
}
```

**Be careful:** a singleton is global state in disguise. It hides dependencies and makes testing hard (you can't easily swap it for a fake). Usually it's better to create one instance at startup and **pass it in** where needed (dependency injection, previous chapter).

### Factory, "give me the right one"

> [!ANALOGY] You walk into a coffee shop and say "a cappuccino". You don't need to know which machine, which beans or which barista makes it. The counter (the factory) handles that.

A **Factory** creates objects for you so callers don't need to know the concrete class.

```java
interface Notifier { void send(User user, String message); }

final class NotifierFactory {
    private final Map<Channel, Supplier<Notifier>> makers = new EnumMap<>(Channel.class);
    NotifierFactory() {
        makers.put(Channel.EMAIL, EmailNotifier::new);
        makers.put(Channel.SMS, SmsNotifier::new);
        makers.put(Channel.PUSH, PushNotifier::new);
    }
    Notifier create(Channel channel) {
        Supplier<Notifier> maker = makers.get(channel);
        if (maker == null) throw new IllegalArgumentException("unsupported channel: " + channel);
        return maker.get();
    }
}
```

Using a map instead of a `switch` means adding WhatsApp later is one new line (open/closed principle).

An **Abstract Factory** creates **families** of objects that belong together, for example, `AwsFactory` gives you an S3 storage client and an SQS queue client; `GcpFactory` gives you the Google Cloud equivalents. The rest of the code never mixes them up.

### Builder, many optional parts

> [!ANALOGY] Ordering a custom pizza: choose the size, then the crust, then add toppings one at a time, then say "done". Much clearer than one giant order form with 20 blanks you have to fill in in the right order.

When an object has many optional settings, constructors become unreadable (`new Request(url, "POST", null, null, 30, true, false)`, what's `true`?). A **Builder** sets things step by step and then builds an **immutable** object:

```java
HttpRequest request = HttpRequest.newBuilder("https://api.example.com/orders")
        .post(jsonBody)
        .header("Idempotency-Key", key)
        .timeout(Duration.ofSeconds(3))
        .build();
```

You've used builders already: Java's `HttpRequest.newBuilder()`, `StringBuilder`, and the generated builders in Protocol Buffers.

## Part 2: Structuring objects

### Adapter, make it fit

> [!ANALOGY] A travel plug adapter. Your Indian charger doesn't fit a UK socket; the adapter makes the shapes compatible without changing the charger or the wall.

An **Adapter** wraps a class with an incompatible interface so it fits the interface your code expects. It's essential when integrating third-party services:

```java
interface PaymentGateway { PaymentResult charge(Money amount, CardToken card); }   // what OUR code expects

final class StripeAdapter implements PaymentGateway {
    private final StripeClient stripe;                                              // the vendor's own API
    StripeAdapter(StripeClient stripe) { this.stripe = stripe; }
    public PaymentResult charge(Money amount, CardToken card) {
        var intent = stripe.createPaymentIntent(amount.paise(), "inr", card.value());
        return intent.succeeded() ? PaymentResult.ok(intent.id()) : PaymentResult.failed(intent.error());
    }
}
```

Your business logic only knows `PaymentGateway`. Adding Razorpay means writing a `RazorpayAdapter`; nothing else changes.

### Decorator, add features by wrapping

> [!ANALOGY] Ordering coffee, then adding extra milk, then a shot of caramel, then whipped cream. Each addition wraps the drink and adds to it, and you can combine them in any order. You don't need a separate menu item for every combination.

A **Decorator** wraps an object and adds behavior while keeping the **same interface** so wrappers can be stacked:

```java
interface DataStore { String read(String key); void write(String key, String value); }

final class Encrypted implements DataStore {
    private final DataStore inner;
    Encrypted(DataStore inner) { this.inner = inner; }
    public String read(String k)            { return decrypt(inner.read(k)); }
    public void write(String k, String v)   { inner.write(k, encrypt(v)); }
}
// Stack wrappers freely:
DataStore store = new Logged(new Encrypted(new Compressed(new FileDataStore("/data"))));
```

You've used this: Java's `new BufferedReader(new InputStreamReader(new FileInputStream(f)))`, and web "middleware" that adds logging, authentication or retries around a request handler.

### Facade, one simple front door

> [!ANALOGY] A hotel concierge. You say "book me a dinner and a taxi for 8 pm", and they deal with the restaurant, the taxi company and the timing. You don't call each yourself.

A **Facade** gives a simple interface to a complicated set of components: `checkout.placeOrder(cart)` hides inventory reservation, pricing, payment, shipping and notifications behind one call.

### Proxy, a stand-in that controls access

> [!ANALOGY] A celebrity's manager. To reach the star, you go through the manager, who decides whether to let you through, may answer common questions themselves, and schedules things for later.

A **Proxy** has the same interface as the real object but controls access to it: **caching** results, **checking permissions** **loading lazily** (only creating an expensive object when first used), or representing something on another machine (a gRPC client stub).

```java
final class CachingUserService implements UserService {
    private final UserService real;
    private final Map<UserId, User> cache = new ConcurrentHashMap<>();
    CachingUserService(UserService real) { this.real = real; }
    public User get(UserId id) { return cache.computeIfAbsent(id, real::get); }
}
```

(Decorator and Proxy look alike in code; the difference is intent. A decorator **adds** behavior; a proxy **controls access**.)

### Composite, treat one and many the same way

> [!ANALOGY] Folders and files. "How big is this?" works the same whether you ask a single file or a folder containing thousands of files and subfolders, a folder just adds up its contents.

A **Composite** lets single objects and groups be used through the same interface. File systems, organization charts, UI components inside containers and nested menus all work this way (see the in-memory file system case study).

## Part 3: Swappable behavior

### Strategy, choose the algorithm

> [!ANALOGY] Google Maps asks: drive, take the bus, cycle, or walk? Same question ("get me there"), different strategies, chosen at the moment you ask.

A **Strategy** puts each variation of an algorithm behind one interface, so you can choose or swap it at runtime. It's the **most useful pattern in LLD interviews**: pricing rules, parking-spot allocation, ride matching, retry policies, sorting orders.

```java
interface SpotAllocationStrategy { Optional<Spot> allocate(List<Floor> floors, Vehicle v); }
final class NearestToEntrance implements SpotAllocationStrategy { /* … */ }
final class FillLowestFloorFirst implements SpotAllocationStrategy { /* … */ }
```

### Template Method, a fixed recipe with replaceable steps

> [!ANALOGY] Every Subway sandwich follows the same steps, bread, filling, vegetables, sauce, wrap, but you choose what goes into each step.

A **Template Method** defines the steps of an algorithm in a base class, and subclasses fill in particular steps. For example, an import job always does `read → validate → transform → save`, and a `CsvImporter` and a `JsonImporter` each override only `read`. (Strategy achieves the same with composition and is often preferred.)

## Part 4: Communication

### Observer, tell everyone who's interested

> [!ANALOGY] Subscribing to a YouTube channel. When a new video is published, every subscriber is notified. The creator doesn't keep a list of who to phone; subscribers sign up and get notified automatically.

An **Observer** (publish/subscribe) lets one object notify many others of changes, without knowing who they are:

```java
interface OrderListener { void onOrderPlaced(Order order); }

final class OrderEvents {
    private final List<OrderListener> listeners = new CopyOnWriteArrayList<>();   // safe to iterate while others subscribe
    void subscribe(OrderListener l) { listeners.add(l); }
    void publish(Order order) { listeners.forEach(l -> l.onOrderPlaced(order)); }
}
events.subscribe(order -> emailService.sendReceipt(order));
events.subscribe(order -> analytics.track("order_placed", order.id()));
events.subscribe(inventory::reserve);
```

At system scale, Observer becomes a message broker like Kafka (System Design track, chapter 6). Watch out for slow listeners delaying everyone (notify them asynchronously) and for listeners that are never unsubscribed (memory leaks).

### Command, turn a request into an object

> [!ANALOGY] A waiter writes your order on a ticket. The ticket can be queued, handed to any cook, kept for the record, or torn up (cancelled). The request has become a thing you can pass around.

A **Command** wraps an action as an object with `execute()` (and often `undo()`). This enables queues of work, logs, retries, and **undo/redo**:

```java
interface Command { void execute(); void undo(); }

final class InsertText implements Command {
    private final Document doc; private final int pos; private final String text;
    InsertText(Document doc, int pos, String text) { this.doc = doc; this.pos = pos; this.text = text; }
    public void execute() { doc.insert(pos, text); }
    public void undo()    { doc.delete(pos, text.length()); }
}

final class Editor {
    private final Deque<Command> undoStack = new ArrayDeque<>(), redoStack = new ArrayDeque<>();
    void run(Command c) { c.execute(); undoStack.push(c); redoStack.clear(); }
    void undo() { if (!undoStack.isEmpty()) { Command c = undoStack.pop(); c.undo(); redoStack.push(c); } }
    void redo() { if (!redoStack.isEmpty()) { Command c = redoStack.pop(); c.execute(); undoStack.push(c); } }
}
```

Every Ctrl+Z you've ever pressed is built on this idea.

### Chain of Responsibility, pass it along until someone handles it

> [!ANALOGY] Calling customer support: the first-level agent tries to help; if they can't, they escalate to a specialist; if needed, a manager. Each level either handles the request or passes it on.

A **Chain of Responsibility** passes a request along a chain of handlers. Web middleware is the classic example: **authenticate → check rate limit → log → handle**. Expense approvals by amount (team lead up to ₹10,000, manager up to ₹1 lakh, director above) and the ATM's note dispenser (₹2,000 notes, then ₹500, then ₹200…) work the same way.

### Mediator, a central coordinator

> [!ANALOGY] An airport control tower. Planes don't negotiate runway use with each other directly; they all talk to the tower.

A **Mediator** makes objects communicate through one coordinator instead of all talking to each other, for example, a chat room relaying messages between users, or a form dialog that enables the "Submit" button only when all fields are valid.

## Part 5: Behavior that depends on state

### State, different behavior in different situations

> [!ANALOGY] A traffic light. What happens next depends entirely on its current color: green goes to yellow, yellow to red, red to green. A car's reaction depends on the color too.

The **State** pattern gives each state its own class, which handles actions in its own way and decides the next state. It replaces sprawling `if (status == …)` code. Vending machines, ATMs, order lifecycles, document approval flows and network connections are all natural fits (see the vending machine and ATM case studies).

### Memento, save a snapshot to restore later

> [!ANALOGY] A save point in a video game: you can return to exactly that moment, without the game exposing how it stores everything internally.

A **Memento** captures an object's state so it can be restored later, game saves, editor checkpoints, "restore previous version".

## Choosing a pattern: quick guide

| The problem | Pattern |
|---|---|
| Several interchangeable algorithms or rules | **Strategy** |
| Behavior depends on the current status | **State** |
| Notify many parts when something happens | **Observer** |
| Undo/redo, queueing or logging actions | **Command** |
| Third-party API doesn't match your interface | **Adapter** |
| Add features in any combination | **Decorator** |
| Cache, protect or lazily load an object | **Proxy** |
| Complicated subsystem, simple front door | **Facade** |
| Single items and groups used the same way | **Composite** |
| Object with many optional settings | **Builder** |
| Callers shouldn't know the exact class | **Factory** |
| Pass a request through a series of checks | **Chain of Responsibility** |

> [!RECAP]
> - Patterns are named, proven solutions, mostly valuable as a **shared vocabulary**. Use them only when they solve a real problem.
> - **Creating:** Singleton (use sparingly), Factory, Abstract Factory, Builder.
> - **Structuring:** Adapter (make it fit), Decorator (add by wrapping), Facade (simple front door), Proxy (control access), Composite (one and many alike).
> - **Behavior:** Strategy (swap algorithms), Template Method, Observer (notify subscribers), Command (requests as objects; undo), Chain of Responsibility, Mediator, State, Memento.

> [!INTERVIEW] Expect "why did you use State here?", "Strategy vs State?" (with Strategy, the **caller** picks the algorithm; with State, the object **switches itself** as events happen), "Decorator vs Proxy?", "Factory vs Builder?", and implementing a thread-safe Singleton. Point out patterns naturally as you design, not as a checklist.

::quiz {"q":"You need to add compression, encryption and logging to a storage client, in any combination. Which pattern?","options":["Singleton","Decorator","Abstract Factory","Mediator"],"answer":1,"explain":"Stackable wrappers that share the same interface, like coffee add-ons."}

::quiz {"q":"An order moves Created → Paid → Shipped → Delivered, and allowed actions differ at each stage. Which pattern fits?","options":["Strategy","State","Observer","Composite"],"answer":1,"explain":"Each state class handles only the actions and transitions that are legal in that state."}

::quiz {"q":"Undo and redo in a text editor are a classic use of…","options":["Command","Adapter","Builder","Facade"],"answer":0,"explain":"Each edit becomes an object with execute() and undo(), kept on stacks."}
