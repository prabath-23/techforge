---
title: Recursion and Divide & Conquer — Solving Big Problems by Solving Small Ones
summary: How to think recursively without getting lost, what the computer actually does when a function calls itself, and the "divide and conquer" strategy — split the problem, solve the pieces, combine — behind merge sort, fast exponentiation, the fast multiplication inside cryptography, and finding a median without sorting.
---

## Russian dolls

> [!ANALOGY] Open a Russian nesting doll and you find a smaller doll that works exactly the same way. Keep opening until you reach the tiny solid one that doesn't open. **Recursion** solves problems the same way: a problem contains a smaller version of itself, which contains a smaller version, until you reach one so small the answer is obvious.

A **recursive function** solves a problem by calling itself on a smaller version of it. To write one correctly, you need just three things:

1. **A base case** — the smallest version, answered directly. (The tiny solid doll.)
2. **A recursive step** — express the answer in terms of the answer to a **strictly smaller** version.
3. **Trust** — assume the call on the smaller version simply works, and only think about how to use its answer. (This "leap of faith" is the part beginners find hardest; it's really just mathematical induction.)

Example: how many files are in a folder, including all its subfolders?

```python
import os
def count_files(folder):
    total = 0
    for entry in os.scandir(folder):
        if entry.is_dir():
            total += count_files(entry.path)   # trust: this correctly counts the subfolder
        else:
            total += 1                          # base case: a plain file counts as 1
    return total
```

You don't think about how deep the folders go. You only decide what to do with one level, and trust the recursive call for everything below it.

Another classic: **all subsets** of a list. The subsets of `[a, b, c]` are the subsets of `[b, c]`, plus each of those with `a` added.

```python
def subsets(items):
    if not items:
        return [[]]                                  # base case: the empty list has one subset — itself
    rest = subsets(items[1:])                        # trust it
    return rest + [[items[0]] + s for s in rest]     # without the first item, and with it

subsets(["a", "b", "c"])   # 8 subsets: [], [c], [b], [b, c], [a], [a, c], [a, b], [a, b, c]
```

## What the computer actually does

Every function call pushes a **frame** onto the **call stack** (OS track, chapter 4): a small block of memory holding that call's local variables and where to return to. A recursive call pushes another frame on top; returning pops it.

> [!WARN] The call stack has a limited size (around 8 MB by default on Linux; Python stops at about 1,000 nested calls). Recursing a million levels deep — for example, recursively walking a linked list of a million items — crashes with a **stack overflow**. For very deep problems, convert the recursion into a loop with your own explicit stack.

### The repeated-work trap

The obvious recursive Fibonacci is beautiful and catastrophically slow:

```python
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

`fib(50)` takes hours, because `fib(48)` is computed twice, `fib(47)` three times, `fib(46)` five times… the same small answers are recalculated billions of times. Remembering each answer the first time we compute it fixes this completely — `fib(50)` becomes instant. That idea, called **memoization**, is the doorway to **dynamic programming** (chapter 6).

```python
from functools import cache
@cache                               # remember every answer
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
```

## Divide and conquer

**Divide and conquer** is a recursion strategy with three steps:

1. **Divide** the problem into smaller pieces, usually halves.
2. **Conquer** each piece recursively.
3. **Combine** the pieces' answers into the full answer.

> [!ANALOGY] Counting the votes in a national election. No single person counts a billion ballots. Each polling booth counts its own; each district adds up its booths; each state adds up its districts; the national total adds up the states. The work splits naturally, and combining the results is easy.

The art is making the **combine** step cheap.

### Merge sort: the classic

Sorting a list with divide and conquer:

1. Split the list in half.
2. Sort each half (recursively).
3. **Merge** the two sorted halves into one sorted list, by repeatedly taking the smaller of the two front items.

Merging is easy and fast — one pass. How much work is that overall? The list is halved again and again, about log₂(n) times, and at every level of halving the merges together touch all n items once. So merge sort takes **O(n log n)**: a million items need about 20 million steps instead of the trillion an O(n²) sort would need.

::widget Stepper {"type":"tree","title":"Merge sort on 8 numbers — split down, merge back up","what":"The top box is the whole list. Each level splits the list in half until single numbers remain, which are trivially sorted. Then halves are merged back together in sorted order.","steps":["Click the boxes from top to bottom to see the splitting.","Notice there are only 3 levels for 8 numbers (log₂ 8 = 3).","At every level, the merging work adds up to all 8 numbers — that's where n log n comes from."],"nodes":[["[5 2 4 7 1 3 2 6]","The whole list. Merging its two sorted halves at the end takes one pass over all 8 numbers."],["[5 2 4 7]","Left half. Sort it recursively, then merge."],["[1 3 2 6]","Right half. Sort it recursively, then merge."],["[5 2]","Split again. Merging [5] and [2] gives [2 5]."],["[4 7]","Merging [4] and [7] gives [4 7]."],["[1 3]","Merging gives [1 3]."],["[2 6]","Merging gives [2 6]. Then the levels above merge into [2 4 5 7] and [1 2 3 6], and finally into [1 2 2 3 4 5 6 7]."]]}

### Fast exponentiation: computing huge powers quickly

How do you compute 3¹⁰⁰⁰⁰⁰⁰ (or, more usefully, 3¹⁰⁰⁰⁰⁰⁰ modulo some number)? Multiplying 3 by itself a million times is slow. But notice: 3¹⁰⁰⁰⁰⁰⁰ = (3⁵⁰⁰⁰⁰⁰)². So compute the half-power once and square it. Each step halves the exponent, so about **20 multiplications** do the job instead of a million.

```python
def power_mod(base, exp, mod):
    result = 1
    base %= mod
    while exp > 0:
        if exp % 2 == 1:                  # odd exponent: take one factor out
            result = result * base % mod
        base = base * base % mod          # square the base
        exp //= 2                          # halve the exponent
    return result
```

> [!EXAMPLE] **This is inside every HTTPS connection.** RSA and Diffie-Hellman encryption (Networking track, chapter 7) compute powers with exponents hundreds of digits long. Without this halving trick, that would take longer than the age of the universe; with it, it takes milliseconds.

### Faster multiplication

Multiplying two n-digit numbers the school way takes n² digit multiplications. In 1960, a 23-year-old student named Anatoly Karatsuba found a divide-and-conquer trick: split each number in half, and with some clever addition and subtraction, you need only **three** half-size multiplications instead of four. Applied recursively, that cuts the cost from n² to about n^1.58. For numbers with thousands of digits — like those in cryptography — that's a huge saving, and big-number libraries use it.

### Finding the k-th smallest without sorting: quickselect

"Find the median salary of 10 million employees." Sorting costs O(n log n). But we don't need everything sorted — only the middle one.

**Quickselect:** pick a random **pivot**, partition the list into "smaller than the pivot" and "bigger than the pivot", and see which side the answer must be on. Then recurse into **only that side**, ignoring the other. On average, each step throws away half the remaining data: n + n/2 + n/4 + … ≈ 2n, so it's **O(n)** on average.

```python
import random
def kth_smallest(items, k):          # k = 0 means the smallest
    pivot = random.choice(items)
    smaller = [x for x in items if x < pivot]
    equal   = [x for x in items if x == pivot]
    larger  = [x for x in items if x > pivot]
    if k < len(smaller):
        return kth_smallest(smaller, k)                        # answer is among the smaller ones
    if k < len(smaller) + len(equal):
        return pivot                                           # the pivot itself is the answer
    return kth_smallest(larger, k - len(smaller) - len(equal)) # answer is among the larger ones
```

### Maximum subarray: a lesson in looking for something simpler

"Find the stretch of consecutive days with the highest total profit." Divide and conquer solves it in O(n log n). But there's an even simpler idea, **Kadane's algorithm**, at O(n): walk through the days keeping the best total for a stretch ending today — either extend yesterday's stretch, or start fresh if yesterday's total was negative.

```python
def best_stretch(profits):
    best = current = profits[0]
    for p in profits[1:]:
        current = max(p, current + p)   # extend the stretch, or start a new one today
        best = max(best, current)
    return best

best_stretch([-2, 1, -3, 4, -1, 2, 1, -5, 4])   # 6 (the stretch 4, -1, 2, 1)
```

The lesson: divide and conquer is powerful, but always ask whether a simpler pass would do.

## How to estimate divide-and-conquer costs

Most divide-and-conquer algorithms fit a pattern: "split into **a** pieces, each **1/b** the size, and do some combining work". You can estimate the cost with the **recursion tree**: count the work at each level, then multiply by the number of levels.

| Algorithm | Split into | Combine work | Total |
|---|---|---|---|
| Binary search | 1 half (other ignored) | constant | **O(log n)** |
| Merge sort | 2 halves | O(n) merge | **O(n log n)** |
| Quickselect (average) | 1 part, about half | O(n) partition | **O(n)** |
| Karatsuba multiplication | 3 half-size multiplications | O(n) additions | **O(n^1.58)** |

> [!RECAP]
> - **Recursion** solves a problem using a smaller version of itself: a **base case**, a **recursive step**, and **trust** in the recursive call.
> - Each call uses a **stack frame**; very deep recursion overflows the stack, so convert it to a loop if needed.
> - Recomputing the same subproblems is the main recursion trap; **memoization** fixes it.
> - **Divide and conquer**: split, solve the pieces, combine — merge sort (O(n log n)), fast exponentiation (O(log n) multiplications, used in encryption), Karatsuba multiplication, **quickselect** (O(n) average).
> - Always check whether a simpler single pass (like **Kadane's algorithm**) exists.

> [!INTERVIEW] Signals for divide and conquer: the input splits naturally into halves (arrays, ranges, trees) and the halves' answers combine cheaply. Always state the cost and the recursion depth (stack space). "Find the k-th largest" → quickselect or a heap, not a full sort.

::quiz {"q":"Why is the naive recursive Fibonacci so slow?","options":["Recursion is always slow","It recomputes the same smaller Fibonacci values over and over — exponential work","Python can't add big numbers","It uses too much memory per call"],"answer":1,"explain":"Remembering answers (memoization) makes it linear."}

::quiz {"q":"About how many multiplications does fast exponentiation need for x^1,000,000?","options":["1,000,000","1,000","About 40","2"],"answer":2,"explain":"Each step halves the exponent: roughly 2 × log₂(1,000,000) ≈ 40."}

::quiz {"q":"Quickselect finds the median of n items in, on average…","options":["O(log n)","O(n)","O(n log n)","O(n²)"],"answer":1,"explain":"It recurses into only one side, so the work shrinks geometrically: n + n/2 + … ≈ 2n."}
