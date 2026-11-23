---
title: Intervals, Sweep Lines and Scheduling Problems
summary: A family of problems about things that start and end — meetings, bookings, shifts, ranges — solved with a few reusable ideas: sort by start or end, merge overlapping intervals, sweep a line across events to count overlaps, use a heap to track what's still running, greedy interval scheduling, and difference arrays. With real examples from calendars, hotels and cloud schedulers.
---

## How many meeting rooms do we need?

> [!STORY] An office manager has next week's list of meetings — each with a start and end time — and needs to know the minimum number of rooms to book. Checking every pair of meetings for overlap is slow and doesn't directly give the answer. There's a beautifully simple method: write every start and end on a timeline, walk along it from left to right, add one when a meeting starts and subtract one when it ends. The highest number you reach is the answer. That walk is called a **sweep line**, and with sorting it solves a whole family of scheduling problems.

An **interval** is a pair [start, end]: a meeting, a hotel booking, a CPU job, a range of IP addresses, a gene on a chromosome. Most interval problems are solved by **sorting** first and then making one pass.

## Do two intervals overlap?

[a, b] and [c, d] overlap if and only if **a < d and c < b** — each starts before the other ends. (Use ≤ if touching endpoints count as overlapping; for meetings, one ending at 10:00 and another starting at 10:00 usually don't conflict.)

> [!NOTE] Decide early whether intervals are **closed** [start, end] or **half-open** [start, end). Half-open (end is exclusive) avoids many off-by-one bugs: a booking for nights [Mon, Wed) and another for [Wed, Fri) don't overlap. Most calendar and database range types use half-open intervals.

## Pattern 1: merge overlapping intervals

Combine overlapping intervals into the fewest non-overlapping ones — e.g. a person's busy times from several calendars.

```python
def merge(intervals):
    intervals.sort(key=lambda iv: iv[0])          # by start
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:      # overlaps the last merged one
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged

merge([[9, 10], [9.5, 12], [13, 14], [13.5, 15]])   # [[9, 12], [13, 15]]
```

After sorting by start, an interval can only overlap the **most recent** merged block. O(n log n).

**Free time** for a group (when can everyone meet?) = merge everyone's busy intervals, then take the **gaps** between them.

## Pattern 2: the sweep line

Turn intervals into **events** — +1 at each start, −1 at each end — sort them by time, and walk through, keeping a running count.

::widget Stepper {"type":"flow","cols":4,"title":"Sweeping across five meetings to find the rooms needed","what":"Meetings: A 9–10, B 9:30–11, C 10–11:30, D 10:15–10:45, E 11–12. Each box is one moment where the count of running meetings changes.","steps":["Press Play and follow the running count.","Note the highest count — that's the number of rooms.","Notice that at 10:00, A's end is processed before C's start."],"nodes":[["9:00  A starts","Running: 1 (A)."],["9:30  B starts","Running: 2 (A, B)."],["10:00  A ends, then C starts","Ends are processed before starts at the same time, so A frees its room for C. Running: 2 (B, C)."],["10:15  D starts","Running: 3 (B, C, D) — the peak."],["10:45  D ends","Running: 2."],["11:00  B ends, E starts","Running: 2 (C, E)."],["11:30  C ends","Running: 1."],["12:00  E ends","Running: 0. Peak was 3 → three rooms are enough, and necessary."]]}

```python
def min_rooms(meetings):
    events = []
    for s, e in meetings:
        events.append((s, 1))
        events.append((e, -1))
    events.sort(key=lambda ev: (ev[0], ev[1]))     # at equal times, -1 (end) sorts before +1 (start)
    running = best = 0
    for _, delta in events:
        running += delta
        best = max(best, running)
    return best
```

The same sweep answers: the maximum number of concurrent users from login/logout logs, peak simultaneous calls, how many servers are needed for a batch schedule, and "the busiest hour" in a call center.

## Pattern 3: a heap of what's still running

When you need to know **which** resource each interval uses — not just how many — sort by start and keep a **min-heap of end times** (DSA track, chapter 5):

```python
import heapq

def assign_rooms(meetings):
    meetings.sort()                                  # by start time
    free_at = []                                     # heap of (end_time, room)
    rooms, next_room = {}, 0
    for start, end in meetings:
        if free_at and free_at[0][0] <= start:       # earliest-ending room is free again
            _, room = heapq.heappop(free_at)
        else:
            room, next_room = next_room, next_room + 1
        rooms[(start, end)] = room
        heapq.heappush(free_at, (end, room))
    return rooms
```

This is how simple job schedulers assign tasks to machines, and how a hotel assigns rooms as guests check in.

## Pattern 4: greedy interval scheduling

**Choose the maximum number of non-overlapping intervals** — e.g. the most talks one person can attend, or the most ad slots without clashes.

The proven greedy rule: **sort by end time** and repeatedly pick the interval that **finishes earliest** and doesn't clash with the last one picked.

```python
def max_non_overlapping(intervals):
    intervals.sort(key=lambda iv: iv[1])            # by END
    count, last_end = 0, float("-inf")
    for s, e in intervals:
        if s >= last_end:
            count += 1
            last_end = e
    return count
# "Minimum removals to make intervals non-overlapping" = n - max_non_overlapping
```

> [!ANALOGY] Planning a day at a festival with overlapping shows. Always going to the show that **ends soonest** leaves you the most remaining time for others. Picking the show that starts first or is shortest can trap you in a long one that blocks everything else.

Related greedy problems: the minimum number of arrows to burst balloons (sort by end), and the fewest intervals needed to **cover** a range (sort by start, and each time extend as far right as possible — like covering a road with the fewest street lights, or video clips covering a whole match).

If intervals have **weights** (pay for each job) and you want maximum total weight, greedy fails; use **DP** with binary search: sort by end, and for each job choose max(skip it, take it + best result among jobs ending before it starts). O(n log n).

## Pattern 5: difference arrays for range updates

"For each of these 100,000 bookings [l, r], add 1 to every day in the range — then report each day's total." Adding to each day individually is O(n × range). Instead, add +1 at l and −1 at r + 1, then take a **prefix sum** (chapter 8 of DSA):

```python
diff = [0] * (days + 1)
for l, r, seats in bookings:
    diff[l] += seats
    diff[r + 1] -= seats
total, per_day = 0, []
for d in range(days):
    total += diff[d]
    per_day.append(total)
```

It's the sweep line on a fixed grid: O(n + days). Used for flight seat bookings, "car pooling" capacity checks and counting overlaps per pixel or per minute.

## Intervals in real systems

- **Calendars:** finding free slots for several attendees (merge + gaps), detecting conflicts on booking.
- **Hotels and rentals:** availability = no overlapping booking for the room. Databases help: PostgreSQL has range types and **exclusion constraints** that forbid overlapping bookings at the database level:

```sql
CREATE TABLE bookings (
  room_id int,
  stay    daterange,
  EXCLUDE USING gist (room_id WITH =, stay WITH &&)   -- no two bookings for one room may overlap
);
```

- **Cloud schedulers and CPU schedulers** place jobs on machines over time (OS track).
- **Networking:** merging IP ranges and firewall rules; finding which CIDR block contains an address.
- **Genomics:** finding overlapping genes and reads; **interval trees** answer "which stored intervals overlap this query?" in O(log n + k).

> [!RECAP]
> - Two intervals overlap when each **starts before the other ends**; prefer **half-open** intervals.
> - **Merge**: sort by start, extend or append. Free time = gaps after merging.
> - **Sweep line**: +1 at starts, −1 at ends, sorted (ends first on ties); the peak = resources needed.
> - **Min-heap of end times** assigns specific rooms or machines.
> - **Greedy by earliest end** maximizes non-overlapping intervals; weighted versions need DP + binary search.
> - **Difference arrays** apply many range updates in O(n).

> [!INTERVIEW] Very common: merge intervals, insert interval, meeting rooms I and II, non-overlapping intervals, minimum arrows, employee free time, car pooling, and "design a booking system without double-booking". Recognize the pattern and state the sort key.

::quiz {"q":"To find the minimum number of meeting rooms, what's the core idea?","options":["Sort by duration","Sweep through start (+1) and end (−1) events and track the peak count","Use a trie","Binary search on the answer only"],"answer":1,"explain":"The maximum number of simultaneous meetings is the answer."}

::quiz {"q":"To attend the maximum number of non-overlapping talks, which talk should you pick next?","options":["The one that starts first","The shortest one","The one that ends earliest among those that don't clash","The longest one"],"answer":2,"explain":"Earliest finish leaves the most room for the rest — provably optimal."}

::quiz {"q":"Do the half-open intervals [9, 10) and [10, 11) overlap?","options":["Yes","No — the first ends exactly where the second begins","Only on weekdays","It depends on the time zone"],"answer":1,"explain":"Half-open intervals exclude their end point."}
