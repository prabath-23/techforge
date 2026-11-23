---
title: Binary Search, Two Pointers and Sliding Windows — Three Patterns That Turn Slow Code Fast
summary: Three techniques that turn countless O(n²) brute-force solutions into O(n) or O(log n) ones. Binary search done right (and its surprising uses beyond searching), two pointers moving through data together, and sliding windows for anything about "a stretch of consecutive items".
---

::widget Scene {"title": "Sliding window: longest substring without repeats", "sub": "\"abcabcbb\" — grow the window right, shrink it from the left", "nodes": [{"id": "s", "kind": "cells", "label": "string", "x": 3.1, "y": 3.1, "values": ["a", "b", "c", "a", "b", "c", "b", "b"]}], "metrics": [["win", "Window"], ["best", "Best length"], ["act", "Action"]], "steps": [{"short": "Brute", "tag": "Idea", "title": "Brute force checks every substring: O(n²) or worse", "body": "<p>A window that only moves forward does it in one pass.</p>", "metrics": {"win": ["—"], "best": ["0"], "act": ["—"]}}, {"short": "r0", "tag": "Grow", "title": "r=0..2: \"a\", \"ab\", \"abc\" — no repeats", "body": "<p>Track the last index of each character in a map.</p>", "set": {"s": {"marks": {"0": "green", "1": "green", "2": "green"}, "ptr": {"l": 0, "r": 2}}}, "metrics": {"win": ["abc"], "best": ["3"], "act": ["grow"]}}, {"short": "r3", "tag": "Repeat", "title": "r=3: \"a\" was last seen at 0, inside the window", "body": "<p>Move l just past it: l = 1. Window \"bca\".</p>", "set": {"s": {"marks": {"0": "dark", "1": "green", "2": "green", "3": "orange"}, "ptr": {"l": 1, "r": 3}}}, "metrics": {"win": ["bca"], "act": ["l jumps to 1"]}}, {"short": "r4", "tag": "Repeat", "title": "r=4: \"b\" last at 1 → l = 2. Window \"cab\"", "body": "<p>l only moves forward — that's why it's linear.</p>", "set": {"s": {"marks": {"0": "dark", "1": "dark", "2": "green", "3": "green", "4": "orange"}, "ptr": {"l": 2, "r": 4}}}, "metrics": {"win": ["cab"], "act": ["l jumps to 2"]}}, {"short": "r5", "tag": "Repeat", "title": "r=5: \"c\" last at 2 → l = 3. Window \"abc\"", "body": "<p>Length 3 again; best stays 3.</p>", "set": {"s": {"marks": {"0": "dark", "1": "dark", "2": "dark", "3": "green", "4": "green", "5": "orange"}, "ptr": {"l": 3, "r": 5}}}, "metrics": {"win": ["abc"], "act": ["l jumps to 3"]}}, {"short": "r6", "tag": "Repeat", "title": "r=6: \"b\" last at 4 → l = 5. Window \"cb\"", "body": "<p>The window shrinks a lot when the repeat is near the end.</p>", "set": {"s": {"marks": {"0": "dark", "1": "dark", "2": "dark", "3": "dark", "4": "dark", "5": "green", "6": "orange"}, "ptr": {"l": 5, "r": 6}}}, "metrics": {"win": ["cb"], "act": ["l jumps to 5"]}}, {"short": "r7", "tag": "Repeat", "title": "r=7: \"b\" last at 6 → l = 7. Window \"b\"", "body": "<p>Done.</p>", "set": {"s": {"marks": {"0": "dark", "1": "dark", "2": "dark", "3": "dark", "4": "dark", "5": "dark", "6": "dark", "7": "orange"}, "ptr": {"l": 7, "r": 7}}}, "metrics": {"win": ["b"], "best": ["3", "good"], "act": ["done"]}}, {"short": "Guard", "tag": "Detail", "title": "Only jump if the old index is inside the window", "body": "<p>In \"abba\", at the last \"a\", its old index 0 is already left of l, so l must not move backwards: l = max(l, last[c] + 1).</p>"}, {"short": "Pattern", "tag": "Pattern", "title": "The general sliding-window pattern", "body": "<p>Expand r every step; while the window is invalid, advance l; update the answer. Each index enters and leaves once: O(n).</p>", "note": {"kind": "key", "text": "Sliding window: two forward-only pointers and a small state (counts or last-seen map). Works for \"longest/shortest subarray or substring with property X\"."}}]}

::widget Scene {"title": "Binary search: find 64 in 16 sorted numbers", "sub": "halve the search space every step", "nodes": [{"id": "arr", "kind": "cells", "label": "sorted array (index 0–15)", "x": 3.1, "y": 3.1, "values": [3, 8, 12, 17, 21, 26, 33, 40, 47, 52, 58, 64, 71, 79, 85, 93]}], "metrics": [["left", "Candidates left"], ["checks", "Comparisons"], ["lin", "Linear search would need"]], "steps": [{"short": "The setup", "tag": "Setup", "title": "Looking for 64 in a sorted list", "body": "<p>Checking every number from the left would take 12 comparisons. But the list is <b>sorted</b>, and that lets us throw away half of it with every single comparison.</p>", "set": {"arr": {"marks": {}, "ptr": {"lo": 0, "hi": 15}}}, "metrics": {"left": ["16"], "checks": ["0"], "lin": ["12"]}}, {"short": "Middle", "tag": "Compare", "title": "Look at the middle: 40 < 64", "body": "<p><code>mid = (lo + hi) // 2 = 7</code>. The value there is 40. Since 64 is bigger and the list is sorted, 64 can't be anywhere on the left — <b>all 8 left-hand numbers are ruled out at once</b>.</p>", "set": {"arr": {"marks": {"7": "orange"}, "ptr": {"lo": 0, "hi": 15, "mid": 7}}}, "metrics": {"checks": ["1"]}}, {"short": "Right half", "tag": "Narrow", "title": "Keep only the right half: lo = 8", "body": "<p>Move <code>lo</code> to <code>mid + 1</code>. Eight candidates remain.</p>", "set": {"arr": {"marks": {"0": "dark", "1": "dark", "2": "dark", "3": "dark", "4": "dark", "5": "dark", "6": "dark", "7": "dark"}, "ptr": {"lo": 8, "hi": 15}}}, "metrics": {"left": ["8"]}}, {"short": "Middle again", "tag": "Compare", "title": "Middle of 8–15 is 11: value 64 — found!", "body": "<p><code>mid = (8 + 15) // 2 = 11</code>. The value is 64. Done in <b>2 comparisons</b> instead of 12.</p>", "set": {"arr": {"marks": {"0": "dark", "1": "dark", "2": "dark", "3": "dark", "4": "dark", "5": "dark", "6": "dark", "7": "dark", "11": "green"}, "ptr": {"lo": 8, "hi": 15, "mid": 11}}}, "metrics": {"checks": ["2", "good"]}}, {"short": "Why it's fast", "tag": "Insight", "title": "Each step halves the problem: O(log n)", "body": "<p>16 → 8 → 4 → 2 → 1: at most 4–5 checks for 16 items. A million items need about 20; a billion about 30.</p><p>Use <code>lo + (hi - lo) // 2</code> in languages with fixed-size integers to avoid overflow.</p>", "set": {"arr": {"marks": {"0": "dark", "1": "dark", "2": "dark", "3": "dark", "4": "dark", "5": "dark", "6": "dark", "7": "dark", "11": "green"}, "ptr": {"lo": 8, "hi": 15}}}, "note": {"kind": "key", "text": "Binary search works on anything sorted or monotonic — including \"the smallest speed that finishes in time\" (binary search on the answer)."}, "metrics": {"left": ["1", "good"], "lin": ["12 (vs 2)"]}}]}

::widget Scene {"title": "Binary search on the answer: the slowest speed that still finishes", "sub": "eat 4 piles of bananas in 8 hours", "nodes": [{"id": "k", "kind": "cells", "label": "possible speeds (bananas/hour)", "x": 3.1, "y": 3.1, "values": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}], "metrics": [["speed", "Try speed"], ["hours", "Hours needed"], ["ok", "Fits in 8 h?"]], "steps": [{"short": "Problem", "tag": "Setup", "title": "Piles of 3, 6, 7, 11 bananas; 8 hours. Slowest speed that works?", "body": "<p>Each hour you eat up to k bananas from one pile. We don't search an array — we search the <b>range of possible answers</b>, 1 to 11.</p>", "set": {"k": {"marks": {}, "ptr": {"lo": 0, "hi": 10}}}, "metrics": {"speed": ["—"], "hours": ["—"], "ok": ["—"]}}, {"short": "Try 6", "tag": "Test", "title": "Speed 6: 1 + 1 + 2 + 2 = 6 hours — fits", "body": "<p>6 works, so anything faster also works. The answer is 6 or slower: search the left half.</p>", "set": {"k": {"marks": {"5": "green", "6": "dark", "7": "dark", "8": "dark", "9": "dark", "10": "dark"}, "ptr": {"mid": 5}}}, "metrics": {"speed": ["6"], "hours": ["6"], "ok": ["yes", "good"]}}, {"short": "Try 3", "tag": "Test", "title": "Speed 3: 1 + 2 + 3 + 4 = 10 hours — too slow", "body": "<p>3 fails, so slower speeds fail too. Search 4–6.</p>", "set": {"k": {"marks": {"2": "dark", "0": "dark", "1": "dark", "6": "dark", "7": "dark", "8": "dark", "9": "dark", "10": "dark"}, "ptr": {"mid": 2}}}, "metrics": {"speed": ["3"], "hours": ["10"], "ok": ["no", "bad"]}}, {"short": "Answer", "tag": "Done", "title": "Speed 4 takes 1+2+2+3 = 8 hours: the answer is 4", "body": "<p>The key property: \"fits in time\" is <b>monotonic</b> — once a speed works, every faster one works. Whenever an answer has that shape, binary search it.</p>", "set": {"k": {"marks": {"3": "green", "0": "dark", "1": "dark", "2": "dark", "4": "dark", "5": "dark", "6": "dark", "7": "dark", "8": "dark", "9": "dark", "10": "dark"}, "ptr": {"answer": 3}}}, "metrics": {"speed": ["4"], "hours": ["8"], "ok": ["yes", "good"]}, "note": {"kind": "key", "text": "Also used for: minimum capacity to ship packages in D days, smallest maximum page load, and deploy bisection (git bisect)."}}]}


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
