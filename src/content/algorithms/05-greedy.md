---
title: Greedy Algorithms — When Taking the Best Option Now Is Best Overall
summary: Greedy algorithms make the choice that looks best at each moment and never look back. Sometimes that's provably optimal (scheduling meetings, Huffman compression, making change with rupee notes), and sometimes it fails badly. This chapter teaches how to tell the difference — and how to convince an interviewer.
---

## The appeal of greed

> [!ANALOGY] You're packing for a trip and can fit only a few things. A **greedy** approach: keep grabbing whatever seems most valuable right now, never reconsidering. For some problems that works perfectly. For others, an early "best-looking" choice blocks a much better combination later — like filling your suitcase with one big jacket and having no room for the three small things you actually needed.

A **greedy algorithm** builds a solution step by step, always making the choice that looks best **at that moment**, and never undoing it. When it works, it's simple and fast — usually just "sort, then make one pass". The hard part is never the code. It's **knowing whether greedy actually gives the best answer.**

## A first example: making change

You're a cashier and need to give ₹289 in change using the fewest notes and coins. With Indian currency (₹2000, 500, 200, 100, 50, 20, 10, 5, 2, 1), you naturally do: take the biggest note that fits, repeat.

₹289 = 200 + 50 + 20 + 10 + 5 + 2 + 2 → 7 pieces. And that's optimal: for currencies like the rupee, dollar or euro, "biggest first" always gives the fewest pieces.

Now imagine a strange currency with coins of **1, 3 and 4**, and you need **6**:

- Greedy: take 4, then 1, then 1 → **3 coins**.
- Optimal: 3 + 3 → **2 coins**.

Greedy failed. Taking the biggest coin first looked good but blocked a better combination. So "biggest first" is correct for real-world currencies (which are deliberately designed to make it work) but **not** for coin systems in general — those need dynamic programming (next chapter).

> [!NOTE] This is the most important lesson about greedy algorithms: **they're only correct when you can prove it.** Every greedy idea must be tested against small tricky examples.

## When does greedy work?

Two properties must hold:

1. **The greedy choice is safe:** some optimal solution starts with the greedy choice.
2. **What's left is the same problem, just smaller:** after making the choice, solving the rest optimally gives an optimal whole.

The standard way to prove the first one is an **exchange argument**: take any optimal solution, and show you can **swap** one of its choices for the greedy choice without making it worse. Then the greedy solution is at least as good as optimal — so it *is* optimal.

## Example: scheduling the most meetings

You have one meeting room and a list of meeting requests, each with a start and end time. Book as many meetings as possible with no overlaps.

Which greedy rule?

- Shortest meeting first? Fails: a short meeting in the middle can block two longer meetings on either side.
- Earliest start first? Fails: one meeting starting at 8 am and lasting all day blocks everything.
- Fewest conflicts first? Fails on trickier examples.
- **Earliest finish first** — works.

```python
def max_meetings(meetings):                         # meetings = [(start, end), ...]
    booked, room_free_at = [], float("-inf")
    for start, end in sorted(meetings, key=lambda m: m[1]):   # earliest finish first
        if start >= room_free_at:
            booked.append((start, end))
            room_free_at = end
    return booked
```

**Why it's correct (the exchange argument):** take any optimal schedule. Its first meeting ends no earlier than the greedy choice (the earliest-finishing meeting overall). Swap that first meeting for the greedy one: it ends at the same time or earlier, so it can't conflict with any later meeting. The schedule is still valid and just as large. Repeat for every subsequent meeting, and the optimal schedule turns into the greedy one without getting worse.

::widget Stepper {"type":"flow","cols":4,"title":"Earliest-finish-first on 8 meeting requests","what":"Meetings A to H are sorted by end time. Each box is one decision: book it, or skip it because it overlaps something already booked.","steps":["Press Play and follow each decision.","Notice that after booking A, everything starting before 4 o'clock must be skipped.","Count the booked meetings at the end: 3, which is the best possible."],"nodes":[["Sort by end time","A(1–4) B(3–5) C(0–6) D(5–7) E(3–9) F(5–9) G(6–10) H(8–11)"],["Book A (1–4)","It finishes earliest. The room is now free from 4."],["Skip B and C","B starts at 3 and C at 0 — both before 4, so they overlap A."],["Book D (5–7)","Starts at 5, after the room frees up at 4. Room now free from 7."],["Skip E, F and G","All start before 7."],["Book H (8–11)","Starts at 8, after 7. Final schedule: A, D, H — 3 meetings, the maximum possible."]]}

> [!EXAMPLE] The same idea answers "minimum number of arrows to burst all balloons" and "fewest meetings to cancel so none overlap". A related question — "how many rooms do we need for all meetings?" — is solved with a heap of end times (DSA track, chapter 5).

## More greedy algorithms you'll meet

### Huffman coding: compressing files

Why should every letter take the same number of bits? In English, "e" is common and "z" is rare. **Huffman coding** gives frequent symbols short codes and rare symbols long codes. The greedy step: repeatedly merge the two **least frequent** symbols into a combined group, until one tree remains. The resulting codes are provably the most compact possible for that set of frequencies.

> [!EXAMPLE] Huffman coding is part of **ZIP files, gzip (which compresses most web pages you load), PNG images and JPEG photos**. Every time a website loads, greedy merges from 1952 are helping shrink it.

### Dijkstra and minimum spanning trees

Several algorithms from the previous chapter are greedy: **Dijkstra** always finalizes the closest place; **Kruskal** always adds the cheapest useful link; **Prim** always grows by the cheapest edge. Each comes with its own proof that the greedy choice is safe.

### The jump game

"You're on step 0. Each number tells you the maximum jump from that step. Can you reach the end?" Walk forward keeping track of the **farthest reachable step**; if you ever stand somewhere beyond it, you're stuck.

```python
def can_reach_end(jumps):
    farthest = 0
    for i, j in enumerate(jumps):
        if i > farthest:
            return False                    # a gap we can't cross
        farthest = max(farthest, i + j)
    return True

can_reach_end([2, 3, 1, 1, 4])   # True
can_reach_end([3, 2, 1, 0, 4])   # False — everyone lands on the 0
```

### Fractional vs whole items

A thief can carry 10 kg. **If items can be divided** (grain, gold dust), take the items with the highest value per kg first, and take part of the last one: greedy is optimal. **If items can't be divided** (a laptop, a TV), greedy fails, and you need dynamic programming (next chapter). It's the same difference as with the coins above.

## Greedy as a "good enough" tool

For some problems, finding the perfect answer is believed to be impossibly slow for large inputs (the "NP-hard" problems — chapter 7). Greedy algorithms often give answers that are **provably close** to optimal, very fast:

- **Load balancing:** assign each new job to the least-busy machine. This simple rule is guaranteed to be within 2× of the best possible arrangement.
- **Delivery routes:** "always drive to the nearest unvisited stop" gives a decent (though not optimal) route.
- **Choosing a small set of things that covers everything** (for example, placing the fewest cell towers to cover every village): repeatedly pick the option that covers the most uncovered things.

## How to handle greedy in an interview

1. **Propose** a greedy rule.
2. **Attack it** yourself with small tricky examples (2–4 items). Interviewers will ask "does that always work?"
3. If you can't break it, **sketch the exchange argument**: "if an optimal solution didn't make this choice, I could swap it in without making things worse, because…"
4. If you **can** break it, say so and switch to **dynamic programming** (overlapping subproblems) or search.

> [!RECAP]
> - **Greedy** algorithms take the best-looking option at each step and never undo it — simple and fast, but only correct when you can prove it.
> - Prove correctness with an **exchange argument**: swap the greedy choice into any optimal solution without making it worse.
> - **Earliest finish first** maximizes non-overlapping meetings; **Huffman coding** (inside ZIP, gzip, PNG, JPEG), Dijkstra and Kruskal are greedy.
> - Greedy **fails** for general coin systems and whole-item knapsacks — use dynamic programming there.
> - For very hard problems, greedy often gives **fast, provably good** approximations.

::quiz {"q":"Which greedy rule books the maximum number of non-overlapping meetings in one room?","options":["Shortest meeting first","Earliest start first","Earliest finish first","Fewest conflicts first"],"answer":2,"explain":"Finishing earliest leaves the most time for everything else, provable by an exchange argument."}

::quiz {"q":"With coins {1, 3, 4} and an amount of 6, what does 'biggest coin first' give?","options":["3 + 3 (optimal)","4 + 1 + 1 — three coins, not optimal","4 + 2","It finds no answer"],"answer":1,"explain":"Greedy isn't optimal for every coin system; use dynamic programming."}

::quiz {"q":"Where is Huffman coding used?","options":["Sorting algorithms","Compression in ZIP, gzip, PNG and JPEG","Password hashing","Routing packets"],"answer":1,"explain":"Frequent symbols get shorter codes, built greedily from the least frequent pairs."}
