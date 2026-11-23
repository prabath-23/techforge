---
title: Complexity Analysis — Recurrences, the Master Theorem and Amortised Cost
summary: How to analyse code you can't eyeball: writing recurrences for recursive algorithms, the recursion-tree method, the Master Theorem's three cases with examples, when it doesn't apply, amortised analysis with the aggregate, accounting and potential methods (dynamic arrays, stacks, union-find), and best/average/worst-case reasoning.
---

::widget Scene {"title": "The recursion tree for merge sort", "sub": "T(n) = 2T(n/2) + n — count the work level by level", "nodes": [{"id": "r", "kind": "node", "label": "n", "x": 6.0, "y": -6.0, "size": 1.9}, {"id": "a", "kind": "node", "label": "n/2", "x": 6.1, "y": 0.1, "size": 1.9}, {"id": "bb", "kind": "node", "label": "n/2", "x": 12.1, "y": -5.9, "size": 1.9}, {"id": "c", "kind": "node", "label": "n/4", "x": 7.7, "y": 4.7, "size": 1.9}, {"id": "d", "kind": "node", "label": "n/4", "x": 10.7, "y": 1.7, "size": 1.9}, {"id": "e", "kind": "node", "label": "n/4", "x": 13.7, "y": -1.3, "size": 1.9}, {"id": "f", "kind": "node", "label": "n/4", "x": 16.7, "y": -4.3, "size": 1.9}], "links": [["r", "a"], ["r", "bb"], ["a", "c"], ["a", "d"], ["bb", "e"], ["bb", "f"]], "metrics": [["level", "Level"], ["work", "Work at this level"], ["total", "Total"]], "steps": [{"short": "Rec", "tag": "Recurrence", "title": "Merge sort: two half-size subproblems + n work to merge", "body": "<p>T(n) = 2T(n/2) + n.</p>", "show": ["r"], "metrics": {"level": ["0"], "work": ["n"], "total": ["—"]}}, {"short": "L1", "tag": "Level 1", "title": "Level 1: two calls of size n/2, each doing n/2 merge work", "body": "<p>2 × n/2 = n.</p>", "show": ["r", "a", "bb"], "metrics": {"level": ["1"], "work": ["n"]}}, {"short": "L2", "tag": "Level 2", "title": "Level 2: four calls of n/4 → n again", "body": "<p>The number of calls doubles while the size halves — work per level stays n.</p>", "show": ["r", "a", "bb", "c", "d", "e", "f"], "metrics": {"level": ["2"], "work": ["n"]}}, {"short": "Depth", "tag": "Depth", "title": "Sizes halve until 1: log₂ n levels", "body": "<p>n → n/2 → … → 1.</p>", "metrics": {"level": ["log₂ n levels"]}}, {"short": "Sum", "tag": "Total", "title": "Total = n per level × log n levels = O(n log n)", "body": "<p>Master theorem case 2: a = 2, b = 2, f(n) = n = n^(log₂2).</p>", "metrics": {"total": ["O(n log n)", "good"]}}, {"short": "Case1", "tag": "Case 1", "title": "If leaves dominate: T(n) = 8T(n/2) + n² → n^(log₂8) = n³ wins", "body": "<p>Work grows down the tree; the leaves (n³ of them in total cost) dominate → O(n³).</p>"}, {"short": "Case3", "tag": "Case 3", "title": "If the root dominates: T(n) = 2T(n/2) + n² → O(n²)", "body": "<p>Work shrinks down the tree; the top level's n² dominates.</p>"}, {"short": "Rule", "tag": "Rule", "title": "Compare f(n) with n^(log_b a)", "body": "<p>Smaller → leaves win; equal → multiply by log n; larger → root wins.</p>", "note": {"kind": "key", "text": "T(n) = aT(n/b) + f(n): compare f(n) with n^(log_b a). Recursion trees make it visual: work per level × number of levels."}}]}

## When you can't just count loops

"Two nested loops → O(n²)" works for simple code. Recursive algorithms, data structures with occasional expensive operations, and clever loops need more careful tools. Interviewers ask "what's the complexity?" after every solution — and sometimes "prove it".

## Recurrences

Write the running time of a recursive function in terms of itself:

| Algorithm | Recurrence | Result |
|---|---|---|
| Binary search | T(n) = T(n/2) + O(1) | O(log n) |
| Merge sort | T(n) = 2T(n/2) + O(n) | O(n log n) |
| Tree traversal | T(n) = 2T(n/2) + O(1) | O(n) |
| Karatsuba multiplication | T(n) = 3T(n/2) + O(n) | O(n^1.585) |
| Naive Fibonacci | T(n) = T(n−1) + T(n−2) + O(1) | O(φⁿ) ≈ O(1.618ⁿ) |
| Quick sort, worst case | T(n) = T(n−1) + O(n) | O(n²) |

## The recursion-tree method

Draw the calls as a tree. At each level, add up the non-recursive work; multiply by (or sum over) the number of levels. It's how the Master Theorem is derived, and it works for uneven splits too.

## The Master Theorem

For **T(n) = a·T(n/b) + f(n)** with a ≥ 1, b > 1, compare f(n) to **n^(log_b a)** (the total work at the leaves):

1. **f(n) is polynomially smaller** → T(n) = Θ(n^(log_b a)). *Leaves dominate.* Example: 8T(n/2) + n² → Θ(n³).
2. **f(n) is the same order** (Θ(n^(log_b a))) → T(n) = Θ(n^(log_b a) · log n). *Every level equal.* Examples: merge sort, binary search.
3. **f(n) is polynomially larger** (and a regularity condition holds) → T(n) = Θ(f(n)). *Root dominates.* Example: 2T(n/2) + n² → Θ(n²).

It doesn't apply to recurrences like T(n) = T(n−1) + n (subtracting, not dividing) — solve those by summing: n + (n−1) + … = O(n²) — or to uneven splits like T(n) = T(n/3) + T(2n/3) + n (use a recursion tree: O(n log n)).

## Amortised analysis

Some operations are usually cheap and occasionally expensive. **Amortised cost** is the average cost per operation over any sequence — a guarantee, not a probability.

### Dynamic array append

Appending is O(1) until the array is full; then it doubles, copying everything. Over n appends, copies total 1 + 2 + 4 + … + n < 2n. So n appends cost O(n) in total: **O(1) amortised** each.

### Three methods

- **Aggregate:** total cost of n operations ÷ n (as above).
- **Accounting (banker's):** charge each cheap operation a little extra "credit" (say 3 units per append) and spend saved credit on the expensive ones. If the bank never goes negative, the charge is a valid amortised cost.
- **Potential:** define a potential function Φ of the data structure (e.g. 2 × size − capacity); amortised cost = actual cost + ΔΦ.

Other examples: a queue built from two stacks (each element moved at most once: O(1) amortised), the monotonic stack/deque (each element pushed and popped once), **union-find** with path compression and union by rank (nearly O(1) — inverse Ackermann).

## Best, average, worst — and expected

- **Worst case:** the guarantee (quick sort O(n²)).
- **Average case:** over a distribution of inputs (quick sort O(n log n) on random inputs).
- **Expected:** over the algorithm's own random choices, for *every* input (randomised quick sort, hash tables with random seeds).
- **Amortised:** over a sequence of operations, worst case guaranteed.

## Space complexity

Count extra memory, including the **recursion stack**: recursive DFS on a path-shaped tree uses O(n) stack; merge sort uses O(n) auxiliary arrays plus O(log n) stack.

> [!RECAP]
> - Express recursive algorithms as recurrences; draw recursion trees.
> - **Master Theorem:** compare f(n) with n^(log_b a) — leaves, equal (× log n), or root.
> - Subtractive or uneven recurrences need summation or recursion trees.
> - **Amortised** = guaranteed average over sequences: dynamic arrays, two-stack queues, monotonic structures, union-find.
> - Distinguish worst, average, expected and amortised; count stack space.

> [!INTERVIEW] "What's the complexity of this recursive function?", "Why is ArrayList.add O(1)?", "Solve T(n) = 3T(n/2) + n", "What's the space complexity of recursive DFS?", "Average vs amortised?"

::quiz {"q": "T(n) = 2T(n/2) + n solves to…", "options": ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], "answer": 1, "explain": "Master theorem case 2 (merge sort)."}

::quiz {"q": "T(n) = 4T(n/2) + n solves to…", "options": ["O(n log n)", "O(n²)", "O(n)", "O(n³)"], "answer": 1, "explain": "n^(log₂4) = n² dominates f(n) = n."}

::quiz {"q": "Why is appending to a doubling dynamic array O(1) amortised?", "options": ["Copies never happen", "Total copying over n appends is less than 2n", "It uses linked lists", "The OS handles it"], "answer": 1, "explain": "Doubling makes expensive copies rare."}
