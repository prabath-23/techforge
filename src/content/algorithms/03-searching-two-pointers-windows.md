---
title: Binary Search, Two Pointers and Sliding Windows — Three Patterns That Turn Slow Code Fast
summary: Three techniques that turn countless O(n²) brute-force solutions into O(n) or O(log n) ones. Binary search done right (and its surprising uses beyond searching), two pointers moving through data together, and sliding windows for anything about "a stretch of consecutive items".
---

## Part 1: Binary search

> [!ANALOGY] Guess my number between 1 and 1,000. If you guess 1, 2, 3… it could take a thousand tries. If you guess 500 and I say "lower", you've ruled out 500 numbers with one question. Then 250, 125… Each guess halves what's left, so you always win within **10 guesses**. For a billion numbers, 30 guesses. That's binary search.

Binary search finds an item in **sorted** data in **O(log n)** steps by repeatedly checking the middle and throwing away the half that can't contain the answer. Step through it:

::widget BinarySearch {}

### It's easy to get subtly wrong

Binary search is famous for bugs. Jon Bentley found that about 90% of professional programmers he tested wrote a buggy version. Even Java's official library had a bug for nine years: computing the middle as `(low + high) / 2` overflows when `low + high` is larger than the biggest integer — for arrays with over a billion items. The safe form is `low + (high - low) / 2`.

The cure is to stop thinking in special cases and think about **one question with a yes/no answer that switches from "no" to "yes" exactly once**. Then binary search finds where it switches.

> [!ANALOGY] A row of light bulbs: all the ones on the left are off, all the ones on the right are on. Binary search finds the **first bulb that's on** by checking the middle bulb and discarding the half that can't contain the switch-over point.

```python
def first_true(low, high, is_true):
    """Smallest x in [low, high] where is_true(x) is True (assumes False...False, True...True).
    Returns high + 1 if it's never True."""
    high += 1
    while low < high:
        mid = low + (high - low) // 2
        if is_true(mid):
            high = mid          # mid might be the answer; keep it in range
        else:
            low = mid + 1       # mid definitely isn't
    return low

# Where would 42 go in a sorted list? = first index whose value is >= 42
position = first_true(0, len(nums) - 1, lambda i: nums[i] >= 42)
```

Every variation — find the first occurrence, the last occurrence, where to insert a value — is this same function with a different question.

### Binary search beyond searching: "binary search on the answer"

This is where binary search becomes a superpower. Many optimization problems can't be searched directly, but you **can check whether a guessed answer works** — and the check flips from "no" to "yes" exactly once.

> [!EXAMPLE] **"What's the smallest truck capacity that can deliver all these packages, in order, within 5 days?"** You can't directly compute it. But you can easily **check** a guess: "with capacity 40 kg, how many days would it take?" — load packages until the truck is full, start a new day, count the days. Capacity too small → too many days; big enough → it works. And bigger capacities always work too. So binary search over capacities from the heaviest single package up to the total weight. Each check is O(n), and there are about log(total weight) checks.

```python
def min_truck_capacity(weights, days):
    def works(capacity):
        needed, load = 1, 0
        for w in weights:
            if load + w > capacity:       # truck full: start a new day
                needed += 1
                load = 0
            load += w
        return needed <= days
    return first_true(max(weights), sum(weights), works)
```

The same pattern solves: "minimum speed to finish reading all books in H hours", "largest minimum distance when placing routers along a street", "the smallest maximum sum when splitting work among k people".

> [!TRY] **`git bisect` is binary search on your project's history.** When a bug appears and you don't know which of 1,000 commits caused it, `git bisect` checks the middle commit; you tell it "good" or "bad", and it halves the range. In about 10 steps it names the exact commit. Engineers use it to hunt real regressions all the time.

## Part 2: Two pointers

Many "find pairs" problems check every pair — O(n²). When the data is **sorted**, two pointers moving toward each other do it in O(n).

> [!ANALOGY] Two people searching a sorted bookshelf for two books whose prices add up to exactly ₹1,000. One starts at the cheapest end, one at the most expensive end. If their two books add up to too little, the person at the cheap end moves to a pricier book. Too much? The person at the expensive end moves to a cheaper book. They never need to go backwards, so together they check the shelf in one pass.

```python
def pair_with_sum(sorted_prices, target):
    left, right = 0, len(sorted_prices) - 1
    while left < right:
        total = sorted_prices[left] + sorted_prices[right]
        if total == target:
            return left, right
        if total < target:
            left += 1          # need more: move up from the cheap end
        else:
            right -= 1         # need less: move down from the expensive end
    return None
```

Every step rules out one item for good, which is why one pass suffices. Variations:

- **3Sum** ("find all triples that add to zero"): sort, fix the first number, then two-pointer the rest — O(n²) instead of O(n³).
- **Container with most water**: always move the shorter wall inward, since that's the only move that could ever help.
- **Is it a palindrome?** One pointer at each end, moving toward the middle.

**Same-direction pointers** handle in-place cleanup: one pointer reads every item, the other marks where the next item to keep should be written. "Remove duplicates from a sorted list" and "move all zeros to the end" work this way, in O(n) with no extra memory.

**Fast and slow pointers** (DSA track, chapter 2) find cycles and middles in linked lists.

## Part 3: Sliding windows

Whenever a problem asks about a **stretch of consecutive items** — a substring, a run of days, a block of packets — think **sliding window**.

> [!ANALOGY] Looking at a long train through a window that you can stretch and shrink. To find "the shortest stretch of carriages containing at least one of each color", you widen the window on the right until it has every color, then shrink it from the left as far as you can while it still has every color, note its length, and keep going. Each carriage enters the window once and leaves once.

**Fixed-size window:** "the highest total sales in any 7-day stretch". Don't re-add 7 numbers each time; when the window slides one day forward, add the new day and subtract the day that left.

```python
def best_week(sales):
    window = sum(sales[:7])
    best = window
    for i in range(7, len(sales)):
        window += sales[i] - sales[i - 7]    # slide: add the new day, drop the oldest
        best = max(best, window)
    return best
```

**Variable-size window:** "the longest stretch of a string with no repeated characters". Expand the right edge one character at a time; when a repeat appears, jump the left edge past the previous occurrence.

```python
def longest_without_repeats(s):
    last_seen, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1           # shrink: move past the earlier copy
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best

longest_without_repeats("abcabcbb")   # 3 ("abc")
```

The general recipe: **grow the window on the right; when it breaks the rule, shrink it from the left; record the best answer as you go.** Every item enters and leaves at most once, so it's O(n).

> [!WARN] Sliding windows rely on a **monotonic** rule: making the window bigger can only make it "more broken" (or only "more valid"). For "subarray sums to exactly k" when numbers can be **negative**, adding an item might push the sum up or down, so the window logic fails. Use prefix sums with a hash map instead (DSA track, chapter 3).

> [!EXAMPLE] **Rate limiters** (System Design track) are sliding windows in real life: "allow at most 100 requests from this user in any 60-second window". As time moves forward, old requests leave the window and new ones enter.

## Choosing the pattern

| The problem says… | Try… |
|---|---|
| Sorted input; find a value or position | Binary search |
| "Minimize the maximum", "smallest X that works", and you can check a guess | Binary search on the answer |
| Pairs or triples with a target sum, in sorted data | Two pointers from both ends |
| Remove or compact items in place | Read/write pointers |
| "Longest/shortest consecutive stretch such that…" | Sliding window |
| Stretch sums with negative numbers | Prefix sums + hash map |
| Cycle or middle of a linked list | Fast and slow pointers |

> [!RECAP]
> - **Binary search** halves the search space each step: O(log n). Think of it as finding the first "yes" in a no…no, yes…yes sequence, and compute the middle as `low + (high − low) / 2`.
> - **Binary search on the answer** solves optimization problems when you can check a guess (truck capacity, `git bisect`).
> - **Two pointers** turn O(n²) pair searches on sorted data into O(n).
> - **Sliding windows** handle "consecutive stretch" problems in O(n): grow on the right, shrink on the left.

::quiz {"q":"Why write mid = low + (high − low) / 2 instead of (low + high) / 2?","options":["It's faster","low + high can overflow fixed-size integers for very large arrays","It rounds differently","It avoids negative numbers"],"answer":1,"explain":"This exact bug lived in Java's library for years."}

::quiz {"q":"'Smallest truck capacity to deliver everything within D days' is best solved by…","options":["Sorting the packages","Binary search over capacities, checking each guess in one pass","Trying every capacity from 1 upward","A heap"],"answer":1,"explain":"Feasibility flips from no to yes exactly once as capacity grows."}

::quiz {"q":"Why doesn't a simple sliding window work for 'subarray sums to exactly k' when numbers can be negative?","options":["Windows can't change size","Adding an item can push the sum up or down, so 'shrink when too big' no longer makes sense","It does work","Hash maps can't store sums"],"answer":1,"explain":"Use prefix sums with a hash map instead."}
