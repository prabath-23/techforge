---
title: Hash Tables — Finding Anything Instantly
summary: The single most useful data structure in everyday programming. How a hash function turns any key into a locker number, what happens when two keys want the same locker, why tables resize, how attackers once used collisions to take down websites, the patterns that solve countless interview problems, and an LRU cache built from a hash table plus a linked list.
---

::widget Scene {"title": "Hash tables: from a key straight to its slot", "sub": "insert, collide, look up, grow — 8 buckets with chaining", "nodes": [{"id": "bk", "kind": "cells", "label": "buckets 0–7", "x": 3.1, "y": 3.1, "values": ["", "", "", "", "", "", "", ""]}], "metrics": [["op", "Operation"], ["hash", "hash(key) % 8"], ["load", "Load factor"]], "steps": [{"short": "Idea", "tag": "Idea", "title": "An array plus a function that turns a key into an index", "body": "<p>No searching: compute where the key belongs and go straight there.</p>", "metrics": {"op": ["—"], "hash": ["—"], "load": ["0 / 8"]}}, {"short": "Put1", "tag": "put", "title": "put(\"asha\", 91): hash(\"asha\") % 8 = 3", "body": "<p>Store the key and value in bucket 3. Keep the key — you need it to tell entries apart later.</p>", "set": {"bk": {"marks": {"3": "blue"}, "ptr": {"asha": 3}, "values": ["", "", "", "asha", "", "", "", ""]}}, "metrics": {"op": ["put asha"], "hash": ["3"], "load": ["1 / 8"]}}, {"short": "Put2", "tag": "put", "title": "put(\"ben\", 77) → 6, put(\"chen\", 64) → 0", "body": "<p>Each lands in its own bucket.</p>", "set": {"bk": {"marks": {"6": "blue", "0": "blue"}, "ptr": {}, "values": ["chen", "", "", "asha", "", "", "ben", ""]}}, "metrics": {"op": ["put ben, chen"], "hash": ["6, 0"], "load": ["3 / 8"]}}, {"short": "Collide", "tag": "Collision", "title": "put(\"dev\", 50) → 3. Bucket 3 is taken!", "body": "<p>Two keys, one bucket: a collision. Unavoidable — there are infinitely many keys and only 8 slots.</p>", "set": {"bk": {"marks": {"3": "red"}, "ptr": {"dev": 3}, "values": ["chen", "", "", "asha", "", "", "ben", ""]}}, "metrics": {"op": ["put dev"], "hash": ["3 (collision)"]}}, {"short": "Chain", "tag": "Chaining", "title": "Chaining: bucket 3 holds a small list", "body": "<p>asha → dev. (Open addressing would instead probe bucket 4, 5… for a free slot.)</p>", "set": {"bk": {"marks": {"3": "orange"}, "ptr": {}, "values": ["chen", "", "", "asha→dev", "", "", "ben", ""]}}, "metrics": {"load": ["4 / 8"]}}, {"short": "Get", "tag": "get", "title": "get(\"dev\"): hash → 3, walk the short chain, compare keys", "body": "<p>asha ≠ dev, dev = dev → 50. Still O(1) on average because chains stay short.</p>", "set": {"bk": {"marks": {"3": "green"}, "ptr": {"get": 3}, "values": ["chen", "", "", "asha→dev", "", "", "ben", ""]}}, "metrics": {"op": ["get dev → 50"]}}, {"short": "Miss", "tag": "get", "title": "get(\"eve\") → 5: empty bucket → not present", "body": "<p>One step to know a key is missing.</p>", "set": {"bk": {"marks": {"5": "dark"}, "ptr": {"get": 5}, "values": ["chen", "", "", "asha→dev", "", "", "ben", ""]}}, "metrics": {"op": ["get eve → none"]}}, {"short": "Full", "tag": "Load", "title": "Add more keys: load factor passes 0.75", "body": "<p>6 entries in 8 buckets. Chains get longer; lookups slow down.</p>", "set": {"bk": {"marks": {"1": "orange", "3": "red", "6": "orange"}, "ptr": {}, "values": ["chen", "fay", "", "asha→dev→gus", "", "", "ben→hal", ""]}}, "metrics": {"op": ["put fay, gus, hal"], "load": ["7 / 8", "bad"]}}, {"short": "Resize", "tag": "Resize", "title": "Resize: allocate 16 buckets and re-insert every key", "body": "<p>Each key's index is recomputed with % 16, so chains spread out. O(n) once, but doubling makes it O(1) amortised per insert.</p>", "set": {"bk": {"marks": {}, "ptr": {}, "values": ["chen", "fay", "", "asha", "", "", "ben", "", "", "", "", "dev", "", "", "hal", "gus"], "label": "buckets 0–15"}}, "metrics": {"op": ["rehash into 16"], "hash": ["hash % 16"], "load": ["7 / 16", "good"]}}, {"short": "Hash", "tag": "Hash quality", "title": "A good hash spreads keys evenly", "body": "<p>A bad one (e.g. \"first letter\") piles keys into a few buckets and everything becomes O(n). Attackers can even craft colliding keys, which is why languages randomise hash seeds.</p>", "note": {"kind": "key", "text": "Hash table: index = hash(key) % size. Handle collisions (chaining or probing), keep the load factor low by doubling. Average O(1) put/get/delete."}}]}




::widget Scene {"title": "Collisions: two keys, one bucket", "sub": "chaining and open addressing", "nodes": [{"id": "b", "kind": "cells", "label": "buckets", "x": 3.1, "y": 3.1, "values": ["", "", "", "asha", "", "", "", ""]}], "metrics": [["k", "New key"], ["how", "Strategy"]], "steps": [{"short": "Collision", "tag": "Problem", "title": "\"zoe\" also hashes to bucket 3", "body": "<p>With more keys than buckets, collisions are guaranteed (pigeonhole principle) — and even with few keys they happen by chance (the birthday paradox).</p>", "set": {"b": {"marks": {"3": "red"}, "ptr": {"zoe→3": 3}, "values": ["", "", "", "asha", "", "", "", ""]}}, "metrics": {"k": ["zoe → 3"], "how": ["?"]}}, {"short": "Chaining", "tag": "Fix 1", "title": "Chaining: each bucket holds a small list", "body": "<p>Bucket 3 keeps a list: asha → zoe. Lookups check the few items in that bucket. Java's HashMap does this (and turns long chains into trees).</p>", "set": {"b": {"marks": {"3": "blue"}, "ptr": {}, "values": ["", "", "", "asha,zoe", "", "", "", ""]}}, "metrics": {"how": ["chaining"]}}, {"short": "Probing", "tag": "Fix 2", "title": "Open addressing: try the next free slot", "body": "<p>Alternatively, store zoe in the next empty bucket (4). Lookups probe 3, then 4… Python's dict and Go maps use variations of this.</p>", "set": {"b": {"marks": {"3": "dark", "4": "green"}, "ptr": {"probe": 4}, "values": ["", "", "", "asha", "zoe", "", "", ""]}}, "metrics": {"how": ["open addressing"]}, "note": {"kind": "key", "text": "Either way, lookups stay O(1) on average as long as the table isn't too full — which is why tables resize (next lesson)."}}]}

::widget Scene {"title": "Resizing: keeping the table fast", "sub": "double the buckets when it gets crowded", "nodes": [{"id": "b", "kind": "cells", "label": "8 buckets", "x": 3.1, "y": 3.1, "values": ["ravi", "li", "asha", "zoe", "omar", "kai", "", "max"]}], "metrics": [["load", "Load factor (items ÷ buckets)"], ["state", "State"]], "steps": [{"short": "Crowded", "tag": "Problem", "title": "7 items in 8 buckets: collisions everywhere", "body": "<p>The <b>load factor</b> is items ÷ buckets = 0.875. Chains get long or probes get long, and O(1) drifts towards O(n).</p>", "set": {"b": {"marks": {"0": "red", "1": "red", "2": "red", "3": "red", "4": "red", "5": "red", "7": "red"}, "ptr": {}, "values": ["ravi", "li", "asha", "zoe", "omar", "kai", "", "max"]}}, "metrics": {"load": ["0.88", "bad"], "state": ["slow"]}}, {"short": "Double", "tag": "Resize", "title": "Allocate 16 buckets and re-insert everything", "body": "<p>Past a threshold (often 0.75), the table allocates twice the buckets and <b>rehashes</b> every key, since <code>hash % 16</code> gives new positions.</p>", "set": {"b": {"marks": {"1": "green", "3": "green", "6": "green", "9": "green", "10": "green", "12": "green", "15": "green"}, "ptr": {}, "values": ["", "li", "", "ravi", "", "", "asha", "", "", "zoe", "max", "", "omar", "", "", "kai"]}}, "metrics": {"load": ["0.44", "good"], "state": ["fast again"]}}, {"short": "Amortized", "tag": "Insight", "title": "Occasional big copy, cheap on average", "body": "<p>Like dynamic arrays, doubling makes the rare O(n) rehash average out to O(1) per insert. Latency-sensitive systems (Redis) rehash gradually in small steps to avoid pauses.</p>", "note": {"kind": "key", "text": "Load factor is the dial: lower = faster but more memory; higher = compact but more collisions."}}]}







## The coat check

> [!ANALOGY] At a theater's coat check, you hand over your coat and get a ticket with a number — say 47. When you come back, the attendant doesn't search through hundreds of coats; they walk straight to hook 47. A **hash table** works the same way: it turns your key ("alice@example.com") into a hook number, and stores the value on that hook. Finding it later is one calculation and one look.

Python's `dict` and `set`, JavaScript's objects and `Map`, Java's `HashMap`, Go's `map` — they're all hash tables. They give **O(1) average time** to add, find and remove items by key, which is why experienced programmers reach for them constantly.

## How it works

A hash table is an array of slots (called **buckets**) plus a **hash function**.

1. The hash function turns the key into a big number: `hash("alice@example.com") → 8,203,411,778`.
2. That number is reduced to a bucket index: `8,203,411,778 mod 16 = 2` (for a table with 16 buckets).
3. The value is stored in bucket 2. To look it up later, repeat steps 1 and 2 and go straight there.

A good hash function must:

- **always give the same output for the same key** (or you'd never find your coat again),
- be **fast**, since it runs on every operation,
- **spread keys evenly** across buckets, so that similar keys ("user1", "user2") land in very different places.

## Collisions: when two keys want the same bucket

With more possible keys than buckets, two keys will sometimes land in the same bucket. This is a **collision**, and it happens far sooner than intuition suggests.

> [!NOTE] **The birthday paradox.** In a room of just 23 people, there's a better-than-even chance two share a birthday — even though there are 365 possible birthdays. Similarly, a table with 365 buckets gets its first collision after about 23 keys on average. Collisions aren't rare edge cases; every hash table must handle them.

There are two main ways to handle them. Try both:

::widget HashTableViz {}

**Separate chaining:** each bucket holds a small list. Colliding keys simply join the list. Lookup means going to the bucket and scanning its short list. Java's `HashMap` does this, and if one bucket's list grows long (more than 8 items), Java turns that list into a balanced tree so even the worst case stays reasonable.

**Open addressing:** everything lives directly in the array. If your bucket is taken, try the next one, and the next, until you find a free spot (**linear probing**). Lookups follow the same path. This is very cache-friendly (the slots are next to each other in memory, chapter 1), and Python's `dict` and Google's high-performance "Swiss tables" use variations of it.

> [!WARN] With open addressing, you can't simply empty a slot when deleting a key: a later key that had to skip past it would become unreachable, because searches stop at empty slots. Deleted slots are marked with a "tombstone" instead.

## Keeping it fast: load factor and resizing

The **load factor** is how full the table is: items ÷ buckets. As it rises, collisions multiply and lookups slow down. So hash tables **resize** — typically doubling the number of buckets — when the load factor passes a threshold (0.75 in Java, about two-thirds in Python), and every key is re-inserted into the new, bigger table.

Resizing costs O(n), but like the list doubling in chapter 1, it happens rarely enough that each insertion is still **O(1) amortized**.

> [!EXAMPLE] **Redis**, which often holds millions of keys, avoids freezing during a big resize: it keeps the old and new tables side by side and moves a few buckets on each operation, finishing the move gradually. No single request pays for the whole resize.

## Equal keys must hash equally

If you use your own objects as keys, two objects that are **equal** must produce the **same hash**. Break that rule and the table will look in the wrong bucket and never find things you put in.

```java
// Java: if you override equals(), you MUST override hashCode() consistently
record Point(int x, int y) {}      // records generate both correctly
Map<Point, String> labels = new HashMap<>();
labels.put(new Point(1, 2), "A");
labels.get(new Point(1, 2));       // "A" — works because equal points hash the same
```

And never change a key after putting it in a table: its hash changes, so it's now sitting in the "wrong" bucket and can't be found.

## When hash tables go wrong: hash flooding

> [!STORY] **The 2011 hash collision attack.** Researchers showed that many web frameworks (in PHP, Java, Python, Ruby, ASP.NET) stored form fields in hash tables using predictable hash functions. An attacker could craft a single web request with thousands of field names that **all landed in the same bucket**. Every insert then had to scan an ever-growing list — O(n²) work — and one small request could keep a server's CPU busy for minutes. The fix, now standard: use hash functions with a **secret random seed** chosen when the program starts (Python's string hashes change every time you run Python for exactly this reason), and cap or tree-ify long buckets.

## Patterns that solve countless problems

Most hash-table interview problems are variations on a handful of patterns.

**1. Counting**

```python
from collections import Counter
votes = ["red", "blue", "red", "green", "red"]
Counter(votes).most_common(1)     # [('red', 3)]
```

**2. "Have I seen this before?"**

```python
def first_repeated(items):
    seen = set()
    for x in items:
        if x in seen:
            return x
        seen.add(x)
```

**3. Finding a partner (the famous "two-sum")** — "find two numbers that add up to a target". Checking every pair is O(n²). With a hash map, for each number we ask "have I already seen the partner I need?", in O(1):

```python
def two_sum(nums, target):
    seen = {}                       # number → its position
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i

two_sum([2, 7, 11, 15], 9)   # [0, 1]
```

**4. Grouping by a key** — "group words that are anagrams of each other": words with the same letters sorted are anagrams, so the sorted letters become the key.

```python
from collections import defaultdict
groups = defaultdict(list)
for w in ["eat", "tea", "tan", "ate", "nat"]:
    groups["".join(sorted(w))].append(w)
# {'aet': ['eat', 'tea', 'ate'], 'ant': ['tan', 'nat']}
```

**5. Caching results** — store answers to expensive calculations so you never compute them twice (the heart of dynamic programming, Algorithms track).

## Building something bigger: an LRU cache

Real systems often combine two structures to get the best of both. A classic example — and one of the most common interview questions — is the **LRU cache**.

A cache holds a limited number of items (say, the 1,000 most recently viewed product pages). When it's full and a new item arrives, it throws out the **least recently used** item. It must do three things fast:

- look up an item by key → a **hash map** gives O(1);
- mark an item as "just used" → move it to the front of a **doubly linked list**, O(1) when the map tells us where its node is;
- throw out the least recently used item → remove from the back of the list, O(1).

> [!ANALOGY] A small bookshelf by your bed that holds 5 books. Whenever you read a book, it goes to the left end. When you buy a sixth book, the one at the far right — the one you haven't touched for longest — goes back to the big bookcase downstairs. The hash map is your memory of exactly where each book sits on the shelf.

Try it:

::widget LruCache {}

```python
class Node:
    def __init__(self, key=None, val=None):
        self.key, self.val, self.prev, self.next = key, val, None, None

class LRUCache:
    def __init__(self, capacity):
        self.cap, self.map = capacity, {}
        self.head, self.tail = Node(), Node()          # sentinels: most-recent side, least-recent side
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, n):
        n.prev.next, n.next.prev = n.next, n.prev
    def _add_front(self, n):
        n.prev, n.next = self.head, self.head.next
        self.head.next.prev = n
        self.head.next = n

    def get(self, key):
        if key not in self.map:
            return None
        n = self.map[key]
        self._unlink(n); self._add_front(n)            # mark as most recently used
        return n.val

    def put(self, key, val):
        if key in self.map:
            self._unlink(self.map[key])
        n = Node(key, val)
        self.map[key] = n
        self._add_front(n)
        if len(self.map) > self.cap:                   # evict the least recently used
            lru = self.tail.prev
            self._unlink(lru)
            del self.map[lru.key]
```

## When NOT to use a hash table

- You need items **in order** ("the next appointment after 3 pm", "all users with names between M and P") → use a sorted structure: a balanced tree or B-tree (chapter 4).
- Your keys are small whole numbers (0 to 1,000) → a plain array is simpler and faster.
- Memory is extremely tight → hash tables use extra space for empty buckets.

## Clever cousins: probabilistic structures

Sometimes "probably" is good enough and saves enormous memory:

- **Bloom filter** — answers "is this item in the set?" with either **"definitely not"** or **"probably yes"**, using about 10 bits per item no matter how big the items are. Databases use them to skip reading files that can't contain a key; browsers have used them to check URLs against lists of known malicious sites.
- **HyperLogLog** — estimates **how many distinct items** you've seen (unique visitors, unique search queries) among billions, using about 12 KB of memory, within about 1%.

> [!RECAP]
> - A **hash table** turns a key into a bucket index with a **hash function**, giving O(1) average add, find and remove.
> - **Collisions** are inevitable; they're handled by **chaining** (lists in buckets) or **open addressing** (probing for the next free slot).
> - Tables **resize** when the **load factor** gets too high, keeping operations O(1) amortized.
> - Equal keys must hash equally; don't mutate keys. Use **seeded** hash functions to resist **hash flooding**.
> - Key patterns: **counting**, **seen-before**, **finding a partner**, **grouping**, **caching**.
> - An **LRU cache** combines a hash map with a doubly linked list.

> [!INTERVIEW] Be ready to explain how a hash map works internally (hashing, buckets, collisions, resizing) and its worst case. Then recognize the patterns: two-sum, group anagrams, longest substring without repeating characters, subarray sum equals k (prefix sums + map), and designing an LRU cache.

::quiz {"q":"Why can't open addressing simply empty a slot when a key is deleted?","options":["It wastes memory","Searches stop at empty slots, so keys stored further along the probe path would become unreachable","Hash functions forbid it","It triggers a resize"],"answer":1,"explain":"A tombstone marker keeps the probe chain intact."}

::quiz {"q":"How do modern languages defend against hash flooding attacks?","options":["By disabling hash tables","By using hash functions with a secret random seed, and capping long buckets","By sorting all keys","By limiting table size to 100"],"answer":1,"explain":"Attackers can't predict which keys collide without knowing the seed."}

::quiz {"q":"An LRU cache needs O(1) lookup and O(1) 'mark as recently used'. Which combination provides both?","options":["Array + binary search","Hash map + doubly linked list","Two stacks","A sorted tree"],"answer":1,"explain":"The map finds the node; the list moves and evicts in constant time."}
