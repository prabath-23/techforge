---
title: Bit Manipulation and Bitsets
summary: Using individual bits as a data structure — the bitwise operators and the handful of tricks worth memorizing, flags and permission masks, bitsets for fast set operations on small universes, enumerating all subsets with bitmasks, bitmask dynamic programming, and real-world uses from Redis to chess engines and Bloom filters.
---

## 64 yes/no answers in one number

> [!STORY] A chess engine needs to know, millions of times per second, which squares are attacked by white's pieces. Storing a list of squares would be slow. Instead, top engines like Stockfish use **bitboards**: a single 64-bit number where bit *i* means "square *i* is attacked". Combining white's knight attacks with its bishop attacks is one OR instruction. Checking whether the king's square is attacked is one AND. Operations that would loop over 64 squares become single CPU instructions. That's the power of treating bits as a data structure.

Chapter 1 of the Architecture track shows how numbers are stored in binary. Here we use those bits deliberately.

## The operators

| Operator | Meaning | Example (8-bit) |
|---|---|---|
| `a & b` | AND: 1 where both are 1 | `1100 & 1010 = 1000` |
| `a \| b` | OR: 1 where either is 1 | `1100 \| 1010 = 1110` |
| `a ^ b` | XOR: 1 where they differ | `1100 ^ 1010 = 0110` |
| `~a` | NOT: flip every bit | `~1100 = …0011` |
| `a << k` | Shift left: multiply by 2ᵏ | `0011 << 2 = 1100` |
| `a >> k` | Shift right: divide by 2ᵏ (rounding down) | `1100 >> 2 = 0011` |

## Tricks worth knowing by heart

```python
x & (1 << i)          # is bit i set?
x | (1 << i)          # set bit i
x & ~(1 << i)         # clear bit i
x ^ (1 << i)          # toggle bit i
x & (x - 1)           # clear the lowest set bit
x & -x                # isolate the lowest set bit (used by Fenwick trees, next chapter)
x & (x - 1) == 0      # is x a power of two? (for x > 0)
bin(x).count("1")     # number of set bits — "popcount" (one CPU instruction in C: __builtin_popcount)
a ^ b ^ b == a        # XOR undoes itself
```

> [!EXAMPLE] **Why `x & (x - 1)` clears the lowest set bit.** Take x = `10110100`. Subtracting 1 flips the lowest 1 to 0 and all the 0s below it to 1: `10110011`. ANDing them keeps everything above that bit and zeroes the rest: `10110000`. Repeating this until x is 0 counts the set bits in as many steps as there are 1s (Kernighan's trick).

### Classic interview problems solved with bits

- **Single number:** every element appears twice except one — XOR them all; pairs cancel, the single one remains. O(n) time, O(1) space.
- **Missing number** from 0..n: XOR all indices and all values.
- **Power of two / four:** `x > 0 and x & (x-1) == 0` (and for four, the single bit is at an even position).
- **Counting bits** for every number up to n: `bits[i] = bits[i >> 1] + (i & 1)`.
- **Swap without a temp:** `a ^= b; b ^= a; a ^= b` (a curiosity — don't use it in real code).

## Flags and masks

Bits are perfect for storing several independent yes/no options compactly.

```python
READ, WRITE, EXECUTE = 4, 2, 1          # the Unix permission bits (Linux track)
perms = READ | WRITE                    # 6 → rw-
can_write = bool(perms & WRITE)         # True
perms &= ~WRITE                         # revoke write → 4
```

You'll see this pattern in file permissions, TCP header flags (SYN, ACK, FIN — Networking track), feature-flag sets, and OS APIs like `open(path, O_CREAT | O_WRONLY)`.

> [!ANALOGY] A row of light switches on a wall panel. Each switch controls one light independently. Reading the whole panel at once tells you the state of every light; flipping one switch doesn't touch the others.

## Bitsets: sets as bits

If the possible elements are small integers 0..n−1, a set can be a row of n bits: bit *i* is 1 if *i* is in the set.

| Operation | With bitsets |
|---|---|
| Union | `a \| b` |
| Intersection | `a & b` |
| Difference | `a & ~b` |
| Symmetric difference | `a ^ b` |
| Size | popcount |
| Membership | test one bit |

Each machine word handles **64 elements per instruction**, and SIMD handles even more (Architecture track, chapter 4). For a universe of a million elements, a bitset takes just 125 KB.

> [!EXAMPLE] **Real-world bitsets.**
> - **Redis bitmaps:** `SETBIT active:2026-11-23 <userId> 1` records daily active users — 100 million users fit in ~12 MB, and `BITOP AND` finds users active on both of two days.
> - **Databases** use bitmap indexes for low-cardinality columns and bitmaps to combine index results.
> - **Roaring bitmaps** compress sparse bitsets and power search engines like Lucene/Elasticsearch, Apache Druid and Pinot.
> - **Bloom filters** (chapter 9) are a bitset plus hashing.

## Enumerating subsets with bitmasks

A set of n items has 2ⁿ subsets — and the numbers 0 to 2ⁿ−1, read as bitmasks, list every one of them exactly once.

```python
items = ["a", "b", "c"]
n = len(items)
for mask in range(1 << n):                       # 0 .. 7
    subset = [items[i] for i in range(n) if mask & (1 << i)]
    print(f"{mask:03b}", subset)
# 000 []   001 ['a']   010 ['b']   011 ['a','b']   100 ['c'] ...
```

Useful for brute-forcing small problems (n ≤ ~20): "choose a subset of tasks that fits the budget and maximizes value". To iterate over the subsets of a given mask: `sub = mask; while sub: …; sub = (sub - 1) & mask`.

## Bitmask dynamic programming

Some problems need to remember **which items have been used so far** — exactly a subset. With n ≤ ~20, the subset fits in a bitmask, which becomes part of the DP state (Algorithms track, chapter 5).

The classic: the **travelling salesman problem**. Visit every city once and return home, minimizing distance. Trying all orders is n! (20! ≈ 2.4 × 10¹⁸). With bitmask DP:

```python
from functools import lru_cache
import math

def tsp(dist):
    n = len(dist)
    @lru_cache(None)
    def best(mask, last):                   # visited set 'mask', currently at city 'last'
        if mask == (1 << n) - 1:
            return dist[last][0]            # all visited: return home
        ans = math.inf
        for nxt in range(n):
            if not mask & (1 << nxt):
                ans = min(ans, dist[last][nxt] + best(mask | (1 << nxt), nxt))
        return ans
    return best(1, 0)                       # start at city 0, with only city 0 visited
```

States: 2ⁿ × n; work per state: n. Total O(2ⁿ · n²) — for n = 20, about 400 million operations instead of 10¹⁸. Still exponential, but feasible.

> [!NOTE] Other bitmask-DP problems: assigning n workers to n jobs, the minimum number of sessions to finish tasks, covering all skills with the smallest team, and "shortest path visiting all nodes" (BFS over (node, mask) states).

## Gotchas

- **Operator precedence:** in many languages `x & 1 == 0` parses as `x & (1 == 0)`. Always parenthesize: `(x & 1) == 0`.
- **Signed shifts:** right-shifting a negative number may fill with 1s (arithmetic shift); Java has `>>>` for logical shift. Use unsigned types in C/C++ for bit work.
- **Shifting by ≥ the width** (e.g. `1 << 64` on a 64-bit int) is undefined in C/C++. Python integers are unbounded, so masks never overflow there — but they're slower.
- **Readability:** name your masks and wrap tricks in small functions; `is_power_of_two(x)` beats an unexplained `x & (x - 1)`.

> [!RECAP]
> - Bitwise operators work on all bits at once; memorize: test/set/clear/toggle bit *i*, `x & (x-1)`, `x & -x`, popcount, XOR cancellation.
> - **Flags and masks** pack many booleans into one integer (permissions, TCP flags).
> - **Bitsets** make set operations on small universes extremely fast and compact (Redis bitmaps, Roaring bitmaps).
> - Numbers 0..2ⁿ−1 **enumerate all subsets**; **bitmask DP** solves problems like TSP in O(2ⁿ·n²) for n ≤ ~20.
> - Watch precedence, signed shifts and readability.

> [!INTERVIEW] Bit problems are common warm-ups: single number (XOR), counting bits, power of two, reverse bits, subsets via bitmasks, and bitmask DP for small n. Explain the trick, not just the code.

::quiz {"q":"Every number in an array appears twice except one. What's the O(1)-space solution?","options":["Sort and scan","XOR all numbers — pairs cancel out","Use a hash map","Sum and divide"],"answer":1,"explain":"a ^ a = 0 and a ^ 0 = a."}

::quiz {"q":"What does x & (x - 1) do?","options":["Doubles x","Clears the lowest set bit of x","Sets all bits","Counts bits"],"answer":1,"explain":"It's zero exactly when x is a power of two (for x > 0)."}

::quiz {"q":"How many subsets does bitmask enumeration produce for 10 items?","options":["10","100","1,024","3,628,800"],"answer":2,"explain":"2¹⁰ = 1024 masks, from 0 to 1023."}
