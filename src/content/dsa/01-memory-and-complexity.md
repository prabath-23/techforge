---
title: Measuring Cost — Big-O, Memory and Why Some Code Is Fast
summary: Before learning data structures, learn how to judge them. What "O(n)" and "O(log n)" really mean, how to work out the cost of a piece of code by counting, why some operations are "cheap on average", and the hidden factor textbooks skip — how computer memory actually behaves.
---

::widget Scene {"title": "Big-O: how the work grows when the input grows", "sub": "each block = one step of work", "nodes": [{"id": "o1", "kind": "blocks", "label": "O(1) constant", "x": 0, "y": 5, "count": 1, "color": "red"}, {"id": "ol", "kind": "blocks", "label": "O(log n)", "x": 3, "y": 2.4, "count": 1, "color": "red"}, {"id": "on", "kind": "blocks", "label": "O(n) linear", "x": 6, "y": -0.2, "count": 2, "color": "red"}, {"id": "on2", "kind": "blocks", "label": "O(n²) quadratic", "x": 9.6, "y": -6.8, "count": 4, "color": "red"}], "metrics": [["n", "Input size n"], ["o1", "O(1)"], ["ol", "O(log n)"], ["on", "O(n)"], ["on2", "O(n²)"]], "steps": [{"short": "Count steps", "tag": "Concept", "title": "Count steps, not seconds", "body": "<p>How fast is an algorithm? Seconds depend on the machine, so instead we count <b>steps</b> and ask how that count depends on the input size, <i>n</i>.</p><p>Here are four algorithms working on <b>2 items</b>. Each block is one step. They look much the same.</p>", "note": {"kind": "notice", "text": "On small inputs, almost anything is fast. The differences show up when n grows."}, "set": {"o1": {"count": 1, "badge": "1 step", "x": 0.0, "y": -2.2}, "ol": {"count": 1, "badge": "1 step", "x": 1.59, "y": -4.86}, "on": {"count": 2, "badge": "2 steps", "x": 3.18, "y": -7.52}, "on2": {"count": 4, "badge": "4 steps", "x": 4.77, "y": -10.18}}, "metrics": {"n": ["2"], "o1": ["1"], "ol": ["1"], "on": ["2"], "on2": ["4"]}}, {"short": "Double the input", "tag": "Grow", "title": "Double the input", "body": "<p>Now give them <b>4 items</b> instead of 2. Watch each platform react:</p><p>O(1) didn't change. O(log n) gained a single block. O(n) doubled. O(n²) became <b>four times</b> bigger.</p><p>That reaction to growth is exactly what Big-O describes.</p>", "set": {"o1": {"count": 1, "badge": "1 step", "x": 0.0, "y": -2.2}, "ol": {"count": 2, "badge": "2 steps", "x": 1.59, "y": -4.86}, "on": {"count": 4, "badge": "4 steps", "x": 3.18, "y": -7.52}, "on2": {"count": 16, "badge": "16 steps", "x": 4.77, "y": -11.46}}, "metrics": {"n": ["4"], "ol": ["2"], "on": ["4"], "on2": ["16", "bad"]}, "focus": ["on2"]}, {"short": "Double it again", "tag": "Grow", "title": "Double it again", "body": "<p><b>8 items.</b> O(1): still 1. O(log n): 3. O(n): 8. O(n²): <b>64</b>.</p><p>At a million items, O(n²) would need a <b>trillion</b> steps — hours — while O(log n) needs about 20.</p>", "note": {"kind": "key", "text": "Big-O ignores constants and small terms, and keeps only the part that dominates as n grows large."}, "set": {"o1": {"count": 1, "badge": "1 step", "x": 0.0, "y": -2.2}, "ol": {"count": 3, "badge": "3 steps", "x": 1.59, "y": -4.86}, "on": {"count": 8, "badge": "8 steps", "x": 3.18, "y": -8.08}, "on2": {"count": 64, "badge": "64 steps", "x": 5.02, "y": -14.79}}, "metrics": {"n": ["8"], "ol": ["3"], "on": ["8"], "on2": ["64", "bad"]}, "focus": ["on2"]}, {"short": "O(1)", "tag": "Constant", "title": "O(1): the same work at any size", "body": "<p>Reading <code>a[0]</code>, looking up a key in a hash table, pushing onto a stack: one step whether the list has 8 items or 8 billion.</p><p>The computer jumps straight to the answer — it never looks at the other items.</p>", "focus": ["o1"], "metrics": {"o1": ["1", "good"]}}, {"short": "O(log n)", "tag": "Logarithmic", "title": "O(log n): halve the problem each step", "body": "<p>Binary search in a sorted list of 8 items: check the middle, throw away half, repeat. 8 → 4 → 2 → 1: <b>3 steps</b>.</p><p>Doubling n adds just <b>one</b> step. A billion items take only about 30.</p>", "focus": ["ol"], "metrics": {"ol": ["3", "good"]}}, {"short": "O(n)", "tag": "Linear", "title": "O(n): touch every item once", "body": "<p>Finding the largest number in an unsorted list means looking at each item once. Twice the items, twice the work.</p><p>This is usually the best you can do when you must read all the input.</p>", "focus": ["on"]}, {"short": "O(n²)", "tag": "Quadratic", "title": "O(n²): every item against every item", "body": "<p>Comparing every pair (checking for duplicates with two nested loops) does n × n steps. 8 items → 64; 100,000 items → 10 billion.</p><p>When an interviewer says \"can you do better?\", this is usually what they want you to remove — often with a hash set (O(n)) or by sorting first (O(n log n)).</p>", "note": {"kind": "key", "text": "Big-O tells you how an algorithm will behave on tomorrow's bigger data — that's why it matters more than today's timing."}, "focus": ["on2"]}]}

::widget Scene {"title": "Memory and pointers: every value lives at an address", "sub": "stack frames, heap objects, references", "nodes": [{"id": "st", "kind": "cells", "label": "stack (this function)", "x": 0.93, "y": 0.93, "values": ["x=7", "p→2048"]}, {"id": "hp", "kind": "cells", "label": "heap at 2048", "x": 11.26, "y": 4.86, "values": ["\"Asha\"", "32", "NYC"]}], "links": [["st", "hp", {"label": "pointer", "dashed": true}]], "metrics": [["where", "Where it lives"], ["life", "Freed when"]], "steps": [{"short": "Addresses", "tag": "Concept", "title": "Memory is one long numbered street", "body": "<p>Every byte has an address. A variable is just a name for some addresses. <code>x = 7</code> puts 7 into a few bytes on the <b>stack</b>.</p>", "set": {"st": {"marks": {"0": "blue"}, "ptr": {"x": 0}}}, "show": ["st"], "metrics": {"where": ["stack"], "life": ["function returns"]}}, {"short": "Heap", "tag": "Allocate", "title": "Big or long-lived data goes on the heap", "body": "<p><code>p = new User(\"Asha\", 32, \"NYC\")</code> allocates on the <b>heap</b> at address 2048. The variable <code>p</code> only stores that address — a <b>pointer</b> (or reference).</p>", "set": {"st": {"marks": {"1": "orange"}, "ptr": {"p": 1}}, "hp": {"marks": {"0": "orange", "1": "orange", "2": "orange"}, "ptr": {}}}, "metrics": {"where": ["heap"], "life": ["GC / free()"]}}, {"short": "Copying", "tag": "Gotcha", "title": "Copying p copies the address, not the user", "body": "<p><code>q = p</code> gives two names for the <b>same</b> object. Change <code>q.age</code> and <code>p.age</code> changes too. That's why passing objects to functions can modify them.</p>", "note": {"kind": "key", "text": "Stack: fast, automatic, small, freed on return. Heap: flexible, shared, freed by garbage collection or manually. Following pointers costs cache misses, which is why arrays beat linked lists."}}]}

## Why we need a way to measure

Two programmers solve the same problem. Both programs give the right answer on your laptop with 100 test records. In production, with 10 million records, one finishes in a second and the other would take three weeks.

Nobody could tell the difference with 100 records. We need a way to predict how a program's cost **grows** as its input grows — before we run it on real data. That's what **Big-O notation** gives us.

> [!ANALOGY] Imagine three ways to find a friend's name in a phone book of n names.
> - **Open it directly at the right page** because you have the page number: same effort no matter how big the book is. That's **O(1)** — constant.
> - **Flip to the middle, decide which half, repeat**: a 1,000-page book takes about 10 flips; a million pages, about 20. That's **O(log n)** — the effort barely grows.
> - **Read every name from the start**: double the book, double the effort. That's **O(n)** — linear.
> - **Compare every name with every other name** (to find duplicates, say): double the book, **four times** the effort. That's **O(n²)** — quadratic.

## Big-O in plain words




**Big-O describes how the work grows as the input size n grows, ignoring constant factors and small details.** It answers "if my data gets 10 times bigger, how much slower does this get?"

| Big-O | Name | If n gets 10× bigger, work gets… | Everyday example |
|---|---|---|---|
| O(1) | constant | the same | Looking up a value in a hash map by key |
| O(log n) | logarithmic | a little bigger (+3 steps) | Binary search in a sorted list |
| O(n) | linear | 10× bigger | Scanning a list once |
| O(n log n) | "n log n" | a bit more than 10× | Good sorting algorithms |
| O(n²) | quadratic | 100× bigger | Comparing every pair |
| O(2ⁿ) | exponential | astronomically bigger | Trying every subset |

Drag `n` here and watch how differently these grow. Switch to log scale to compare them fairly:

::widget BigOChart {}

> [!EXAMPLE] **A real performance bug.** A team builds a page that shows which of a user's 2,000 contacts also use the app. The first version, for each contact, scans the list of all 50 million users: 2,000 × 50,000,000 = 100 billion comparisons — minutes per page load. Putting the users in a hash set makes each check O(1): 2,000 lookups, under a millisecond. Same result, a million times faster — just by choosing a different data structure. That's what this whole track is about.

### What Big-O ignores (on purpose)

Big-O drops constant factors and smaller terms: 3n² + 100n + 7 is just **O(n²)**, because for large n the n² term dominates everything else. That makes it a great tool for comparing *approaches*. But it hides two things that matter in practice:

1. **Constants do matter for real sizes.** An O(n) algorithm that does 100 operations per item can lose to an O(n log n) algorithm that does 2, for every n you'll ever see.
2. **Memory behavior.** Two O(n) loops can differ in speed by 10× because of how they use memory — the last section of this chapter.

### Best case, worst case, average case

Many algorithms behave differently depending on the input. Quicksort is usually O(n log n), but on certain unlucky inputs it degrades to O(n²). A hash map lookup is O(1) on average, but O(n) if every key collides. When someone says "it's O(1)", it's worth asking: **in the worst case, or on average?**

## Working out the cost of code

You can usually find the Big-O of code by counting how many times the innermost work happens.

**One loop over n items → O(n).**

```python
def total(prices):
    s = 0
    for p in prices:      # runs n times
        s += p            # constant work each time
    return s              # → O(n)
```

**A loop inside a loop → multiply → O(n²).**

```python
def has_duplicate(items):
    for i in range(len(items)):             # n times
        for j in range(i + 1, len(items)):  # up to n times each
            if items[i] == items[j]:
                return True
    return False                            # → O(n²)
```

**Halving each time → O(log n).** How many times can you halve 1,000,000 before reaching 1? About 20. So any loop that halves its problem each step runs about log₂(n) times.

```python
def count_halvings(n):
    steps = 0
    while n > 1:
        n //= 2           # the problem halves each time
        steps += 1
    return steps          # → O(log n): 20 for a million, 30 for a billion
```

**Space counts too.** `has_duplicate` above uses O(1) extra memory but O(n²) time. Here's the opposite trade:

```python
def has_duplicate_fast(items):
    seen = set()
    for x in items:          # n times
        if x in seen:        # O(1) on average
            return True
        seen.add(x)
    return False             # → O(n) time, but O(n) extra memory
```

Trading memory for speed like this is one of the most common moves in all of programming.

## "Cheap on average": amortized cost

Python lists (and Java's `ArrayList`, C++'s `vector`, JavaScript arrays) let you `append` forever. Underneath, the list lives in one block of memory with some spare room. When the room runs out, the list allocates a **bigger block — usually double the size** — copies everything over, and continues.

That copy is expensive: O(n). So is `append` O(n)? Look at a sequence of appends instead of a single one:

> [!ANALOGY] Moving house. Most days you just put new things on a shelf — quick. Occasionally the house is full, and you move to a house **twice as big**, carrying everything over. That move is exhausting, but because each new house is double the size, moves get rarer and rarer. Spread the effort of all the moves across all the days, and it's a small, constant amount per day.

Mathematically: growing from 1 to n items with doubling copies 1 + 2 + 4 + … + n items in total, which is less than 2n. Spread over n appends, that's a constant amount of copying per append. So `append` is **O(1) amortized**: individually it's occasionally expensive, but **on average over any sequence** it's constant.

> [!WARN] "Amortized O(1)" still means an occasional slow operation. For most programs that doesn't matter. For a system with strict latency targets — a trading engine, a game frame — a sudden pause to copy a million items can. That's why systems like Redis and Go's maps grow their tables **gradually**, a little on each operation, instead of all at once.

## Practical budgets: how big can n be?

A modern computer does roughly **100 million simple operations per second** (more with optimized code, but that's a good rule of thumb). Combine that with Big-O and you can sanity-check any design:

| If n is about… | You can afford roughly… | Example |
|---|---|---|
| 10–20 | O(2ⁿ), O(n!) — try everything | All orderings of 10 delivery stops |
| a few thousand | O(n²) | Compare every pair of 5,000 items |
| 1 million | O(n log n) | Sort a million records |
| 100 million | O(n) | One pass over a big log file |
| billions and beyond | O(log n) or O(1) | Look up one user among billions |

> [!TRY] In coding interviews and competitive programming, the input limits are a hint. If n can be 100,000, an O(n²) solution (10 billion steps) is too slow, so you need O(n log n) or better. Next time you see a problem, look at the limits first and ask which complexity they allow.

## The hidden factor: how memory really works

Textbooks treat every memory access as equally fast. Real computers don't work that way, and this explains many surprises.

The CPU is extremely fast, and main memory (RAM) is comparatively slow — reading from RAM takes about **100 nanoseconds**, time enough for hundreds of CPU instructions. So CPUs keep small, very fast copies of recently used memory right next to the cores, called **caches**:

| Where | Typical size | Time to read |
|---|---|---|
| CPU registers | a few hundred bytes | instant |
| L1 cache | 32–64 KB per core | ~1 ns |
| L2 cache | 1–2 MB per core | ~4 ns |
| L3 cache | 16–100 MB shared | ~15 ns |
| RAM | gigabytes | ~100 ns |
| SSD | terabytes | ~50,000–100,000 ns |

Two facts about caches change how you should think about data structures:

1. **Memory moves in chunks of 64 bytes** (a "cache line"). Read one number and the 15 numbers next to it come along for free.
2. **CPUs notice patterns.** If you read memory in order, the CPU fetches what comes next before you even ask.

> [!ANALOGY] A chef at a stove (the CPU) with a small counter (cache) and a big storeroom down the hall (RAM). When the chef sends someone to the storeroom, they bring back a whole tray of nearby ingredients, not just one onion. If the recipe uses ingredients in the order they're shelved, the next tray is already on its way. If it jumps randomly around the storeroom, the chef stands waiting most of the time.

So **reading data that sits next to each other in memory is far faster than jumping around**, even when Big-O says the work is the same:

```c
// The same total work: add up every number in a 4096 × 4096 grid.
for (int row = 0; row < N; row++) for (int col = 0; col < N; col++) sum += grid[row][col];  // in memory order: ~0.02 s
for (int col = 0; col < N; col++) for (int row = 0; row < N; row++) sum += grid[row][col];  // jumping across rows: ~0.3 s
```

The second loop is over **10 times slower**, purely because of how it walks through memory. Both are O(n²).

This is why **arrays are often faster than linked lists in practice** even when Big-O says they're equal (next chapter): an array's items sit side by side in memory, while a linked list's items are scattered, and every step to the next item may be a trip to the storeroom.

> [!RECAP]
> - **Big-O** describes how cost **grows** with input size, ignoring constant factors: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ).
> - Find it by counting: one loop → O(n), nested loops → multiply, halving → O(log n). Count **memory** too.
> - **Amortized O(1)** means occasionally expensive but constant on average over a sequence (like a list doubling its storage).
> - Use **~100 million operations per second** to judge whether an approach is fast enough.
> - Real speed also depends on **memory layout**: data stored side by side is much faster to process than scattered data.

> [!INTERVIEW] Always state the time **and** space complexity of your solution without being asked, and mention whether it's worst-case, average or amortized. If you can explain why an array beats a linked list even when the Big-O is equal, you'll stand out.

::quiz {"q":"A function loops over n items, and for each item does a binary search over n sorted items. What's its time complexity?","options":["O(n)","O(log n)","O(n log n)","O(n²)"],"answer":2,"explain":"n iterations × O(log n) each."}

::quiz {"q":"Why is appending to a Python list O(1) amortized?","options":["Memory allocation is free","When the list is full it doubles its storage, so the total copying over n appends is less than 2n","It never copies","It's a linked list"],"answer":1,"explain":"The rare expensive copies average out to a constant per append."}

::quiz {"q":"Two loops do the same O(n²) work over a grid, but one is 10× slower. Most likely reason?","options":["One uses more variables","One reads memory in order and benefits from caches; the other jumps around memory","Big-O is wrong","The compiler skipped one"],"answer":1,"explain":"Cache-friendly access patterns can matter more than constant factors."}
