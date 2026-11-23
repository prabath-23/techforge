---
title: Recursion and Divide & Conquer — Solving Big Problems by Solving Small Ones
summary: How to think recursively without getting lost, what the computer actually does when a function calls itself, and the "divide and conquer" strategy — split the problem, solve the pieces, combine — behind merge sort, fast exponentiation, the fast multiplication inside cryptography, and finding a median without sorting.
---

::widget Scene {"title": "Merge sort: split, sort the halves, merge", "sub": "sorting [38, 27, 43, 3, 9, 82, 10] all the way through", "nodes": [{"id": "a", "kind": "cells", "label": "array", "x": 0.0, "y": 0.0, "values": [38, 27, 43, 3, 9, 82, 10]}, {"id": "out", "kind": "cells", "label": "merge output", "x": 5.58, "y": 5.58, "values": ["", "", "", "", "", "", ""]}], "metrics": [["phase", "Phase"], ["level", "Level"], ["work", "Comparisons"]], "steps": [{"short": "Idea", "tag": "Idea", "title": "Divide, conquer, combine", "body": "<p>Split in half, sort each half recursively, merge the two sorted halves. A one-element list is already sorted — that's the base case.</p>", "show": ["a"], "metrics": {"phase": ["—"], "level": ["0"], "work": ["0"]}}, {"short": "Split1", "tag": "Divide", "title": "Split: [38, 27, 43, 3] | [9, 82, 10]", "body": "<p>Just compute the middle index — no work yet.</p>", "set": {"a": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue", "4": "purple", "5": "purple", "6": "purple"}, "ptr": {}}}, "metrics": {"phase": ["split"], "level": ["1"]}}, {"short": "Split2", "tag": "Divide", "title": "Keep splitting until pieces have one element", "body": "<p>[38] [27] [43] [3] [9] [82] [10] — log₂ 7 ≈ 3 levels.</p>", "set": {"a": {"marks": {"0": "blue", "1": "orange", "2": "blue", "3": "orange", "4": "blue", "5": "orange", "6": "blue"}, "ptr": {}}}, "metrics": {"level": ["3 (singles)"]}}, {"short": "Pairs", "tag": "Merge", "title": "Merge pairs: [27, 38] [3, 43] [9, 82] [10]", "body": "<p>Each merge compares the fronts of two sorted lists.</p>", "set": {"a": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green", "5": "green"}, "ptr": {}, "values": [27, 38, 3, 43, 9, 82, 10]}}, "metrics": {"phase": ["merge"], "level": ["2"], "work": ["3"]}}, {"short": "Quads", "tag": "Merge", "title": "Merge again: [3, 27, 38, 43] and [9, 10, 82]", "body": "<p>Every level does about n comparisons in total.</p>", "set": {"a": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue", "4": "purple", "5": "purple", "6": "purple"}, "ptr": {}, "values": [3, 27, 38, 43, 9, 10, 82]}}, "metrics": {"level": ["1"], "work": ["3 + 5 = 8"]}}, {"short": "M1", "tag": "Final merge", "title": "Final merge: compare fronts 3 vs 9 → take 3", "body": "<p>Two pointers, one per half.</p>", "show": ["a", "out"], "set": {"a": {"marks": {"0": "orange", "4": "orange"}, "ptr": {"i": 0, "j": 4}, "values": [3, 27, 38, 43, 9, 10, 82]}, "out": {"marks": {"0": "green"}, "ptr": {}, "values": [3, "", "", "", "", "", ""]}}, "metrics": {"phase": ["final merge"], "level": ["0"], "work": ["9"]}}, {"short": "M2", "tag": "Final merge", "title": "27 vs 9 → 9; 27 vs 10 → 10", "body": "<p>The right pointer advances twice.</p>", "set": {"a": {"marks": {"1": "orange", "6": "orange"}, "ptr": {"i": 1, "j": 6}, "values": [3, 27, 38, 43, 9, 10, 82]}, "out": {"marks": {"1": "green", "2": "green"}, "ptr": {}, "values": [3, 9, 10, "", "", "", ""]}}, "metrics": {"work": ["11"]}}, {"short": "M3", "tag": "Final merge", "title": "27 vs 82 → 27, 38, 43", "body": "<p>The left half runs out of smaller values one by one.</p>", "set": {"a": {"marks": {"6": "orange"}, "ptr": {"j": 6}, "values": [3, 27, 38, 43, 9, 10, 82]}, "out": {"marks": {"3": "green", "4": "green", "5": "green"}, "ptr": {}, "values": [3, 9, 10, 27, 38, 43, ""]}}, "metrics": {"work": ["14"]}}, {"short": "M4", "tag": "Final merge", "title": "Left is empty: copy the rest (82)", "body": "<p>Sorted: [3, 9, 10, 27, 38, 43, 82].</p>", "set": {"a": {"marks": {}, "ptr": {}, "values": [3, 27, 38, 43, 9, 10, 82]}, "out": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green", "5": "green", "6": "green"}, "ptr": {}, "values": [3, 9, 10, 27, 38, 43, 82]}}, "metrics": {"phase": ["done", "good"]}}, {"short": "Cost", "tag": "Complexity", "title": "log n levels × n work per level = O(n log n)", "body": "<p>Always — no bad inputs. Costs O(n) extra memory for merging, and it's stable (equal items keep their order).</p>", "note": {"kind": "key", "text": "Merge sort: split until trivial, merge sorted halves with two pointers. O(n log n) guaranteed, stable, needs O(n) extra space."}}]}

::widget Scene {"title": "Recursion: a function that calls itself", "sub": "factorial(4) and the call stack", "nodes": [{"id": "st", "kind": "cells", "label": "call stack (newest on the right)", "x": 3.1, "y": 3.1, "values": ["f(4)"]}], "metrics": [["call", "Current call"], ["ret", "Returned"]], "steps": [{"short": "The idea", "tag": "Concept", "title": "Solve a big problem using a smaller copy of itself", "body": "<p>4! = 4 × 3!. If we can compute 3!, we're done — and 3! = 3 × 2!, and so on, down to a <b>base case</b> we know: 1! = 1.</p>", "set": {"st": {"marks": {"0": "blue"}, "ptr": {}, "values": ["f(4)"]}}, "metrics": {"call": ["f(4)"], "ret": ["—"]}}, {"short": "Going down", "tag": "Calls", "title": "Each call waits for the smaller one", "body": "<p>f(4) calls f(3), which calls f(2), which calls f(1). Each waiting call is a frame on the <b>call stack</b>, holding its own n.</p>", "set": {"st": {"marks": {"3": "orange"}, "ptr": {}, "values": ["f(4)", "f(3)", "f(2)", "f(1)"]}}, "metrics": {"call": ["f(1) — base case"]}}, {"short": "Coming back", "tag": "Returns", "title": "Results flow back up: 1 → 2 → 6 → 24", "body": "<p>f(1) returns 1. f(2) returns 2×1 = 2, f(3) returns 3×2 = 6, f(4) returns 4×6 = 24. Each return pops a frame.</p>", "set": {"st": {"marks": {"0": "green"}, "ptr": {}, "values": ["f(4)=24"]}}, "metrics": {"ret": ["1, 2, 6, 24", "good"]}}, {"short": "Watch out", "tag": "Gotcha", "title": "No base case → stack overflow", "body": "<p>Forget the base case and the calls never stop until the stack runs out of memory. Very deep recursion (100,000 levels) can overflow too — convert to a loop then.</p>", "note": {"kind": "key", "text": "Every recursive solution needs: a base case, and a step that makes the problem smaller."}}]}


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
