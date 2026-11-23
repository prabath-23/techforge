---
title: Java Essentials: Syntax, Types, Collections, OOP, Exceptions and Modern Features
summary: A fast, complete refresher on everyday Java: program structure, primitives vs objects and autoboxing, strings, the Collections framework and when to use each type, classes, interfaces and inheritance, generics, exceptions, lambdas and streams, records, sealed types, switch expressions and Optional, with a glossary of the terms interviewers use.
---

::widget Scene {"title": "Java in one small program", "sub": "every core concept, one step at a time", "nodes": [{"id": "cls", "kind": "doc", "label": "class + main", "x": 0.0, "y": 0.0, "color": "blue"}, {"id": "types", "kind": "doc", "label": "Primitives vs objects", "x": 4.2, "y": -4.2, "color": "purple"}, {"id": "str", "kind": "doc", "label": "Strings", "x": 8.4, "y": -8.4, "color": "orange"}, {"id": "coll", "kind": "doc", "label": "Collections", "x": 12.6, "y": -12.6, "color": "teal"}, {"id": "oop", "kind": "doc", "label": "Interfaces & classes", "x": 6.51, "y": 6.51, "color": "green"}, {"id": "gen", "kind": "doc", "label": "Generics", "x": 10.71, "y": 2.31, "color": "pink"}, {"id": "exc", "kind": "doc", "label": "Exceptions", "x": 14.91, "y": -1.89, "color": "blue"}, {"id": "fn", "kind": "doc", "label": "Lambdas & streams", "x": 19.11, "y": -6.09, "color": "purple"}, {"id": "mod", "kind": "doc", "label": "Records, sealed, switch", "x": 19.01, "y": 6.41, "color": "orange"}], "links": [], "metrics": [["c", "Concept"], ["n", "Progress"]], "steps": [{"short": "Class", "tag": "Structure", "title": "Everything lives in a class; execution starts at main", "body": "<p><code>public class App { public static void main(String[] args) { … } }</code>. One public top-level class per file, named like the file.</p>", "show": ["cls"], "focus": ["cls"], "metrics": {"c": ["class + main"], "n": ["1 of 9"]}}, {"short": "Types", "tag": "Types", "title": "int, long, double, boolean are primitives; everything else is an object reference", "body": "<p>Primitives live in variables directly; objects are on the heap. Integer vs int: autoboxing converts between them, and Integer can be null.</p>", "show": ["cls", "types"], "focus": ["types"], "metrics": {"c": ["Primitives vs objects"], "n": ["2 of 9"]}}, {"short": "Strings", "tag": "Strings", "title": "Strings are immutable; compare with equals(), never ==", "body": "<p>== compares references. Build strings in loops with StringBuilder. Text blocks <code>\"\"\"…\"\"\"</code> for multi-line.</p>", "show": ["cls", "types", "str"], "focus": ["str"], "metrics": {"c": ["Strings"], "n": ["3 of 9"]}}, {"short": "Collections", "tag": "Collections", "title": "List, Set, Map, Deque, interfaces with several implementations", "body": "<p>ArrayList (default list), HashMap/HashSet (O(1) average), TreeMap (sorted), ArrayDeque (stack/queue), PriorityQueue (heap).</p>", "show": ["cls", "types", "str", "coll"], "focus": ["coll"], "metrics": {"c": ["Collections"], "n": ["4 of 9"]}}, {"short": "OOP", "tag": "OOP", "title": "Interfaces define contracts; classes implement them", "body": "<p>Single class inheritance, many interfaces. Default methods in interfaces. Prefer composition over deep inheritance.</p>", "show": ["cls", "types", "str", "coll", "oop"], "focus": ["oop"], "metrics": {"c": ["Interfaces & classes"], "n": ["5 of 9"]}}, {"short": "Generics", "tag": "Generics", "title": "Generics give type-safe containers: List&lt;Order&gt;", "body": "<p>Type erasure: generic types disappear at runtime. Wildcards: <code>? extends T</code> to read, <code>? super T</code> to write (PECS).</p>", "show": ["cls", "types", "str", "coll", "oop", "gen"], "focus": ["gen"], "metrics": {"c": ["Generics"], "n": ["6 of 9"]}}, {"short": "Errors", "tag": "Errors", "title": "Checked exceptions must be declared or caught; unchecked (RuntimeException) need not", "body": "<p>try-with-resources closes AutoCloseable resources automatically.</p>", "show": ["cls", "types", "str", "coll", "oop", "gen", "exc"], "focus": ["exc"], "metrics": {"c": ["Exceptions"], "n": ["7 of 9"]}}, {"short": "Streams", "tag": "Functional", "title": "Lambdas and streams for data pipelines", "body": "<p><code>orders.stream().filter(o -> o.paid()).map(Order::total).reduce(0, Integer::sum)</code>. Streams are lazy and single-use.</p>", "show": ["cls", "types", "str", "coll", "oop", "gen", "exc", "fn"], "focus": ["fn"], "metrics": {"c": ["Lambdas & streams"], "n": ["8 of 9"]}}, {"short": "Modern", "tag": "Modern Java", "title": "Records, sealed interfaces, pattern-matching switch, var", "body": "<p><code>record Point(int x, int y) {}</code> gives constructor, accessors, equals/hashCode/toString. Sealed types + switch patterns = exhaustive checks.</p>", "show": ["cls", "types", "str", "coll", "oop", "gen", "exc", "fn", "mod"], "focus": ["mod"], "metrics": {"c": ["Records, sealed, switch"], "n": ["9 of 9"]}, "note": {"kind": "key", "text": "Java = classes and interfaces, primitives vs references, a rich Collections library, checked/unchecked exceptions, and modern features (records, sealed types, switch patterns, streams)."}}]}

## Why a refresher matters

Interview code must compile in your head: there's often no IDE. Senior engineers stumble on small things, `==` on strings, `Integer` caching, which collection to use, a forgotten `@Override`. This chapter is a compact, practical tour of everyday Java (17–21). The JVM internals chapter goes deeper.

## Program structure

```java
package com.acme.orders;

import java.util.*;

public class App {
    public static void main(String[] args) {
        var orders = new ArrayList<Order>();
        orders.add(new Order("A1", 499));
        System.out.println(orders);
    }
}
```

- Packages group classes; access modifiers: `public`, `protected` (package + subclasses), package-private (no keyword), `private`.
- `static` belongs to the class, not instances. `final` = can't reassign (variables), override (methods) or subclass (classes).
- `var` infers local variable types (still statically typed).

## Types

| Kind | Examples | Notes |
|---|---|---|
| Primitives | `int`, `long`, `double`, `boolean`, `char`, `byte`, `short`, `float` | values, can't be null, have default values in fields |
| Wrappers | `Integer`, `Long`, `Double`, `Boolean` | objects; needed in collections; **autoboxing** converts |
| References | `String`, arrays, your classes | point to heap objects; can be null |

> [!WARN] `Integer a = 127, b = 127; a == b` is true (cached), but with 128 it's false. Always compare objects with `.equals()`. Also beware `NullPointerException` when unboxing a null `Integer` into an `int`.

Integer overflow wraps silently (`Integer.MAX_VALUE + 1` is negative). Use `long`, `Math.addExact`, or `BigInteger`/`BigDecimal` (money).

## Strings

Immutable; `s.equals(t)`, `s.equalsIgnoreCase`, `s.length()`, `s.charAt(i)`, `s.substring(a, b)`, `s.split(",")`, `String.join`, `s.strip()`, `s.isBlank()`, `String.valueOf(x)`, `Integer.parseInt(s)`. Use `StringBuilder` for loops: `sb.append(x)`, `sb.reverse()`, `sb.toString()`.

## Collections: which one?

| Need | Use | Cost |
|---|---|---|
| ordered list, index access | `ArrayList` | get O(1), add O(1) amortised, insert middle O(n) |
| unique items, fast contains | `HashSet` | O(1) average |
| key → value | `HashMap` | O(1) average |
| sorted keys / range queries | `TreeMap`, `TreeSet` | O(log n); `floorKey`, `ceilingKey`, `headMap` |
| insertion order kept | `LinkedHashMap`, `LinkedHashSet` | O(1); LRU with access order |
| stack / queue / deque | `ArrayDeque` | O(1) push/pop/offer/poll (avoid `Stack`, `LinkedList`) |
| priority queue / heap | `PriorityQueue` | O(log n) offer/poll; min-heap by default |
| thread-safe map | `ConcurrentHashMap` | lock-striped / CAS |

Useful methods: `map.getOrDefault(k, 0)`, `map.merge(k, 1, Integer::sum)`, `map.computeIfAbsent(k, x -> new ArrayList<>()).add(v)`, `Collections.sort(list)`, `list.sort(Comparator.comparing(Order::total).reversed())`, `List.of(...)` (immutable), `Arrays.asList`, `Arrays.fill`, `Arrays.sort`.

```java
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);  // min by second element
Deque<Integer> stack = new ArrayDeque<>(); stack.push(1); stack.pop();
```

> [!WARN] Comparators written as `a - b` can overflow for large values; prefer `Integer.compare(a, b)`.

## Classes, interfaces and inheritance

```java
public interface PaymentMethod { Receipt pay(long paise); }

public final class UpiPayment implements PaymentMethod {
    private final String vpa;
    public UpiPayment(String vpa) { this.vpa = Objects.requireNonNull(vpa); }
    @Override public Receipt pay(long paise) { /* ... */ return new Receipt(paise); }
}
```

- One superclass (`extends`), many interfaces (`implements`). `abstract` classes can hold state and partial implementations.
- **Overriding** (same signature in a subclass, use `@Override`) vs **overloading** (same name, different parameters).
- **Polymorphism:** a `PaymentMethod` variable can hold any implementation; the right `pay` runs at runtime (dynamic dispatch).
- Override `equals` and `hashCode` together (records do it for you).
- **Inner classes:** static nested (no outer reference) vs inner (holds an outer reference, can leak memory).

## Generics

`List<String>`, `Map<String, List<Order>>`, generic methods `static <T extends Comparable<T>> T max(List<T> xs)`. **Type erasure** means `List<String>` and `List<Integer>` are the same class at runtime, you can't do `new T()` or `instanceof List<String>`. **PECS:** producer `extends`, consumer `super`.

## Exceptions

- **Checked** (`IOException`) must be caught or declared with `throws`; **unchecked** (`RuntimeException`, e.g. `IllegalArgumentException`, `NullPointerException`) needn't be.
- `Error` (`OutOfMemoryError`), don't catch.
- **try-with-resources** closes resources even on exceptions:

```java
try (var reader = Files.newBufferedReader(path)) {
    return reader.lines().filter(l -> l.contains("ERROR")).count();
} catch (IOException e) {
    throw new UncheckedIOException("cannot read " + path, e);   // keep the cause
}
```

## Lambdas, functional interfaces and streams

Functional interfaces have one abstract method: `Function<T,R>`, `Predicate<T>`, `Consumer<T>`, `Supplier<T>`, `Comparator<T>`, `Runnable`. Method references: `String::length`, `Order::total`.

```java
Map<String, Long> countByCity = customers.stream()
    .filter(c -> c.active())
    .collect(Collectors.groupingBy(Customer::city, Collectors.counting()));
```

Streams are lazy, single-use and shouldn't have side effects; parallel streams use the common ForkJoinPool, use with care.

## Optional

`Optional<User> findById(id)` signals "may be absent" in return types: `.map(...)`, `.orElse(default)`, `.orElseThrow()`. Don't use it for fields or parameters.

## Modern Java (17–21)

- **Records** immutable data carriers.
- **Sealed** classes/interfaces, a closed set of subtypes.
- **Pattern matching** `if (obj instanceof Order o)` and switch patterns:

```java
sealed interface Shape permits Circle, Square {}
record Circle(double r) implements Shape {}
record Square(double side) implements Shape {}

double area(Shape s) {
    return switch (s) {                       // compiler checks exhaustiveness
        case Circle c -> Math.PI * c.r() * c.r();
        case Square q -> q.side() * q.side();
    };
}
```

- **Text blocks** **switch expressions** `var`, **virtual threads** (Java 21).

## Glossary

| Term | Meaning |
|---|---|
| JVM / JRE / JDK | virtual machine / runtime / development kit (compiler, tools) |
| bytecode | portable instructions in `.class` files, run by the JVM |
| autoboxing | automatic conversion between primitives and wrapper objects |
| immutable | can't change after creation (`String`, records) |
| type erasure | generic type information removed at compile time |
| checked exception | must be declared or handled |
| functional interface | interface with one abstract method; target of lambdas |
| PECS | producer extends, consumer super |
| dynamic dispatch | choosing the overriding method at runtime |
| classpath / module path | where the JVM finds classes |

> [!RECAP]
> - Primitives vs references; compare objects with `equals`; watch autoboxing and overflow.
> - Pick collections by operation: ArrayList, HashMap/HashSet, TreeMap, ArrayDeque, PriorityQueue.
> - Interfaces + composition; override equals/hashCode together; generics with erasure and PECS.
> - Checked vs unchecked exceptions; try-with-resources.
> - Lambdas, streams, Optional; records, sealed types and pattern-matching switch.

> [!INTERVIEW] "== vs equals?", "HashMap vs TreeMap?", "checked vs unchecked?", "abstract class vs interface?", "What is type erasure?", "Write a comparator sorting by two fields", "What are records?"

::quiz {"q": "`String a = \"hi\"; String b = new String(\"hi\");` What is `a == b`?", "options": ["true", "false", "compile error", "NullPointerException"], "answer": 1, "explain": "== compares references; use equals()."}

::quiz {"q": "Which collection gives sorted keys and floor/ceiling lookups?", "options": ["HashMap", "TreeMap", "ArrayList", "ArrayDeque"], "answer": 1, "explain": "Red-black tree, O(log n)."}

::quiz {"q": "What does try-with-resources guarantee?", "options": ["No exceptions", "Resources are closed even if an exception occurs", "Faster I/O", "Checked exceptions become unchecked"], "answer": 1, "explain": "Any AutoCloseable declared in the header is closed."}
