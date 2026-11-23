---
title: Dynamic Programming — Never Solve the Same Problem Twice
summary: The most feared interview topic, made systematic. DP is just "remember answers to smaller problems and build up from them". This chapter gives you a five-step recipe, walks through the main families (staircases, grids, two strings, knapsacks), and shows where DP runs in the real world — from Git's diff to spell checkers to speech recognition.
---

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
