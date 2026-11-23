---
title: Probabilistic Data Structures — Bloom Filters, HyperLogLog and Count-Min Sketch
summary: Structures that trade a small, controlled error for enormous savings in memory — Bloom filters that answer "definitely not" or "probably yes", HyperLogLog that counts billions of unique items in 12 KB, Count-Min sketches for finding the most frequent items in a stream, and where Chrome, Cassandra, Redis and analytics systems use them.
---

::widget Scene {"title": "Bloom filters: \"definitely not\" or \"probably yes\"", "sub": "10 bits, 3 hash functions, one false positive", "nodes": [{"id": "bf", "kind": "cells", "label": "bit array 0–9", "x": 3.1, "y": 3.1, "values": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]}], "metrics": [["op", "Operation"], ["h", "Hash positions"], ["ans", "Answer"]], "steps": [{"short": "Idea", "tag": "Idea", "title": "A bit array plus k hash functions", "body": "<p>Tiny memory, no keys stored. Used to avoid expensive lookups for things that aren't there.</p>", "metrics": {"op": ["—"], "h": ["—"], "ans": ["—"]}}, {"short": "Cat", "tag": "Add", "title": "add(\"cat\"): hashes give 1, 4, 7 → set those bits", "body": "<p>The word itself is not stored.</p>", "set": {"bf": {"marks": {"1": "blue", "4": "blue", "7": "blue"}, "ptr": {}, "values": [0, 1, 0, 0, 1, 0, 0, 1, 0, 0]}}, "metrics": {"op": ["add cat"], "h": ["1, 4, 7"]}}, {"short": "Dog", "tag": "Add", "title": "add(\"dog\") → 3, 4, 9", "body": "<p>Bit 4 was already set; that's fine — bits are shared.</p>", "set": {"bf": {"marks": {"3": "blue", "4": "blue", "9": "blue"}, "ptr": {}, "values": [0, 1, 0, 1, 1, 0, 0, 1, 0, 1]}}, "metrics": {"op": ["add dog"], "h": ["3, 4, 9"]}}, {"short": "QCat", "tag": "Query", "title": "contains(\"cat\")? bits 1, 4, 7 all set", "body": "<p>→ \"probably yes\".</p>", "set": {"bf": {"marks": {"1": "green", "4": "green", "7": "green"}, "ptr": {}, "values": [0, 1, 0, 1, 1, 0, 0, 1, 0, 1]}}, "metrics": {"op": ["query cat"], "h": ["1, 4, 7"], "ans": ["probably yes", "good"]}}, {"short": "QCow", "tag": "Query", "title": "contains(\"cow\")? 2, 4, 7 — bit 2 is 0", "body": "<p>If cow had been added, bit 2 would be 1. So: definitely not. No false negatives, ever.</p>", "set": {"bf": {"marks": {"2": "red", "4": "green", "7": "green"}, "ptr": {}, "values": [0, 1, 0, 1, 1, 0, 0, 1, 0, 1]}}, "metrics": {"op": ["query cow"], "h": ["2, 4, 7"], "ans": ["definitely not", "good"]}}, {"short": "QFox", "tag": "False positive", "title": "contains(\"fox\")? 1, 3, 9 — all set by cat and dog!", "body": "<p>Fox was never added. A false positive — the price of saving memory.</p>", "set": {"bf": {"marks": {"1": "orange", "3": "orange", "9": "orange"}, "ptr": {}, "values": [0, 1, 0, 1, 1, 0, 0, 1, 0, 1]}}, "metrics": {"op": ["query fox"], "h": ["1, 3, 9"], "ans": ["probably yes (wrong!)", "bad"]}}, {"short": "Tune", "tag": "Tuning", "title": "More bits and the right number of hashes lower the error", "body": "<p>~10 bits per item and 7 hashes give about 1% false positives, whatever the item size.</p>"}, {"short": "Use", "tag": "Uses", "title": "Where they're used", "body": "<p>Databases skip SSTables that can't contain a key; browsers check malicious-URL lists; caches avoid storing one-hit wonders.</p>"}, {"short": "Family", "tag": "Relatives", "title": "Other sketches trade exactness for memory too", "body": "<p>Count-min sketch (approximate counts), HyperLogLog (count distinct users in 12 KB), Cuckoo filters (support deletion).</p>", "note": {"kind": "key", "text": "Bloom filter: set k bits per item; query = all k set? \"No\" is certain, \"yes\" is probable. Can't delete from a plain one."}}]}




## Counting a billion visitors in 12 kilobytes

> [!STORY] An analytics dashboard must show how many **unique** users visited each page today. The exact way is to keep a set of every user ID seen — for a popular site, hundreds of millions of IDs per page per day, gigabytes of memory per counter, multiplied by thousands of pages. Redis offers another way: `PFADD page:home user123` and `PFCOUNT page:home`. Each counter uses at most **12 KB** no matter how many users it sees, and the answer is within about **1%** of the truth. For a dashboard, 1% error for a million-fold memory saving is an easy trade.

**Probabilistic data structures** give approximate answers with **guaranteed error bounds**, using tiny, fixed amounts of memory. They're everywhere in large systems — databases, browsers, networks and analytics.

## Bloom filters: "definitely not" or "probably yes"

A **Bloom filter** answers set membership: "have I seen this item?" It can say:

- **"Definitely not"** — always correct.
- **"Probably yes"** — usually correct, with a small chance of a **false positive**.

It never gives false negatives.

### How it works

- A bit array of *m* bits, all 0, and *k* different hash functions.
- **Add** an item: hash it *k* ways, set those *k* bits to 1.
- **Check** an item: hash it *k* ways. If **any** of those bits is 0, it was **never added**. If all are 1, it was **probably** added — or other items happened to set all those bits.

::widget Stepper {"type":"flow","cols":3,"title":"A Bloom filter with 16 bits and 3 hash functions","what":"Adding two items to a small Bloom filter, then checking two others. Each box is one step; follow which bits are set.","steps":["Press Play and track the bits being set.","Find the check that is answered 'definitely not' by a single zero bit.","Find the false positive, and explain why it happened."],"nodes":[["Start","16 bits, all 0: 0000000000000000. Three hash functions map any item to three positions."],["Add 'apple'","Hashes to positions 2, 7 and 11. Set them: bits 2, 7, 11 = 1."],["Add 'mango'","Hashes to positions 4, 7 and 14. Bit 7 is already 1; set 4 and 14."],["Check 'grape'","Hashes to 3, 7, 11. Bit 3 is 0 → 'grape' was DEFINITELY never added. One zero is enough."],["Check 'kiwi'","Hashes to 2, 4, 14. All three are 1 — set by apple and mango — so the filter says 'probably yes'. But kiwi was never added: a false positive."],["The trade-off","More bits per item and the right number of hashes make false positives rarer: about 10 bits per item gives ~1%; 15 bits gives ~0.1%. You can't delete items (clearing a bit might erase others) — counting Bloom filters or cuckoo filters can."]]}

> [!ANALOGY] A nightclub bouncer with a fuzzy memory for faces. If they're sure they've never seen you, they're right. If they think you look familiar, they're usually right — but occasionally they confuse you with someone similar. They never forget someone they actually saw.

### Where Bloom filters save the day

- **Databases (Cassandra, HBase, RocksDB, Bigtable):** each on-disk file (SSTable — System Design track, LSM trees) has a Bloom filter. Before reading a file from disk for a key, check the filter; "definitely not" skips the disk read. This eliminates most wasted reads.
- **Web caches and CDNs:** Akamai found most URLs are requested only once; a Bloom filter makes sure an item is cached only on its **second** request ("one-hit wonders" never pollute the cache).
- **Browsers:** Chrome once used a Bloom filter of known malicious URLs, checking locally and only contacting Google's servers on a "probably yes".
- **Distributed joins and networking:** send a small filter of keys instead of the full key list to avoid shipping useless data.
- **Username availability, "have I recommended this before?", crawler "have I visited this URL?"** — all fast first checks.

The sizing formulas, for *n* items and a false-positive rate *p*: bits m ≈ −n·ln(p) / (ln 2)², hashes k ≈ (m/n)·ln 2.

## HyperLogLog: counting distinct items

How many **different** users, IP addresses or search queries were there? Exact counting needs memory proportional to the number of distinct items. **HyperLogLog (HLL)** estimates it in a few kilobytes.

### The intuition

Hash each item to a random-looking binary number. About half of all hashes start with `1`, a quarter with `01`, an eighth with `001`… If the **longest run of leading zeros** you've seen is 20, you've probably seen around 2²⁰ ≈ a million distinct items — because that's how many random tries it usually takes to get 20 leading zeros.

> [!ANALOGY] If a friend tells you their best coin-flipping streak today was 10 heads in a row, you can guess they flipped a coin roughly a thousand times — long streaks are rare, so the longest streak reveals how many tries there were. Duplicates don't help: flipping the "same" coin flip again doesn't give a new streak.

One measurement is noisy, so HLL splits items into thousands of **buckets** (using the first bits of the hash), tracks the longest run in each, and combines them with a harmonic mean plus corrections. With 16,384 buckets, the standard error is about **0.8%**, in 12 KB.

Superpowers:

- **Duplicates are free** — adding the same item twice changes nothing.
- **Mergeable:** the union of two HLLs is the bucket-wise maximum. Count unique visitors per hour, then merge to get per day or per week **without** re-reading raw data.

Used by Redis (`PFADD`/`PFCOUNT`/`PFMERGE`), BigQuery's `APPROX_COUNT_DISTINCT`, Presto/Trino, Druid, Elasticsearch's cardinality aggregation, and network monitoring.

## Count-Min sketch: how often, and what's trending?

A **Count-Min sketch** estimates **how many times** each item appeared in a stream, in fixed memory.

- A small grid: *d* rows of *w* counters, each row with its own hash function.
- **Add** an item: in each row, hash it to a column and increment that counter.
- **Estimate** an item's count: look up its counter in each row and take the **minimum**.

Collisions only ever **add** to counters, so estimates can be **too high** but never too low; taking the minimum across rows picks the least-polluted one.

> [!EXAMPLE] **Trending hashtags.** A stream of millions of tweets per minute: keep a Count-Min sketch for counts and a small **heap** of the current top 100 (chapter 5). For each hashtag, update the sketch, read its estimated count, and update the heap if it qualifies. You get the "heavy hitters" in a few megabytes, without storing every hashtag. The same approach finds the top IPs in a DDoS, the most-requested cache keys, and the most frequent search queries (System Design track — top-K case study).

## Other members of the family

- **Cuckoo filters:** like Bloom filters but support deletion, with similar or better space.
- **t-digest and DDSketch:** approximate **percentiles** (p50, p99) over streams and across machines — how Datadog, Prometheus summaries and Elasticsearch compute latency percentiles without storing every measurement (Cloud track, chapter 7).
- **MinHash and locality-sensitive hashing:** estimate how **similar** two sets are (near-duplicate web pages, plagiarism detection) — related to vector search (AI track).
- **Reservoir sampling:** keep a fair random sample of fixed size from an unbounded stream.

## When (not) to use them

Use them when:

- The data is **huge or streaming**, and exact answers would need too much memory or time.
- A small, **bounded** error is acceptable (analytics, monitoring, caching decisions, pre-filtering).
- You need **mergeability** across time windows or machines.

Don't use them when:

- Correctness is required: billing, money, inventory, security decisions ("is this password compromised?" might be fine as a first check, but "is this user banned?" must be exact).
- The data is small enough to count exactly — a hash set of 10,000 items is simpler.

> [!RECAP]
> - **Bloom filter:** membership with "definitely not" or "probably yes"; ~10 bits per item for 1% false positives; no false negatives; used to skip disk reads and avoid caching one-hit wonders.
> - **HyperLogLog:** distinct counts within ~1% using ~12 KB, ignoring duplicates and **mergeable** across windows.
> - **Count-Min sketch:** frequency estimates (never too low) in fixed memory; plus a heap → **top-K / heavy hitters**.
> - Relatives: cuckoo filters (deletion), t-digest (percentiles), MinHash (similarity), reservoir sampling.
> - Use them for big or streaming data where bounded error is acceptable; never for exact business-critical answers.

> [!INTERVIEW] System design rounds love these: "count unique visitors at scale" (HLL), "avoid unnecessary disk lookups" (Bloom filter), "top-K trending items" (Count-Min + heap). Explain the error trade-off and why it's acceptable.

::quiz {"q":"A Bloom filter says an item is NOT in the set. How reliable is that?","options":["Usually right","Always right — Bloom filters have no false negatives","50/50","It depends on the hash"],"answer":1,"explain":"At least one of its bits is 0, so it was never added."}

::quiz {"q":"How do you get unique visitors for a week from daily HyperLogLogs?","options":["Add the daily counts","Merge the daily HLLs (bucket-wise maximum) and count","Impossible without raw data","Average them"],"answer":1,"explain":"Adding counts would double-count users who visited on several days."}

::quiz {"q":"A Count-Min sketch's estimate for an item can be…","options":["Too low","Too high, but never too low","Exactly right always","Negative"],"answer":1,"explain":"Collisions only add to counters; taking the minimum limits the overcount."}
