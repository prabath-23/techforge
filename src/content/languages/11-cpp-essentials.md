---
title: C++ Essentials: Values, References, Classes, the STL and Templates
summary: Core modern C++ (17/20): compilation model and headers, value semantics, references and pointers, const correctness, classes with constructors and destructors, the STL containers and algorithms with their costs, iterators, lambdas, templates, enums and std::optional/variant, and common undefined behaviour to avoid, with a glossary.
---

::widget Scene {"title": "C++ in one small program", "sub": "the essentials, one step at a time", "nodes": [{"id": "comp", "kind": "doc", "label": "Compilation", "x": 0.0, "y": 0.0, "color": "blue"}, {"id": "val", "kind": "doc", "label": "Value semantics", "x": 4.2, "y": -4.2, "color": "purple"}, {"id": "ref", "kind": "doc", "label": "References & pointers", "x": 8.4, "y": -8.4, "color": "orange"}, {"id": "const", "kind": "doc", "label": "const", "x": 12.6, "y": -12.6, "color": "teal"}, {"id": "cls", "kind": "doc", "label": "Classes", "x": 6.51, "y": 6.51, "color": "green"}, {"id": "stl", "kind": "doc", "label": "STL containers", "x": 10.71, "y": 2.31, "color": "pink"}, {"id": "alg", "kind": "doc", "label": "Algorithms & lambdas", "x": 14.91, "y": -1.89, "color": "blue"}, {"id": "tmpl", "kind": "doc", "label": "Templates", "x": 19.11, "y": -6.09, "color": "purple"}, {"id": "ub", "kind": "doc", "label": "Undefined behaviour", "x": 19.01, "y": 6.41, "color": "orange"}], "links": [], "metrics": [["c", "Concept"], ["n", "Progress"]], "steps": [{"short": "Build", "tag": "Build", "title": "Headers declare, source files define; the linker joins them", "body": "<p>#include copies a header in. Each .cc compiles separately; one definition rule (ODR) across the program.</p>", "show": ["comp"], "focus": ["comp"], "metrics": {"c": ["Compilation"], "n": ["1 of 9"]}}, {"short": "Values", "tag": "Values", "title": "Objects are values: assignment copies", "body": "<p>std::string a = b copies the characters. Moves (std::move) transfer resources instead.</p>", "show": ["comp", "val"], "focus": ["val"], "metrics": {"c": ["Value semantics"], "n": ["2 of 9"]}}, {"short": "References", "tag": "References", "title": "References alias an existing object; pointers can be null and reseated", "body": "<p>Pass large objects by const reference: void f(const std::string& s).</p>", "show": ["comp", "val", "ref"], "focus": ["ref"], "metrics": {"c": ["References & pointers"], "n": ["3 of 9"]}}, {"short": "const", "tag": "Correctness", "title": "const marks what must not change", "body": "<p>const member functions promise not to modify the object. constexpr evaluates at compile time.</p>", "show": ["comp", "val", "ref", "const"], "focus": ["const"], "metrics": {"c": ["const"], "n": ["4 of 9"]}}, {"short": "Classes", "tag": "Classes", "title": "Constructors, destructors, RAII", "body": "<p>The destructor runs automatically when an object goes out of scope, the basis of resource management.</p>", "show": ["comp", "val", "ref", "const", "cls"], "focus": ["cls"], "metrics": {"c": ["Classes"], "n": ["5 of 9"]}}, {"short": "Containers", "tag": "STL", "title": "vector, unordered_map, map, set, deque, priority_queue", "body": "<p>std::vector is the default container: contiguous, cache-friendly.</p>", "show": ["comp", "val", "ref", "const", "cls", "stl"], "focus": ["stl"], "metrics": {"c": ["STL containers"], "n": ["6 of 9"]}}, {"short": "Algorithms", "tag": "STL", "title": "<algorithm> + lambdas: sort, find_if, transform, accumulate", "body": "<p>std::ranges versions (C++20) take whole containers.</p>", "show": ["comp", "val", "ref", "const", "cls", "stl", "alg"], "focus": ["alg"], "metrics": {"c": ["Algorithms & lambdas"], "n": ["7 of 9"]}}, {"short": "Templates", "tag": "Generics", "title": "Templates generate code per type at compile time", "body": "<p>Concepts (C++20) constrain template parameters with readable errors.</p>", "show": ["comp", "val", "ref", "const", "cls", "stl", "alg", "tmpl"], "focus": ["tmpl"], "metrics": {"c": ["Templates"], "n": ["8 of 9"]}}, {"short": "UB", "tag": "Safety", "title": "Know the undefined behaviour traps", "body": "<p>Out-of-bounds access, use-after-free, signed overflow, data races, dangling references, the compiler may do anything.</p>", "show": ["comp", "val", "ref", "const", "cls", "stl", "alg", "tmpl", "ub"], "focus": ["ub"], "metrics": {"c": ["Undefined behaviour"], "n": ["9 of 9"]}, "note": {"kind": "key", "text": "C++ = value semantics, references and pointers, const correctness, RAII classes, STL containers and algorithms, templates, and constant vigilance about undefined behaviour."}}]}

## Why C++ still matters

Browsers (Chromium, Firefox), game engines, databases, trading systems and operating-system components are written in C++ for control and speed. That control comes with responsibility: memory, lifetimes and undefined behaviour are yours to manage. This chapter covers the everyday language; *Modern C++ for Browser Engineers* covers ownership, smart pointers and Chromium patterns.

## Compilation model

- **Headers** (`.h`) hold declarations; **source files** (`.cc`/`.cpp`) hold definitions. `#include` literally pastes a header in; include guards or `#pragma once` stop double inclusion.
- Each source file is compiled separately into an object file; the **linker** resolves symbols across them ("undefined reference" = a declaration with no definition linked in).
- **ODR:** each function/variable has exactly one definition in the program (inline functions and templates may appear in many translation units if identical).
- Prefer forward declarations in headers to reduce rebuild times.

## Value semantics, references and pointers

```cpp
std::string a = "hello";
std::string b = a;           // copy: b has its own characters
std::string& r = a;          // reference: another name for a (can't be null or reseated)
std::string* p = &a;         // pointer: may be null, can point elsewhere later
void print(const std::string& s);   // pass big objects by const reference
void consume(std::string s);        // take by value when you'll keep/move it
```

**Moves** transfer resources: `v.push_back(std::move(s))` steals `s`'s buffer instead of copying.

## const correctness

```cpp
class Order {
 public:
  int64_t total() const { return total_; }   // promises not to modify *this
  void add(const Item& item);
 private:
  int64_t total_ = 0;
};
constexpr int kMaxItems = 100;                 // compile-time constant
```

## Classes, constructors and RAII

```cpp
class File {
 public:
  explicit File(const std::string& path) : f_(std::fopen(path.c_str(), "r")) {
    if (!f_) throw std::runtime_error("cannot open " + path);
  }
  ~File() { if (f_) std::fclose(f_); }         // always runs at scope exit
  File(const File&) = delete;                   // non-copyable
  File& operator=(const File&) = delete;
 private:
  std::FILE* f_;
};
```

- **Member initialiser lists** initialise in declaration order.
- `explicit` single-argument constructors prevent accidental conversions.
- **Rule of zero:** let members (smart pointers, containers) manage resources; otherwise define or delete all five special members (destructor, copy/move constructor and assignment).
- `virtual` functions enable runtime polymorphism; base classes used polymorphically need a **virtual destructor**. Mark overrides with `override`, final classes with `final`.

## STL containers and costs

| Container | Structure | Key costs |
|---|---|---|
| `std::vector` | dynamic array | index O(1), push_back amortised O(1), insert middle O(n) |
| `std::deque` | blocks of arrays | push/pop both ends O(1) |
| `std::list` | doubly linked list | splice O(1), no random access, cache-unfriendly |
| `std::unordered_map/set` | hash table | O(1) average |
| `std::map/set` | red-black tree | O(log n), ordered, `lower_bound` |
| `std::priority_queue` | binary heap | top O(1), push/pop O(log n); max-heap by default |
| `std::array` | fixed-size array | stack-allocated |
| `std::string_view`, `std::span` | non-owning views | no copies, must not outlive the data |

```cpp
std::priority_queue<int, std::vector<int>, std::greater<int>> minHeap;
std::unordered_map<std::string, int> counts; counts[word]++;
if (auto it = counts.find("x"); it != counts.end()) { /* it->second */ }
```

> [!WARN] Inserting into a `vector` can reallocate and **invalidate** iterators, pointers and references to its elements. `map[key]` inserts a default value if the key is missing, use `find` or `contains` (C++20) to only check.

## Algorithms, iterators and lambdas

```cpp
#include <algorithm>
#include <numeric>
std::sort(v.begin(), v.end(), [](const Order& a, const Order& b) { return a.total() < b.total(); });
auto it = std::find_if(v.begin(), v.end(), [&](const Order& o) { return o.id() == id; });
int64_t sum = std::accumulate(v.begin(), v.end(), int64_t{0}, [](int64_t s, const Order& o) { return s + o.total(); });
std::ranges::sort(v, {}, &Order::total);      // C++20 ranges with a projection
```

Lambda captures: `[=]` by value, `[&]` by reference (dangerous if the lambda outlives the scope), `[x, &y]`, `[this]`, `[p = std::move(ptr)]`.

## Templates

```cpp
template <typename T>
const T& clampMax(const T& a, const T& b) { return a < b ? b : a; }

template <std::integral T>          // C++20 concept
T gcd(T a, T b) { return b == 0 ? a : gcd(b, a % b); }
```

Templates are instantiated per type at compile time, zero runtime cost, longer compile times and (without concepts) long error messages.

## Vocabulary types

`std::optional<T>` (maybe a value), `std::variant<A, B>` (one of several types, visited with `std::visit`), `std::unique_ptr`/`std::shared_ptr` (ownership), `enum class` (scoped, strongly typed enums), structured bindings `auto [key, value] = *it;`.

## Undefined behaviour to avoid

- Out-of-bounds access (`v[i]` doesn't check; `v.at(i)` does).
- Use-after-free and dangling references (returning a reference to a local, a `string_view` of a temporary).
- **Signed integer overflow** (unsigned wraps; signed is UB).
- Data races between threads.
- Reading uninitialised variables.

Compile with warnings (`-Wall -Wextra`), run tests with **sanitizers** (ASan, UBSan, TSan), and lean on safer types.

## Glossary

| Term | Meaning |
|---|---|
| translation unit | one source file after preprocessing |
| ODR | one definition rule |
| RAII | resources tied to object lifetime |
| lvalue / rvalue | has an identity/address vs temporary value |
| move semantics | transferring resources from rvalues |
| UB | undefined behaviour, anything may happen |
| iterator invalidation | iterators becoming unusable after container changes |
| template instantiation | generating code for specific template arguments |
| vtable | table enabling virtual function dispatch |

> [!RECAP]
> - Headers declare, sources define, the linker joins; respect the ODR.
> - Value semantics; pass by const reference; move to transfer.
> - const correctness; RAII classes; rule of zero; virtual destructors for polymorphic bases.
> - Know STL container costs and iterator invalidation; `vector` by default.
> - Algorithms + lambdas (careful with `[&]`); templates with concepts.
> - Avoid UB; use sanitizers.

> [!INTERVIEW] "Reference vs pointer?", "When do vector iterators become invalid?", "map vs unordered_map?", "What is RAII?", "Why a virtual destructor?", "What does std::move actually do?", "Name three kinds of undefined behaviour."

::quiz {"q": "Why should a base class used polymorphically have a virtual destructor?", "options": ["Faster deletion", "So deleting through a base pointer runs the derived destructor too", "Required by the STL", "To allow copying"], "answer": 1, "explain": "Otherwise derived resources leak (and it is UB)."}

::quiz {"q": "What can happen to iterators after `vec.push_back(x)`?", "options": ["Nothing", "They may be invalidated if the vector reallocates", "They become faster", "They point to x"], "answer": 1, "explain": "Reallocation moves elements to new memory."}

::quiz {"q": "Which is undefined behaviour in C++?", "options": ["Unsigned overflow", "Signed integer overflow", "Calling a virtual function", "Using std::optional"], "answer": 1, "explain": "Unsigned wraps; signed overflow is UB."}
