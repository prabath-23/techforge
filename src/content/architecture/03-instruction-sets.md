---
title: Instruction Sets — x86, ARM and RISC-V
summary: The language a CPU actually speaks — what machine instructions and registers are, the fetch-decode-execute cycle, reading a little assembly generated from C, how function calls use the stack, CISC vs RISC, and why Apple, AWS and Android moved to ARM while RISC-V rises as an open alternative.
---

## Your code, as the CPU sees it

> [!STORY] In 2020, Apple announced it was moving every Mac from Intel's x86 processors to its own ARM-based chips. Developers worried: would their apps run? Apple shipped **Rosetta 2**, which translates x86 machine instructions into ARM instructions — and many translated apps ran faster on the new chips than natively on the old ones. Meanwhile, AWS was moving huge numbers of customers to its ARM-based Graviton servers for better price-performance. Underneath both stories is one concept: the **instruction set architecture** — the contract between software and hardware.

## The CPU's vocabulary

A CPU understands only a fixed set of simple **instructions**, each encoded as bits:

- **Arithmetic and logic:** add, subtract, multiply, AND, OR, shift, compare.
- **Data movement:** load a value from memory into a register; store a register into memory.
- **Control flow:** jump to another instruction; jump only if a condition holds (branch); call and return from functions.

The **instruction set architecture (ISA)** defines this vocabulary: which instructions exist, how they're encoded, how many **registers** there are, and how memory is addressed. Any chip implementing the ISA runs the same programs — an Intel and an AMD chip both run x86 software, though they're built very differently inside.

> [!ANALOGY] An ISA is like the official rules of chess. Many different chess clubs, computers and players can follow the rules in completely different ways — but any game recorded in standard notation can be replayed by any of them. The ISA is the notation; each chip design is a different player.

### Registers: the CPU's hands

**Registers** are a small number of named storage slots inside the CPU — 16 general-purpose 64-bit registers on x86-64 (`rax`, `rbx`, …), 31 on 64-bit ARM (`x0`–`x30`). They're the fastest storage in the computer (accessed in under a nanosecond). Instructions mostly operate on registers; values must be **loaded** from memory into registers before working on them, then **stored** back.

## The fetch-decode-execute cycle

::widget Stepper {"type":"cycle","title":"How a CPU runs a program","what":"The basic loop every CPU repeats for each instruction, billions of times per second. Modern CPUs overlap and reorder these steps (next chapter), but the logic is the same.","steps":["Press Play and go around the loop once.","Notice the program counter, which always points to the next instruction.","Find the step where a branch changes what happens next."],"nodes":[["Fetch","Read the instruction at the address in the program counter (PC) from memory (in practice, from the instruction cache)."],["Decode","Work out what the bits mean: which operation, which registers, any constant value or memory address."],["Execute","Do it: the ALU adds, compares or computes an address; or a load or store goes to memory."],["Write back and advance","Save the result into the destination register. Move the PC to the next instruction — or, for a jump or a taken branch, to the target address."]]}

## A little assembly

Here's a C function and the 64-bit ARM assembly a compiler produces for it (with optimizations):

```c
int sum(int *a, int n) {
    int total = 0;
    for (int i = 0; i < n; i++) total += a[i];
    return total;
}
```

```asm
sum:                        // x0 = pointer to a, w1 = n
    mov   w8, #0            // total = 0
    cmp   w1, #1            // if n < 1 …
    b.lt  done              //   … skip the loop
loop:
    ldr   w9, [x0], #4      // load a[i] into w9, then move the pointer forward 4 bytes
    add   w8, w8, w9        // total += a[i]
    subs  w1, w1, #1        // n -= 1, setting flags
    b.ne  loop              // repeat while n != 0
done:
    mov   w0, w8            // return value goes in w0
    ret
```

You can see the whole vocabulary at work: moves, a compare, conditional branches, a load, an add and a return. Try it yourself with **Compiler Explorer** (godbolt.org), which shows the assembly for any code and compiler.

> [!NOTE] You'll rarely write assembly, but reading it helps when profiling hot code, checking whether the compiler vectorized a loop, understanding crash dumps, or doing security work.

## How function calls work: the stack

When a function calls another, the CPU needs to remember where to come back to, and each function needs space for its local variables. That's the **call stack** (OS track): a region of memory that grows and shrinks as functions are called and return.

A **calling convention** (part of each platform's ABI) fixes the rules:

- Arguments go in specific registers (`x0`–`x7` on ARM; `rdi`, `rsi`, `rdx`… on x86-64 Linux), extras on the stack.
- The return value comes back in `x0` / `rax`.
- The return address is saved (in ARM's link register `x30`, or pushed onto the stack on x86).
- Each function's **stack frame** holds saved registers and local variables.

> [!WARN] This is also why **buffer overflows** are dangerous in C and C++: writing past the end of a local array on the stack can overwrite the saved return address, and the function "returns" into attacker-chosen code. Defenses include stack canaries, non-executable stacks, address randomization (ASLR) and, increasingly, memory-safe languages like Rust.

## CISC vs RISC

Two design philosophies:

| | **CISC** (x86) | **RISC** (ARM, RISC-V) |
|---|---|---|
| Instructions | Many, some complex (one instruction can load, compute and store) | Fewer, simple, regular |
| Encoding | Variable length: 1 to 15 bytes | Fixed length (usually 4 bytes) — easy to decode many at once |
| Memory access | Most instructions can use memory operands | Only load and store touch memory |
| Origins | 1978 Intel 8086; backward compatible ever since | 1980s research at Berkeley and Stanford |

Today the line is blurry: modern x86 chips translate their complex instructions internally into simple RISC-like **micro-operations** before executing them. But x86's variable-length encoding makes decoding many instructions per cycle harder, which is one reason ARM designs can be very efficient.

## The three ISAs that matter

- **x86-64** (Intel, AMD): dominant in desktops, laptops and servers for decades; huge software compatibility.
- **ARM** (designs licensed by Arm Ltd. to Apple, Qualcomm, Samsung, AWS, Google, Microsoft, NVIDIA and others): nearly every phone, Apple Silicon Macs, and a fast-growing share of cloud servers (AWS Graviton, Google Axion, Azure Cobalt) thanks to performance per watt.
- **RISC-V**: an **open** ISA anyone can implement without licensing fees, born at UC Berkeley in 2010. Widely used in microcontrollers, storage controllers and AI accelerators, and growing toward phones and servers.

> [!EXAMPLE] **What this means for you.** Building a Docker image on an M-series Mac produces ARM (`arm64`) binaries by default; deploying it to an x86 server fails with "exec format error". The fix is building **multi-architecture images** (`docker buildx build --platform linux/amd64,linux/arm64`). And switching cloud servers to ARM often cuts costs by 20–40% — usually just a rebuild away for Go, Java, Python and Node apps.

> [!RECAP]
> - The **ISA** is the contract between software and hardware: instructions, registers, encodings, memory addressing.
> - CPUs repeat **fetch → decode → execute → write back**, guided by the **program counter**.
> - Compiled code is a sequence of loads, stores, arithmetic and branches; **calling conventions** define how functions pass arguments and use the **stack** (and why buffer overflows are dangerous).
> - **CISC** (x86) vs **RISC** (ARM, RISC-V); modern x86 converts instructions to RISC-like micro-ops internally.
> - **ARM** rules phones and is spreading through laptops and cloud servers; **RISC-V** is the open newcomer. Build multi-architecture images.

> [!INTERVIEW] Systems interviews may ask what happens during a function call (stack frames, calling conventions), how a buffer overflow becomes code execution, or RISC vs CISC. Cloud roles may ask about ARM migration.

::quiz {"q":"What does the program counter hold?","options":["The number of instructions executed","The address of the next instruction to fetch","The result of the last addition","The stack size"],"answer":1,"explain":"Branches and jumps work by changing it."}

::quiz {"q":"In a RISC design like ARM, which instructions access memory?","options":["All arithmetic instructions","Only load and store instructions","Only branches","None — memory is accessed by the OS"],"answer":1,"explain":"Arithmetic works only on registers ('load-store architecture')."}

::quiz {"q":"You build a Docker image on an Apple Silicon Mac and it fails on an x86 server with 'exec format error'. Why?","options":["Docker is broken","The image contains ARM binaries, which x86 CPUs can't execute","The server is out of memory","Wrong Linux version"],"answer":1,"explain":"Build for linux/amd64 or a multi-architecture image."}
