---
title: Python Essentials: Syntax, Built-in Types, Comprehensions, Classes and the Standard Library
summary: Everyday Python for interviews and work: indentation and core syntax, the built-in types and their costs, slicing, comprehensions, unpacking, functions with *args/**kwargs, classes and dataclasses, exceptions, typing hints, and the standard-library modules you'll reach for (collections, heapq, bisect, itertools, functools), plus a glossary.
---

::widget Scene {"title": "Python in one small program", "sub": "the essentials, one step at a time", "nodes": [{"id": "syn", "kind": "doc", "label": "Syntax", "x": 0.0, "y": 0.0, "color": "blue"}, {"id": "types", "kind": "doc", "label": "Built-in types", "x": 4.2, "y": -4.2, "color": "purple"}, {"id": "slice", "kind": "doc", "label": "Slicing", "x": 8.4, "y": -8.4, "color": "orange"}, {"id": "comp", "kind": "doc", "label": "Comprehensions", "x": 12.6, "y": -12.6, "color": "teal"}, {"id": "fn", "kind": "doc", "label": "Functions", "x": 6.51, "y": 6.51, "color": "green"}, {"id": "cls", "kind": "doc", "label": "Classes & dataclasses", "x": 10.71, "y": 2.31, "color": "pink"}, {"id": "exc", "kind": "doc", "label": "Exceptions", "x": 14.91, "y": -1.89, "color": "blue"}, {"id": "std", "kind": "doc", "label": "Standard library", "x": 19.11, "y": -6.09, "color": "purple"}, {"id": "typ", "kind": "doc", "label": "Type hints", "x": 19.01, "y": 6.41, "color": "orange"}], "links": [], "metrics": [["c", "Concept"], ["n", "Progress"]], "steps": [{"short": "Syntax", "tag": "Syntax", "title": "Indentation defines blocks; no braces, no semicolons", "body": "<p><code>def total(items):</code> then an indented body. <code>if __name__ == \"__main__\":</code> runs code only when executed directly.</p>", "show": ["syn"], "focus": ["syn"], "metrics": {"c": ["Syntax"], "n": ["1 of 9"]}}, {"short": "Types", "tag": "Types", "title": "int (unbounded), float, str, bool, None, list, tuple, dict, set", "body": "<p>Dynamically typed: names point to objects; the object has the type.</p>", "show": ["syn", "types"], "focus": ["types"], "metrics": {"c": ["Built-in types"], "n": ["2 of 9"]}}, {"short": "Slicing", "tag": "Sequences", "title": "Sequences support slicing: s[start:stop:step]", "body": "<p><code>s[::-1]</code> reverses; <code>a[-1]</code> is the last item. Slices create copies.</p>", "show": ["syn", "types", "slice"], "focus": ["slice"], "metrics": {"c": ["Slicing"], "n": ["3 of 9"]}}, {"short": "Comprehensions", "tag": "Idioms", "title": "Comprehensions build lists, dicts and sets in one line", "body": "<p><code>{w: len(w) for w in words if w}</code>. Generator expressions <code>(x*x for x in xs)</code> are lazy.</p>", "show": ["syn", "types", "slice", "comp"], "focus": ["comp"], "metrics": {"c": ["Comprehensions"], "n": ["4 of 9"]}}, {"short": "Functions", "tag": "Functions", "title": "Default, keyword, *args and **kwargs parameters", "body": "<p>Functions are objects: pass them around, return them, decorate them.</p>", "show": ["syn", "types", "slice", "comp", "fn"], "focus": ["fn"], "metrics": {"c": ["Functions"], "n": ["5 of 9"]}}, {"short": "Classes", "tag": "OOP", "title": "Classes with __init__ and dunder methods; @dataclass for data", "body": "<p>@dataclass generates __init__, __repr__ and __eq__; frozen=True makes it immutable and hashable.</p>", "show": ["syn", "types", "slice", "comp", "fn", "cls"], "focus": ["cls"], "metrics": {"c": ["Classes & dataclasses"], "n": ["6 of 9"]}}, {"short": "Errors", "tag": "Errors", "title": "try / except / else / finally; raise from", "body": "<p>Catch specific exceptions; EAFP style (\"easier to ask forgiveness than permission\").</p>", "show": ["syn", "types", "slice", "comp", "fn", "cls", "exc"], "focus": ["exc"], "metrics": {"c": ["Exceptions"], "n": ["7 of 9"]}}, {"short": "Stdlib", "tag": "Stdlib", "title": "collections, heapq, bisect, itertools, functools", "body": "<p>Counter, defaultdict, deque, heapq.heappush, bisect_left, lru_cache, interview staples.</p>", "show": ["syn", "types", "slice", "comp", "fn", "cls", "exc", "std"], "focus": ["std"], "metrics": {"c": ["Standard library"], "n": ["8 of 9"]}}, {"short": "Typing", "tag": "Typing", "title": "Type hints document intent and power checkers like mypy", "body": "<p><code>def find(users: list[User], uid: int) -> User | None:</code>, not enforced at runtime.</p>", "show": ["syn", "types", "slice", "comp", "fn", "cls", "exc", "std", "typ"], "focus": ["typ"], "metrics": {"c": ["Type hints"], "n": ["9 of 9"]}, "note": {"kind": "key", "text": "Python = indentation, dynamic types, powerful built-ins (list/dict/set/tuple), comprehensions, first-class functions, dataclasses, and a batteries-included standard library."}}]}

## Why Python is the interview language of choice

Python is concise enough that you spend interview time on the algorithm, not on boilerplate. That only works if the idioms are automatic: slicing, comprehensions, `collections`, `heapq`, `bisect`. This chapter is the practical refresher; Python Internals covers the GIL, memory and asyncio.

## Core syntax

```python
from collections import Counter

def top_words(text: str, k: int = 3) -> list[tuple[str, int]]:
    """Return the k most common words."""
    words = [w.lower() for w in text.split() if w.isalpha()]
    return Counter(words).most_common(k)

if __name__ == "__main__":
    print(top_words("the cat and the hat and the bat"))
```

- Blocks by indentation (4 spaces). `pass` for an empty block.
- `and`, `or`, `not`; `is` for identity (`x is None`), `==` for equality.
- Truthiness: `0`, `""`, `[]`, `{}`, `None` are false.
- f-strings: `f"{name}: {total:.2f}"`.
- Ternary: `a if cond else b`. Walrus: `if (n := len(xs)) > 10:`.

## Built-in types and their costs

| Type | Mutable | Key operations | Cost |
|---|---|---|---|
| `list` | yes | index, append, pop() | O(1); insert/pop(0)/`in` O(n) |
| `tuple` | no | index, hashable | O(1) index |
| `dict` | yes | get/set/`in`/del, insertion-ordered | O(1) average |
| `set` | yes | add/`in`/remove, union/intersection | O(1) average |
| `str` | no | index, slicing, `in` | slicing O(k) |
| `collections.deque` | yes | append/appendleft/pop/popleft | O(1) both ends |

`int` has arbitrary precision, no overflow. Integer division `//`, modulo `%` (always non-negative for positive divisor), power `**`, `divmod`.

## Slicing and unpacking

```python
a = [3, 1, 4, 1, 5, 9]
a[1:4], a[-2:], a[::-1], a[::2]
first, *rest = a          # unpacking with a star
x, y = y, x               # swap
for i, v in enumerate(a): ...
for k, v in d.items(): ...
for a1, b1 in zip(xs, ys): ...
```

## Comprehensions and generators

```python
squares = [x * x for x in range(10) if x % 2 == 0]
index   = {name: i for i, name in enumerate(names)}
unique  = {c.lower() for c in text if c.isalpha()}
total   = sum(o.amount for o in orders)        # generator: no list built
grid    = [[0] * cols for _ in range(rows)]    # NOT [[0]*cols]*rows (shared rows!)
```

## Functions

```python
def connect(host, port=5432, *, timeout=5.0, **opts): ...
connect("db", timeout=2)
```

- Parameters after `*` are keyword-only, clearer calls.
- `*args` collects extra positional arguments, `**kwargs` extra keyword arguments.
- **Mutable default arguments are shared** use `None` (see Python Internals).
- `lambda x: x[1]` for small key functions: `sorted(pairs, key=lambda p: (-p[1], p[0]))`.
- Closures and `nonlocal`; decorators wrap functions.

## Classes and dataclasses

```python
from dataclasses import dataclass, field

@dataclass(frozen=True, order=True)
class Point:
    x: int
    y: int

@dataclass
class Order:
    id: str
    items: list[str] = field(default_factory=list)
    def total_items(self) -> int: return len(self.items)
```

- `__init__`, `__repr__`, `__eq__`, `__hash__`, `__lt__`, `__len__`, `__iter__`, `__getitem__`, `__enter__`/`__exit__` customise behaviour ("dunder" methods).
- `@property` for computed attributes; `@classmethod` alternative constructors; `@staticmethod` helpers.
- Inheritance with `super()`; abstract base classes via `abc`; **duck typing** "if it has `.read()`, it's a file-like".

## Exceptions

```python
try:
    value = int(raw)
except ValueError as e:
    raise BadRequest(f"not a number: {raw!r}") from e   # keep the cause
else:
    store(value)          # runs only if no exception
finally:
    log_attempt()
```

Pythonic style is **EAFP**: try the operation and handle the exception, rather than checking everything first (LBYL).

## The interview standard library

```python
from collections import Counter, defaultdict, deque, OrderedDict
from heapq import heappush, heappop, heapify, nlargest, nsmallest   # min-heap
from bisect import bisect_left, bisect_right, insort
from itertools import accumulate, combinations, permutations, product, groupby, pairwise
from functools import lru_cache, cache, reduce, cmp_to_key
import math   # math.inf, math.gcd, math.isqrt, math.comb
```

- Max-heap: push negatives (`heappush(h, -x)`) or tuples `(-priority, item)`.
- Memoise recursion with `@cache`; raise the recursion limit or convert to iteration for deep recursion (default ~1000 frames).
- `sorted()` is stable (Timsort, O(n log n)); `list.sort()` sorts in place.

## Type hints

`list[int]`, `dict[str, list[int]]`, `int | None`, `Callable[[int], str]`, `TypedDict`, `Protocol` for structural typing. Checked by mypy/pyright, ignored at runtime (validate external data with pydantic).

## Glossary

| Term | Meaning |
|---|---|
| dunder method | special method like `__len__` that hooks into syntax |
| iterable / iterator | something you can loop over / the object producing values with `__next__` |
| generator | function using `yield`, producing values lazily |
| comprehension | one-line construction of list/dict/set |
| duck typing | behaviour matters, not declared type |
| EAFP / LBYL | try-and-catch style vs check-first style |
| GIL | lock allowing one thread to run Python bytecode at a time (CPython) |
| virtual environment | isolated set of installed packages per project |
| PEP 8 | the Python style guide |

> [!RECAP]
> - Indentation, truthiness, f-strings, unpacking and slicing.
> - Know the costs of list/dict/set/deque operations.
> - Comprehensions and generator expressions; beware `[[0]*n]*m`.
> - Keyword-only args, `*args/**kwargs`, no mutable defaults.
> - Dataclasses, dunder methods, properties; EAFP exceptions with `raise … from`.
> - collections, heapq, bisect, itertools, functools are the interview toolkit.

> [!INTERVIEW] "list vs tuple?", "How is dict ordered?", "What does `[[0]*3]*3` do wrong?", "Make a max-heap with heapq", "What does @dataclass generate?", "*args vs **kwargs?"

::quiz {"q": "What is wrong with `grid = [[0] * 3] * 3`?", "options": ["Nothing", "All three rows are the same list object, so changing one changes all", "It creates tuples", "It is too slow"], "answer": 1, "explain": "Use a comprehension to create separate rows."}

::quiz {"q": "How do you get a max-heap with heapq?", "options": ["heapq.maxheap()", "Push negated values (or (-priority, item) tuples)", "Sort descending", "Use a set"], "answer": 1, "explain": "heapq is a min-heap."}

::quiz {"q": "Which structure gives O(1) appends and pops at both ends?", "options": ["list", "collections.deque", "tuple", "dict"], "answer": 1, "explain": "list.pop(0) is O(n)."}
