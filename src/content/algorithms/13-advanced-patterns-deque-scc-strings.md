---
title: Advanced Patterns: Monotonic Deque, Strongly Connected Components, Bridges and String Matching
summary: Interview patterns that go beyond the basics: the monotonic deque for sliding-window maximum, strongly connected components with Kosaraju and Tarjan, bridges and articulation points, and linear-time string matching with KMP and the Z-algorithm, each with when to recognise it.
---

::widget Scene {"title": "Sliding-window maximum with a monotonic deque", "sub": "nums = [1, 3, −1, −3, 5, 3, 6, 7], k = 3", "nodes": [{"id": "a", "kind": "cells", "label": "nums (index 0–7)", "x": 0.0, "y": 0.0, "values": [1, 3, -1, -3, 5, 3, 6, 7]}, {"id": "dq", "kind": "cells", "label": "deque of indices (values decreasing)", "x": 5.27, "y": 5.27, "values": ["", "", ""]}, {"id": "out", "kind": "cells", "label": "window maxima", "x": 9.92, "y": 9.92, "values": ["", "", "", "", "", ""]}], "metrics": [["win", "Window"], ["dq", "Deque (values)"], ["max", "Max"]], "steps": [{"short": "Idea", "tag": "Idea", "title": "Keep indices whose values are decreasing from front to back", "body": "<p>The front is always the current maximum. Anything smaller than a newer element can never be a maximum again, throw it away.</p>", "metrics": {"win": ["-"], "dq": ["-"], "max": ["-"]}}, {"short": "i0", "tag": "Push", "title": "i=0 (1): push", "body": "<p>Deque: [1].</p>", "set": {"a": {"marks": {"0": "blue"}, "ptr": {"i": 0}}, "dq": {"marks": {}, "ptr": {}, "values": [1, "", ""]}}, "metrics": {"dq": ["1"]}}, {"short": "i1", "tag": "Pop smaller", "title": "i=1 (3): 1 < 3, pop it; push 3", "body": "<p>1 can never be a max while 3 is in the window.</p>", "set": {"a": {"marks": {"1": "blue"}, "ptr": {"i": 1}}, "dq": {"marks": {}, "ptr": {}, "values": [3, "", ""]}}, "metrics": {"dq": ["3"]}}, {"short": "i2", "tag": "Push", "title": "i=2 (−1): smaller than 3, push. Window [0..2] full → max = front = 3", "body": "<p>First output.</p>", "set": {"a": {"marks": {"0": "orange", "1": "orange", "2": "orange"}, "ptr": {"i": 2}}, "dq": {"marks": {"0": "green"}, "ptr": {}, "values": [3, -1, ""]}, "out": {"marks": {"0": "green"}, "ptr": {}, "values": [3, "", "", "", "", ""]}}, "metrics": {"win": ["1, 3, −1"], "dq": ["3, −1"], "max": ["3"]}}, {"short": "i3", "tag": "Push", "title": "i=3 (−3): push → [3, −1, −3]; max 3", "body": "<p>3 is still inside the window [1..3].</p>", "set": {"a": {"marks": {"1": "orange", "2": "orange", "3": "orange"}, "ptr": {"i": 3}}, "dq": {"marks": {"0": "green"}, "ptr": {}, "values": [3, -1, -3]}, "out": {"marks": {"1": "green"}, "ptr": {}, "values": [3, 3, "", "", "", ""]}}, "metrics": {"win": ["3, −1, −3"], "dq": ["3, −1, −3"], "max": ["3"]}}, {"short": "i4", "tag": "Expire + pop", "title": "i=4 (5): front index 1 left the window → drop; 5 beats −1 and −3 → pop both", "body": "<p>Deque: [5]. Max 5.</p>", "set": {"a": {"marks": {"2": "orange", "3": "orange", "4": "orange"}, "ptr": {"i": 4}}, "dq": {"marks": {"0": "green"}, "ptr": {}, "values": [5, "", ""]}, "out": {"marks": {"2": "green"}, "ptr": {}, "values": [3, 3, 5, "", "", ""]}}, "metrics": {"win": ["−1, −3, 5"], "dq": ["5"], "max": ["5"]}}, {"short": "i5", "tag": "Push", "title": "i=5 (3): push → [5, 3]; max 5", "body": "<p>Output: 3, 3, 5, 5.</p>", "set": {"a": {"marks": {"3": "orange", "4": "orange", "5": "orange"}, "ptr": {"i": 5}}, "dq": {"marks": {"0": "green"}, "ptr": {}, "values": [5, 3, ""]}, "out": {"marks": {"3": "green"}, "ptr": {}, "values": [3, 3, 5, 5, "", ""]}}, "metrics": {"dq": ["5, 3"], "max": ["5"]}}, {"short": "i6", "tag": "Pop smaller", "title": "i=6 (6): pops 3 and 5 → [6]; max 6", "body": "<p>i=7 (7): pops 6 → [7]; max 7.</p>", "set": {"a": {"marks": {"5": "orange", "6": "orange", "7": "orange"}, "ptr": {"i": 7}}, "dq": {"marks": {"0": "green"}, "ptr": {}, "values": [7, "", ""]}, "out": {"marks": {"4": "green", "5": "green"}, "ptr": {}, "values": [3, 3, 5, 5, 6, 7]}}, "metrics": {"win": ["3, 6, 7"], "dq": ["7"], "max": ["3 3 5 5 6 7", "good"]}}, {"short": "Cost", "tag": "Complexity", "title": "O(n): every index is pushed once and popped at most once", "body": "<p>A heap would be O(n log k).</p>", "note": {"kind": "key", "text": "Monotonic deque: pop expired indices from the front, pop smaller values from the back, push, read the front. Each element enters and leaves once."}}]}

## Patterns that separate strong candidates

The basic patterns (two pointers, sliding window, BFS/DFS, heaps, DP) cover most interview problems. A handful of advanced patterns appear in harder rounds, and each one turns a problem that looks O(n²) or worse into O(n).

## Monotonic deque: sliding-window maximum

**Problem shape:** "maximum (or minimum) of every window of size k", "longest subarray where max − min ≤ limit", "shortest subarray with sum ≥ K" (with prefix sums).

Keep a double-ended queue of **indices** whose values are monotonic (decreasing for maximum):

```python
from collections import deque
def max_sliding_window(nums, k):
    dq, out = deque(), []
    for i, x in enumerate(nums):
        if dq and dq[0] <= i - k: dq.popleft()          # expired
        while dq and nums[dq[-1]] <= x: dq.pop()        # can never be max again
        dq.append(i)
        if i >= k - 1: out.append(nums[dq[0]])
    return out
```

Each index is pushed and popped at most once: **O(n)**. It's the windowed cousin of the monotonic stack (next greater element).

## Strongly connected components

In a **directed** graph, an SCC is a maximal set of vertices where every vertex can reach every other. Uses: finding cycles of dependencies, condensing a graph into a DAG, 2-SAT, detecting groups of mutually linked web pages.

**Kosaraju's algorithm (O(V + E)):**

1. DFS the graph, recording vertices in order of **finish time**.
2. **Reverse** all edges.
3. DFS the reversed graph in **decreasing finish time**; each DFS tree is one SCC.

**Tarjan's algorithm** does it in one DFS, tracking for each vertex its discovery index and **low-link** (the smallest index reachable from its subtree via the stack); when `low[v] == index[v]`, pop the stack to emit an SCC.

## Bridges and articulation points

In an **undirected** graph:

- A **bridge** is an edge whose removal disconnects the graph.
- An **articulation point** is a vertex whose removal disconnects it.

They identify single points of failure in networks. Using DFS with discovery time `tin[v]` and `low[v]` = earliest discovery time reachable from v's subtree with one back edge:

- Edge (v, child) is a bridge if `low[child] > tin[v]`.
- Non-root v is an articulation point if some child has `low[child] >= tin[v]`; the root is one if it has two or more DFS children.

Interview example: "critical connections in a network" (LeetCode 1192) is exactly bridges.

## KMP: string matching without backtracking

Naive search for a pattern of length m in text of length n is O(n·m). **Knuth–Morris–Pratt** precomputes, for each prefix of the pattern, the length of the longest proper prefix that is also a suffix (the **failure function** or LPS array). On a mismatch, it jumps the pattern forward using this table instead of re-reading text: **O(n + m)**.

```python
def lps(p):
    t, k = [0] * len(p), 0
    for i in range(1, len(p)):
        while k and p[i] != p[k]: k = t[k - 1]
        if p[i] == p[k]: k += 1
        t[i] = k
    return t
# lps("ABABC") == [0, 0, 1, 2, 0]
```

The LPS array also solves "shortest palindrome" and "repeated substring pattern".

## The Z-algorithm

`Z[i]` = length of the longest substring starting at i that matches a prefix of the string. Computed in O(n) by reusing a window [l, r] of the rightmost match. To find a pattern: compute Z on `pattern + "$" + text`; positions where `Z[i] == len(pattern)` are matches.

## Rabin–Karp, briefly

A **rolling hash** lets you compare a window's hash to the pattern's in O(1) as the window slides, O(n + m) expected. Useful for multiple patterns and "longest duplicate substring" with binary search. Verify matches to rule out collisions.

## Recognising the pattern

| Clue in the problem | Pattern |
|---|---|
| max/min of every window | monotonic deque |
| "groups that can all reach each other" in a directed graph | SCC |
| "critical" edges or nodes | bridges / articulation points |
| find a pattern in a string, prefix = suffix | KMP / Z |
| compare many substrings quickly | rolling hash |

> [!RECAP]
> - **Monotonic deque** → sliding-window extremes in O(n).
> - **Kosaraju/Tarjan** → SCCs in O(V + E); condense to a DAG.
> - **Bridges/articulation points** via DFS low-link values.
> - **KMP** (LPS array) and **Z-algorithm** → linear-time pattern matching; Rabin–Karp with rolling hashes.

> [!INTERVIEW] Classic problems: Sliding Window Maximum (239), Longest Continuous Subarray With Absolute Diff ≤ Limit (1438), Critical Connections (1192), Find the Index of the First Occurrence (28) with KMP, Shortest Palindrome (214), Course Schedule variants with cycle detection.

::quiz {"q": "Why is the sliding-window maximum with a deque O(n)?", "options": ["It sorts each window", "Each index is pushed and popped at most once", "It uses binary search", "k is constant"], "answer": 1, "explain": "Amortised constant work per element."}

::quiz {"q": "In an undirected graph, an edge (v, c) is a bridge when…", "options": ["tin[c] < tin[v]", "low[c] > tin[v]", "v has two children", "the graph is a tree only"], "answer": 1, "explain": "c's subtree can't reach v or above without that edge."}

::quiz {"q": "What does KMP's LPS array store for each prefix?", "options": ["Its hash", "The length of the longest proper prefix that is also a suffix", "Its number of vowels", "Its position in the text"], "answer": 1, "explain": "It tells how far to shift on mismatch."}
