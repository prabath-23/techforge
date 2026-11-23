---
title: Heaps and Tries — Priorities and Prefixes
summary: Two specialized structures with outsized usefulness. Heaps always hand you the most urgent item instantly — they power hospital-style priority queues, "top 10" lists, schedulers and map navigation. Tries organize words by their letters — they power autocomplete, spell checkers and internet routing.
---

## Part 1: Heaps — always knowing what's most urgent

> [!ANALOGY] A hospital emergency room doesn't treat patients in arrival order. A person with a heart attack is seen before someone with a sprained ankle who arrived an hour earlier. The triage nurse always knows **who is most urgent right now**, even as new patients keep arriving. A **priority queue** is that triage nurse, and a **heap** is how it's usually built.

A **priority queue** supports three operations:

- **add** an item with a priority,
- **peek** at the most urgent item,
- **remove** the most urgent item.

How would simpler structures do?

| Approach | Add | Remove most urgent |
|---|---|---|
| Unsorted list | O(1) | O(n) — scan for the most urgent |
| Sorted list | O(n) — find the right spot and shift | O(1) |
| **Heap** | **O(log n)** | **O(log n)** (peek is O(1)) |

A heap is the balanced choice, and it's remarkably simple.

### What a heap is

A **min-heap** is a binary tree with two rules:

1. **Every parent is smaller than (or equal to) its children.** So the smallest item is always at the top.
2. **The tree is filled level by level, left to right**, with no gaps.

That second rule lets us store the whole tree in a plain array with **no pointers at all**: the children of the item at position `i` are at positions `2i + 1` and `2i + 2`, and its parent is at `(i − 1) // 2`.

Note that a heap is **not sorted** — siblings can be in any order. It only guarantees that the top is the smallest. That's all a priority queue needs, and it's much cheaper to maintain than full sorting.

### Adding and removing

- **Add:** put the new item at the end of the array (the next free spot in the bottom level), then **bubble it up**: while it's smaller than its parent, swap them. At most one swap per level → O(log n).
- **Remove the top:** take the root, move the **last** item into the root's place, then **sink it down**: while it's bigger than one of its children, swap it with the smaller child. Again O(log n).

Watch both happen in the tree and in the array that stores it:

::widget HeapViz {}

In practice you'll use your language's built-in heap: Python's `heapq` (a min-heap), Java's `PriorityQueue`, C++'s `priority_queue` (a max-heap by default — watch out).

### Where heaps show up in real life

- **Task schedulers:** "run the job with the earliest deadline next".
- **Timers:** an operating system or a game engine keeping thousands of timers, always needing the one that fires soonest.
- **Map navigation:** Dijkstra's shortest-path algorithm (Algorithms track) repeatedly picks the closest unvisited location from a heap — that's inside every maps app.
- **Event simulations:** process events in order of their timestamps.
- **Merging sorted streams:** combining sorted log files from 100 servers into one sorted timeline.

### Heap patterns worth knowing

**Top K.** "Find the 10 most-viewed videos out of a billion." Sorting a billion items is wasteful. Instead, keep a **min-heap of size 10**: for each video, push it; if the heap grows beyond 10, pop the smallest. At the end, the heap holds the top 10. That's O(n log 10) — basically O(n) — and it works on a stream too big to fit in memory.

```python
import heapq
def top_k(view_counts, k):
    heap = []
    for item in view_counts:          # item = (views, video_id)
        heapq.heappush(heap, item)
        if len(heap) > k:
            heapq.heappop(heap)       # drop the smallest; the k largest survive
    return sorted(heap, reverse=True)
```

**Merging k sorted lists.** Put the first item from each list in a heap; repeatedly take the smallest and push the next item from the same list. This is how databases sort data bigger than memory (Algorithms track, sorting chapter).

**Running median.** Keep the smaller half of the numbers in a max-heap and the larger half in a min-heap, balanced in size. The median is always at the top of one or both. Each new number costs O(log n).

> [!EXAMPLE] **"How many meeting rooms do we need?"** Given meetings with start and end times, sort them by start time and keep a min-heap of the end times of meetings in progress. For each new meeting, if the earliest-ending meeting has finished, reuse its room (pop); then push the new meeting's end time. The largest the heap ever gets is the number of rooms needed. Calendar apps solve exactly this when suggesting rooms.

## Part 2: Tries — organizing words by their letters

> [!ANALOGY] Think of the index tabs on a big paper dictionary: first find the section for "C", then within it the pages for "CA", then "CAT". Each letter narrows the search. A **trie** (pronounced "try", from re*trie*val) is a tree built exactly this way: each step down follows one more letter.

In a trie, every path from the root spells out a prefix. Words that share a beginning share the same path:

```text
            (root)
           /      \
          c        d
          |        |
          a        o
        /   \      |
       t*    r*    g*        * marks the end of a complete word
       |
       s*
```

This small trie holds "cat", "cats", "car" and "dog". Finding a word of length L takes **L steps, no matter how many words are stored** — whether the trie holds 100 words or 10 million.

```python
class Trie:
    def __init__(self):
        self.root = {}
    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})   # follow or create the branch for this letter
        node["$"] = True                     # mark the end of a complete word
    def _walk(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node:
                return None
            node = node[ch]
        return node
    def contains(self, word):
        node = self._walk(word)
        return node is not None and "$" in node
    def has_prefix(self, prefix):
        return self._walk(prefix) is not None
```

### Where tries show up

- **Autocomplete.** As you type "pyth" in a search box, walk to that node and list the words below it. Real systems store the most popular completions at each node so suggestions appear instantly. (System Design track → typeahead case study.)
- **Spell checkers and word games**, such as finding every dictionary word in a Boggle grid: the trie lets you abandon a path the moment no word starts with those letters.
- **Internet routing.** Routers find the longest matching address prefix for every packet (Networking track, chapter 2) using tries built over the bits of IP addresses.
- **Search engines** store their term dictionaries in compressed trie-like structures.

The cost is memory: one node per letter. **Compressed tries** (also called **radix trees**) merge chains of single-child nodes into one edge labeled with several letters — the Linux kernel, many web frameworks' URL routers and Redis use them.

> [!RECAP]
> - A **priority queue** always gives you the most urgent item; a **binary heap** implements it with O(log n) add and remove and O(1) peek, stored in a plain array.
> - Heaps are only partially ordered — just enough to keep the top correct.
> - Uses: schedulers, timers, Dijkstra's shortest paths, merging sorted data, **top K**, running medians, meeting rooms.
> - A **trie** stores words letter by letter; lookups cost the word's length, independent of how many words exist.
> - Uses: **autocomplete**, spell checking, word games, **IP routing**; radix trees compress tries to save memory.

> [!INTERVIEW] Recognize the signals: "k largest / most frequent / closest", "merge k sorted", "median of a stream", "minimum number of rooms or machines" → heap. "Prefix", "autocomplete", "dictionary of words with wildcards", "find many words in a grid" → trie.

::quiz {"q":"What's the best way to find the 100 largest numbers in a stream of 1 billion?","options":["Sort everything — O(n log n)","Keep a min-heap of size 100 — O(n log 100)","A max-heap of all n items","Binary search"],"answer":1,"explain":"The heap's top is the smallest of the current top 100; anything bigger replaces it."}

::quiz {"q":"In a heap stored as an array, where are the children of the item at index 3?","options":["4 and 5","6 and 7","7 and 8","1 and 2"],"answer":2,"explain":"Children of i are at 2i + 1 and 2i + 2."}

::quiz {"q":"Looking up a 6-letter word in a trie holding 10 million words takes about…","options":["log₂(10 million) ≈ 23 steps","6 steps","10 million steps","One step"],"answer":1,"explain":"One step per letter, regardless of how many words are stored."}
