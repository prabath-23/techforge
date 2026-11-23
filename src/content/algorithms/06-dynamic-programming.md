---
title: Dynamic Programming — Never Solve the Same Problem Twice
summary: The most feared interview topic, made systematic. DP is just "remember answers to smaller problems and build up from them". This chapter gives you a five-step recipe, walks through the main families (staircases, grids, two strings, knapsacks), and shows where DP runs in the real world — from Git's diff to spell checkers to speech recognition.
---

::widget Scene {"title": "Coin change with DP: the fewest coins", "sub": "coins {1, 3, 4}, amount 6 — fill the table left to right", "nodes": [{"id": "dp", "kind": "cells", "label": "dp[x] = fewest coins to make x", "x": 3.1, "y": 3.1, "values": [0, "", "", "", "", "", ""]}], "metrics": [["x", "Amount"], ["try", "Options tried"], ["val", "dp[x]"]], "steps": [{"short": "Greedy", "tag": "Problem", "title": "Greedy picks 4, then 1, then 1: three coins", "body": "<p>But 3 + 3 = 6 uses two. We need to consider every option without trying every combination.</p>", "metrics": {"x": ["6"], "try": ["greedy: 4+1+1"], "val": ["3 (not optimal)"]}}, {"short": "Define", "tag": "Define", "title": "Define the subproblem: dp[x] = fewest coins for amount x", "body": "<p>Recurrence: dp[x] = 1 + min(dp[x−1], dp[x−3], dp[x−4]). Base: dp[0] = 0.</p>", "set": {"dp": {"marks": {"0": "green"}, "ptr": {}}}, "metrics": {"x": ["0"], "try": ["base case"], "val": ["0"]}}, {"short": "x1", "tag": "Fill", "title": "dp[1] = 1 + dp[0] = 1", "body": "<p>Only coin 1 fits.</p>", "set": {"dp": {"marks": {"1": "green", "0": "blue"}, "ptr": {"x": 1}, "values": [0, 1, "", "", "", "", ""]}}, "metrics": {"x": ["1"], "try": ["1+dp[0]"], "val": ["1"]}}, {"short": "x2", "tag": "Fill", "title": "dp[2] = 1 + dp[1] = 2", "body": "<p>1 + 1.</p>", "set": {"dp": {"marks": {"2": "green", "1": "blue"}, "ptr": {"x": 2}, "values": [0, 1, 2, "", "", "", ""]}}, "metrics": {"x": ["2"], "try": ["1+dp[1]"], "val": ["2"]}}, {"short": "x3", "tag": "Fill", "title": "dp[3] = min(1 + dp[2], 1 + dp[0]) = 1", "body": "<p>Using the 3-coin beats three 1s.</p>", "set": {"dp": {"marks": {"3": "green", "0": "blue", "2": "blue"}, "ptr": {"x": 3}, "values": [0, 1, 2, 1, "", "", ""]}}, "metrics": {"x": ["3"], "try": ["1+2, 1+0"], "val": ["1"]}}, {"short": "x4", "tag": "Fill", "title": "dp[4] = min(1 + dp[3], 1 + dp[1], 1 + dp[0]) = 1", "body": "<p>The 4-coin.</p>", "set": {"dp": {"marks": {"4": "green", "0": "blue", "1": "blue", "3": "blue"}, "ptr": {"x": 4}, "values": [0, 1, 2, 1, 1, "", ""]}}, "metrics": {"x": ["4"], "try": ["1+1, 1+1, 1+0"], "val": ["1"]}}, {"short": "x5", "tag": "Fill", "title": "dp[5] = min(1 + dp[4], 1 + dp[2], 1 + dp[1]) = 2", "body": "<p>4 + 1.</p>", "set": {"dp": {"marks": {"5": "green", "1": "blue", "2": "blue", "4": "blue"}, "ptr": {"x": 5}, "values": [0, 1, 2, 1, 1, 2, ""]}}, "metrics": {"x": ["5"], "try": ["1+1, 1+2, 1+1"], "val": ["2"]}}, {"short": "x6", "tag": "Fill", "title": "dp[6] = min(1 + dp[5], 1 + dp[3], 1 + dp[2]) = 2", "body": "<p>Via dp[3]: 3 + 3. The table found what greedy missed.</p>", "set": {"dp": {"marks": {"6": "green", "2": "blue", "3": "orange", "5": "blue"}, "ptr": {"x": 6}, "values": [0, 1, 2, 1, 1, 2, 2]}}, "metrics": {"x": ["6"], "try": ["1+2, 1+1, 1+2"], "val": ["2", "good"]}}, {"short": "Recon", "tag": "Reconstruct", "title": "Which coins? Remember the choice at each step", "body": "<p>6 used coin 3 → 3 used coin 3 → 0. Answer: 3 + 3.</p>", "set": {"dp": {"marks": {"6": "green", "3": "green", "0": "green"}, "ptr": {}, "values": [0, 1, 2, 1, 1, 2, 2]}}}, {"short": "Cost", "tag": "Complexity", "title": "O(amount × coins) time, O(amount) space", "body": "<p>Each subproblem is solved once and reused — instead of the exponential tree of plain recursion.</p>", "note": {"kind": "key", "text": "DP recipe: define the state, write the recurrence, set base cases, fill in an order where dependencies are ready, reconstruct the answer from stored choices."}}]}

::widget Scene {"title": "Memoization: never solve the same subproblem twice", "sub": "Fibonacci without the explosion", "nodes": [{"id": "m", "kind": "cells", "label": "memo: fib(0) … fib(7)", "x": 3.1, "y": 3.1, "values": ["", "", "", "", "", "", "", ""]}], "metrics": [["calls", "Calls"], ["cost", "Cost"]], "steps": [{"short": "The waste", "tag": "Problem", "title": "Naive fib(7) recomputes fib(5) twice, fib(4) three times…", "body": "<p><code>fib(n) = fib(n-1) + fib(n-2)</code> branches twice per call: fib(40) makes over 300 million calls.</p>", "metrics": {"calls": ["41 for fib(7); 331 M for fib(40)", "bad"], "cost": ["O(2ⁿ)", "bad"]}}, {"short": "Remember", "tag": "Memo", "title": "Store each answer the first time", "body": "<p>Keep a table. Before computing fib(k), check the table; after computing it, store it.</p>", "set": {"m": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue"}, "ptr": {}, "values": [0, 1, 1, 2, "", "", "", ""]}}}, {"short": "Fill", "tag": "Memo", "title": "Each value is computed once: 0 1 1 2 3 5 8 13", "body": "<p>fib(7) = 13 with only 8 real computations.</p>", "set": {"m": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green", "5": "green", "6": "green", "7": "green"}, "ptr": {}, "values": [0, 1, 1, 2, 3, 5, 8, 13]}}, "metrics": {"calls": ["8", "good"], "cost": ["O(n)", "good"]}, "note": {"kind": "key", "text": "Dynamic programming = recursion + a table, whenever subproblems overlap. Top-down with a cache (memoization) or bottom-up filling a table (tabulation)."}}]}

::widget Scene {"title": "Coin change with DP: the fewest coins for every amount", "sub": "coins 1, 3, 4 — amounts 0 to 6", "nodes": [{"id": "d", "kind": "cells", "label": "best[amount] for amount 0…6", "x": 3.1, "y": 3.1, "values": [0, "", "", "", "", "", ""]}], "metrics": [["rule", "Rule"]], "steps": [{"short": "Table", "tag": "Setup", "title": "best[0] = 0: no coins for nothing", "body": "<p>Build answers for small amounts first; bigger amounts reuse them.</p>", "metrics": {"rule": ["best[a] = 1 + min(best[a − coin])"]}}, {"short": "1 to 4", "tag": "Fill", "title": "best[1]=1, best[2]=2, best[3]=1, best[4]=1", "body": "<p>Amount 3: use one 3-coin (1 + best[0]). Amount 4: one 4-coin.</p>", "set": {"d": {"marks": {"1": "blue", "2": "blue", "3": "blue", "4": "blue"}, "ptr": {}, "values": [0, 1, 2, 1, 1, "", ""]}}}, {"short": "5", "tag": "Fill", "title": "best[5] = 2 (4 + 1)", "body": "<p>Options: 1 + best[4] = 2, 1 + best[2] = 3, 1 + best[1] = 2. Minimum 2.</p>", "set": {"d": {"marks": {"5": "orange"}, "ptr": {"a": 5}, "values": [0, 1, 2, 1, 1, 2, ""]}}}, {"short": "6", "tag": "Done", "title": "best[6] = 2 (3 + 3) — greedy got 3", "body": "<p>Options: 1 + best[5] = 3, 1 + best[3] = <b>2</b>, 1 + best[2] = 3. The table finds what greedy missed. O(amount × coins).</p>", "set": {"d": {"marks": {"6": "green"}, "ptr": {"a": 6}, "values": [0, 1, 2, 1, 1, 2, 2]}}, "note": {"kind": "key", "text": "The DP recipe: define the state (best[a]), write the transition (try every coin), set the base case, fill in order."}}]}

::widget Scene {"title": "Grid paths: how many ways across the city?", "sub": "move only right or down", "nodes": [{"id": "r0", "kind": "cells", "label": "row 0", "x": 0.93, "y": 0.93, "values": [1, 1, 1, 1]}, {"id": "r1", "kind": "cells", "label": "row 1", "x": 4.96, "y": 4.96, "values": [1, "", "", ""]}, {"id": "r2", "kind": "cells", "label": "row 2", "x": 8.99, "y": 8.99, "values": [1, "", "", ""]}], "metrics": [["rule", "Rule"], ["ans", "Ways to bottom-right"]], "steps": [{"short": "Edges", "tag": "Base", "title": "Top row and left column: only one way each", "body": "<p>To reach any cell in the top row you can only go right. Same for the left column going down.</p>", "metrics": {"rule": ["ways = from above + from left"], "ans": ["?"]}}, {"short": "Fill row 1", "tag": "Fill", "title": "Each cell = above + left", "body": "<p>Row 1: 1, 2, 3, 4.</p>", "set": {"r1": {"marks": {"1": "blue", "2": "blue", "3": "blue"}, "ptr": {}, "values": [1, 2, 3, 4]}}}, {"short": "Fill row 2", "tag": "Done", "title": "Row 2: 1, 3, 6, 10 → 10 ways", "body": "<p>Same rule all the way down. 10 routes through a 3×4 grid. O(rows × cols).</p>", "set": {"r1": {"marks": {}, "ptr": {}, "values": [1, 2, 3, 4]}, "r2": {"marks": {"3": "green", "1": "blue", "2": "blue"}, "ptr": {}, "values": [1, 3, 6, 10]}}, "metrics": {"ans": ["10", "good"]}, "note": {"kind": "key", "text": "Add obstacles by setting those cells to 0. Add costs by taking the min instead of the sum — that's minimum path sum."}}]}

::widget Scene {"title": "Edit distance: how many edits turn one word into another?", "sub": "spell-checkers and DNA alignment", "nodes": [{"id": "a", "kind": "cells", "label": "kitten", "x": 0.93, "y": 0.93, "values": ["k", "i", "t", "t", "e", "n"]}, {"id": "b", "kind": "cells", "label": "sitting", "x": 6.82, "y": 6.82, "values": ["s", "i", "t", "t", "i", "n", "g"]}], "metrics": [["edits", "Edits"], ["ans", "Distance"]], "steps": [{"short": "Goal", "tag": "Problem", "title": "Turn \"kitten\" into \"sitting\" with the fewest edits", "body": "<p>Allowed: insert, delete, or replace one character.</p>", "metrics": {"edits": ["—"], "ans": ["?"]}}, {"short": "Replace", "tag": "Edit", "title": "k → s, e → i", "body": "<p>Two replacements: sitten → sittin.</p>", "set": {"a": {"marks": {"0": "orange", "4": "orange"}, "ptr": {}, "values": ["s", "i", "t", "t", "i", "n"]}}, "metrics": {"edits": ["2 replacements"]}}, {"short": "Insert", "tag": "Edit", "title": "Insert g at the end", "body": "<p>sittin → sitting. Total: 3 edits.</p>", "set": {"a": {"marks": {"6": "green"}, "ptr": {}, "values": ["s", "i", "t", "t", "i", "n", "g"]}, "b": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green", "5": "green", "6": "green"}, "ptr": {}}}, "metrics": {"edits": ["+1 insert"], "ans": ["3", "good"]}}, {"short": "The DP", "tag": "Method", "title": "Table: cost to turn the first i letters into the first j letters", "body": "<p>If letters match, copy the diagonal; otherwise 1 + min(insert, delete, replace). O(m × n). Used by spell-checkers, diff tools and DNA alignment.</p>", "note": {"kind": "key", "text": "Two-string DP problems (edit distance, longest common subsequence) all use a table indexed by prefix lengths of both strings."}}]}





## The idea in one story

> [!STORY] A teacher writes "1 + 1 + 1 + 1 + 1 + 1 + 1 + 1" on the board and asks a student for the total. The student counts: "8". The teacher adds "+ 1" at the end and asks again. The student instantly says "9". "How did you get that so fast?" "I didn't count again — I remembered it was 8 and added 1." **That's dynamic programming**: remember the answers to smaller problems, and build bigger answers from them instead of starting over.

Dynamic programming (DP) applies to problems with two properties:

1. **Optimal substructure:** the best answer to the big problem can be built from best answers to smaller versions of it.
2. **Overlapping subproblems:** the same smaller problems come up again and again.

Without the second property, plain recursion (divide and conquer, chapter 1) is enough. DP's entire trick is to **solve each smaller problem once and store the answer**.

> [!NOTE] The name is famously meaningless. Richard Bellman, who invented the method in the 1950s, said he chose "dynamic programming" partly because it sounded impressive and his funders disliked the word "research".

## A first example: climbing stairs

You can climb a staircase 1 or 2 steps at a time. How many different ways are there to climb n steps?

Think about **your last move**. You arrived at step n either from step n−1 (a 1-step) or from step n−2 (a 2-step). So:

`ways(n) = ways(n − 1) + ways(n − 2)`, with `ways(0) = 1` and `ways(1) = 1`.

Written as plain recursion, this recomputes the same values exponentially many times (it's Fibonacci in disguise — chapter 1). There are two ways to fix that.

**Top-down (memoization):** keep the recursion, but remember every answer.

```python
from functools import cache
@cache
def ways(n):
    if n <= 1:
        return 1
    return ways(n - 1) + ways(n - 2)
```

**Bottom-up (tabulation):** start from the smallest cases and build upward in a loop.

```python
def ways(n):
    prev, cur = 1, 1                 # ways(0), ways(1)
    for _ in range(n - 1):
        prev, cur = cur, prev + cur
    return cur
```

Both are O(n). Top-down is often easier to write first; bottom-up avoids deep recursion and often uses less memory.

## The five-step recipe

Every DP problem can be approached the same way:

1. **Define the state in plain words.** "`best[i]` = the most money I can rob from the first i houses." This is the creative step; say it out loud.
2. **Find the recurrence** by thinking about the **last decision**: did I take item i or not? Do the last letters match or not?
3. **Base cases:** the smallest states, answered directly.
4. **Order:** fill states so that everything a state needs is already computed (or just memoize).
5. **Where's the answer?** `best[n]`, the bottom-right cell, the maximum over all states…

The cost is (number of states) × (work per state).

## Family 1: a line of choices

**House robber.** Houses in a row each have some cash; you can't rob two neighboring houses (the alarms are linked). What's the most you can take?

- State: `best[i]` = the most from the first i houses.
- Last decision: rob house i or not. If yes, you couldn't rob house i−1: `cash[i] + best[i−2]`. If not: `best[i−1]`.

```python
def rob(cash):
    take, skip = 0, 0                     # best total if the previous house was robbed / not robbed
    for c in cash:
        take, skip = skip + c, max(skip, take)
    return max(take, skip)

rob([2, 7, 9, 3, 1])   # 12: houses 1, 3 and 5 (2 + 9 + 1)
```

**Coin change (fewest coins).** Remember the coins {1, 3, 4} where greedy failed (chapter 5)? DP handles it: `fewest[amount] = 1 + min(fewest[amount − coin])` over every coin.

```python
def fewest_coins(coins, amount):
    INF = float("inf")
    fewest = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and fewest[a - c] + 1 < fewest[a]:
                fewest[a] = fewest[a - c] + 1
    return fewest[amount] if fewest[amount] != INF else -1

fewest_coins([1, 3, 4], 6)   # 2 (3 + 3), where greedy gave 3
```

**Word break.** "Can `iloveindia` be split into dictionary words?" `ok[i]` = "the first i letters can be split". It's true if some earlier `ok[j]` is true and letters j..i form a word. Search engines and phone keyboards solve versions of this for languages written without spaces.

## Family 2: grids

"A robot starts at the top-left of a grid and can only move right or down. How many paths reach the bottom-right?" Each cell can only be reached from above or from the left, so `paths[r][c] = paths[r−1][c] + paths[r][c−1]`. The same shape solves "cheapest path through a grid of costs" (take the minimum instead of the sum) and "largest square of 1s in a grid".

## Family 3: comparing two strings

Watch the table fill in. Each cell depends only on its three neighbors above, to the left and diagonally:

::widget DpTable {}

**Edit distance** — the fewest single-letter insertions, deletions or replacements to turn one word into another (kitten → sitting needs 3). Cell `[i][j]` is the answer for the first i letters of one word and the first j of the other. The last letters either match (take the diagonal) or don't (1 + the best of delete, insert or replace).

> [!EXAMPLE] **Edit distance is everywhere:** your phone's autocorrect and search engines' "did you mean…?" suggest words with a small edit distance from what you typed; DNA analysis compares genetic sequences the same way; and fuzzy search in apps like VS Code's file finder uses related ideas.

**Longest common subsequence (LCS)** — the longest sequence of characters (not necessarily consecutive) that appears in both strings, in order. If the last characters match, `1 + diagonal`; otherwise the best of the cell above or to the left.

> [!EXAMPLE] **LCS is the heart of `diff` and Git.** When Git shows you which lines changed between two versions of a file, it's finding the longest common subsequence of lines: everything in it is "unchanged", and everything else is shown as added or removed. (Git uses a refined, faster algorithm by Eugene Myers, but the underlying problem is LCS.)

## Family 4: knapsacks — choosing items under a limit

You can carry 10 kg. Each item has a weight and a value, and items **can't be split** (a laptop, not gold dust). Which items maximize the total value?

Greedy fails here (chapter 5). The DP:

- State: `best[w]` = the most value achievable with capacity w, using the items considered so far.
- For each item: either skip it, or take it and add its value to `best[w − weight]`.

```python
def knapsack(weights, values, capacity):
    best = [0] * (capacity + 1)
    for wt, val in zip(weights, values):
        for w in range(capacity, wt - 1, -1):      # go DOWNWARD so each item is used at most once
            best[w] = max(best[w], best[w - wt] + val)
    return best[capacity]
```

> [!WARN] The direction of that inner loop matters. Going **downward** means each item is counted at most once. Going **upward** would let the same item be added again and again — which is the right answer for a *different* problem, where you have unlimited copies of each item (like coins).

Many problems are knapsacks in disguise:

- **"Can this list be split into two groups with equal sums?"** — can you fill a knapsack of size (total ÷ 2) exactly?
- **Budget allocation**: which projects fit in this quarter's budget for the most impact?
- **Cloud cost optimization**: which reserved instances to buy for the best savings within a budget.

## Two more families, briefly

- **Interval DP:** the state is a range `[i, j]`, and you try every split point inside it. "In what order should we multiply these matrices to do the least work?" is the textbook example — and database query planners solve a similar problem when choosing the order to join tables.
- **DP over subsets:** with up to about 20 items, a state can be "which subset have I used so far", stored as a bitmask. The traveling salesman problem for small numbers of cities is solved this way.

## Getting the actual choices, not just the score

The table tells you the best **value**. To get the actual **choices** (which items, which edits), walk backwards from the answer: at each cell, ask which option produced its value, and follow that. That's how `diff` reconstructs the exact lines that changed.

## DP in the real world

- **Text:** `diff`, Git merges, spell checkers, autocorrect.
- **Biology:** aligning DNA and protein sequences.
- **Speech recognition and mobile networks:** the **Viterbi** algorithm finds the most likely sequence of hidden states (spoken words, transmitted bits) — a DP over time.
- **Routing:** Bellman-Ford (chapter 4) is a DP.
- **Databases:** query optimizers use DP to choose the order in which to join tables.
- **Typesetting:** TeX chooses where to break lines in a paragraph with DP, so the spacing looks even.
- **AI:** reinforcement learning is built on the "Bellman equation" — Bellman's DP again.

> [!RECAP]
> - **Dynamic programming** = remember answers to overlapping smaller problems and build up from them.
> - Two styles: **top-down** (recursion + memoization) and **bottom-up** (fill a table in order).
> - Recipe: **define the state**, find the **recurrence from the last decision**, set **base cases**, choose an **order**, locate the **answer**.
> - Families: lines (house robber, coin change, word break), grids, **two strings** (edit distance, LCS — inside Git), **knapsacks**, intervals, subsets.
> - Walk the table backwards to recover the actual choices.

> [!INTERVIEW] DP is very learnable. Always: (1) write the brute-force recursion, (2) point out the repeated subproblems, (3) add memoization, (4) if asked, convert to bottom-up and reduce memory. Say your state definition out loud before coding. Most-asked: climbing stairs, house robber, coin change, longest increasing subsequence, longest common subsequence, edit distance, word break, unique paths, partition equal subset sum, decode ways, best time to buy and sell stock.

::quiz {"q":"Which two properties make a problem a good fit for dynamic programming?","options":["Sorted input and small size","Optimal substructure and overlapping subproblems","Greedy choice and randomness","Recursion and graphs"],"answer":1,"explain":"Without overlap, divide-and-conquer suffices; without optimal substructure, combining sub-answers isn't valid."}

::quiz {"q":"In the one-row knapsack solution, why does the capacity loop go downward?","options":["It's faster","So each item can only be counted once (each update reads values from before this item was considered)","To handle negative weights","It doesn't matter"],"answer":1,"explain":"Going upward allows reusing an item — the unlimited-copies version."}

::quiz {"q":"What does Git's diff fundamentally compute?","options":["A hash of each file","The longest common subsequence of lines between two versions","The edit distance between file names","A topological sort"],"answer":1,"explain":"Lines in the common subsequence are unchanged; the rest are shown as added or removed."}
