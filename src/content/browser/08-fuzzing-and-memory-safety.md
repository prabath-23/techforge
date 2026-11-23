---
title: Fuzzing and Memory Safety: How Browser Bugs Are Found Before Attackers Find Them
summary: How large C/C++ projects find security bugs at scale: coverage-guided fuzzing with libFuzzer and AFL++, writing a fuzz target, sanitizers (ASan, UBSan, MSan, TSan), structure-aware and grammar fuzzing for JavaScript and IPC, ClusterFuzz and OSS-Fuzz running fuzzers continuously, triage with minimisation and bisection, and severity ratings.
---

::widget Scene {"title": "Coverage-guided fuzzing finds a heap overflow", "sub": "mutate inputs, keep the ones that reach new code, crash with ASan", "nodes": [{"id": "corp", "kind": "blocks", "label": "Corpus (seed inputs)", "x": 3.72, "y": 3.72, "count": 6, "color": "blue"}, {"id": "mut", "kind": "cpu", "label": "Mutator", "x": 8.22, "y": -0.78, "color": "orange"}, {"id": "tgt", "kind": "cube", "label": "Fuzz target + ASan", "x": 12.72, "y": -5.28, "color": "purple"}, {"id": "cov", "kind": "doc", "label": "Coverage feedback", "x": 6.83, "y": -11.17, "color": "teal"}, {"id": "crash", "kind": "doc", "label": "Crash report", "x": 17.22, "y": -9.78, "color": "red"}], "links": [["corp", "mut"], ["mut", "tgt"], ["tgt", "cov"], ["cov", "corp", {"dashed": true, "label": "new path → keep"}], ["tgt", "crash"]], "metrics": [["execs", "Executions"], ["cov", "Code covered"], ["found", "Findings"]], "steps": [{"short": "Target", "tag": "Target", "title": "A fuzz target feeds bytes to the code under test", "body": "<p>LLVMFuzzerTestOneInput(data, size) calls, say, the WebP image decoder. Must be fast and deterministic.</p>", "show": ["tgt"], "metrics": {"execs": ["0"], "cov": ["-"], "found": ["0"]}}, {"short": "Seeds", "tag": "Corpus", "title": "Start from a corpus of valid sample images", "body": "<p>Real inputs get past early format checks quickly.</p>", "show": ["corp", "tgt"]}, {"short": "Mutate", "tag": "Mutate", "title": "Mutate: flip bits, insert bytes, splice two inputs, use dictionary tokens", "body": "<p>Thousands of executions per second per core.</p>", "show": ["corp", "mut", "tgt"], "flow": [["corp", "mut", "#3b82f6", "pick"], ["mut", "tgt", "#f59e0b", "mutated input"]], "metrics": {"execs": ["12,000 / s"]}}, {"short": "Coverage", "tag": "Feedback", "title": "Instrumentation reports which code edges ran", "body": "<p>If an input reaches new code, it's added to the corpus, the fuzzer climbs deeper into the parser step by step.</p>", "show": ["corp", "mut", "tgt", "cov"], "flow": [["tgt", "cov", "#14b8a6", "new edge!"], ["cov", "corp", "#14b8a6", "keep"]], "metrics": {"cov": ["grows over hours"]}}, {"short": "ASan", "tag": "Sanitizer", "title": "AddressSanitizer guards every memory access", "body": "<p>Shadow memory marks redzones around allocations and freed memory, so a 1-byte overflow is caught immediately instead of silently corrupting data.</p>", "set": {"tgt": {"badge": "ASan build"}}}, {"short": "Crash", "tag": "Bug", "title": "After 9 hours: heap-buffer-overflow WRITE of size 4 in a lossless decoder", "body": "<p>ASan prints the stack of the bad access, where the buffer was allocated, and the exact offset.</p>", "show": ["corp", "mut", "tgt", "cov", "crash"], "flow": [["tgt", "crash", "#ef4444", "ASan report"]], "metrics": {"execs": ["~400 million"], "found": ["1 critical", "bad"]}}, {"short": "Minimise", "tag": "Triage", "title": "Minimise the test case and bisect the commit that introduced it", "body": "<p>ClusterFuzz does this automatically, files a bug, and assigns a severity.</p>", "metrics": {"found": ["minimised 812 → 61 bytes"]}}, {"short": "Fix", "tag": "Fix", "title": "Fix the bounds check, keep the input as a regression test", "body": "<p>The fuzzer verifies the fix and keeps running on every new build.</p>", "metrics": {"found": ["fixed + regression test", "good"]}}, {"short": "Scale", "tag": "Scale", "title": "Run thousands of fuzzers continuously on many cores", "body": "<p>Chromium's ClusterFuzz and Google's OSS-Fuzz have found tens of thousands of bugs this way.</p>", "note": {"kind": "key", "text": "Coverage-guided fuzzing = mutate → run instrumented target → keep inputs that reach new code → sanitizers turn silent corruption into crashes → triage automatically."}}]}

## The image that could take over a phone

> [!STORY] In 2023 a heap overflow in libwebp, the library browsers and countless apps use to decode WebP images, was exploited in the wild: a crafted image could run attacker code. The bug lived in tricky decompression code that had been reviewed and tested. Bugs like this are exactly what **fuzzing** is built to find: throw hundreds of millions of malformed inputs at a parser, with tools that make every memory error loud.

## What fuzzing is

Fuzzing automatically generates inputs and runs the program on them, watching for crashes, hangs and sanitizer errors. Modern fuzzers are **coverage-guided**: they measure which code each input exercises and keep inputs that reach new code, evolving a corpus that explores deeper and deeper.

Tools: **libFuzzer** (in-process, LLVM), **AFL++** **Honggfuzz** **centipede**; Go and Rust have built-in fuzzing; Jazzer for Java, Atheris for Python.

## Writing a fuzz target

```cpp
// webp_decoder_fuzzer.cc
extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
  int width = 0, height = 0;
  uint8_t* rgba = WebPDecodeRGBA(data, size, &width, &height);
  WebPFree(rgba);
  return 0;
}
```

Good targets: parsers (images, fonts, media, PDF, compression), protocol handlers, IPC message deserialisers, anything handling untrusted input. Keep them **fast** **deterministic** and free of side effects (no network, no global state left behind). Provide a **seed corpus** of real files and a **dictionary** of format tokens (magic numbers, keywords).

## Sanitizers

Fuzzing finds crashes; sanitizers make bugs crash:

- **AddressSanitizer (ASan):** out-of-bounds reads/writes, use-after-free, double free. ~2× slowdown.
- **UndefinedBehaviorSanitizer (UBSan):** integer overflow, invalid shifts, misaligned pointers.
- **MemorySanitizer (MSan):** reading uninitialised memory.
- **ThreadSanitizer (TSan):** data races.
- **LeakSanitizer:** memory leaks.

Without ASan, a 4-byte overflow may silently corrupt the heap and never crash in testing, while an attacker shapes it into code execution.

## Beyond random bytes

Some inputs must be well-formed to get anywhere:

- **Structure-aware fuzzing** libprotobuf-mutator mutates a structured description (a protobuf) that's converted into the real input, keeping it valid enough to reach deep code.
- **Grammar-based fuzzing** generate syntactically valid JavaScript, HTML, CSS or SQL. Browser JavaScript engines are fuzzed with tools like Fuzzilli, which mutates an intermediate language designed to find JIT compiler bugs.
- **IPC fuzzing** send malformed Mojo messages from a simulated compromised renderer to find sandbox escapes.
- **Differential fuzzing** run two implementations (or optimised vs unoptimised JIT) and compare outputs.

## Fuzzing at scale: ClusterFuzz and OSS-Fuzz

**ClusterFuzz** runs fuzzers continuously on thousands of cores against every new build, then automates the boring parts:

1. Deduplicate crashes by stack signature.
2. **Minimise** the input to the smallest reproducer.
3. **Bisect** to the commit range that introduced the bug.
4. File a bug with severity and owners.
5. Verify the fix and close the bug.

**OSS-Fuzz** offers the same free to critical open-source projects.

## Severity and triage

Browser security teams rate bugs by impact and exploitability: a memory corruption in the sandboxed renderer is usually **High**; one in the browser process or a sandbox escape is **Critical**; a crash on a null dereference is often not a security bug at all. Factors: attacker control of the corrupted data, reachability from web content, need for user interaction, and mitigations in the way.

## Memory safety strategy

Fuzzing finds bugs; it doesn't eliminate the class. Projects combine it with:

- safer C++ (hardened standard library with bounds checks, `base::span`, raw_ptr, Languages chapter 7),
- isolation (sandboxing, site isolation, V8 sandbox),
- **memory-safe languages** for new parsers (Rust, Java/Kotlin, Swift),
- exploit mitigations (CFI, ASLR, PAC/MTE on newer hardware).

> [!RECAP]
> - Coverage-guided fuzzers evolve a corpus toward unexplored code.
> - Write fast, deterministic fuzz targets for every untrusted-input parser; add seeds and dictionaries.
> - **Sanitizers** (ASan, UBSan, MSan, TSan) turn silent memory errors into crashes.
> - Structure-aware, grammar and IPC fuzzing reach deep logic; differential fuzzing finds wrong results.
> - ClusterFuzz/OSS-Fuzz automate dedup, minimisation, bisection and verification.
> - Combine fuzzing with safer C++, isolation and memory-safe languages.

> [!INTERVIEW] "How does coverage-guided fuzzing work?", "Write a fuzz target for this parser", "What does ASan detect and how?", "How would you fuzz IPC between a renderer and the browser process?", "How do you rate the severity of a memory bug?"

::quiz {"q": "Why do coverage-guided fuzzers keep some generated inputs?", "options": ["To save disk", "Inputs that reach new code are kept and mutated further to explore deeper", "They keep all inputs", "Only crashing inputs are kept"], "answer": 1, "explain": "Coverage feedback drives exploration."}

::quiz {"q": "What does AddressSanitizer catch?", "options": ["Slow functions", "Out-of-bounds accesses and use-after-free at the moment they happen", "SQL injection", "Deadlocks"], "answer": 1, "explain": "Redzones and quarantined freed memory."}

::quiz {"q": "Why use structure-aware or grammar fuzzing for JavaScript engines?", "options": ["Random bytes are illegal", "Random bytes rarely form valid programs, so they never reach deep compiler logic", "It is faster to compile", "It avoids sanitizers"], "answer": 1, "explain": "Valid-looking inputs reach the JIT."}
