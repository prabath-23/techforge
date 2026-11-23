---
title: Advanced Dynamic Programming — Knapsack, Intervals, Trees, Bitmasks and Digits
summary: The DP families that show up in harder interviews, each with its state, transition and a recognisable clue: 0/1 and unbounded knapsack, longest increasing subsequence in O(n log n), interval DP (burst balloons, matrix chains), DP on trees, bitmask DP for small sets (travelling salesman), and digit DP for counting numbers with properties.
---

::widget Scene {"title": "0/1 knapsack in one array", "sub": "capacity 5; items A (w1, ₹1), B (w3, ₹4), C (w4, ₹5)", "nodes": [{"id": "dp", "kind": "cells", "label": "dp[c] = best value with capacity c", "x": 3.1, "y": 3.1, "values": [0, 0, 0, 0, 0, 0]}], "metrics": [["item", "Item"], ["rule", "Transition"], ["best", "dp[5]"]], "steps": [{"short": "State", "tag": "State", "title": "dp[c] = best value achievable with capacity c using items seen so far", "body": "<p>Start with no items: all zeros.</p>", "metrics": {"item": ["—"], "rule": ["dp[c] = max(dp[c], dp[c−w] + v)"], "best": ["0"]}}, {"short": "Back", "tag": "Order", "title": "Loop capacity from HIGH to LOW for 0/1 knapsack", "body": "<p>So dp[c − w] still refers to the previous items — each item used at most once. (Low to high = unbounded knapsack.)</p>"}, {"short": "A", "tag": "Item A", "title": "Item A (w1, ₹1): every capacity ≥ 1 can hold it", "body": "<p>dp = [0, 1, 1, 1, 1, 1].</p>", "set": {"dp": {"marks": {"1": "blue", "2": "blue", "3": "blue", "4": "blue", "5": "blue"}, "ptr": {}, "values": [0, 1, 1, 1, 1, 1]}}, "metrics": {"item": ["A"], "best": ["1"]}}, {"short": "B5", "tag": "Item B", "title": "Item B (w3, ₹4): c=5 → max(1, dp[2] + 4 = 5) = 5", "body": "<p>A + B fits in 5.</p>", "set": {"dp": {"marks": {"5": "green", "2": "orange"}, "ptr": {"c": 5}, "values": [0, 1, 1, 1, 1, 5]}}, "metrics": {"item": ["B"], "best": ["5"]}}, {"short": "B4", "tag": "Item B", "title": "c=4 → max(1, dp[1] + 4) = 5; c=3 → max(1, dp[0] + 4) = 4", "body": "<p>dp = [0, 1, 1, 4, 5, 5].</p>", "set": {"dp": {"marks": {"3": "green", "4": "green"}, "ptr": {}, "values": [0, 1, 1, 4, 5, 5]}}}, {"short": "C5", "tag": "Item C", "title": "Item C (w4, ₹5): c=5 → max(5, dp[1] + 5 = 6) = 6", "body": "<p>A + C beats A + B.</p>", "set": {"dp": {"marks": {"5": "green", "1": "orange"}, "ptr": {"c": 5}, "values": [0, 1, 1, 4, 5, 6]}}, "metrics": {"item": ["C"], "best": ["6", "good"]}}, {"short": "C4", "tag": "Item C", "title": "c=4 → max(5, dp[0] + 5) = 5 (tie)", "body": "<p>Final: [0, 1, 1, 4, 5, 6]. Answer ₹6.</p>", "set": {"dp": {"marks": {"4": "blue"}, "ptr": {}, "values": [0, 1, 1, 4, 5, 6]}}}, {"short": "Cost", "tag": "Complexity", "title": "O(n × capacity) time, O(capacity) space", "body": "<p>Pseudo-polynomial: fine when capacity is small (≤ ~10⁵).</p>", "note": {"kind": "key", "text": "0/1 knapsack: iterate items, capacity downward, dp[c] = max(dp[c], dp[c−w] + v). Upward iteration allows reuse (unbounded)."}}]}

## When basic DP isn't enough

The basic DP chapter covered memoisation, coin change, grid paths and edit distance. Harder interviews use a few more families. Recognising the family is most of the battle: once you know the **state** and **transition**, the code is short.

## Knapsack family

- **0/1 knapsack** — each item once (see lesson). Loop capacity **downwards**.
- **Unbounded knapsack** — unlimited copies (coin change). Loop capacity **upwards**.
- **Subset sum / partition equal subset sum** — boolean knapsack: can we reach exactly target?
- **Counting** variants: number of ways (sum instead of max).

Clue: "choose items with a budget/limit to maximise/count something".

## Longest increasing subsequence in O(n log n)

The O(n²) DP (`lis[i] = 1 + max(lis[j])` for j < i with smaller value) is standard. The faster method keeps `tails[k]` = smallest possible tail of an increasing subsequence of length k+1; for each number, binary-search the first tail ≥ it and replace it (or append):

```python
import bisect
def lis(nums):
    tails = []
    for x in nums:
        i = bisect.bisect_left(tails, x)
        tails[i:i + 1] = [x]
    return len(tails)
```

Variants: Russian doll envelopes (sort by width, then LIS on heights with ties sorted descending), longest chain of pairs.

## Interval DP

State over a **range** `dp[i][j]` = best answer for the subarray/substring i..j, computed by trying every split point k. Fill by increasing length.

- **Matrix chain multiplication**, **burst balloons** (choose which balloon bursts *last* in the range), **minimum cost to merge stones**, **palindrome partitioning**, **longest palindromic subsequence**.

Clue: "combine/remove elements in a sequence, cost depends on neighbours or ranges". Complexity is usually O(n³).

## DP on trees

Do a DFS; each node's answer is computed from its children's answers.

- **House robber III:** for each node return (best if robbed, best if not robbed).
- **Diameter of a tree:** at each node, combine the two deepest child paths.
- **Maximum path sum**, minimum cameras to cover a tree, counting subtrees.

Clue: a tree and a choice per node that depends on parent/child choices. Return a small tuple of states per node.

## Bitmask DP

When the set of things is small (n ≤ ~20), represent "which items are used" as a bitmask and use it as part of the state.

- **Travelling salesman:** `dp[mask][last]` = shortest path visiting exactly the cities in mask and ending at last. Transition: add an unvisited city. O(2ⁿ · n²).
- **Assigning n tasks to n people**, **shortest path visiting all nodes**, **partition into k equal subsets**.

Clue: n ≤ 20 and "all permutations" or "every subset" would be too slow.

## Digit DP

Count numbers in [0, N] with a property (digit sum = S, no two equal adjacent digits, contains digit 7). Process N's digits from most significant, with state `(position, tight, extra info)` where **tight** says whether the prefix so far equals N's prefix (limiting the next digit). Answer for [L, R] = count(R) − count(L − 1).

## A method for any DP

1. Define the **state** in words ("best value using the first i items with capacity c").
2. Write the **transition** — what choice do you make at this state?
3. **Base cases.**
4. Choose an **order** where dependencies are computed first (or memoise recursion).
5. **Optimise space** if only the previous row/column is needed.
6. **Reconstruct** the choices if the problem asks for them.

> [!RECAP]
> - Knapsack: downward for 0/1, upward for unbounded; boolean and counting variants.
> - LIS in O(n log n) with tails + binary search.
> - Interval DP over ranges with a split point; tree DP returns per-node state tuples.
> - Bitmask DP for n ≤ 20 subsets; digit DP with a "tight" flag for counting numbers.
> - Always: state, transition, base case, order, space, reconstruction.

> [!INTERVIEW] Partition Equal Subset Sum (416), LIS (300), Russian Doll Envelopes (354), Burst Balloons (312), House Robber III (337), Shortest Path Visiting All Nodes (847), Numbers With Repeated Digits (1012).

::quiz {"q": "In 0/1 knapsack with a 1-D array, why iterate capacity from high to low?", "options": ["It is faster", "So each item is used at most once (dp[c−w] still reflects previous items)", "To sort items", "It saves memory"], "answer": 1, "explain": "Low to high would allow reuse — unbounded knapsack."}

::quiz {"q": "n = 18 cities, visit all with the shortest path. Which technique?", "options": ["Greedy nearest neighbour (exact)", "Bitmask DP over visited sets", "Binary search", "Union-find"], "answer": 1, "explain": "O(2ⁿ·n²) is feasible for n ≤ ~20."}

::quiz {"q": "What does the \"tight\" flag in digit DP mean?", "options": ["The number is prime", "The digits chosen so far equal the bound's prefix, so the next digit is limited", "The DP table is full", "Leading zeros are present"], "answer": 1, "explain": "Once you go below the bound, later digits are free."}
