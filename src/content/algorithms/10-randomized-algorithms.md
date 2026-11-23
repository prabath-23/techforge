---
title: Randomized Algorithms and Hashing Tricks
summary: Using randomness on purpose — why random pivots make quicksort reliably fast, quickselect for the k-th largest element, Las Vegas vs Monte Carlo algorithms, shuffling correctly, reservoir sampling from an endless stream, randomized load balancing ("the power of two choices"), rolling hashes, and consistent hashing. Plus why randomness protects systems from attackers.
---

## Flipping a coin to be faster

> [!STORY] In 2011, researchers showed they could freeze web servers written in PHP, Java, Python and Ruby with a single crafted HTTP request. They sent form fields whose names were chosen so that every one landed in the **same hash-table bucket**. A lookup that should take O(1) became O(n), and parsing one 2 MB request took the server a full minute of CPU. The fix, adopted by nearly every language: **randomize the hash function** each time the program starts, so attackers can't predict collisions. Randomness, used deliberately, turned a predictable weakness into something no attacker could plan for.

A **randomized algorithm** makes random choices as it runs. That sounds unreliable, but it often makes algorithms **simpler, faster on average, and immune to worst-case inputs** — because no fixed input can be bad for every random choice.

## Two kinds of randomized algorithm

- **Las Vegas:** always gives the **correct** answer; only the running **time** is random. Randomized quicksort is always correct; it's just very likely to be fast.
- **Monte Carlo:** runs in fixed time; the **answer** might be wrong with a small, controllable probability. Primality tests like Miller-Rabin: "probably prime" with error below 4⁻ᵏ after k rounds — repeat 40 times and you're more likely to be hit by a meteor than get a wrong answer.

> [!ANALOGY] A Las Vegas algorithm is a guaranteed delivery service that's usually on time but occasionally slow. A Monte Carlo algorithm always arrives on time but, very rarely, delivers to the wrong door — and you can make that rarer by sending extra couriers to double-check.

## Random pivots: quicksort and quickselect

Quicksort picks a **pivot**, partitions the array into smaller and larger elements, and recurses (chapter 3). With a fixed pivot choice (say, always the first element), an already-sorted input makes every partition lopsided: O(n²). A **random pivot** makes that vanishingly unlikely for **any** input — expected O(n log n).

The same idea finds the **k-th largest element** without fully sorting: **quickselect**.

```python
import random

def kth_largest(nums, k):
    target = len(nums) - k                       # index in ascending order
    lo, hi = 0, len(nums) - 1
    while True:
        pivot = nums[random.randint(lo, hi)]
        # three-way partition of nums[lo..hi] around pivot
        less    = [x for x in nums[lo:hi+1] if x < pivot]
        equal   = [x for x in nums[lo:hi+1] if x == pivot]
        greater = [x for x in nums[lo:hi+1] if x > pivot]
        nums[lo:hi+1] = less + equal + greater
        if target < lo + len(less):
            hi = lo + len(less) - 1
        elif target < lo + len(less) + len(equal):
            return pivot
        else:
            lo = lo + len(less) + len(equal)
```

Each round throws away a large fraction of the remaining elements on average, so expected time is **O(n)** — faster than sorting (O(n log n)) or a heap (O(n log k)) for one-off queries. Databases and analytics engines use selection algorithms to compute medians and percentiles.

## Shuffling correctly

How do you put a playlist or a deck of cards in random order, with every ordering equally likely? The **Fisher-Yates shuffle**:

```python
def shuffle(a):
    for i in range(len(a) - 1, 0, -1):
        j = random.randint(0, i)        # pick from the not-yet-shuffled part, including i itself
        a[i], a[j] = a[j], a[i]
```

> [!WARN] A common bug: `j = random.randint(0, len(a) - 1)` on every step (picking from the **whole** array). It looks random but some orderings come out more often than others — a real problem for card games, A/B test assignment and lotteries. Use your language's built-in shuffle, which implements Fisher-Yates.

## Reservoir sampling: a fair sample from an endless stream

You're reading an unbounded stream — log lines, tweets, network packets — and want to keep a **uniformly random sample of k items** at all times, without storing everything or knowing the total in advance.

```python
def reservoir_sample(stream, k):
    sample = []
    for i, item in enumerate(stream):
        if i < k:
            sample.append(item)
        else:
            j = random.randint(0, i)        # item i is kept with probability k/(i+1)
            if j < k:
                sample[j] = item
    return sample
```

At every moment, each item seen so far has an equal chance (k / items seen) of being in the sample. Used for sampling traces and logs in observability systems (Cloud track), database query optimizers' statistics, and "pick a random line from a huge file in one pass".

## Randomized load balancing: the power of two choices

You have N servers and want to spread requests evenly.

- **Pure random:** pick any server. Simple, but some servers end up noticeably busier than others by chance.
- **Least loaded:** check all N and pick the least busy — accurate but needs global knowledge, and many balancers acting on the same stale information all pile onto the same server ("herding").
- **Power of two choices:** pick **two** servers at random and send the request to the less loaded of the two.

That tiny change has a dramatic effect: the maximum load imbalance drops from roughly log n / log log n to log log n — **exponentially better**, with almost no coordination. nginx (`random two least_conn`), Envoy, HAProxy and many internal schedulers use it.

> [!ANALOGY] At a supermarket, glancing at just two random checkout queues and joining the shorter one gives almost all the benefit of surveying every queue — without walking the whole store, and without everyone rushing to the same "shortest" queue at once.

## Hashing tricks

### Randomized hashing

As in the story: hash tables in Python, Ruby, Rust, Go and Java's HashMap (with tree fallback) use **seeded** hash functions (SipHash in many cases) chosen randomly per process, defending against **hash-flooding** attacks. **Universal hashing** is the theory behind it: pick the hash function at random from a family, and any fixed set of keys collides rarely in expectation.

### Rolling hashes (Rabin-Karp)

To find a pattern in text, compute a hash of each window of text. A **rolling hash** updates the previous window's hash in O(1) by removing the leftmost character and adding the new one — so all windows are hashed in O(n) total, and only windows with matching hashes are compared character by character (chapter 7). Used for plagiarism detection, finding duplicate code, and in **rsync** and backup tools to find changed blocks between two versions of a file.

### Consistent hashing

With `server = hash(key) mod N`, adding one server changes **almost every** key's server — catastrophic for caches. **Consistent hashing** places servers and keys on a ring; each key belongs to the next server clockwise. Adding or removing a server only moves the keys near it (~1/N of them). Random **virtual nodes** spread load evenly. Used by DynamoDB, Cassandra, CDNs and distributed caches (System Design track — try the hash-ring figure there).

## Randomness as a design tool in systems

- **Jitter in retries:** when a service fails, thousands of clients retrying after exactly 1, 2, 4 seconds hit it in synchronized waves. Adding **random jitter** to backoff spreads them out (System Design track).
- **Randomized leader election timeouts** in Raft avoid split votes (try the Raft simulation in the System Design track).
- **Sampling** for metrics, traces and A/B tests.
- **Skip lists** (used by Redis sorted sets) use coin flips to decide node heights, giving balanced-tree performance without complex rebalancing.
- **Treaps** and **randomized BSTs** stay balanced in expectation.

> [!NOTE] **Pseudorandom vs cryptographically secure.** `Math.random()` and `random.random()` are fast but predictable if an attacker sees some outputs. For tokens, passwords, session IDs and keys, use a **cryptographically secure** generator (`secrets` in Python, `crypto.getRandomValues`/`crypto.randomUUID` in JavaScript) — Security track, chapter 2.

> [!RECAP]
> - **Las Vegas** algorithms are always correct with random running time; **Monte Carlo** algorithms have fixed time and a tiny, tunable error.
> - **Random pivots** make quicksort O(n log n) and **quickselect** O(n) in expectation on any input.
> - **Fisher-Yates** shuffles fairly; **reservoir sampling** keeps a uniform sample of an unbounded stream.
> - **Power of two choices** balances load exponentially better than pure random with minimal coordination.
> - Hashing: **seeded hashes** stop hash flooding; **rolling hashes** find matches; **consistent hashing** limits reshuffling.
> - Randomness also prevents synchronized retries (**jitter**) and powers skip lists and leader election.

> [!INTERVIEW] Expect kth largest element (quickselect vs heap), shuffle an array, random pick from a stream (reservoir sampling), random pick with weights (prefix sums + binary search), and in design rounds: jitter, consistent hashing and load-balancing strategies.

::quiz {"q":"Why does randomized quicksort avoid O(n²) behavior on sorted input?","options":["It sorts first","A random pivot makes consistently bad partitions extremely unlikely for any input","It uses extra memory","It switches to merge sort"],"answer":1,"explain":"No fixed input can be bad for most random choices."}

::quiz {"q":"What is the expected time of quickselect for the k-th largest element?","options":["O(n²)","O(n)","O(n log n)","O(log n)"],"answer":1,"explain":"Each round discards a constant fraction on average."}

::quiz {"q":"In 'the power of two choices', what does a load balancer do?","options":["Sends every request to two servers","Picks two random servers and chooses the less loaded one","Alternates between two servers","Checks all servers"],"answer":1,"explain":"Exponentially better balance with almost no coordination."}
