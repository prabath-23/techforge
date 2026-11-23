---
title: Solving Interview Problems: A Repeatable Method with 50 Worked Examples
summary: A step-by-step method for any coding problem, understand, examine examples, find the brute force, spot the pattern, optimize, code cleanly, test, the signals that point to each pattern, three problems worked through in full, and 50 classic problems mapped to their pattern and the single key insight that cracks each one.
---

::widget Scene {"title": "A method for any coding interview problem", "sub": "worked live on Two Sum: [2, 7, 11, 15], target 9", "nodes": [{"id": "a", "kind": "cells", "label": "nums", "x": 0.0, "y": 0.0, "values": [2, 7, 11, 15]}, {"id": "m", "kind": "cells", "label": "hash map (value → index)", "x": 5.58, "y": 5.58, "values": ["", "", "", ""]}], "metrics": [["stage", "Stage"], ["cx", "Complexity"], ["note", "Say out loud"]], "steps": [{"short": "Clarify", "tag": "1 Clarify", "title": "Restate and ask questions", "body": "<p>Exactly one answer? Can I use the same element twice? Negative numbers? Return indices or values? Empty array?</p>", "show": ["a"], "metrics": {"stage": ["clarify"], "cx": ["-"], "note": ["\"Return the two indices, one solution guaranteed\""]}}, {"short": "Examples", "tag": "2 Examples", "title": "Work an example by hand, plus an edge case", "body": "<p>[2, 7, 11, 15], 9 → [0, 1]. [3, 3], 6 → [0, 1] (duplicates).</p>", "set": {"a": {"marks": {"0": "green", "1": "green"}, "ptr": {}}}, "metrics": {"stage": ["examples"]}}, {"short": "Brute", "tag": "3 Brute force", "title": "State the brute force first", "body": "<p>Check every pair: O(n²) time, O(1) space. It proves you understand the problem and gives a baseline.</p>", "metrics": {"stage": ["brute force"], "cx": ["O(n²)"], "note": ["\"Can we do better?\""]}}, {"short": "Insight", "tag": "4 Optimise", "title": "Bottleneck: for each x, finding 9 − x takes a scan", "body": "<p>Fast lookup → hash map. One pass: check if the complement was seen; otherwise remember x.</p>", "show": ["a", "m"], "metrics": {"stage": ["optimise"], "cx": ["O(n) time, O(n) space"]}}, {"short": "Run1", "tag": "5 Trace", "title": "i=0: need 7, not in map. Store 2 → 0", "body": "<p>Trace the algorithm before coding.</p>", "set": {"a": {"marks": {"0": "orange"}, "ptr": {"i": 0}}, "m": {"marks": {"0": "blue"}, "ptr": {}, "values": ["2→0", "", "", ""]}}, "metrics": {"stage": ["trace"]}}, {"short": "Run2", "tag": "5 Trace", "title": "i=1: need 2, it's in the map at index 0 → [0, 1]", "body": "<p>Found in one pass.</p>", "set": {"a": {"marks": {"0": "green", "1": "green"}, "ptr": {"i": 1}}, "m": {"marks": {"0": "green"}, "ptr": {}, "values": ["2→0", "", "", ""]}}, "metrics": {"note": ["\"[0, 1]\""]}}, {"short": "Code", "tag": "6 Code", "title": "Write clean code with good names", "body": "<p>Check the complement before inserting, that handles [3, 3] correctly and avoids using one element twice.</p>", "metrics": {"stage": ["code"]}}, {"short": "Test", "tag": "7 Test", "title": "Test with your examples and edge cases", "body": "<p>Walk through the code line by line with [3, 3], 6 and a case with negative numbers.</p>", "metrics": {"stage": ["test"]}}, {"short": "Analyse", "tag": "8 Analyse", "title": "State time and space complexity and trade-offs", "body": "<p>If the input were sorted, two pointers would give O(1) space.</p>", "metrics": {"stage": ["analyse"], "cx": ["O(n) / O(n)", "good"]}, "note": {"kind": "key", "text": "Clarify → examples → brute force → find the bottleneck → trace → code → test → analyse. Talk the whole way through."}}]}


::widget Scene {"title": "P vs NP: easy to check, hard to solve?", "sub": "the biggest open question in computer science", "nodes": [{"id": "p", "kind": "cube", "label": "P: solvable fast", "x": 3.1, "y": 3.1, "color": "green"}, {"id": "np", "kind": "cube", "label": "NP: checkable fast", "x": 7.6, "y": -1.4, "color": "orange"}, {"id": "npc", "kind": "cube", "label": "NP-complete", "x": 12.1, "y": -5.9, "color": "red"}], "links": [["p", "np"], ["np", "npc"]], "metrics": [["ex", "Example"]], "steps": [{"short": "P", "tag": "Easy", "title": "P: problems we can solve in polynomial time", "body": "<p>Sorting, shortest paths, matching. Solving them scales reasonably as n grows.</p>", "focus": ["p"], "metrics": {"ex": ["shortest path, sorting"]}}, {"short": "NP", "tag": "Checkable", "title": "NP: a proposed answer is quick to verify", "body": "<p>A filled-in Sudoku is easy to check; finding one may be hard. Every P problem is also in NP.</p>", "focus": ["np"], "metrics": {"ex": ["Sudoku, scheduling, route planning"]}}, {"short": "NP-complete", "tag": "Hardest", "title": "NP-complete: the hardest problems in NP", "body": "<p>Travelling salesman (decision version), SAT, graph colouring. A fast algorithm for any one of them would give fast algorithms for all of NP.</p>", "focus": ["npc"], "metrics": {"ex": ["TSP, SAT, knapsack"]}}, {"short": "So what", "tag": "Practice", "title": "If your problem is NP-complete, change the question", "body": "<p>Use approximations, heuristics, limits on input size, or solvers. Nobody knows whether P = NP, there's a $1 million prize, but almost everyone bets P ≠ NP, and modern cryptography relies on some problems being hard.</p>", "note": {"kind": "key", "text": "Recognising an NP-hard problem in an interview (\"this is the knapsack problem\") is itself a strong signal."}}]}



## Same problem, two candidates

> [!STORY] Two candidates get the same question: "Given an array of numbers and a target, return the indices of two numbers that add up to the target." The first starts typing immediately, writes nested loops, gets stuck optimizing halfway, and runs out of time with buggy code. The second spends three minutes asking questions (Can numbers repeat? Is there always a solution? Can I use the same element twice?), says "the brute force checks all pairs in O(n²)", notices "for each number I need to know whether its complement was seen, that's a hash-map lookup", writes ten clean lines, and tests them on an example with duplicates. Both knew what a hash map was. Only one had a **method**.

Interviewers aren't only checking whether you reach the answer. They're watching **how you think**: whether you clarify, reason about trade-offs, communicate, write clean code and test it. A repeatable method makes all of that visible, and stops you from freezing.

## The method

::widget Stepper {"type":"flow","cols":4,"title":"A repeatable method for any coding problem","what":"Seven steps to work through out loud in an interview. The time guides assume a 45-minute round with one medium problem.","steps":["Press Play and read each step.","Notice how much time goes into understanding before any code is written.","Practice the method on the next problem you solve, saying each step aloud."],"nodes":[["1. Understand (3–5 min)","Restate the problem in your own words. Ask about input size, value ranges, duplicates, negatives, empty input, sortedness, and what to return when there's no answer."],["2. Examples (2–3 min)","Work through a small example by hand, then an edge case. Hand-solving often reveals the pattern."],["3. Brute force (2 min)","State the simplest correct approach and its complexity. It proves you understand the problem and gives a fallback."],["4. Find the bottleneck (5–8 min)","What repeated work does the brute force do? Which pattern removes it? Use the signals table below. Agree the approach and complexity with the interviewer before coding."],["5. Code (15 min)","Clean, well-named code; helper functions for sub-steps; talk while you write. Don't optimize micro-details."],["6. Test (5 min)","Trace your code on the example line by line, then edge cases: empty, one element, all equal, maximum size. Fix bugs calmly."],["7. Analyze and extend (2 min)","State time and space complexity. Mention trade-offs and follow-ups: streaming input, much larger data, concurrency."]]}

## Signals: which pattern does this problem want?

| If the problem says… | Think about… |
|---|---|
| "sorted array", "find a pair/triplet" | **Two pointers** binary search |
| "contiguous subarray/substring", "longest/shortest window" | **Sliding window** |
| "subarray sum equals k", "range sums" | **Prefix sums** + hash map |
| "have I seen this before?", "count frequencies", "pairs that sum to" | **Hash map / set** |
| "minimum/maximum that satisfies a condition", answer is monotonic | **Binary search on the answer** |
| "next greater/smaller element", "histogram", matching brackets | **Monotonic stack** / stack |
| "top k", "k-th largest", "merge k sorted", "running median" | **Heap** |
| "tree", "path", "depth", "ancestor" | **DFS/BFS on trees** recursion |
| "grid", "islands", "connected", "shortest steps" | **BFS/DFS on graphs**; BFS for unweighted shortest path |
| "dependencies", "order of tasks", "prerequisites" | **Topological sort** |
| "weighted shortest path" | **Dijkstra** |
| "groups", "connected components", "merge sets dynamically" | **Union-find** |
| "all combinations/permutations/subsets", "place N items legally" | **Backtracking** |
| "count the ways", "min/max cost", choices with overlapping subproblems | **Dynamic programming** |
| "intervals", "meetings", "overlaps" | **Sort + sweep / merge** (chapter 9) |
| "prefix", "autocomplete", "words" | **Trie** |
| "range query with updates" | **Segment/Fenwick tree** |
| "n ≤ 20" | **Bitmask** / exponential search |
| "n up to 10⁵ or 10⁶" | Needs O(n log n) or O(n) |

> [!NOTE] **Input size is a hint.** Roughly 10⁸ simple operations per second: n ≤ 10 → n! is fine; n ≤ 20 → 2ⁿ; n ≤ 500 → n³; n ≤ 5,000 → n²; n ≤ 10⁶ → n log n; bigger → O(n) or O(log n).

## Three problems, worked in full

### 1. Longest substring without repeating characters

*Understand:* given a string, find the length of the longest **contiguous** substring with all distinct characters. "abcabcbb" → 3 ("abc").

*Brute force:* check every substring for duplicates, O(n³), or O(n²) with a set.

*Bottleneck and pattern:* "longest contiguous substring with a property" → **sliding window**. When a duplicate enters the window, there's no point restarting from scratch; just move the left edge past the previous occurrence.

```python
def longest_unique(s):
    last_seen = {}                 # char -> last index
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1          # jump past the duplicate
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best
```

*Test:* "abba", at the second 'b', left → 2; at the final 'a', its last index 0 is < left, so left stays 2; best = 2. ✓ Empty string → 0. ✓ *Complexity:* O(n) time, O(alphabet) space.

### 2. Number of islands

*Understand:* a grid of '1' (land) and '0' (water); count groups of land connected up/down/left/right.

*Pattern:* "connected regions in a grid" → **graph traversal**. Each unvisited land cell starts a new island; flood-fill it so it isn't counted again.

```python
def num_islands(grid):
    rows, cols = len(grid), len(grid[0])
    def sink(r, c):
        stack = [(r, c)]
        while stack:
            r, c = stack.pop()
            if 0 <= r < rows and 0 <= c < cols and grid[r][c] == "1":
                grid[r][c] = "0"                         # mark visited
                stack.extend([(r+1, c), (r-1, c), (r, c+1), (r, c-1)])
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                count += 1
                sink(r, c)
    return count
```

*Discuss:* an iterative stack avoids recursion-depth limits on big grids; mention that it modifies the input (ask if that's allowed, or use a visited set). O(rows × cols) time and space.

### 3. Coin change (fewest coins)

*Understand:* coins of given values (unlimited supply), a target amount; fewest coins to make it, or −1.

*Why not greedy?* Coins [1, 3, 4], amount 6: greedy takes 4 + 1 + 1 = 3 coins; best is 3 + 3 = 2. Greedy fails → **dynamic programming**.

*State:* `best[a]` = fewest coins to make amount a. *Transition:* `best[a] = 1 + min(best[a − coin])` over coins ≤ a.

```python
def coin_change(coins, amount):
    INF = float("inf")
    best = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and best[a - c] + 1 < best[a]:
                best[a] = best[a - c] + 1
    return best[amount] if best[amount] != INF else -1
```

O(amount × coins) time, O(amount) space. Mention the counterexample to greedy, interviewers love it.

## 50 classic problems and the insight that cracks each

| # | Problem | Pattern | Key insight |
|---|---|---|---|
| 1 | Two Sum | Hash map | For each x, look up target − x among numbers seen so far |
| 2 | Best Time to Buy and Sell Stock | One pass | Track the minimum price so far; best profit = max(price − min) |
| 3 | Contains Duplicate | Hash set | Seen before → duplicate |
| 4 | Valid Anagram | Counting | Equal character counts |
| 5 | Group Anagrams | Hash map | Key = sorted word (or letter counts) |
| 6 | Top K Frequent Elements | Heap / bucket sort | Count, then heap of size k or buckets by frequency |
| 7 | Product of Array Except Self | Prefix/suffix | Product of everything left × everything right, no division |
| 8 | Longest Consecutive Sequence | Hash set | Only start counting from numbers whose x − 1 is absent |
| 9 | Valid Palindrome | Two pointers | Compare from both ends, skipping non-alphanumerics |
| 10 | 3Sum | Sort + two pointers | Fix one number, two-pointer the rest; skip duplicates |
| 11 | Container With Most Water | Two pointers | Move the shorter wall inward, it's the limit |
| 12 | Trapping Rain Water | Two pointers / prefix max | Water at i = min(max left, max right) − height |
| 13 | Longest Substring Without Repeating Characters | Sliding window | Jump left edge past the previous occurrence |
| 14 | Longest Repeating Character Replacement | Sliding window | Window valid while length − max frequency ≤ k |
| 15 | Minimum Window Substring | Sliding window | Expand to satisfy all counts, shrink while still valid |
| 16 | Valid Parentheses | Stack | Push openers; each closer must match the top |
| 17 | Daily Temperatures | Monotonic stack | Stack of unresolved days; pop when a warmer day arrives |
| 18 | Largest Rectangle in Histogram | Monotonic stack | Each bar extends until a shorter bar on each side |
| 19 | Binary Search | Binary search | Keep an invariant on lo/hi; mid = lo + (hi − lo) // 2 |
| 20 | Search in Rotated Sorted Array | Binary search | One half is always sorted; check if target lies in it |
| 21 | Koko Eating Bananas | Binary search on answer | Feasibility is monotonic in speed |
| 22 | Median of Two Sorted Arrays | Binary search | Partition both arrays so left halves hold the smaller half |
| 23 | Reverse Linked List | Pointers | Re-point each next to the previous node |
| 24 | Linked List Cycle | Fast/slow pointers | Fast pointer catches up inside a cycle (Floyd) |
| 25 | Merge K Sorted Lists | Heap | Heap of each list's current head |
| 26 | LRU Cache | Hash map + doubly linked list | O(1) lookup and O(1) move-to-front (try the DSA figure) |
| 27 | Invert Binary Tree | Tree recursion | Swap children, recurse |
| 28 | Maximum Depth of Binary Tree | DFS | 1 + max(depth of children) |
| 29 | Validate BST | DFS with bounds | Each node must lie within (low, high) inherited from ancestors |
| 30 | Lowest Common Ancestor | DFS | The node where p and q split into different subtrees |
| 31 | Binary Tree Level Order Traversal | BFS | Queue, processing one level's size at a time |
| 32 | Serialize/Deserialize Binary Tree | DFS | Preorder with null markers |
| 33 | Kth Smallest in a BST | In-order traversal | In-order visits values in sorted order |
| 34 | Implement Trie | Trie | Node per character; end-of-word flag (DSA ch. 10) |
| 35 | Word Search II | Trie + backtracking | Walk the grid while walking the trie; prune dead prefixes |
| 36 | Number of Islands | DFS/BFS | Flood-fill each new land cell |
| 37 | Clone Graph | DFS + hash map | Map original → copy to handle cycles |
| 38 | Course Schedule | Topological sort | Cycle in prerequisites ⇔ impossible (Kahn's algorithm) |
| 39 | Rotting Oranges | Multi-source BFS | Start BFS from all rotten oranges at once; levels = minutes |
| 40 | Network Delay Time | Dijkstra | Shortest paths from the source; answer is the max |
| 41 | Number of Connected Components / Redundant Connection | Union-find | An edge joining already-connected nodes is redundant |
| 42 | Subsets / Permutations | Backtracking | Choose, recurse, un-choose |
| 43 | Combination Sum | Backtracking | Recurse with the same or later candidates; prune when over target |
| 44 | N-Queens | Backtracking | Track used columns and both diagonals in sets |
| 45 | Climbing Stairs | DP | ways(n) = ways(n−1) + ways(n−2) |
| 46 | House Robber | DP | best(i) = max(best(i−1), best(i−2) + house i) |
| 47 | Coin Change | DP | best(a) = 1 + min(best(a − coin)) |
| 48 | Longest Increasing Subsequence | DP / patience sorting | O(n log n): smallest tail for each length, binary search |
| 49 | Longest Common Subsequence / Edit Distance | 2D DP | Compare last characters; match or take best of skips (try the DP figure) |
| 50 | Merge Intervals / Meeting Rooms II | Sort + sweep | Sort by start and merge; or count overlaps with ±1 events |

> [!NOTE] Don't memorize solutions, memorize **the key insight** and the **pattern**. When you get a new problem, ask: "which row of the signals table does this look like, and what's the repeated work I can eliminate?"

## When you get stuck

- **Solve a smaller version** by hand, n = 3, and watch what you do.
- **Ask what a sorted input would allow**; often sorting first unlocks two pointers or greedy.
- **Precompute something**: prefix sums, a hash map of positions, counts.
- **Think backwards** from the answer or **binary search** the answer.
- **Say it out loud**: "I'm thinking about whether a heap helps here because…". Interviewers give hints to candidates who show their thinking; taking a hint well is a positive signal.

## Practising effectively

- Practise **by pattern** a few problems each, then mix them.
- After each problem, write the one-line key insight (like the table above). Re-solve problems you missed after a few days (spaced repetition).
- **Time yourself** (≈20–25 minutes for a medium) and practise **talking aloud** ideally in mock interviews.
- Quality beats quantity: 150 problems understood deeply beat 500 skimmed.

> [!RECAP]
> - Use a **method**: understand → examples → brute force → find the bottleneck → code → test → analyze.
> - Map problem **signals** (sorted, contiguous, top-k, grid, dependencies, count ways…) to **patterns**; input size hints at the needed complexity.
> - Learn each classic problem's **key insight** not its code.
> - When stuck: smaller cases, sorting, precomputation, binary search on the answer, and thinking aloud.

> [!INTERVIEW] Use this chapter as your checklist on the day: clarify, give a brute force, name the pattern, agree the plan, code cleanly, test with edge cases, and state complexity.

::quiz {"q":"A problem asks for the longest contiguous subarray with at most k distinct values. Which pattern?","options":["Backtracking","Sliding window","Topological sort","Union-find"],"answer":1,"explain":"Contiguous + longest/shortest window → sliding window."}

::quiz {"q":"n ≤ 20 and you must choose a subset optimally. What does the input size suggest?","options":["O(n log n) is required","Exponential approaches like bitmasks (2²⁰ ≈ 1 million) are feasible","Only O(1) works","Use a trie"],"answer":1,"explain":"Small n is a deliberate hint."}

::quiz {"q":"Why should you state a brute-force solution before optimizing?","options":["It's always the final answer","It shows you understand the problem, gives a fallback, and reveals the repeated work to eliminate","Interviewers require it by law","It's faster to code"],"answer":1,"explain":"Optimization usually means removing the brute force's wasted work."}
