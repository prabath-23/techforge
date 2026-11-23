---
title: Heaps and Tries — Priorities and Prefixes
summary: Two specialized structures with outsized usefulness. Heaps always hand you the most urgent item instantly — they power hospital-style priority queues, "top 10" lists, schedulers and map navigation. Tries organize words by their letters — they power autocomplete, spell checkers and internet routing.
---

::widget Scene {"title": "Binary heaps: always know the smallest", "sub": "push 5, 3, 8, 1 then pop the minimum — the array is the tree", "nodes": [{"id": "h", "kind": "cells", "label": "heap array (children of i at 2i+1, 2i+2)", "x": 3.1, "y": 3.1, "values": ["", "", "", ""]}], "metrics": [["op", "Operation"], ["min", "Minimum"], ["swaps", "Swaps"]], "steps": [{"short": "Rule", "tag": "Rule", "title": "Min-heap rule: every parent ≤ its children", "body": "<p>Stored in an array, no pointers: parent of i is (i−1)/2. The minimum is always at index 0.</p>", "metrics": {"op": ["—"], "min": ["—"], "swaps": ["0"]}}, {"short": "P5", "tag": "push", "title": "push 5", "body": "<p>Append at the end.</p>", "set": {"h": {"marks": {"0": "blue"}, "ptr": {}, "values": [5, "", "", ""]}}, "metrics": {"op": ["push 5"], "min": ["5"]}}, {"short": "P3", "tag": "push", "title": "push 3: append at index 1, its parent is 5", "body": "<p>3 < 5 violates the rule.</p>", "set": {"h": {"marks": {"1": "orange", "0": "orange"}, "ptr": {}, "values": [5, 3, "", ""]}}, "metrics": {"op": ["push 3"]}}, {"short": "Up", "tag": "sift-up", "title": "Sift up: swap with the parent", "body": "<p>Now 3 is the root.</p>", "set": {"h": {"marks": {"0": "green"}, "ptr": {}, "values": [3, 5, "", ""]}}, "metrics": {"min": ["3"], "swaps": ["1"]}}, {"short": "P8", "tag": "push", "title": "push 8 at index 2: parent 3 ≤ 8, fine", "body": "<p>No swaps.</p>", "set": {"h": {"marks": {"2": "blue"}, "ptr": {}, "values": [3, 5, 8, ""]}}, "metrics": {"op": ["push 8"], "swaps": ["0"]}}, {"short": "P1", "tag": "push", "title": "push 1 at index 3: parent (index 1) is 5", "body": "<p>1 < 5 → swap.</p>", "set": {"h": {"marks": {"3": "orange", "1": "orange"}, "ptr": {}, "values": [3, 5, 8, 1]}}, "metrics": {"op": ["push 1"]}}, {"short": "Up2", "tag": "sift-up", "title": "Now at index 1; parent is 3 → swap again", "body": "<p>At most log n swaps — the height of the tree.</p>", "set": {"h": {"marks": {"0": "orange", "1": "orange"}, "ptr": {}, "values": [3, 1, 8, 5]}}, "metrics": {"swaps": ["1"]}}, {"short": "Top", "tag": "sift-up", "title": "1 reaches the root", "body": "<p>Heap valid again.</p>", "set": {"h": {"marks": {"0": "green"}, "ptr": {}, "values": [1, 3, 8, 5]}}, "metrics": {"min": ["1"], "swaps": ["2"]}}, {"short": "Pop", "tag": "pop", "title": "pop: take the root (1), move the last element (5) to the top", "body": "<p>The shape stays compact; now fix the order.</p>", "set": {"h": {"marks": {"0": "red"}, "ptr": {}, "values": [5, 3, 8, ""]}}, "metrics": {"op": ["pop → 1"], "swaps": ["0"]}}, {"short": "Down", "tag": "sift-down", "title": "Sift down: swap with the smaller child (3)", "body": "<p>Choosing the smaller child guarantees the new parent is ≤ both children.</p>", "set": {"h": {"marks": {"0": "green", "1": "orange"}, "ptr": {}, "values": [3, 5, 8, ""]}}, "metrics": {"min": ["3"], "swaps": ["1"]}}, {"short": "Use", "tag": "Uses", "title": "Uses: priority queues, Dijkstra, top-K, scheduling, merging sorted lists", "body": "<p>push and pop O(log n), peek O(1), build from an array in O(n).</p>", "note": {"kind": "key", "text": "Heap = complete binary tree in an array. push → append + sift up. pop → move last to root + sift down toward the smaller child."}}]}




::widget Scene {"title": "Top-K with a small heap", "sub": "the 3 biggest numbers in a huge stream", "nodes": [{"id": "s", "kind": "cells", "label": "stream (one at a time)", "x": 0.93, "y": 0.93, "values": [4, 19, 7, 25, 3, 12, 30, 8]}, {"id": "h", "kind": "cells", "label": "min-heap of size 3", "x": 6.82, "y": 6.82, "values": [4, 7, 19]}], "metrics": [["k", "Keep"], ["mem", "Memory"]], "steps": [{"short": "Idea", "tag": "Setup", "title": "Keep only the best 3 seen so far", "body": "<p>Sorting a billion numbers to get the top 3 is wasteful. Keep a <b>min-heap of size 3</b>: its root is the smallest of the current top 3 — the one to beat.</p>", "set": {"s": {"marks": {"0": "blue", "1": "blue", "2": "blue"}, "ptr": {"i": 2}}}, "metrics": {"k": ["4, 7, 19"], "mem": ["3 items", "good"]}}, {"short": "Beat it", "tag": "Replace", "title": "25 beats the root (4): replace it", "body": "<p>25 > 4, so pop 4 and push 25. The heap now holds 7, 19, 25.</p>", "set": {"s": {"marks": {"3": "green"}, "ptr": {"i": 3}}, "h": {"marks": {"2": "green"}, "ptr": {}, "values": [7, 19, 25]}}}, {"short": "Ignore", "tag": "Skip", "title": "3 doesn't beat 7: ignore it", "body": "<p>Most numbers are rejected with one comparison against the root.</p>", "set": {"s": {"marks": {"4": "dark"}, "ptr": {"i": 4}}}}, {"short": "Result", "tag": "Done", "title": "After the stream: 19, 25, 30", "body": "<p>12 replaced 7, 30 replaced 12, 8 was ignored. O(n log k) time and O(k) memory — it works on streams far bigger than RAM.</p>", "set": {"s": {"marks": {"6": "green"}, "ptr": {"i": 7}}, "h": {"marks": {"0": "green", "1": "green", "2": "green"}, "ptr": {}, "values": [19, 25, 30]}}, "note": {"kind": "key", "text": "Top-K uses a MIN-heap for the largest K (evict the weakest), and a MAX-heap for the smallest K."}}]}

::widget Scene {"title": "Tries: prefix search for autocomplete", "sub": "car, card, care, cat", "nodes": [{"id": "r", "kind": "node", "label": "root", "x": 6.0, "y": -6.0, "size": 1.9, "color": "teal"}, {"id": "c", "kind": "node", "label": "c", "x": 9.41, "y": -2.59, "size": 1.9, "color": "teal"}, {"id": "a", "kind": "node", "label": "a", "x": 12.82, "y": 0.82, "size": 1.9, "color": "teal"}, {"id": "rr", "kind": "node", "label": "r ●", "x": 13.73, "y": 6.73, "size": 1.9, "color": "teal"}, {"id": "t", "kind": "node", "label": "t ●", "x": 18.73, "y": 1.73, "size": 1.9, "color": "teal"}, {"id": "d", "kind": "node", "label": "d ●", "x": 15.64, "y": 11.64, "size": 1.9, "color": "teal"}, {"id": "e", "kind": "node", "label": "e ●", "x": 18.64, "y": 8.64, "size": 1.9, "color": "teal"}], "links": [["r", "c"], ["c", "a"], ["a", "rr"], ["a", "t"], ["rr", "d"], ["rr", "e"]], "metrics": [["typed", "Typed"], ["sugg", "Suggestions"]], "steps": [{"short": "Shared prefixes", "tag": "Concept", "title": "Words share paths for shared prefixes", "body": "<p>car, card, care and cat all start with \"ca\", so they share those nodes. ● marks where a complete word ends.</p>", "metrics": {"typed": ["—"], "sugg": ["—"]}}, {"short": "Type \"ca\"", "tag": "Walk", "title": "Typing \"ca\" walks two edges", "body": "<p>Lookup cost depends only on the length of what's typed, not on how many words are stored.</p>", "flow": [[["r", "c", "a"], "#f59e0b", "c → a"]], "focus": ["a"], "metrics": {"typed": ["ca"]}}, {"short": "Suggest", "tag": "Collect", "title": "Everything below \"ca\" is a suggestion", "body": "<p>Collect the words in the subtree: car, card, care, cat. Real autocomplete stores a popularity score so the best suggestions come first.</p>", "set": {"rr": {"badge": "car"}, "d": {"badge": "card"}, "e": {"badge": "care"}, "t": {"badge": "cat"}}, "metrics": {"sugg": ["car, card, care, cat", "good"]}, "note": {"kind": "key", "text": "Tries power autocomplete, spell checkers and IP routing (longest prefix match)."}}]}







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
