---
title: Pipelines, Branch Prediction and Out-of-Order Execution
summary: How a modern CPU runs several instructions per clock tick — the assembly-line pipeline, the hazards that stall it, guessing the outcome of branches (and why sorted data can make a loop six times faster), executing instructions out of order, superscalar and SIMD execution — and how speculation led to the Spectre and Meltdown vulnerabilities.
---

## The famous sorted-array mystery

> [!STORY] In 2012, someone asked on Stack Overflow why a simple loop — summing all numbers in an array that are at least 128 — ran almost **six times faster** when the array was sorted first. The code was identical; only the order of the data changed. The answer, which became one of the most popular in the site's history, revealed something most programmers never think about: the CPU **guesses** which way each `if` will go before it knows — and when its guesses are right, everything flies.

To understand why, we need to see how a modern CPU actually executes instructions.

## Pipelining: an assembly line for instructions

The fetch-decode-execute cycle (chapter 3) has several stages. A naive CPU would finish one instruction completely before starting the next. Instead, CPUs **pipeline**: while one instruction executes, the next is being decoded and the one after that fetched.

> [!ANALOGY] Doing laundry. Washing, drying and folding one load takes 3 hours. Four loads one after another: 12 hours. But you can put load 2 in the washer as soon as load 1 moves to the dryer. With all three machines busy, a new load finishes every hour. Each load still takes 3 hours, but **throughput** triples. That's a pipeline.

A classic pipeline has 5 stages (fetch, decode, execute, memory access, write back); modern CPUs have 15–20. Ideally, one instruction completes every clock cycle.

### Hazards: when the line stalls

- **Data hazards:** an instruction needs a result the previous one hasn't produced yet (`add x1, …` then `sub x2, x1, …`). CPUs **forward** results directly between stages, but a value loaded from memory may still force a wait.
- **Structural hazards:** two instructions need the same hardware at once.
- **Control hazards:** the CPU doesn't know which instruction comes after a **branch** until the branch's condition is computed — many stages later. Waiting would leave the pipeline empty. This is where guessing comes in.

## Branch prediction: guessing the future

Rather than wait, the CPU **predicts** whether each branch will be taken and keeps fetching and executing along the predicted path — **speculatively**. If the guess was right, no time was lost. If wrong, it throws away the speculative work and restarts from the correct path, wasting roughly **15–20 cycles**.

Modern **branch predictors** are remarkably good — often over 95–99% accurate. They remember each branch's recent history and spot patterns ("taken, taken, not taken, repeat").

::widget Stepper {"type":"flow","cols":2,"title":"Why sorting made the loop six times faster","what":"The same loop — if (value >= 128) sum += value — running over random data versus sorted data, from the branch predictor's point of view.","steps":["Press Play and compare the two situations.","For each, ask: how often can the predictor guess correctly?","Read the last box for a way to remove the branch entirely."],"nodes":[["Random data","Values jump around: 37, 201, 12, 180, 99, 240… The branch is taken or not at random, so the predictor is right only about half the time. Every wrong guess throws away ~15–20 cycles of work."],["Sorted data","All the small values come first, then all the large ones: not taken, not taken, … then taken, taken, taken. The predictor is almost always right, and the pipeline stays full."],["The result","Same instructions, same data, different order: the sorted version ran about six times faster in the original test."],["Branchless code","Compilers (and programmers) can replace the if with arithmetic or a conditional-move instruction: sum += (value >= 128) ? value : 0 computed without a jump. No branch, no misprediction — fast on any data."]]}

> [!NOTE] This is why performance-critical code avoids unpredictable branches in hot loops, why sorting or grouping data can speed up processing, and why profilers report **branch-miss rates** (`perf stat` shows them).

## Out-of-order execution

Some instructions are slow — a load that misses the cache can take 100+ cycles (next chapter). Waiting for it would stall everything behind it, even instructions that don't depend on it.

So modern CPUs execute **out of order**: they look ahead through a window of a few hundred upcoming instructions, find ones whose inputs are ready, and run them early. Results are then **retired in the original program order**, so the program can't tell anything was rearranged.

> [!ANALOGY] A kitchen with several cooks working from a list of orders. If order 5 is waiting on bread from the bakery, the cooks don't stand around — they start orders 6, 7 and 8, whose ingredients are ready. But the waiter still serves the dishes to tables in the order they were placed.

Techniques that make this work:

- **Register renaming:** the CPU has hundreds of hidden physical registers and maps the few named ones onto them, so instructions that merely reuse a register name don't have to wait for each other.
- A **reorder buffer** tracks in-flight instructions and retires them in order — and discards them cleanly on a misprediction.

## Doing more per cycle

- **Superscalar:** modern cores have many execution units (several ALUs, load/store units, floating-point units) and can issue **4–10 instructions per cycle** when the code allows it.
- **SIMD (single instruction, multiple data):** one instruction operates on a whole vector of values — e.g. 8 floats at once with x86's AVX2, or 16 with AVX-512, and ARM's NEON/SVE. Compilers auto-vectorize simple loops; libraries for image processing, compression, JSON parsing and machine learning use SIMD heavily.
- **Simultaneous multithreading (Hyper-Threading):** one physical core runs two hardware threads, filling each other's idle execution units. It shows up as two "logical CPUs" per core — a useful boost, but not double the speed.

## When speculation leaked secrets: Spectre and Meltdown

> [!STORY] In January 2018, researchers disclosed **Spectre** and **Meltdown**, affecting nearly every modern processor. The insight: when the CPU speculatively executes instructions down a wrongly predicted path, it throws away the **results** — but not the side effects on the **cache**. An attacker could trick the CPU into speculatively reading secret memory (a password, a key from another process or the kernel) and using it to touch a particular cache line. Then, by timing memory accesses, the attacker could see which line was cached — and recover the secret, one byte at a time. Decades of performance tricks had a hidden security cost.

Fixes included operating-system changes (separating kernel and user memory more strictly, at a performance cost for system-call-heavy workloads), compiler changes, browser changes (reducing timer precision and isolating sites into separate processes), and new hardware designs. It's a lasting lesson: optimizations that are invisible to **correctness** can still be visible to **timing**.

> [!RECAP]
> - **Pipelining** overlaps instruction stages like a laundry line; hazards (data, structural, control) cause stalls.
> - **Branch prediction** guesses branch outcomes and executes **speculatively**; mispredictions cost ~15–20 cycles — why sorted data or branchless code can be much faster.
> - **Out-of-order execution** runs ready instructions early and retires them in order, using register renaming and a reorder buffer.
> - **Superscalar** cores issue several instructions per cycle; **SIMD** processes vectors; **SMT** shares a core between two threads.
> - **Spectre and Meltdown** showed speculative execution can leak secrets through cache timing.

> [!INTERVIEW] Explain the sorted-array question, what a branch misprediction costs, pipelining vs parallelism, and SIMD. Performance-focused roles may ask how you'd make a hot loop faster; security roles may ask how Spectre works at a high level.

::quiz {"q":"Why can summing values over 128 run much faster on sorted data?","options":["Sorted data uses less memory","The branch becomes predictable, so the CPU rarely throws away speculative work","Sorting removes the loop","The cache is larger for sorted data"],"answer":1,"explain":"On random data, the predictor is right only about half the time."}

::quiz {"q":"What does out-of-order execution do while a load waits on memory?","options":["Stops the whole CPU","Executes later, independent instructions whose inputs are ready, then retires everything in program order","Skips the load","Restarts the program"],"answer":1,"explain":"The program still sees results in the original order."}

::quiz {"q":"What did Spectre exploit?","options":["A bug in one operating system","Speculatively executed instructions leaving traces in the cache that can be measured by timing","Weak passwords","Network packet timing"],"answer":1,"explain":"Results were discarded, but cache side effects were not."}
