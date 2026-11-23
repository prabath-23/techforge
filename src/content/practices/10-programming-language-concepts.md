---
title: Programming Language Concepts: Types, Memory and Concurrency Models
summary: The ideas underneath every programming language, so you can learn new ones quickly and choose well, compiled vs interpreted and JIT, static vs dynamic and strong vs weak typing, generics and type inference, memory management (manual, garbage collection, reference counting, Rust's ownership), values vs references, paradigms, error handling styles, and concurrency models (threads, async/await, goroutines, actors).
---

::widget Scene {"title": "Memory management: four approaches", "sub": "the same \"create a list, share it, drop it\" in C, Java, Swift and Rust", "nodes": [{"id": "m", "kind": "cube", "label": "Manual (C)", "x": 0.0, "y": 0.0, "color": "red"}, {"id": "gc", "kind": "cube", "label": "Tracing GC (Java, Go)", "x": 6.0, "y": -6.0, "color": "blue"}, {"id": "rc", "kind": "cube", "label": "Reference counting (Swift)", "x": 6.82, "y": 6.82, "color": "orange"}, {"id": "own", "kind": "cube", "label": "Ownership (Rust)", "x": 12.82, "y": 0.82, "color": "green"}], "metrics": [["who", "Who frees it"], ["when", "When"], ["risk", "Main risk"]], "steps": [{"short": "Task", "tag": "Task", "title": "Allocate a list, pass it to a function, then stop using it", "body": "<p>Who decides when its memory can be reused?</p>", "show": ["m", "gc", "rc", "own"], "metrics": {"who": ["?"], "when": ["?"], "risk": ["?"]}}, {"short": "C", "tag": "Manual", "title": "C: you call malloc and free yourself", "body": "<p>Fast and predictable.</p>", "focus": ["m"], "metrics": {"who": ["the programmer"], "when": ["when you call free"]}}, {"short": "CBug", "tag": "Manual", "title": "Free too early → use-after-free; forget → leak; twice → corruption", "body": "<p>About 70% of serious security bugs in big C/C++ codebases are memory-safety bugs.</p>", "set": {"m": {"badge": "use-after-free!"}}, "metrics": {"risk": ["memory-safety bugs", "bad"]}}, {"short": "GC", "tag": "Tracing GC", "title": "Java/Go: a garbage collector finds unreachable objects", "body": "<p>Start from roots (stack, globals), mark everything reachable, free the rest.</p>", "focus": ["gc"], "set": {"m": {"badge": null}}, "metrics": {"who": ["the runtime"], "when": ["some time after it's unreachable"], "risk": ["pauses, memory overhead"]}}, {"short": "GCtune", "tag": "Tracing GC", "title": "Modern collectors are concurrent and generational", "body": "<p>Most objects die young, so collect the young generation often and cheaply. Pauses are now often sub-millisecond.</p>"}, {"short": "RC", "tag": "Ref counting", "title": "Swift/Python: each object counts references", "body": "<p>Freed the instant the count hits 0, predictable.</p>", "focus": ["rc"], "metrics": {"who": ["count reaches 0"], "when": ["immediately"], "risk": ["cycles leak"]}}, {"short": "Cycle", "tag": "Ref counting", "title": "A ↔ B referencing each other never reach 0", "body": "<p>Use weak references for back-pointers (Python adds a cycle collector).</p>", "set": {"rc": {"badge": "cycle leak"}}}, {"short": "Rust", "tag": "Ownership", "title": "Rust: every value has one owner; borrows are checked at compile time", "body": "<p>Freed when the owner goes out of scope. Use-after-free won't compile.</p>", "focus": ["own"], "set": {"rc": {"badge": null}}, "metrics": {"who": ["the compiler-placed drop"], "when": ["end of owner's scope"], "risk": ["learning curve"]}}, {"short": "Choose", "tag": "Choose", "title": "Trade-offs", "body": "<p>Control and speed (C, Rust) vs simplicity (GC). Rust gets safety without a GC by moving the work to compile time.</p>", "note": {"kind": "key", "text": "Manual: fast, unsafe. Tracing GC: safe, pauses/overhead. Ref counting: immediate, cycles. Ownership: safe and fast, stricter rules."}}]}


## Five languages, one engineer

> [!STORY] Over a career, a typical engineer might write Java at their first job, Python for data scripts, TypeScript for a front-end, Go for infrastructure tools and some Rust for a performance-critical service. Each switch feels like starting over, until you realize the languages are mostly **different combinations of the same few ideas**: how types are checked, how memory is managed, how errors are reported, and how concurrent work is expressed. Learn those ideas once, and a new language becomes "Go uses this approach to memory and that approach to concurrency", a few days of syntax, not months.

## How code runs: compiled, interpreted, JIT

- **Ahead-of-time compiled** (C, C++, Rust, Go, Swift): source is compiled into machine code before running (OS track, chapter 11). Fast startup and execution; you ship a binary per platform.
- **Interpreted** (classic Python, Ruby): an interpreter reads and executes code (usually compiled first to **bytecode**) at run time. Flexible, slower for heavy computation.
- **JIT-compiled** (Java/JVM, C#/.NET, JavaScript V8, PyPy): code starts as bytecode, and a **just-in-time compiler** turns hot code paths into optimized machine code while the program runs, using profiling information, often approaching AOT speed after warm-up.

> [!NOTE] Speed differences are real but often overstated: most web services spend their time waiting on networks and databases (chapter 9). Choose for the ecosystem, team skills and the problem; drop to faster languages or native libraries for the hot spots (NumPy is fast because its core is C).

## Type systems

### Static vs dynamic

- **Static typing** (Java, Go, Rust, TypeScript, C#): types are checked **before** the program runs. Many mistakes are caught by the compiler; editors autocomplete and refactor reliably.
- **Dynamic typing** (Python, JavaScript, Ruby): types belong to **values** and are checked at run time. Quick to write and flexible; errors appear later, when that line runs.

Many dynamic languages now support **gradual typing** optional type hints checked by tools (Python's type hints with mypy/pyright; TypeScript over JavaScript), getting much of the safety without giving up flexibility.

### Strong vs weak

- **Strong** typing refuses to silently mix types: Python raises an error for `"5" + 5`.
- **Weak** typing converts implicitly: JavaScript gives `"5" + 5 === "55"` and `"5" * 2 === 10`, a famous source of bugs.

> [!ANALOGY] Static typing is a building inspector who checks the plans before construction; dynamic typing is an inspector who checks each room as you start using it. Strong typing is an inspector who refuses to let a water pipe connect to a gas line; weak typing quietly installs an adapter and hopes for the best.

### Other type-system ideas worth knowing

- **Type inference:** the compiler works out types so you don't write them everywhere (`let total = price * qty` in Rust, TypeScript, Kotlin, Go's `:=`).
- **Generics:** code that works for many types while staying type-safe, `List<T>`, `Map<K, V>`, `func Max[T constraints.Ordered](a, b T) T`.
- **Null safety:** Kotlin, Swift, Rust and TypeScript (strict mode) distinguish "may be missing" (`String?`, `Option<String>`) from "always present", eliminating most null-pointer errors, Tony Hoare called inventing the null reference his "billion-dollar mistake".
- **Algebraic data types / sum types:** "a result is either Ok(value) or Err(error)", "a shape is a Circle or a Rectangle", with the compiler checking you handle every case (Rust enums, Swift enums, TypeScript discriminated unions, Kotlin sealed classes).
- **Structural vs nominal typing:** TypeScript and Go interfaces accept anything with the right shape (structural); Java requires explicitly declaring `implements` (nominal).

## Memory management

Every program allocates memory for its data; someone must free it when it's no longer needed (OS track, chapter 7).

::widget Stepper {"type":"flow","cols":4,"title":"Four ways languages manage memory","what":"The main strategies for freeing memory, from fully manual to compiler-enforced. Each box shows how it works, its benefits and its costs.","steps":["Press Play and compare the four approaches.","For each, ask: who decides when memory is freed, and what goes wrong if they get it wrong?","Find the approach that gives safety without a garbage collector."],"nodes":[["Manual (C, C++ without smart pointers)","The programmer calls malloc/free (new/delete). Maximum control and predictable performance, but forgetting to free leaks memory, freeing too early causes use-after-free bugs, and freeing twice corrupts memory. Around 70% of serious security bugs in large C/C++ codebases (Microsoft, Chrome) have been memory-safety issues."],["Garbage collection (Java, Go, C#, JavaScript, Python's cycle collector)","A runtime periodically finds objects no longer reachable from the program and frees them. Safe and convenient; costs CPU and memory overhead and occasional pauses (modern collectors keep pauses to milliseconds or less)."],["Reference counting (Swift, Python's main mechanism, C++ shared_ptr)","Each object counts how many references point to it and is freed the moment the count hits zero. Predictable timing; overhead on every copy; reference CYCLES (A points to B, B to A) leak unless broken with weak references or a cycle collector."],["Ownership and borrowing (Rust)","Every value has exactly one owner; when the owner goes out of scope, the value is freed. Other code may 'borrow' references under rules the compiler checks, at most one writer OR many readers. Memory safety and no data races, with no garbage collector, verified at compile time. The cost: a steeper learning curve."]]}

### Stack vs heap, values vs references

- **Stack:** fast, automatically freed when a function returns; holds local variables of fixed size.
- **Heap:** for data whose size or lifetime isn't known at compile time; managed by one of the strategies above.
- **Value semantics** (copying the data, Go structs, C# structs, Swift structs, Rust by default) vs **reference semantics** (copying a pointer to shared data, Java/Python objects). This explains a classic Python surprise:

```python
def add_item(item, basket=[]):     # the default list is created ONCE and shared across calls
    basket.append(item)
    return basket

add_item("apple")    # ['apple']
add_item("pear")     # ['apple', 'pear']  ← surprise: the same list object
# Fix: basket=None, then basket = [] if basket is None else basket
```

## Paradigms

Most modern languages mix these; knowing them lets you pick the right tool per problem.

- **Imperative/procedural:** step-by-step instructions changing state.
- **Object-oriented:** objects bundling data and behaviour; encapsulation, polymorphism, composition over inheritance (LLD track).
- **Functional:** pure functions without side effects, immutability, higher-order functions (`map`, `filter`, `reduce`), function composition. Easier to test and to run in parallel; influential everywhere (Java streams, JavaScript array methods, React's model).
- **Declarative:** describe **what** not how, SQL (Databases track), HTML, Terraform, Kubernetes manifests.

## Error handling styles

| Style | Languages | Trade-off |
|---|---|---|
| **Exceptions** | Java, Python, C#, JavaScript, C++ | Clean happy path; errors propagate automatically; but it's not visible in signatures which calls can fail, and they're easy to swallow |
| **Error values** | Go (`value, err := f()`) | Explicit and visible; verbose; easy to ignore `err` by accident (linters help) |
| **Result / Option types** | Rust (`Result<T, E>`, `?`), Swift, Kotlin, functional languages | The type system forces you to handle failure; `?` keeps code concise |
| **Checked exceptions** | Java | Signatures declare failures; often found burdensome in practice |

Whatever the style: handle errors where you can do something meaningful, add context when propagating, and never silently swallow them (chapter 1).

## Concurrency models

How a language lets you do several things at once shapes how you write servers and pipelines (OS track, chapters 5 and 8).

- **OS threads with shared memory and locks** (Java, C++, C#, Python with the GIL caveat below): powerful and general; data races and deadlocks are the danger.
- **Async/await on an event loop** (JavaScript/Node, Python asyncio, C#, Rust tokio, Kotlin coroutines): one thread juggles thousands of I/O-bound tasks; code looks sequential but must never block the loop. Excellent for network services.
- **Green threads / goroutines** (Go, Java virtual threads since Java 21, Erlang processes): very cheap threads scheduled by the runtime onto a few OS threads, write simple blocking code, run hundreds of thousands of them. Go adds **channels**: "don't communicate by sharing memory; share memory by communicating".
- **Actors** (Erlang/Elixir, Akka): independent actors with private state communicate only by messages; failures are isolated and supervised ("let it crash"). WhatsApp's servers ran on Erlang (System Design track, chapter 15).
- **Data parallelism:** the same operation on many items in parallel, parallel streams, Rayon in Rust, NumPy/vectorized operations, GPUs (Architecture track, chapter 7).

> [!WARN] **Python's GIL.** In CPython, the global interpreter lock has historically let only one thread execute Python bytecode at a time, so threads help with I/O but not CPU-bound work, use multiprocessing, native extensions or async I/O instead. Python 3.13 introduced an experimental free-threaded build without the GIL, which may change this over the coming years.

## Choosing a language

Practical factors usually matter more than language features: the **ecosystem** and libraries for the domain, the **team's experience** hiring, **performance** and **memory** needs, **deployment** (a single static binary vs a runtime), interoperability with existing systems, and maturity of tooling. Rough patterns: Python for data/ML and scripting; TypeScript for web front- and back-ends; Go for cloud infrastructure and network services; Java/Kotlin/C# for large business systems; Rust and C++ where performance and control are critical; Swift/Kotlin for mobile.

> [!RECAP]
> - Code runs **AOT-compiled** **interpreted** or **JIT-compiled**; most services are I/O-bound, so choose for ecosystem and team first.
> - Types: **static vs dynamic** **strong vs weak**; gradual typing, inference, generics, **null safety** and **sum types** catch whole classes of bugs.
> - Memory: **manual** **garbage collection** **reference counting** (beware cycles), **Rust ownership** (safety without GC). Know stack vs heap and value vs reference semantics.
> - Paradigms: imperative, OO, **functional** declarative, mix them.
> - Errors: exceptions, error values, **Result types** never swallow errors.
> - Concurrency: threads + locks, **async/await** **goroutines/virtual threads** **actors** data parallelism; know your runtime's limits (Python's GIL).

> [!INTERVIEW] Common questions: static vs dynamic typing trade-offs, how garbage collection works and its costs, what Rust's ownership guarantees, value vs reference semantics (and the mutable-default-argument bug), async/await vs threads for an I/O-heavy service, and why you'd choose one language over another for a project.

::quiz {"q":"What does Rust's ownership system provide without a garbage collector?","options":["Faster compile times","Memory safety and freedom from data races, checked at compile time","Dynamic typing","Automatic parallelism"],"answer":1,"explain":"One owner per value; borrows follow compiler-checked rules."}

::quiz {"q":"Why does reference counting leak memory for two objects that point to each other?","options":["Counters overflow","Their counts never reach zero, even when nothing else refers to them","Reference counting doesn't free memory","The GC is disabled"],"answer":1,"explain":"Break cycles with weak references or a cycle collector."}

::quiz {"q":"An I/O-heavy Python service must handle 10,000 concurrent connections. What's a good fit?","options":["10,000 OS threads","Async I/O (asyncio) on an event loop","CPU multiprocessing only","A single blocking loop"],"answer":1,"explain":"One event loop can juggle thousands of waiting connections."}
