---
title: Segment Trees, Fenwick Trees and Range Queries
summary: Answering questions about ranges of an array — "what's the sum, minimum or maximum between positions i and j?" — while the array keeps changing. Prefix sums for static data, sparse tables, Fenwick (binary indexed) trees in a few lines of code, segment trees step by step, lazy propagation for range updates, and where these show up in real systems.
---

## The leaderboard that kept changing

> [!STORY] A trading dashboard shows, for any time window the user drags across a chart, the total volume traded and the highest price. Prices arrive thousands of times per second, and users constantly move their windows. Recomputing each answer by looping over the window takes O(n) per query — too slow with millions of data points. Precomputing all answers is impossible because the data keeps changing. The right data structure answers both "update one value" and "query any range" in **O(log n)**.

## Static data: prefix sums

If the array **never changes**, precompute running totals:

```python
prefix = [0]
for x in arr:
    prefix.append(prefix[-1] + x)
range_sum = lambda i, j: prefix[j + 1] - prefix[i]     # sum of arr[i..j] in O(1)
```

> [!ANALOGY] A car's odometer. To know how far you drove between Pune and Mumbai, you don't re-measure the road; you subtract the odometer reading at Pune from the reading at Mumbai.

Prefix sums also work in 2D (sum of any rectangle in an image) and with hash maps for "count subarrays summing to k" (Algorithms track). But a single update forces O(n) recomputation.

For **minimum/maximum** on static data, a **sparse table** precomputes answers for every range whose length is a power of two, then answers any query in O(1) by combining two overlapping ones. O(n log n) to build.

## Changing data: the trade-off

| Approach | Update one element | Range query |
|---|---|---|
| Plain array | O(1) | O(n) |
| Prefix sums | O(n) | O(1) |
| **Fenwick tree** | **O(log n)** | **O(log n)** (sums and similar) |
| **Segment tree** | **O(log n)** | **O(log n)** (sum, min, max, gcd, custom) |

## Fenwick tree (binary indexed tree)

A **Fenwick tree** stores partial sums cleverly so that both updates and prefix queries touch only O(log n) cells. Its magic is the bit trick `i & -i` (chapter 7), which gives the size of the block each cell is responsible for.

```python
class Fenwick:
    def __init__(self, n):
        self.tree = [0] * (n + 1)          # 1-indexed

    def add(self, i, delta):               # arr[i] += delta
        i += 1
        while i < len(self.tree):
            self.tree[i] += delta
            i += i & -i                    # move to the next block that covers i

    def prefix(self, i):                   # sum of arr[0..i]
        i += 1; s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & -i                    # jump to the previous block
        return s

    def range_sum(self, l, r):
        return self.prefix(r) - (self.prefix(l - 1) if l else 0)
```

Cell `i` holds the sum of a block ending at `i` whose length is the lowest set bit of `i`: cell 12 (`1100`) covers 4 elements, cell 13 (`1101`) covers 1. A prefix query walks down by stripping the lowest bit; an update walks up by adding it.

Fenwick trees are tiny, fast and cache-friendly — ideal for sums and counts. They're awkward for min/max (which can't be "subtracted").

> [!EXAMPLE] **Counting inversions.** How many pairs (i < j) have `arr[i] > arr[j]`? Walk left to right; for each value, ask the Fenwick tree "how many values greater than this have I seen?" and then add this value. O(n log n). The same idea ranks players live: "how many players have a higher score than me?" with point updates as scores change.

## Segment tree

A **segment tree** is a binary tree where each node stores the answer (sum, min, max…) for a range of the array. The root covers everything; each child covers half of its parent's range; leaves are single elements.

::widget Stepper {"type":"tree","title":"A segment tree for sums over [5, 2, 8, 1, 9, 3, 7, 4]","what":"Each box stores the sum of the range in brackets. To answer a query, combine the fewest boxes that exactly cover the range.","steps":["Click the root, then explore the children.","Find the boxes that together cover positions 2..5 (values 8, 1, 9, 3).","Count how many boxes you needed — that's why queries are O(log n)."],"nodes":[["[0..7] sum = 39","The root: the whole array."],["[0..3] sum = 16","Left half: 5 + 2 + 8 + 1."],["[4..7] sum = 23","Right half: 9 + 3 + 7 + 4."],["[2..3] sum = 9","Covers positions 2 and 3 (8 + 1) — fully inside the query 2..5, so use it whole."],["[0..1] sum = 7","Outside the query range 2..5 — skip."],["[4..5] sum = 12","Covers positions 4 and 5 (9 + 3) — fully inside the query. Answer: 9 + 12 = 21, from just two boxes."],["[6..7] sum = 11","Outside the query — skip."]]}

```python
class SegTree:
    def __init__(self, arr, combine=lambda a, b: a + b, identity=0):
        self.n, self.f, self.id = len(arr), combine, identity
        self.t = [identity] * (2 * self.n)
        self.t[self.n:] = arr                               # leaves at n..2n-1
        for i in range(self.n - 1, 0, -1):                  # build parents
            self.t[i] = self.f(self.t[2 * i], self.t[2 * i + 1])

    def update(self, i, value):                             # arr[i] = value
        i += self.n; self.t[i] = value
        while i > 1:
            i //= 2
            self.t[i] = self.f(self.t[2 * i], self.t[2 * i + 1])

    def query(self, l, r):                                  # combine arr[l..r]
        resl, resr = self.id, self.id
        l += self.n; r += self.n + 1
        while l < r:
            if l & 1: resl = self.f(resl, self.t[l]); l += 1
            if r & 1: r -= 1; resr = self.f(self.t[r], resr)
            l //= 2; r //= 2
        return self.f(resl, resr)

prices = SegTree([101, 99, 105, 98], combine=max, identity=float("-inf"))
prices.query(1, 3)      # 105 — highest price in the window
prices.update(2, 97)    # a new price arrives
```

This compact **iterative** version works for any **associative** combine function: sum, min, max, gcd, product modulo m, or even merging small structs (e.g. "maximum subarray sum within the range").

### Lazy propagation: updating whole ranges

What if updates cover ranges too — "add 10 to every element in positions 100..900"? Updating each leaf would be O(n). **Lazy propagation** stores a pending update at the highest nodes that fully cover the range and pushes it down to children only when a later query or update needs to go deeper. Both range updates and range queries stay O(log n).

> [!ANALOGY] A manager told "give everyone in the sales department a ₹5,000 bonus" doesn't visit each employee's desk. They write one note on the sales department's folder. Only when someone asks for a specific employee's pay does the note get applied to that person's record.

## Where these structures appear

- **Competitive programming and interviews:** range sum/min queries with updates, counting inversions, "count of smaller numbers after self", skyline and interval problems.
- **Time-series and monitoring:** rolling aggregates over windows of metrics.
- **Databases and storage:** B-tree nodes often store counts of entries beneath them ("order statistics") so `OFFSET 100000` can skip efficiently; interval trees index time ranges.
- **Graphics and games:** collision detection uses related spatial trees (quadtrees, BVH).
- **Scheduling and allocation:** finding the first free slot of size ≥ k uses segment trees storing the longest free run in each range.

> [!RECAP]
> - **Prefix sums** answer static range sums in O(1); **sparse tables** answer static range min/max in O(1).
> - With updates, use **Fenwick trees** (sums/counts; tiny code using `i & -i`) or **segment trees** (any associative operation), both O(log n) per update and query.
> - A segment tree combines O(log n) precomputed nodes to cover any range.
> - **Lazy propagation** makes range updates O(log n) too.

> [!INTERVIEW] Recognize the signal: "many range queries **and** updates" → Fenwick or segment tree. Know how to build a segment tree, why queries take O(log n), and when a simple prefix sum is enough.

::quiz {"q":"The array never changes and you need many range-sum queries. What's simplest?","options":["Segment tree","Prefix sums — O(1) per query","Fenwick tree","Sort the array"],"answer":1,"explain":"No updates, no need for a tree."}

::quiz {"q":"Which structure supports range MINIMUM queries with point updates in O(log n)?","options":["Prefix sums","Fenwick tree (naturally)","Segment tree","Hash map"],"answer":2,"explain":"Min can't be subtracted, so Fenwick trees don't fit naturally; segment trees handle any associative operation."}

::quiz {"q":"What does lazy propagation enable?","options":["Faster builds","Range updates (like adding to every element in a range) in O(log n)","Sorting in O(n)","Persistent storage"],"answer":1,"explain":"Pending updates are stored high in the tree and pushed down only when needed."}
