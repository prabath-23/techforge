---
title: Arrays, Strings, Linked Lists, Stacks and Queues
summary: The everyday building blocks. How arrays store items side by side and why that makes them fast, why building strings in a loop can be accidentally slow, when a linked list is the right tool, and how stacks and queues model "undo", browser history, task lines and much more — with the patterns interviewers love.
---

## Arrays: a row of numbered lockers

> [!ANALOGY] An array is a row of numbered lockers in a school hallway, all the same size, standing side by side. To open locker 57, you don't walk past lockers 1 to 56 — you know exactly where it is: the start of the row plus 57 locker-widths. That's why reading any item of an array by its position is instant, no matter how long the row is.

An **array** stores items **next to each other in memory**. The computer finds item `i` with one calculation — *start address + i × item size* — so `arr[i]` is **O(1)**.

That same layout explains the weaknesses:

| Operation | Cost | Why |
|---|---|---|
| Read or change `arr[i]` | O(1) | One address calculation |
| Add at the end | O(1) amortized | Usually there's spare room (chapter 1's doubling) |
| Insert or remove at the front or middle | **O(n)** | Every later item must shift one locker over |
| Find a value (unsorted) | O(n) | Check lockers one by one |
| Find a value (sorted) | O(log n) | Binary search (Algorithms track) |

> [!EXAMPLE] **A slow "queue" bug.** Code that uses a Python list as a waiting line, adding with `append` and taking from the front with `pop(0)`, works fine in testing. With 100,000 items in production, every `pop(0)` shifts 99,999 items, and the program crawls. The fix: use `collections.deque`, which is built for removing from both ends quickly. (More on queues below.)

**Tips that come from this:** if you know roughly how many items you'll have, create the list at that size up front; and prefer adding and removing at the **end** of an array.

## Strings: arrays of characters (with surprises)

A string is an array of characters — but "character" is trickier than it looks.

Computers store text as numbers. Every character in every language (and every emoji) has a number called a **code point** in the **Unicode** standard: `A` is 65, `₹` is 8377. Most of the web stores text as **UTF-8**, which uses 1 byte for English letters and 2–4 bytes for others. That's why:

- the "length" of a Hindi or Tamil word in many languages doesn't match the number of letters you see, because some visible characters are made of several code points combined;
- cutting a string at an arbitrary byte position can break a character in half and produce garbage.

> [!EXAMPLE] A tweet-limit counter, a username validator or a "first 100 characters" preview that counts bytes instead of visible characters will cut emoji and many Indian-language words in half. Real apps use "grapheme"-aware functions for anything users see.

### The string-building trap

In Python, Java, JavaScript, Go and C#, strings are **immutable**: they can never be changed after creation. So `s = s + "x"` doesn't add to `s` — it creates a brand-new string and copies everything into it.

```python
# Slow: each += copies the whole string so far → O(n²) total
report = ""
for line in lines:
    report += line + "\n"

# Fast: collect pieces, join once → O(n)
report = "\n".join(lines)
```

With 100,000 lines, the first version copies billions of characters. The fix in every language is the same idea: collect pieces and join once (`StringBuilder` in Java, `strings.Builder` in Go, `"".join()` in Python, an array and `.join()` in JavaScript).

## A powerful array trick: prefix sums

Suppose you're asked many times: "what's the total sales between day 30 and day 90?" Adding up 60 numbers each time is slow if there are millions of questions.

Instead, build a **running total** once: `prefix[i]` = total of all days before day `i`. Then any range total is a single subtraction:

`total(day 30 to day 89) = prefix[90] − prefix[30]`

> [!ANALOGY] Your car's odometer. To know how far you drove between two cities, you don't re-measure the road — you subtract the odometer reading at the first city from the reading at the second.

```python
def build_prefix(sales):
    prefix = [0]
    for s in sales:
        prefix.append(prefix[-1] + s)       # running total
    return prefix

prefix = build_prefix(daily_sales)
range_total = prefix[90] - prefix[30]       # O(1) per question
```

Prefix sums turn up in surprisingly many interview problems — "how many subarrays add up to k?" is solved by combining them with a hash map (next chapter).

## Linked lists: a scavenger hunt

> [!ANALOGY] A linked list is a scavenger hunt. Each clue tells you where the next clue is hidden. To find the 50th clue, you must follow the first 49. But adding a new clue in the middle is easy: change one clue to point to the new one, and have the new one point onward. Nothing else moves.

Each item (a **node**) holds a value and a pointer to the next node. Nodes can be anywhere in memory.

| Operation | Array | Linked list |
|---|---|---|
| Get the k-th item | O(1) | O(k) — follow k pointers |
| Insert/remove at the front | O(n) | **O(1)** |
| Insert/remove next to a node you already have | O(n) | **O(1)** |
| Memory per item | just the item | item + pointer(s) |
| Speed of scanning in practice | very fast (side by side) | slower (scattered — chapter 1) |

A **doubly linked list** stores both "next" and "previous" pointers, so you can remove a node in O(1) when you hold just that node.

When are linked lists the right choice? When you constantly add and remove items in the middle and already hold a reference to the position — like the **recently-used list in an LRU cache** (next chapter), or the operating system's lists of waiting processes. For everyday "list of things", arrays usually win because they're so much friendlier to the CPU's caches.

> [!NOTE] **The sentinel trick.** Linked list code is full of special cases: empty list, removing the head, removing the tail. Put a permanent dummy node at each end (a **sentinel**) and the special cases disappear — every real node always has a node before and after it.

Classic linked-list techniques worth knowing:

- **Reverse a list** by walking it once and flipping each pointer.
- **Detect a cycle** with two pointers, one moving one step at a time and one moving two (the "tortoise and hare"). If there's a loop, the fast one eventually laps the slow one.
- **Find the middle** the same way: when the fast pointer reaches the end, the slow one is in the middle.

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:          # the hare lapped the tortoise
            return True
    return False
```

## Stacks: last in, first out

> [!ANALOGY] A stack of plates. You add plates on top and take plates from the top. The last plate you put down is the first one you pick up.

A **stack** supports **push** (add to the top) and **pop** (remove from the top), both O(1). An array with additions and removals at the end is a perfect stack.

Stacks are everywhere:

- **Undo** in every editor: each action is pushed; Undo pops the most recent.
- **Back button** in your browser.
- **Function calls**: every call pushes a frame on the call stack; returning pops it (OS track). Infinite recursion fills it up — a **stack overflow**.
- **Checking brackets** in code editors and compilers:

```python
def brackets_balanced(text):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in text:
        if ch in '([{':
            stack.append(ch)                           # remember what we opened
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:  # must close the most recent opener
                return False
    return not stack                                   # nothing left unclosed

brackets_balanced("if (a[0] == {b}) {}")   # True
brackets_balanced("(]")                     # False
```

### The monotonic stack

A powerful variation keeps the stack's items in increasing (or decreasing) order. It answers questions like **"for each day, how many days until a warmer temperature?"** in a single pass:

```python
def days_until_warmer(temps):
    answer = [0] * len(temps)
    stack = []                                   # indexes of days still waiting for a warmer day
    for today, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:    # today is warmer than those waiting days
            past = stack.pop()
            answer[past] = today - past
        stack.append(today)
    return answer

days_until_warmer([30, 31, 28, 27, 35])  # [1, 3, 2, 1, 0]
```

Each day is pushed once and popped at most once, so it's O(n), even though there's a loop inside a loop.

## Queues: first in, first out

> [!ANALOGY] A line at a ticket counter. People join at the back and are served from the front, in the order they arrived.

A **queue** supports **enqueue** (add to the back) and **dequeue** (take from the front), both O(1) when built properly. Don't use a plain array with removal from the front (the slow bug at the top of this chapter); use:

- a **deque** (double-ended queue) from your language's library — Python's `collections.deque`, Java's `ArrayDeque`;
- or a **circular buffer**: a fixed array where "front" and "back" positions wrap around to the start, like a running track. Network cards, audio systems and logging libraries use these because they never need to allocate memory.

Queues model anything that waits its turn: print jobs, customer support tickets, tasks in a thread pool (OS track), messages in Kafka (System Design track), and the "breadth-first search" algorithm (Algorithms track).

A **deque** allows adding and removing at **both** ends, which unlocks another classic: the **sliding window maximum** ("the highest price in every 5-minute window"), solved in O(n) by keeping a deque of candidates in decreasing order.

> [!RECAP]
> - **Arrays** store items side by side: O(1) access by position, O(1) amortized append, O(n) insert/remove in the middle. Usually the fastest choice in practice.
> - **Strings** are arrays of characters, with Unicode complications; they're immutable in most languages, so build them with join/builders, not `+=` in a loop.
> - **Prefix sums** answer range-total questions in O(1).
> - **Linked lists** give O(1) insert/remove when you hold the position, but O(n) access and poor cache behavior.
> - **Stacks** (last in, first out) power undo, the back button, function calls and bracket checking; **monotonic stacks** solve "next greater" problems in O(n).
> - **Queues** (first in, first out) model waiting lines; use a deque or circular buffer, never `pop(0)` on an array.

> [!INTERVIEW] Bread-and-butter questions: reverse a linked list, detect a cycle, merge two sorted lists, valid brackets, a min-stack (a stack that also returns its minimum in O(1)), a queue built from two stacks, sliding window maximum, and "next greater element" with a monotonic stack.

::quiz {"q":"Building a 100,000-line report with report += line inside a loop is slow in Python/Java. Why?","options":["Python is slow","Strings are immutable, so each += copies the whole string so far — O(n²) in total","The loop is infinite","Memory runs out immediately"],"answer":1,"explain":"Collect pieces and join once for O(n)."}

::quiz {"q":"Which structure does a browser's Back button behave like?","options":["Queue","Stack","Hash map","Tree"],"answer":1,"explain":"The most recently visited page is the first one you go back to: last in, first out."}

::quiz {"q":"Why is removing from the front of a Python list with pop(0) slow for large lists?","options":["It sorts the list","Every remaining item has to shift one position left — O(n)","It copies the list twice","It's actually fast"],"answer":1,"explain":"Use collections.deque for O(1) removal from the front."}
