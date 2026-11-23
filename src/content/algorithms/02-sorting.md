---
title: Sorting — Putting Things in Order, Fast
summary: Why sorting matters far beyond "sort this list", the proof that comparison sorting can't beat n log n, how the classic algorithms actually move data (with a visualizer), what Python, Java and C++ really use under the hood, and how companies sort data far bigger than memory.
---

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
