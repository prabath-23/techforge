---
title: Backtracking, String Searching and Bit Tricks: Plus How to Recognize Impossible Problems
summary: How to systematically try every possibility without wasting time (backtracking, with Sudoku and N-Queens), how text editors and search tools find words in huge documents quickly, a toolbox of bit-manipulation tricks, and what it means when a problem is "NP-hard", and what engineers do about it.
---

::widget Scene {"title": "Backtracking: N-Queens on a 4×4 board", "sub": "place a queen per row, undo when stuck", "nodes": [{"id": "r0", "kind": "cells", "label": "row 0", "x": 0.0, "y": 0.0, "values": ["", "", "", ""]}, {"id": "r1", "kind": "cells", "label": "row 1", "x": 2.48, "y": 2.48, "values": ["", "", "", ""]}, {"id": "r2", "kind": "cells", "label": "row 2", "x": 4.96, "y": 4.96, "values": ["", "", "", ""]}, {"id": "r3", "kind": "cells", "label": "row 3", "x": 7.44, "y": 7.44, "values": ["", "", "", ""]}], "metrics": [["place", "Queens (col per row)"], ["act", "Action"]], "steps": [{"short": "Rule", "tag": "Rules", "title": "One queen per row; none may share a column or diagonal", "body": "<p>Try columns left to right; if a row has no safe column, go back and move the previous queen.</p>", "metrics": {"place": ["-"], "act": ["-"]}}, {"short": "Q0", "tag": "Place", "title": "Row 0: column 0", "body": "<p>First safe spot.</p>", "set": {"r0": {"marks": {"0": "green"}, "ptr": {}, "values": ["Q", "", "", ""]}}, "metrics": {"place": ["0"], "act": ["place"]}}, {"short": "Q1", "tag": "Place", "title": "Row 1: col 0 (same column) ✗, col 1 (diagonal) ✗, col 2 ✓", "body": "<p>Checking is O(1) with sets of used columns and diagonals (r−c and r+c).</p>", "set": {"r1": {"marks": {"0": "red", "1": "red", "2": "green"}, "ptr": {}, "values": ["", "", "Q", ""]}}, "metrics": {"place": ["0, 2"], "act": ["place"]}}, {"short": "Dead", "tag": "Stuck", "title": "Row 2: every column is attacked", "body": "<p>Col 0 and 2 share columns, col 1 and 3 are on diagonals with row 1.</p>", "set": {"r2": {"marks": {"0": "red", "1": "red", "2": "red", "3": "red"}, "ptr": {}}}, "metrics": {"act": ["dead end", "bad"]}}, {"short": "Back1", "tag": "Backtrack", "title": "Backtrack: move row 1 to column 3", "body": "<p>Undo the last choice and try the next option.</p>", "set": {"r2": {"marks": {}, "ptr": {}}, "r1": {"marks": {"3": "orange"}, "ptr": {}, "values": ["", "", "", "Q"]}}, "metrics": {"place": ["0, 3"], "act": ["backtrack"]}}, {"short": "Q2", "tag": "Place", "title": "Row 2: column 1 is safe", "body": "<p>Progress.</p>", "set": {"r2": {"marks": {"1": "green"}, "ptr": {}, "values": ["", "Q", "", ""]}}, "metrics": {"place": ["0, 3, 1"]}}, {"short": "Dead2", "tag": "Stuck", "title": "Row 3: no safe column again", "body": "<p>Back to row 2, no other column works, back to row 1, no more columns, back to row 0.</p>", "set": {"r3": {"marks": {"0": "red", "1": "red", "2": "red", "3": "red"}, "ptr": {}}}, "metrics": {"act": ["backtrack ×3", "bad"]}}, {"short": "Q0b", "tag": "Backtrack", "title": "Row 0 moves to column 1", "body": "<p>Everything below is cleared.</p>", "set": {"r0": {"marks": {"1": "orange"}, "ptr": {}, "values": ["", "Q", "", ""]}, "r1": {"marks": {}, "ptr": {}, "values": ["", "", "", ""]}, "r2": {"marks": {}, "ptr": {}, "values": ["", "", "", ""]}, "r3": {"marks": {}, "ptr": {}, "values": ["", "", "", ""]}}, "metrics": {"place": ["1"], "act": ["backtrack"]}}, {"short": "Solve", "tag": "Solution", "title": "Row 1 → col 3, row 2 → col 0, row 3 → col 2", "body": "<p>A solution: [1, 3, 0, 2].</p>", "set": {"r1": {"marks": {"3": "green"}, "ptr": {}, "values": ["", "", "", "Q"]}, "r2": {"marks": {"0": "green"}, "ptr": {}, "values": ["Q", "", "", ""]}, "r3": {"marks": {"2": "green"}, "ptr": {}, "values": ["", "", "Q", ""]}, "r0": {"marks": {"1": "green"}, "ptr": {}, "values": ["", "Q", "", ""]}}, "metrics": {"place": ["1, 3, 0, 2", "good"], "act": ["solved"]}}, {"short": "Prune", "tag": "Insight", "title": "Pruning is what makes it fast", "body": "<p>We never explored any board with a conflict in an early row, whole subtrees were cut off. Same pattern: Sudoku, permutations, subsets, word search.</p>", "note": {"kind": "key", "text": "Backtracking: choose → check constraints → recurse → undo. Prune as early as possible."}}]}



## Part 1: Backtracking, exploring every possibility, cleverly

> [!ANALOGY] Solving a maze by hand: at each fork you pick a path and keep going. When you hit a dead end, you **walk back** to the last fork and try the next path you haven't tried. You never repeat a path, and you'll eventually find the exit if there is one. That's **backtracking**.

Backtracking explores a tree of choices: make a choice, go deeper, and when it fails (or succeeds), **undo the choice** and try the next one. On its own, that's brute force. Its power comes from **pruning**: abandoning a path the moment you can tell it can't possibly work, saving every branch below it.

Every backtracking solution has the same skeleton:

```python
def backtrack(path, options):
    if path is a complete solution:
        record a copy of path
        return
    for option in options:
        if option can't possibly work with path:   # PRUNE: skip whole branches early
            continue
        path.append(option)                        # choose
        backtrack(path, remaining options)         # explore
        path.pop()                                 # un-choose (walk back to the fork)
```

### The three core shapes

**All subsets** (each item is either in or out), 2ⁿ results:

```python
def subsets(items):
    result = []
    def go(i, chosen):
        if i == len(items):
            result.append(chosen[:])
            return
        go(i + 1, chosen)                              # leave items[i] out
        chosen.append(items[i]); go(i + 1, chosen); chosen.pop()   # put it in, then undo
    go(0, [])
    return result
```

**All orderings (permutations)** n! results:

```python
def permutations(items):
    result, used = [], [False] * len(items)
    def go(order):
        if len(order) == len(items):
            result.append(order[:]); return
        for i, x in enumerate(items):
            if not used[i]:
                used[i] = True; order.append(x)
                go(order)
                order.pop(); used[i] = False           # undo
    go([])
    return result
```

**Combinations that hit a target** "which dishes on this menu add up to exactly ₹500?" Sorting first lets you prune: once a dish is too expensive, every dish after it is too.

```python
def combos_for_budget(prices, budget):
    prices.sort()
    result = []
    def go(start, remaining, chosen):
        if remaining == 0:
            result.append(chosen[:]); return
        for i in range(start, len(prices)):
            if prices[i] > remaining:
                break                                  # prune: everything after is even pricier
            chosen.append(prices[i])
            go(i, remaining - prices[i], chosen)       # i, not i+1: a dish can be ordered again
            chosen.pop()
    go(0, budget, [])
    return result
```

### Puzzles: Sudoku and N-Queens

**N-Queens:** place N chess queens on an N×N board so no two attack each other. Place one queen per row; for each row, try every column that isn't attacked by an earlier queen (same column or same diagonal), and backtrack when a row has no safe column. Tracking attacked columns and diagonals in sets makes each check instant.

**Sudoku:** fill an empty cell with a digit that doesn't clash with its row, column or box; recurse; undo if you get stuck. A simple trick makes it dramatically faster: **always fill the most constrained cell first** (the one with the fewest legal digits). Fewer options early means much less backtracking.

> [!EXAMPLE] **Industrial-strength backtracking:** chip designers verifying circuits, airlines building crew schedules and compilers allocating registers use **SAT solvers** backtracking engines with very sophisticated pruning that learn from every dead end. They routinely solve problems with millions of variables.

Backtracking is still exponential in the worst case. Whether it finishes in a millisecond or a million years depends almost entirely on how well you prune.

## Part 2: Finding text inside text

Press Ctrl+F in a 500-page document, or run `grep` over gigabytes of logs, and the matches appear instantly. How?

The naive approach, try the pattern at every position of the text and compare character by character, costs up to O(n × m) for a text of length n and a pattern of length m. With long patterns that partially match often, that gets slow.

**KMP (Knuth-Morris-Pratt)** never re-reads text it has already seen. Before searching, it studies the **pattern** itself: "if a match fails at this point, how much of what I've already matched could still be the beginning of a match?" So on a mismatch it slides the pattern forward intelligently instead of starting over. Total cost: **O(n + m)**.

> [!ANALOGY] Searching for the word "ABABAC" in a long text. You've matched "ABABA" and then the next letter isn't "C". The naive approach starts again one letter later and re-checks letters it already saw. KMP notices that the "ABA" you just matched is also the start of the pattern, so it keeps those three letters as already matched and continues from there.

**Rabin-Karp** uses a **rolling hash**: compute a fingerprint (hash) of the current window of text, and slide it one character at a time by adding the new character and removing the old one in O(1). Only when the window's fingerprint matches the pattern's do you compare the actual characters. It's especially good for searching for **many patterns at once** and for finding duplicate passages in large texts.

> [!EXAMPLE] **Rolling hashes power more than search.** Plagiarism checkers fingerprint overlapping chunks of documents to find shared passages. **rsync** and Dropbox-style sync tools use rolling hashes to find which parts of a big file changed, so only those parts are sent over the network (System Design track).

Real tools combine tricks: `grep` and `ripgrep` use the **Boyer-Moore** family, which compares from the end of the pattern and can skip ahead many characters at a time, plus CPU instructions that compare 16–64 bytes at once. Antivirus scanners use **Aho-Corasick** which searches for thousands of virus signatures in a single pass over a file.

### Palindromes

"Find the longest palindrome inside a string." The simple approach expands outward from each possible center while the characters on both sides match: O(n²), easy to write, and usually what interviewers want. (An algorithm called Manacher's does it in O(n).)

## Part 3: Bit tricks

Computers store numbers in binary. A few operations on individual bits solve some problems in a single instruction:

| Trick | What it does | Why it works |
|---|---|---|
| `x & 1` | Is x odd? | The last bit is 1 for odd numbers |
| `x & (x - 1) == 0` (x > 0) | Is x a power of two? | Powers of two have exactly one 1-bit; subtracting 1 flips it and everything below |
| `x & (x - 1)` | Remove the lowest 1-bit | Same reason |
| `(x >> k) & 1` | Is bit k set? | Shift bit k to the end and check it |
| `x \| (1 << k)` | Turn bit k on | |
| `a ^ a == 0` | Anything XORed with itself is 0 | XOR cancels identical bits |

> [!EXAMPLE] **"Every number in this list appears twice except one. Find it."** XOR all the numbers together. Pairs cancel out (a ^ a = 0), leaving only the single number, in one pass, with no extra memory. A classic interview puzzle with a two-line answer.

**Bitmasks as sets.** With up to about 20–30 items, a set can be stored as one integer where bit i means "item i is in the set". Checking membership, adding and combining sets become single instructions. Permission flags in operating systems (read = 4, write = 2, execute = 1, so `chmod 755` means 7 = read+write+execute for the owner) and feature flags work this way.

## Part 4: When problems are truly hard, P vs NP

Some problems have fast algorithms; for others, nobody has found one, and most computer scientists believe none exists.

- **P**: problems solvable in **polynomial time** O(n), O(n log n), O(n³)… Sorting, shortest paths, minimum spanning trees.
- **NP**: problems where a proposed answer can be **checked** quickly, even if finding one seems hard. Checking a filled-in Sudoku is easy; solving a giant one is not.
- **NP-complete**: the hardest problems in NP. If anyone found a fast algorithm for one of them, it would solve all of them. Examples: the traveling salesman problem (decision version), scheduling with constraints, the knapsack problem, graph coloring, and satisfiability (SAT).

Whether P = NP is the most famous open question in computer science, with a $1 million prize from the Clay Mathematics Institute.

> [!ANALOGY] It's much easier to **check** whether a key opens a lock than to **find** the right key among millions. NP problems are the "easy to check, seemingly hard to find" kind.

### What engineers actually do with NP-hard problems

Delivery companies still route millions of packages every day, and airlines still schedule crews. When you meet an NP-hard problem, you don't give up, you choose a practical approach:

1. **Is the input small?** Up to ~20–25 items, exact search (backtracking, or DP over subsets) is fine.
2. **Are the numbers small?** Knapsack with a capacity of 10,000 is easy with DP (chapter 6).
3. **Does the input have special structure?** Many hard problems become easy on trees or other restricted shapes.
4. **Is "good enough" acceptable?** Greedy approximations (chapter 5), local search ("keep making small improvements"), or simulated annealing usually get within a few percent of optimal.
5. **Use a professional solver:** SAT solvers, integer programming solvers (Gurobi, Google OR-Tools) and constraint solvers handle huge real-world instances.

> [!EXAMPLE] **UPS's ORION system** plans routes for tens of thousands of delivery drivers each day, a vehicle routing problem, which is NP-hard. It doesn't find the perfect route; it uses heuristics and optimization to find very good ones. UPS has reported saving around 100 million miles of driving per year.

> [!RECAP]
> - **Backtracking** tries choices, explores deeper, and undoes them; **pruning** decides whether it's practical. Subsets, permutations, combinations, N-Queens and Sudoku all follow one template.
> - **String search:** naive is O(n·m); **KMP** never re-reads text (O(n + m)); **Rabin-Karp** uses rolling hashes (also used by rsync and plagiarism checkers).
> - **Bit tricks** and **bitmasks** solve some problems in one instruction (XOR to find the unpaired number; permission flags).
> - **NP-complete** problems are easy to check but seemingly hard to solve; in practice use small exact searches, DP, approximations, heuristics or professional solvers.

> [!INTERVIEW] Backtracking staples: subsets, permutations, combination sum, letter combinations of a phone number, generate valid parentheses, N-Queens, word search, Sudoku solver. Always mention the exponential cost and how you prune. Recognizing an NP-hard problem and proposing a practical approach is a strong senior signal.

::quiz {"q":"What distinguishes backtracking from plain recursion?","options":["It memoizes results","It makes a choice, explores, then undoes the choice, and prunes branches that can't work","It sorts the input","It uses a queue"],"answer":1,"explain":"Choose → explore → un-choose, plus pruning."}

::quiz {"q":"Every number in a list appears twice except one. What's the neatest way to find it?","options":["Sort and scan","XOR all the numbers together, pairs cancel out","Count with a hash map","Binary search"],"answer":1,"explain":"a ^ a = 0, so only the unpaired number remains."}

::quiz {"q":"You discover your routing problem is NP-hard and has 50,000 stops. What's the practical approach?","options":["Give up","Try every possible route","Use heuristics, approximations or an optimization solver to find very good (not perfect) routes","Use binary search"],"answer":2,"explain":"Real systems like UPS ORION find near-optimal routes this way."}
