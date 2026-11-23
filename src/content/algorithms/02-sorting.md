---
title: Sorting — Putting Things in Order, Fast
summary: Why sorting matters far beyond "sort this list", the proof that comparison sorting can't beat n log n, how the classic algorithms actually move data (with a visualizer), what Python, Java and C++ really use under the hood, and how companies sort data far bigger than memory.
---

::widget Scene {"title": "Quick sort: partition around a pivot", "sub": "one full Lomuto partition of [7, 2, 1, 8, 6, 3, 5, 4]", "nodes": [{"id": "a", "kind": "cells", "label": "array (pivot = last element)", "x": 3.1, "y": 3.1, "values": [7, 2, 1, 8, 6, 3, 5, 4]}], "metrics": [["ij", "i / j"], ["act", "Action"], ["why", "Why"]], "steps": [{"short": "Pivot", "tag": "Setup", "title": "Pick the pivot: 4", "body": "<p>Goal: everything ≤ 4 to its left, everything > 4 to its right. i marks the end of the \"small\" region (starts empty, at −1).</p>", "set": {"a": {"marks": {"7": "purple"}, "ptr": {"pivot": 7}}}, "metrics": {"ij": ["i=−1, j=0"], "act": ["—"], "why": ["—"]}}, {"short": "j0", "tag": "Scan", "title": "j=0: 7 > 4 → leave it", "body": "<p>j scans every element once.</p>", "set": {"a": {"marks": {"7": "purple", "0": "red"}, "ptr": {"j": 0}}}, "metrics": {"ij": ["i=−1, j=0"], "act": ["skip"]}}, {"short": "j1", "tag": "Scan", "title": "j=1: 2 ≤ 4 → i=0, swap a[0] and a[1]", "body": "<p>2 joins the small region.</p>", "set": {"a": {"marks": {"7": "purple", "0": "green"}, "ptr": {"i": 0, "j": 1}, "values": [2, 7, 1, 8, 6, 3, 5, 4]}}, "metrics": {"ij": ["i=0, j=1"], "act": ["swap 7 ↔ 2"]}}, {"short": "j2", "tag": "Scan", "title": "j=2: 1 ≤ 4 → i=1, swap a[1] and a[2]", "body": "<p>Small region: [2, 1].</p>", "set": {"a": {"marks": {"7": "purple", "0": "green", "1": "green"}, "ptr": {"i": 1, "j": 2}, "values": [2, 1, 7, 8, 6, 3, 5, 4]}}, "metrics": {"ij": ["i=1, j=2"], "act": ["swap 7 ↔ 1"]}}, {"short": "j34", "tag": "Scan", "title": "j=3: 8 > 4, j=4: 6 > 4 → skip both", "body": "<p>Big values stay put for now.</p>", "set": {"a": {"marks": {"7": "purple", "0": "green", "1": "green", "3": "red", "4": "red"}, "ptr": {"i": 1, "j": 4}, "values": [2, 1, 7, 8, 6, 3, 5, 4]}}, "metrics": {"ij": ["i=1, j=4"], "act": ["skip, skip"]}}, {"short": "j5", "tag": "Scan", "title": "j=5: 3 ≤ 4 → i=2, swap a[2] and a[5]", "body": "<p>3 jumps over the big values into the small region.</p>", "set": {"a": {"marks": {"7": "purple", "0": "green", "1": "green", "2": "green"}, "ptr": {"i": 2, "j": 5}, "values": [2, 1, 3, 8, 6, 7, 5, 4]}}, "metrics": {"ij": ["i=2, j=5"], "act": ["swap 7 ↔ 3"]}}, {"short": "j6", "tag": "Scan", "title": "j=6: 5 > 4 → skip", "body": "<p>Scan finished.</p>", "set": {"a": {"marks": {"7": "purple", "0": "green", "1": "green", "2": "green"}, "ptr": {"i": 2, "j": 6}, "values": [2, 1, 3, 8, 6, 7, 5, 4]}}, "metrics": {"ij": ["i=2, j=6"], "act": ["skip"]}}, {"short": "Place", "tag": "Place pivot", "title": "Swap the pivot into position i+1 = 3", "body": "<p>4 is now in its final sorted position, forever.</p>", "set": {"a": {"marks": {"3": "purple", "0": "green", "1": "green", "2": "green", "4": "red", "5": "red", "6": "red", "7": "red"}, "ptr": {"pivot": 3}, "values": [2, 1, 3, 4, 6, 7, 5, 8]}}, "metrics": {"act": ["swap 8 ↔ 4"], "why": ["left ≤ 4 < right", "good"]}}, {"short": "Recurse", "tag": "Recurse", "title": "Recurse on [2, 1, 3] and [6, 7, 5, 8]", "body": "<p>Each partition fixes one pivot and splits the problem.</p>", "set": {"a": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green", "5": "green", "6": "green", "7": "green"}, "ptr": {}, "values": [1, 2, 3, 4, 5, 6, 7, 8]}}, "metrics": {"act": ["sorted"], "why": ["in place, no extra array"]}}, {"short": "Worst", "tag": "Danger", "title": "Worst case: always picking the smallest or largest as pivot", "body": "<p>Already-sorted input + last-element pivot → splits of n−1 and 0 → O(n²). Fix: random pivot or median-of-three.</p>", "note": {"kind": "key", "text": "Quick sort: partition around a pivot in one pass, recurse on both sides. O(n log n) on average, in place, cache-friendly; randomise the pivot to avoid O(n²)."}}]}

::widget Scene {"title": "Insertion sort: how you sort playing cards", "sub": "grow a sorted section one card at a time", "nodes": [{"id": "a", "kind": "cells", "label": "cards", "x": 3.1, "y": 3.1, "values": [7, 3, 5, 2, 8]}], "metrics": [["sorted", "Sorted part"], ["cost", "Cost"]], "steps": [{"short": "Start", "tag": "Setup", "title": "The first card alone is sorted", "body": "<p>Think of picking up cards one at a time and slotting each into place in your hand.</p>", "set": {"a": {"marks": {"0": "green"}, "ptr": {"i": 1}}}, "metrics": {"sorted": ["[7]"], "cost": ["—"]}}, {"short": "Insert 3", "tag": "Insert", "title": "3 slides left past 7", "body": "<p>Take 3; shift 7 right; drop 3 in front: [3 7 | 5 2 8].</p>", "set": {"a": {"marks": {"0": "green", "1": "green"}, "ptr": {"i": 2}, "values": [3, 7, 5, 2, 8]}}, "metrics": {"sorted": ["[3 7]"]}}, {"short": "Insert 5, 2", "tag": "Insert", "title": "5 goes between, 2 slides all the way left", "body": "<p>[3 5 7] then [2 3 5 7]. Small numbers far to the right cost many shifts.</p>", "set": {"a": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green"}, "ptr": {"i": 4}, "values": [2, 3, 5, 7, 8]}}, "metrics": {"sorted": ["[2 3 5 7]"]}}, {"short": "Cost", "tag": "Insight", "title": "O(n²) worst case — but great on nearly-sorted data", "body": "<p>Reverse-sorted input shifts every card past every other: O(n²). Already-sorted input needs no shifts: O(n). That's why fast library sorts switch to insertion sort for small or nearly-sorted pieces.</p>", "set": {"a": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green"}, "ptr": {}}}, "metrics": {"cost": ["O(n²) worst, O(n) best"]}, "note": {"kind": "key", "text": "Simple sorts (bubble, selection, insertion) are O(n²): fine for 50 items, hopeless for a million."}}]}


::widget Scene {"title": "Counting sort: beating n log n when values are small", "sub": "exam scores 0–5", "nodes": [{"id": "a", "kind": "cells", "label": "scores", "x": 0.93, "y": 0.93, "values": [3, 1, 4, 1, 5, 3, 0, 3]}, {"id": "c", "kind": "cells", "label": "count of each score 0–5", "x": 6.82, "y": 6.82, "values": [0, 0, 0, 0, 0, 0]}], "metrics": [["cost", "Cost"]], "steps": [{"short": "Count", "tag": "Count", "title": "Count how many of each value", "body": "<p>No comparisons at all: walk the list and add 1 to <code>count[score]</code>.</p>", "set": {"c": {"marks": {"0": "blue", "1": "blue", "3": "blue", "4": "blue", "5": "blue"}, "ptr": {}, "values": [1, 2, 0, 3, 1, 1]}}, "metrics": {"cost": ["O(n)"]}}, {"short": "Write out", "tag": "Output", "title": "Write each value count times", "body": "<p>0 once, 1 twice, 3 three times, 4 once, 5 once: [0 1 1 3 3 3 4 5].</p>", "set": {"a": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green", "5": "green", "6": "green", "7": "green"}, "ptr": {}, "values": [0, 1, 1, 3, 3, 3, 4, 5]}}, "metrics": {"cost": ["O(n + k)", "good"]}, "note": {"kind": "key", "text": "Comparison sorts can't beat O(n log n). Counting and radix sort can — when values are small integers or fixed-length keys."}}]}

## Why a whole chapter on sorting?

Sorting looks like a small feature — the "sort by price" dropdown. But sorted data unlocks a huge number of other things:

- **Searching** becomes fast (binary search, next chapter).
- **Duplicates** end up next to each other, so finding them is one pass.
- **Merging** two sorted lists is easy.
- "Top 10", "median", "rank" and "percentile" all become simple.
- **Databases** sort constantly: `ORDER BY`, merging tables together, building indexes.
- Many **greedy algorithms** (chapter 5) start with "sort by end time" or "sort by deadline".

> [!EXAMPLE] Card players sort their hand without thinking about it — picking up cards one at a time and slotting each into the right place. That's literally **insertion sort**, one of the algorithms below. Postal sorting centers dividing mail first by region, then by city, then by street use the idea behind **radix sort**.

## Two properties that matter

- **Stable:** items that compare equal keep their original order. This matters when sorting by one field after another: sort employees by name, then *stably* by department, and within each department they stay alphabetical.
- **In-place:** needs little or no extra memory beyond the list itself.

## The speed limit: why n log n

Any sort that works by comparing two items at a time ("is a < b?") **must** make about **n log₂ n** comparisons in the worst case. Why? There are n! possible orderings of n items (for 10 items, 3.6 million). Each comparison has two possible answers, so it can at best cut the remaining possibilities in half. To narrow n! possibilities down to one, you need about log₂(n!) ≈ n log₂ n comparisons.

So O(n log n) is the best possible for comparison sorts. The only way to beat it is to **not compare** — using the structure of the keys themselves (see counting and radix sort below).

## The algorithms, in action

Pick an algorithm and watch how it moves data. Then switch the input to "nearly sorted" and compare:

::widget SortingViz {}

### The simple ones (O(n²))

- **Bubble sort** — repeatedly swap neighbors that are out of order. Mostly useful as a teaching example.
- **Selection sort** — find the smallest item, put it first; find the next smallest, put it second… Always does about n²/2 comparisons, but very few swaps.
- **Insertion sort** — take items one at a time and slot each into place among those already sorted, like sorting a hand of cards. It's O(n²) in general, but **almost O(n) when the data is nearly sorted**, and it's very fast for small lists. That's why every serious sorting library uses it for small pieces.

### Merge sort (O(n log n), stable)

Split the list in half, sort each half, merge them (chapter 1). Always O(n log n), stable, and it works by reading data in order, which makes it ideal for linked lists and for data on disk. Its cost: it needs extra memory the size of the list.

```python
def merge_sort(items):
    if len(items) <= 1:
        return items
    mid = len(items) // 2
    left, right = merge_sort(items[:mid]), merge_sort(items[mid:])
    merged, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:          # <= (not <) keeps equal items in original order: stable
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
    return merged + left[i:] + right[j:]
```

### Quicksort (O(n log n) on average, in-place)

Pick a **pivot**. Rearrange the list so everything smaller than the pivot is on its left and everything larger is on its right — the pivot is now in its final position. Then sort each side the same way.

> [!ANALOGY] Sorting a class of students by height for a group photo. Pick one student as the pivot. Everyone shorter moves to their left, everyone taller to their right. Now the pivot is exactly where they belong. Repeat with the left group and the right group.

Quicksort is usually the **fastest in practice**: it sorts in place, and its inner loop walks through memory in order, which the CPU loves (DSA track, chapter 1). Its weakness: a consistently bad pivot (for example, always the first item when the data is already sorted) makes it O(n²). Real implementations pick pivots randomly or take the middle of three samples to avoid this. It's not stable.

### Heap sort (O(n log n) guaranteed, in-place)

Build a heap (DSA track, chapter 5), then repeatedly move the largest item to the end. Guaranteed O(n log n) with no extra memory, but it jumps around memory a lot, so it's usually slower than quicksort in practice. Its value is the **guarantee**.

## Beating n log n: counting and radix sort

When keys have known structure, you don't need to compare them at all.

**Counting sort:** to sort a million exam scores between 0 and 100, just count how many students got each score (101 counters), then write them out in order. That's **O(n + k)**, where k is the range of values.

**Radix sort:** sort numbers **one digit at a time**, from the last digit to the first, using a stable counting sort for each digit. Ten-digit phone numbers need 10 passes, each O(n), regardless of how many numbers there are. GPUs use radix sort for exactly this reason.

> [!ANALOGY] A post office sorting letters by PIN code: first into piles by the last digit, then (keeping that order) by the second-to-last digit, and so on. After the final pass by the first digit, the letters are completely in order — without ever comparing two PIN codes with each other.

## What your programming language actually uses

You'll almost never write a sort yourself. But knowing what's inside explains the behavior you see:

| Language | Algorithm | Notes |
|---|---|---|
| **Python** (`sorted`, `.sort()`), **Java** (objects), Android | **Timsort** | A hybrid of merge sort and insertion sort that finds already-sorted stretches ("runs") in real data and merges them. Stable; nearly linear on nearly-sorted data. |
| **C++** `std::sort` | **Introsort** | Quicksort that switches to heap sort if it detects bad pivots (guaranteeing O(n log n)), and to insertion sort for small pieces. Not stable. |
| **Java** primitives (`int[]`) | Dual-pivot quicksort | Stability doesn't matter for plain numbers. |
| **Rust**, **Go** | Pattern-defeating quicksort variants (unstable); merge-based for stable sorts | |

> [!EXAMPLE] **Why Python sorts real data so fast:** Tim Peters designed Timsort in 2002 after noticing that real-world data is rarely random. Log files are mostly in time order, spreadsheets are often partly sorted, lists are frequently appended to an already-sorted list. Timsort detects those sorted runs and merges them, so on typical data it does far less work than the worst case.

## Sorting data bigger than memory

How do you sort 1 TB of log data on a machine with 16 GB of RAM? **External sorting**:

1. **Read 16 GB at a time**, sort it in memory, write it out as a sorted chunk. You end up with about 64 sorted chunks on disk.
2. **Merge all 64 chunks at once**: keep the front item of each chunk in a min-heap (DSA track, chapter 5), repeatedly take the smallest, and pull the next item from the chunk it came from. Everything is read and written in order, which disks handle efficiently.

Databases do exactly this when a big `ORDER BY` doesn't fit in memory, and big-data systems like Spark do it across thousands of machines.

## Sorting in interviews

- Know the table below by heart.
- Practice **custom sort keys**: meetings by start time, people by (height descending, then position), numbers arranged to form the largest possible number.
- Many problems become easy **after** sorting: merging overlapping intervals, the 3Sum problem, grouping anagrams, meeting rooms.
- "Find the k-th largest" doesn't need a full sort: use quickselect or a heap.

| Algorithm | Best | Average | Worst | Extra memory | Stable |
|---|---|---|---|---|---|
| Insertion | n | n² | n² | 1 | ✓ |
| Merge | n log n | n log n | n log n | n | ✓ |
| Quick | n log n | n log n | n² | log n | ✗ |
| Heap | n log n | n log n | n log n | 1 | ✗ |
| Timsort | n | n log n | n log n | n | ✓ |
| Counting | n + k | n + k | n + k | n + k | ✓ |
| Radix | d·(n + b) | d·(n + b) | d·(n + b) | n + b | ✓ |

> [!RECAP]
> - Sorted data makes searching, deduplication, merging, ranking and many greedy algorithms easy.
> - Comparison sorts can't beat **O(n log n)** in the worst case; counting and **radix sort** beat it by using the keys' structure.
> - **Insertion sort** is great for small or nearly sorted data; **merge sort** is stable and disk-friendly; **quicksort** is usually fastest in memory; **heap sort** guarantees O(n log n) in place.
> - Real libraries use hybrids: **Timsort** (Python, Java objects) and **introsort** (C++).
> - **External sorting** handles data bigger than memory: sort chunks, then merge them with a heap.

::quiz {"q":"Why is quicksort usually faster than heap sort even though both are O(n log n) on average?","options":["Quicksort does fewer comparisons in every case","Quicksort walks through memory in order, which is cache-friendly; heap sort jumps around","Heap sort is O(n²)","Quicksort is stable"],"answer":1,"explain":"Memory behavior often matters more than Big-O constants."}

::quiz {"q":"You sort employees by department, and they're already sorted by name. Which property must the sort have so names stay alphabetical within each department?","options":["In-place","Stable","Adaptive","Non-comparison"],"answer":1,"explain":"A stable sort keeps the existing order among items that compare equal."}

::quiz {"q":"How would you sort 1 TB of data with 16 GB of RAM?","options":["Buy more RAM","Sort 16 GB chunks in memory, write them out, then merge all chunks with a min-heap","Use bubble sort","Sorting is impossible"],"answer":1,"explain":"This is external merge sort, used by databases and big-data systems."}
