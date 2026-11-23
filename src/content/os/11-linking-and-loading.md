---
title: Linking and Loading — How Source Code Becomes a Running Program
summary: The journey from a .c file to a process in memory — preprocessing, compiling, assembling, linking symbols together, static vs dynamic libraries, what's inside an ELF executable, how the loader and dynamic linker set up a process, position-independent code and the GOT/PLT, and the classic "undefined reference" and "library not found" errors explained.
---

## "undefined reference to `sqrt`"

> [!STORY] A student writes a small C program that calls `sqrt()`. It compiles… and then fails with `undefined reference to 'sqrt'`. They included `<math.h>` — so why doesn't the computer know about `sqrt`? A week later, a different program runs perfectly on their laptop but crashes on a server with `error while loading shared libraries: libssl.so.3: cannot open shared object file`. Both errors come from steps that most programmers never see: **linking** and **loading**. Once you understand them, these errors become five-second fixes.

## Four steps from source to executable

When you run `gcc main.c util.c -o app`, four separate tools run:

::widget Stepper {"type":"flow","cols":4,"title":"From source files to an executable","what":"The four stages a C program goes through on the way to becoming an executable file. Each box is one tool and what it produces.","steps":["Press Play from left to right.","Notice that each .c file is compiled on its own — the compiler never sees the other files.","Find the stage where the 'undefined reference' error appears."],"nodes":[["1. Preprocessor","Handles #include (pastes header files in), #define (text substitution) and #ifdef. Output: one big expanded C file per source file."],["2. Compiler","Turns C into assembly for the target CPU, optimizing along the way. Each source file is compiled separately — it only needs to know that sqrt EXISTS (from math.h), not where its code is."],["3. Assembler","Turns assembly into machine code: an object file (.o) containing code, data, a list of symbols it defines (main, helper) and a list of symbols it needs from elsewhere (sqrt, printf)."],["4. Linker","Combines all .o files and libraries into one executable, matching every 'needed' symbol to a 'defined' one and fixing up addresses. A needed symbol nobody defines → 'undefined reference'."]]}

> [!ANALOGY] Writing a book with several co-authors. Each writes their own chapter (compiling), and when they mention something from another chapter they write "see the section on sqrt" without a page number. The editor (the linker) assembles the chapters, fills in every page number, and complains if some chapter refers to a section that nobody wrote.

So the student's bug: `math.h` only **declares** `sqrt`. The code lives in the math library, which on Linux must be linked explicitly: `gcc main.c -lm`.

## Symbols and the linker's job

An object file contains a **symbol table**: names it **defines** and names it **references**. You can inspect it:

```bash
nm main.o
#                 U sqrt        ← U = undefined here, needed from elsewhere
# 0000000000000000 T main       ← T = defined in the text (code) section
```

The linker:

1. **Resolves symbols** — matches every undefined reference with exactly one definition. Two definitions of the same function → "multiple definition" error.
2. **Relocates** — the compiler didn't know final addresses, so it left placeholders. The linker decides where each piece of code and data will live and patches every reference.

> [!NOTE] **Order matters** for static libraries with traditional linkers: they're scanned left to right, so `gcc -lm main.c` may fail while `gcc main.c -lm` works. Put libraries after the files that use them.

## Static vs dynamic libraries

A **library** is a bundle of compiled code for reuse.

| | Static library (`.a`, `.lib`) | Shared/dynamic library (`.so`, `.dylib`, `.dll`) |
|---|---|---|
| When joined | Copied into the executable at **link time** | Loaded at **run time** |
| Executable size | Larger | Smaller |
| Sharing | Each program has its own copy | One copy in memory shared by all programs using it |
| Updates | Must rebuild every program to get a security fix | Update the library once; every program benefits |
| Deployment | One self-contained file | The right library versions must exist on the target machine |

That's the server error in the story: the program was dynamically linked against `libssl.so.3`, which wasn't installed there. `ldd ./app` lists the libraries a program needs and where they're found.

> [!EXAMPLE] **Why Go and Rust binaries "just work".** Go links statically by default, producing one file you can copy to any Linux machine with the same CPU architecture — ideal for tiny container images (Cloud track, chapter 3). The trade-off: a vulnerability in a bundled library means rebuilding and redeploying every program that includes it.

## Inside an executable: ELF

On Linux, executables, object files and shared libraries use the **ELF** format (Windows uses PE, macOS uses Mach-O). An ELF file contains:

- A **header**: "this is a 64-bit ARM executable; start running at address X".
- **Sections/segments**: `.text` (machine code, read-only and executable), `.rodata` (constants and string literals), `.data` (initialized global variables), `.bss` (zero-initialized globals — takes no space in the file), plus symbol tables and debug information.
- A list of **needed shared libraries** and the path of the **dynamic linker** to use.

```bash
file app             # ELF 64-bit LSB executable, x86-64, dynamically linked …
readelf -h app       # the header
readelf -S app       # sections
objdump -d app       # disassemble the code
```

## Loading: from file to process

When you run `./app`, the shell calls `execve()` (chapter 4). The kernel:

1. Reads the ELF header and **maps** the segments into a new address space (chapter 6) — code as read+execute, data as read+write — using memory-mapping, so pages are only read from disk when first touched.
2. Sets up the **stack** with the program's arguments and environment variables.
3. If the program is dynamically linked, starts the **dynamic linker** (`ld-linux.so`) first instead of the program itself.

The dynamic linker then finds each needed library (searching `RPATH`, `LD_LIBRARY_PATH`, the cache in `/etc/ld.so.cache`, and standard folders), maps it into memory, resolves symbols, runs initialization code, and finally jumps to the program's entry point, which calls `main`.

### Position-independent code, the GOT and the PLT

A shared library might be loaded at a different address in every process (address randomization makes that deliberate — a security defense). So libraries are compiled as **position-independent code (PIC)**: instead of hard-coding addresses, they reach global data and other libraries' functions through tables:

- The **GOT** (global offset table) holds the actual addresses, filled in by the dynamic linker.
- The **PLT** (procedure linkage table) holds small stubs for calling external functions. With **lazy binding**, the first call to `printf` goes through the dynamic linker to look it up and patch the GOT; later calls jump straight there.

> [!ANALOGY] A phone's contacts list. Your code doesn't memorize everyone's number (which may change); it says "call Mum", and the phone looks up the current number in the contacts table. The dynamic linker keeps that table up to date.

## Practical tools and tricks

- `ldd app` — which shared libraries, resolved to which files.
- `LD_LIBRARY_PATH=/opt/lib ./app` — look in extra folders (fine for testing; avoid in production).
- `LD_PRELOAD=./mymalloc.so ./app` — load your library first, overriding functions like `malloc` — used by profilers, memory debuggers and (sadly) some malware.
- `strace -e openat ./app` — see exactly which library files it tries to open.
- **Symbol versioning** lets glibc keep old versions of functions for old programs — which is also why a binary built on a new Linux may fail on an older one with "GLIBC_2.34 not found". Build on the oldest system you support, or link statically (musl).

> [!RECAP]
> - **Preprocess → compile → assemble → link**; each source file compiles separately into an **object file** with defined and undefined **symbols**.
> - The **linker** resolves symbols and relocates addresses; "undefined reference" means no definition was linked in (e.g. missing `-lm`).
> - **Static** libraries are copied in; **dynamic** libraries are shared and loaded at run time (check with `ldd`).
> - **ELF** files contain code, data, symbols and the list of needed libraries.
> - The kernel maps segments; the **dynamic linker** loads libraries and fills the **GOT** (via the **PLT**) for **position-independent code**.

> [!INTERVIEW] Systems interviews ask: what happens between `gcc` and `main()` running, static vs dynamic linking trade-offs, what an undefined reference means, and how shared libraries can be loaded at different addresses.

::quiz {"q":"A program compiles but fails with 'undefined reference to sqrt'. What's missing?","options":["The #include line","Linking the library that defines sqrt (e.g. -lm)","A main function","Optimization flags"],"answer":1,"explain":"Headers only declare functions; the linker needs the code."}

::quiz {"q":"What's a main advantage of dynamic linking?","options":["Faster startup always","One copy of a library is shared in memory, and a security fix to it benefits every program without rebuilding","Programs need no libraries","Smaller libraries"],"answer":1,"explain":"The trade-off is depending on the right versions being installed."}

::quiz {"q":"Which tool shows the shared libraries a Linux executable needs?","options":["nm","ldd","gcc -E","top"],"answer":1,"explain":"It also shows which file each one resolves to."}
