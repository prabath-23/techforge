---
title: From Transistors to Logic Gates to an Adder
summary: How a computer is built from switches — transistors as electrically controlled switches, the AND, OR, NOT and XOR gates made from them, combining gates to add binary numbers, memory from feedback loops, and the clock that keeps billions of them in step. The bridge from physics to programs.
---

## A computer made of switches

> [!STORY] In 1937, a 21-year-old MIT student named Claude Shannon wrote a master's thesis showing that circuits of electrical switches could carry out **any logical operation** — the true/false algebra that George Boole had invented in the 1850s. It has been called the most important master's thesis of the twentieth century. Today a phone's processor contains around 15–20 billion microscopic switches doing exactly what Shannon described: combining on/off signals according to the rules of logic, billions of times a second.

## The transistor: a switch controlled by electricity

A **transistor** has three connections. A small voltage on one (the **gate**) decides whether current can flow between the other two. Gate on → switch closed → current flows. Gate off → switch open.

> [!ANALOGY] A tap on a water pipe, except the tap is turned by water pressure from another pipe. No hand needed — so the output of one tap can control another tap, and you can build chains of taps controlling taps. That's what makes it possible to build logic.

Modern transistors are only a few dozen atoms wide and switch billions of times per second. Modern chips use **CMOS** — pairs of complementary transistors — which use almost no power while holding still and only spend energy when they switch (which is why chips heat up when busy).

## Logic gates

Wire a few transistors together and you get a **logic gate**: a tiny circuit that takes one or two input bits and produces an output bit by a fixed rule.

| Gate | Output is 1 when… | Symbol in code |
|---|---|---|
| **NOT** | the input is 0 (it flips the bit) | `~a`, `!a` |
| **AND** | both inputs are 1 | `a & b` |
| **OR** | at least one input is 1 | `a \| b` |
| **XOR** | exactly one input is 1 | `a ^ b` |
| **NAND** | NOT (a AND b) | — |

> [!NOTE] **NAND is universal.** Every other gate — and therefore an entire computer — can be built from NAND gates alone. Chips are often designed largely from NAND and NOR gates because they're the cheapest to make with CMOS transistors. (The popular course "From NAND to Tetris" builds a working computer, step by step, starting from nothing but NAND.)

These are the same operations as your programming language's bitwise operators. When you write `flags & MASK`, the CPU runs your bits through a row of AND gates.

## Building an adder

Adding two single bits has four cases:

```text
0 + 0 = 0           sum 0, carry 0
0 + 1 = 1           sum 1, carry 0
1 + 0 = 1           sum 1, carry 0
1 + 1 = 10 (two)    sum 0, carry 1
```

Look at the columns: the **sum** bit is 1 exactly when one input is 1 — that's **XOR**. The **carry** bit is 1 only when both are 1 — that's **AND**. Two gates, and you have a **half adder**.

To add multi-bit numbers, each column must also add the carry from the column to its right — three inputs. A **full adder** handles that with two half adders and an OR gate. Chain full adders together, and you can add numbers of any width:

::widget Stepper {"type":"flow","cols":4,"title":"Adding 0110 (6) + 0111 (7) with a chain of full adders","what":"A 4-bit adder made of four full adders, one per column, working right to left just like adding by hand. Each box is one column.","steps":["Press Play, starting from the rightmost column (bit 0).","At each column, note the sum bit and the carry passed to the next column.","Read the final answer from the sum bits plus the last carry."],"nodes":[["Bit 0 (ones)","Inputs 0 + 1, carry in 0. Sum = 1, carry out = 0."],["Bit 1 (twos)","Inputs 1 + 1, carry in 0. Sum = 0, carry out = 1 — just like 5 + 5 = 10 in decimal carries a 1."],["Bit 2 (fours)","Inputs 1 + 1, carry in 1. Total three 1s → sum = 1, carry out = 1."],["Bit 3 (eights)","Inputs 0 + 0, carry in 1. Sum = 1, carry out = 0. Result: 1101 = 13. Correct: 6 + 7 = 13."]]}

This simple chain is called a **ripple-carry adder**: each column waits for the carry from the one before. For 64-bit numbers that's slow, so real CPUs use **carry-lookahead** adders that compute carries in parallel with extra gates — trading more transistors for less waiting, a theme you'll see throughout hardware.

Thanks to two's complement (chapter 1), the **same adder subtracts**: to compute a − b, flip b's bits and add with an initial carry of 1.

### The ALU

Put an adder together with AND, OR, XOR, shift and comparison circuits, plus a selector that picks which result to output based on an **operation code**, and you have an **arithmetic logic unit (ALU)** — the calculator at the heart of every CPU. When the CPU executes `add r1, r2`, the instruction's bits literally set the ALU's selector to "add".

## Memory: circuits that remember

Gates so far have no memory — their output depends only on the current inputs. To remember a bit, loop a gate's output back into its input. A pair of cross-connected NOR (or NAND) gates forms a **latch**: once set, it stays set until reset, even after the input changes.

> [!ANALOGY] A light switch with a little spring catch. Push it once and it stays on by itself; it doesn't need you to keep holding it. The feedback loop is the catch.

- A **flip-flop** is a latch that only changes at the tick of a clock. Groups of flip-flops make **registers** — the CPU's fastest storage, holding the values it's working on right now.
- **SRAM** (static RAM) uses about six transistors per bit in a similar loop: fast, but big and expensive — used for **CPU caches** (chapter 5).
- **DRAM** (your main memory) stores each bit as charge in a tiny **capacitor** with one transistor: dense and cheap, but the charge leaks away, so it must be **refreshed** thousands of times a second — and it's slower.

## The clock: keeping billions of switches in step

Signals take time to travel through gates. If parts of the chip used results before they'd settled, chaos would follow. So a **clock** — an oscillating signal — ticks billions of times per second (3 GHz = 3 billion ticks), and all flip-flops update together on each tick.

> [!ANALOGY] A rowing crew with a coxswain calling "stroke… stroke…". Everyone pulls together on the call. Calling faster speeds the boat up — until some rowers can't finish their stroke in time, and the crew falls apart. A chip's maximum clock speed is set by its slowest path of gates finishing within one tick.

Why did clock speeds stop climbing around 3–5 GHz in the mid-2000s? Power. Faster switching means more heat, and chips hit the limit of what can be cooled (the end of "Dennard scaling"). Since then, chip makers have used their growing transistor budgets for **more cores** (chapter 6) and **smarter cores** (chapter 4) instead of faster clocks.

> [!NOTE] **Moore's law** — Gordon Moore's 1965 observation that the number of transistors on a chip doubles roughly every two years — held for decades and drove the whole industry. It has slowed as transistors approach atomic sizes, but chips keep improving through 3D stacking, chiplets and specialized accelerators (chapter 7).

> [!RECAP]
> - A **transistor** is a switch controlled by electricity; billions make up a chip.
> - **Logic gates** (NOT, AND, OR, XOR, NAND) are small transistor circuits; NAND alone can build anything.
> - A **half adder** is XOR (sum) + AND (carry); chained **full adders** add numbers; the same circuit subtracts with two's complement. Adders + logic = the **ALU**.
> - **Feedback** makes memory: latches, flip-flops, **registers**, **SRAM** (caches) and **DRAM** (main memory, refreshed constantly).
> - A **clock** synchronizes everything; heat stopped clock speeds rising, so chips added more and smarter cores.

> [!INTERVIEW] Hardware basics come up in systems and embedded interviews: build XOR from other gates, explain a half adder, SRAM vs DRAM, why clock speeds plateaued. They also make bit-manipulation tricks intuitive.

::quiz {"q":"Which two gates form a half adder?","options":["AND and OR","XOR for the sum, AND for the carry","NOT and NAND","OR and XOR"],"answer":1,"explain":"Sum is 1 when exactly one input is 1; carry when both are."}

::quiz {"q":"Why is DRAM refreshed thousands of times per second?","options":["To clear old data","Each bit is a charge in a tiny capacitor that leaks away","To save power","To sync with the clock"],"answer":1,"explain":"SRAM holds bits with a feedback loop and needs no refresh, but uses more transistors."}

::quiz {"q":"Why did CPU clock speeds stop rising in the mid-2000s?","options":["Transistors stopped shrinking","Power and heat — faster switching produced more heat than could be removed","Software couldn't use them","Memory got slower"],"answer":1,"explain":"Chip makers turned to more cores and smarter cores instead."}
