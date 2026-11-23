---
title: Design a Data Structure — Min-Stack, LFU Cache, Time-Based Store, Random Set and Twitter
summary: The "design a class with these operations in this complexity" interview problems, solved by combining basic structures: a min-stack in O(1), a queue from two stacks, insert/delete/getRandom in O(1), a time-based key-value store with binary search, an LFU cache in O(1), and a simplified Twitter feed with heaps — plus a method for any such problem.
---

::widget Scene {"title": "Min-stack: getMin in O(1)", "sub": "push 5, 3, 7, 2, then pop — a second stack remembers the minimum", "nodes": [{"id": "s", "kind": "cells", "label": "main stack (bottom → top)", "x": 0.0, "y": 0.0, "values": ["", "", "", ""]}, {"id": "m", "kind": "cells", "label": "min stack (min so far at each level)", "x": 5.58, "y": 5.58, "values": ["", "", "", ""]}], "metrics": [["op", "Operation"], ["min", "getMin()"]], "steps": [{"short": "Idea", "tag": "Idea", "title": "Store, at every level, the minimum of everything at or below it", "body": "<p>Then the minimum is always on top of the min stack, even after pops.</p>", "metrics": {"op": ["—"], "min": ["—"]}}, {"short": "5", "tag": "push", "title": "push 5 → min stack gets 5", "body": "<p>Only element: it's the minimum.</p>", "set": {"s": {"marks": {"0": "blue"}, "ptr": {}, "values": [5, "", "", ""]}, "m": {"marks": {"0": "green"}, "ptr": {}, "values": [5, "", "", ""]}}, "metrics": {"op": ["push 5"], "min": ["5"]}}, {"short": "3", "tag": "push", "title": "push 3 → min(3, 5) = 3", "body": "<p>New minimum.</p>", "set": {"s": {"marks": {"1": "blue"}, "ptr": {}, "values": [5, 3, "", ""]}, "m": {"marks": {"1": "green"}, "ptr": {}, "values": [5, 3, "", ""]}}, "metrics": {"op": ["push 3"], "min": ["3"]}}, {"short": "7", "tag": "push", "title": "push 7 → min(7, 3) = 3", "body": "<p>The min stack repeats 3.</p>", "set": {"s": {"marks": {"2": "blue"}, "ptr": {}, "values": [5, 3, 7, ""]}, "m": {"marks": {"2": "green"}, "ptr": {}, "values": [5, 3, 3, ""]}}, "metrics": {"op": ["push 7"], "min": ["3"]}}, {"short": "2", "tag": "push", "title": "push 2 → min = 2", "body": "<p>getMin() just reads the top: O(1).</p>", "set": {"s": {"marks": {"3": "blue"}, "ptr": {}, "values": [5, 3, 7, 2]}, "m": {"marks": {"3": "green"}, "ptr": {}, "values": [5, 3, 3, 2]}}, "metrics": {"op": ["push 2"], "min": ["2"]}}, {"short": "pop", "tag": "pop", "title": "pop → remove 2 from both stacks", "body": "<p>The minimum automatically reverts to 3 — no searching.</p>", "set": {"s": {"marks": {"3": "red"}, "ptr": {}, "values": [5, 3, 7, ""]}, "m": {"marks": {"2": "green"}, "ptr": {}, "values": [5, 3, 3, ""]}}, "metrics": {"op": ["pop"], "min": ["3", "good"]}}, {"short": "Space", "tag": "Optimise", "title": "Space trick: only push to the min stack when the value ≤ current min", "body": "<p>Pop from it only when the popped value equals its top.</p>", "note": {"kind": "key", "text": "Pair each level with the minimum so far. Every operation is O(1); the same idea gives max-stack and \"minimum of a queue\" via two stacks."}}]}

## The family of "design" questions

> [!STORY] "Implement a data structure that supports insert, delete and getRandom, all in O(1)." There's no single library type for it. The answer combines a hash map and an array in a clever way. These problems test whether you can **compose** basic structures to meet complexity requirements — exactly what real engineering needs when building caches, schedulers and indexes.

## A method

1. List the operations and the required complexity for each.
2. For each operation, ask which structure gives that complexity: hash map (O(1) lookup), array (O(1) index, random), linked list (O(1) splice), heap (O(log n) min/max), balanced tree/sorted list (O(log n) order queries), stack/queue.
3. Combine them and decide how they stay **in sync** on every operation.
4. Walk through edge cases: empty, duplicates, ties, capacity limits.

## Min-stack (and max-stack)

Keep a second stack of "minimum so far" (see the lesson). All operations O(1).

## Queue using two stacks

Push onto an **in** stack. To dequeue, if the **out** stack is empty, pop everything from *in* onto *out* (reversing the order), then pop from *out*. Each element moves at most once: **O(1) amortised**.

## Insert, delete, getRandom in O(1)

- An **array** of values supports O(1) random choice.
- A **hash map** value → index supports O(1) lookup.
- **Delete** in O(1): swap the element with the **last** element in the array, update the moved element's index in the map, pop the last.

```python
import random
class RandomizedSet:
    def __init__(self): self.vals, self.pos = [], {}
    def insert(self, v):
        if v in self.pos: return False
        self.pos[v] = len(self.vals); self.vals.append(v); return True
    def remove(self, v):
        if v not in self.pos: return False
        i, last = self.pos[v], self.vals[-1]
        self.vals[i], self.pos[last] = last, i
        self.vals.pop(); del self.pos[v]; return True
    def get_random(self): return random.choice(self.vals)
```

## Time-based key-value store

`set(key, value, timestamp)` and `get(key, timestamp)` returning the value with the largest timestamp ≤ the given one. Timestamps arrive in increasing order per key, so store a **list of (timestamp, value)** per key and **binary search** on get: set O(1), get O(log n).

## LRU and LFU caches

- **LRU** (DSA chapter 3 / LLD chapter 9): hash map + doubly linked list, all O(1).
- **LFU** — evict the least *frequently* used key, breaking ties by least recently used:
  - `key → (value, freq)` map,
  - `freq → doubly linked list of keys` (most recent at front),
  - a `minFreq` variable.
  - **get:** move the key from list `f` to list `f+1`; if list `f` became empty and `f == minFreq`, increment `minFreq`.
  - **put (new key, full):** evict the tail of list `minFreq`; insert the new key with freq 1; set `minFreq = 1`.
  - Every operation is O(1).

## Design Twitter (simplified)

Operations: `postTweet(user, id)`, `follow`, `unfollow`, `getNewsFeed(user)` returning the 10 most recent tweets from the user and those they follow.

- `user → set of followees` (hash set).
- `user → list of (time, tweetId)`, appended in time order.
- Feed = **merge k sorted lists** with a max-heap: push each followee's latest tweet, pop the newest, push that followee's next tweet, repeat 10 times. O(k + 10 log k).

At real scale this becomes the fan-out-on-write vs fan-out-on-read question from the System Design news-feed case study.

## Others worth knowing

- **Median of a data stream:** two heaps (max-heap for the lower half, min-heap for the upper), balanced in size; median from the tops. Add O(log n), median O(1).
- **Hit counter / rate limiter:** circular buffer of the last 300 seconds or a deque of timestamps.
- **Snapshot array:** per index, a list of (snapshotId, value) + binary search.
- **Range sum with updates:** Fenwick or segment tree (DSA chapter 8).

> [!RECAP]
> - Map each operation to a structure with the needed complexity; keep them in sync.
> - Min-stack: parallel min stack. Queue: two stacks, amortised O(1).
> - Random set: array + index map + swap-with-last delete.
> - Time-based store: per-key sorted list + binary search.
> - LFU: key map + frequency → linked list + minFreq, all O(1).
> - Feeds: merge k sorted lists with a heap; medians with two heaps.

> [!INTERVIEW] Min Stack (155), Implement Queue using Stacks (232), Insert Delete GetRandom O(1) (380), Time Based Key-Value Store (981), LRU (146), LFU (460), Design Twitter (355), Find Median from Data Stream (295).

::quiz {"q": "How does RandomizedSet delete in O(1)?", "options": ["Shift all elements left", "Swap the element with the last one, update its index in the map, then pop", "Mark it deleted forever", "Rebuild the array"], "answer": 1, "explain": "Removing from the end of an array is O(1)."}

::quiz {"q": "In an LFU cache, what decides which key is evicted?", "options": ["The oldest key overall", "The least frequently used key, ties broken by least recently used", "A random key", "The largest value"], "answer": 1, "explain": "Track minFreq and per-frequency recency lists."}

::quiz {"q": "How do you get a running median in O(log n) per insert?", "options": ["Sort after each insert", "Two heaps: a max-heap for the lower half and a min-heap for the upper half", "A single queue", "A hash map"], "answer": 1, "explain": "The median is at the heap tops."}
