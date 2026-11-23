---
title: Bits, Bytes and Number Representation
summary: How everything a computer handles, numbers, text, images, becomes patterns of 0s and 1s. Binary and hexadecimal, how negative numbers work (two's complement), what happens when numbers overflow, why 0.1 + 0.2 isn't 0.3 (floating point), byte order, and how text becomes bytes with Unicode and UTF-8.
---

::widget Scene {"title": "Binary: counting with only 0 and 1", "sub": "place values, a byte, negative numbers and overflow", "nodes": [{"id": "b", "kind": "cells", "label": "bit values: 128 64 32 16 8 4 2 1", "x": 3.1, "y": 3.1, "values": [0, 0, 0, 0, 0, 0, 0, 0]}], "metrics": [["bin", "Binary"], ["dec", "Decimal"], ["note", "Note"]], "steps": [{"short": "Place", "tag": "Place value", "title": "Each position is worth double the one to its right", "body": "<p>Like decimal (1, 10, 100) but with 2: 1, 2, 4, 8, 16, 32, 64, 128.</p>", "metrics": {"bin": ["00000000"], "dec": ["0"], "note": ["8 bits = 1 byte"]}}, {"short": "Five", "tag": "Example", "title": "5 = 4 + 1 → 00000101", "body": "<p>Turn on the bits that add up to the number.</p>", "set": {"b": {"marks": {"5": "green", "7": "green"}, "ptr": {}, "values": [0, 0, 0, 0, 0, 1, 0, 1]}}, "metrics": {"bin": ["00000101"], "dec": ["5"]}}, {"short": "Count", "tag": "Counting", "title": "6 → 00000110, 7 → 00000111, 8 → 00001000", "body": "<p>Adding 1 to 7 carries all the way, like 999 + 1.</p>", "set": {"b": {"marks": {"4": "orange"}, "ptr": {}, "values": [0, 0, 0, 0, 1, 0, 0, 0]}}, "metrics": {"bin": ["00001000"], "dec": ["8"]}}, {"short": "Max", "tag": "Range", "title": "All ones: 11111111 = 255", "body": "<p>n bits hold 2ⁿ values: 8 bits → 0 to 255.</p>", "set": {"b": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue", "4": "blue", "5": "blue", "6": "blue", "7": "blue"}, "ptr": {}, "values": [1, 1, 1, 1, 1, 1, 1, 1]}}, "metrics": {"bin": ["11111111"], "dec": ["255"]}}, {"short": "Overflow", "tag": "Overflow", "title": "255 + 1 in 8 bits = 0", "body": "<p>The carry falls off the end. Overflow bugs have crashed rockets and broken games.</p>", "set": {"b": {"marks": {"0": "red", "1": "red", "2": "red", "3": "red", "4": "red", "5": "red", "6": "red", "7": "red"}, "ptr": {}, "values": [0, 0, 0, 0, 0, 0, 0, 0]}}, "metrics": {"bin": ["00000000"], "dec": ["0 (!)"], "note": ["unsigned overflow wraps", "bad"]}}, {"short": "Neg", "tag": "Negatives", "title": "Two's complement: the top bit is worth −128", "body": "<p>−1 = 11111111 (−128 + 127). Range −128 to 127. Addition works the same for positive and negative, the hardware needs one adder.</p>", "set": {"b": {"marks": {"0": "purple", "1": "blue", "2": "blue", "3": "blue", "4": "blue", "5": "blue", "6": "blue", "7": "blue"}, "ptr": {}, "values": [1, 1, 1, 1, 1, 1, 1, 1]}}, "metrics": {"bin": ["11111111"], "dec": ["−1 (signed)"]}}, {"short": "Hex", "tag": "Hex", "title": "Hexadecimal: one digit per 4 bits", "body": "<p>1111 1111 = FF. Memory addresses and colours (#FF5C35) are written in hex because it maps cleanly to bits.</p>", "metrics": {"bin": ["1111 1111"], "dec": ["0xFF"]}}, {"short": "Float", "tag": "Fractions", "title": "Fractions use floating point", "body": "<p>0.1 has no exact binary form, so 0.1 + 0.2 = 0.30000000000000004. Use integers (paise) for money.</p>", "note": {"kind": "key", "text": "Binary place values double; n bits give 2ⁿ values; two's complement represents negatives; integers overflow; floats are approximate."}}]}


## The rocket that overflowed

> [!STORY] On 4 June 1996, the first Ariane 5 rocket veered off course 37 seconds after launch and self-destructed, destroying satellites worth hundreds of millions of dollars. The cause: a piece of software reused from the slower Ariane 4 converted the rocket's horizontal velocity from a 64-bit floating-point number into a 16-bit integer. Ariane 5 was faster; the value no longer fit in 16 bits, the conversion failed, and the guidance system shut down. Nobody had made a "bug" in the usual sense, they had forgotten that **numbers in a computer have limits**.

Everything in a computer, numbers, text, pictures, programs, is stored as **bits**: tiny switches that are either 0 or 1. Understanding how values are encoded explains a whole class of bugs that no amount of high-level code can hide.

## Binary: counting with two digits

We count in base 10 because we have ten fingers: the number 347 means 3×100 + 4×10 + 7×1. Computers count in **base 2** with place values 1, 2, 4, 8, 16, 32…

```text
  1   0   1   1   0   1
 32  16   8   4   2   1   →  32 + 8 + 4 + 1 = 45
```

- A **bit** is one binary digit. A **byte** is 8 bits, holding 256 different values (0–255).
- *n* bits can represent 2ⁿ values: 16 bits → 65,536; 32 bits → ~4.3 billion; 64 bits → ~18 quintillion.

> [!ANALOGY] A row of light switches. With 8 switches you can make 256 different on/off patterns. Everything a computer stores is just an agreement about what each pattern **means** the pattern `01000001` is the number 65, or the letter "A", or a shade of grey, depending on how the program reads it.

### Hexadecimal: binary for humans

Long strings of bits are hard to read, so engineers use **hexadecimal** (base 16: digits 0–9 then A–F). Each hex digit is exactly 4 bits, so a byte is two hex digits:

```text
binary  1111 1111   0010 1010
hex        F    F      2    A      →  0xFF = 255,  0x2A = 42
```

You'll see hex everywhere: memory addresses (`0x7ffe4a10`), colors (`#FF5733`), hashes, MAC addresses, file dumps (`xxd file`).

## Negative numbers: two's complement

How do you store −5 with only 0s and 1s? Almost every computer uses **two's complement**: in an 8-bit number, the top bit is worth **−128** instead of +128.

```text
0000 0101  =   5
1111 1011  =  -128 + 64 + 32 + 16 + 8 + 2 + 1 = -5
```

To negate: flip all the bits and add 1. The beauty is that the **same adding circuit** works for positive and negative numbers, no special cases in hardware (next chapter).

An 8-bit signed integer holds −128 to 127; a 32-bit one, about −2.1 billion to +2.1 billion.

## Overflow: when numbers wrap around

What's 127 + 1 in an 8-bit signed integer? The bits become `1000 0000`, which means **−128**. The number wraps around like a car's odometer rolling over from 99999 to 00000.

::widget Stepper {"type":"flow","cols":3,"title":"Real overflow bugs","what":"Famous failures caused by numbers exceeding the range their type could hold. Each box is one incident and its lesson.","steps":["Press Play and read each incident.","For each, work out how many bits were used and what the maximum value was.","Think about where your own code stores counts, IDs or timestamps in 32 bits."],"nodes":[["Ariane 5 (1996)","A 64-bit velocity converted into a 16-bit integer (max 32,767). The faster rocket exceeded it; the guidance software crashed and the rocket self-destructed."],["Gangnam Style (2014)","YouTube's view counter was a signed 32-bit integer (max 2,147,483,647). The video approached it, and YouTube upgraded to 64 bits."],["Boeing 787 (2015)","A counter in the generator control units, counting hundredths of a second in 32 bits, would overflow after 248 days of continuous power and shut the generators down. The fix: reboot periodically, then a software update."],["Year 2038","Many systems store time as signed 32-bit seconds since 1 January 1970. That runs out at 03:14:07 UTC on 19 January 2038, wrapping to 1901. Modern systems use 64-bit time."],["Binary search (2006)","Java's binary search computed the midpoint as (low + high) / 2. For arrays over a billion elements, low + high overflowed into a negative number. The fix: low + (high - low) / 2."],["Database IDs","A table with a 32-bit auto-increment ID runs out at ~2.1 billion rows, and inserts start failing. Use 64-bit IDs from the start (Databases track)."]]}

> [!WARN] Different languages handle overflow differently: C wraps around (and signed overflow is officially "undefined behavior"), Rust panics in debug builds, Java silently wraps, and Python integers simply grow without limit. Know what yours does.

## Floating point: why 0.1 + 0.2 ≠ 0.3

```js
0.1 + 0.2            // 0.30000000000000004
```

Computers store fractional numbers in **floating point** (the IEEE 754 standard): like scientific notation (6.02 × 10²³), but in binary, a sign bit, an **exponent** and a **mantissa** (the significant digits). A 64-bit "double" has about 15–16 significant decimal digits.

The catch: just as 1/3 can't be written exactly in decimal (0.3333…), **0.1 can't be written exactly in binary**. It's stored as the closest available value, and those tiny errors show up when you add.

> [!ANALOGY] A ruler marked only in eighths of an inch. You can measure 3/8 exactly, but "one tenth of an inch" falls between marks, so you write down the nearest mark. Add up ten of those approximate tenths, and you don't get exactly one inch.

Practical consequences:

- **Never use floats for money** use integers in paise/cents or decimal types.
- **Don't compare floats with `==`**; check whether they're within a small tolerance.
- Very large and very small numbers lose precision: above 2⁵³, a double can't represent every integer (JavaScript's `Number.MAX_SAFE_INTEGER`), which is why big IDs in JSON APIs are often sent as strings.
- Special values exist: `Infinity`, `-Infinity`, and `NaN` ("not a number", from 0/0), which is not even equal to itself.

> [!NOTE] Machine learning uses smaller floating-point formats, 16-bit (FP16, bfloat16), 8-bit and even 4-bit, because they halve memory and double speed, and neural networks tolerate the lost precision (AI track, chapter 4).

## Byte order (endianness)

A 32-bit number takes 4 bytes. In what order are they stored in memory?

- **Little-endian** (x86, most ARM systems): least significant byte first. `0x12345678` is stored as `78 56 34 12`.
- **Big-endian**: most significant byte first, `12 34 56 78`. Used in **network protocols** ("network byte order").

It matters whenever bytes cross between systems: network code converts with functions like `htonl`, and file formats must specify their byte order.

## Text: from ASCII to Unicode

**ASCII** (1963) mapped 128 characters, English letters, digits, punctuation, to the numbers 0–127. "A" is 65. Fine for English; useless for हिन्दी, 中文, or emoji.

**Unicode** gives every character in every writing system a number called a **code point**: "A" is U+0041, "अ" is U+0905, "😀" is U+1F600. Over 150,000 characters are assigned.

**UTF-8** is how code points become bytes, and it's what nearly the entire web uses:

- Code points 0–127 (ASCII) take **1 byte** identical to ASCII, old English text is already valid UTF-8.
- Most other scripts take 2–3 bytes; emoji take 4.

> [!WARN] **Length isn't what you think.** In UTF-8, "नमस्ते" is 6 characters on screen but 18 bytes. In JavaScript, `"😀".length` is 2 (it counts UTF-16 units). A family emoji like 👨‍👩‍👧 is several code points joined together. When you truncate strings, count characters for limits, or index into text, use your language's Unicode-aware functions, or you'll cut characters in half and show garbage.

**Mojibake** garbled text like "Ã©" instead of "é", happens when bytes written in one encoding are read as another. The fix is to use UTF-8 everywhere and say so explicitly (HTTP headers, database settings, file readers).

> [!RECAP]
> - Everything is **bits**; *n* bits hold 2ⁿ values; **hex** is a compact way to write bytes.
> - Negative integers use **two's complement**; fixed-size integers **overflow** and wrap (Ariane 5, Year 2038, 32-bit IDs).
> - **Floating point** approximates real numbers in binary: 0.1 + 0.2 ≠ 0.3; never use floats for money; compare with tolerance.
> - **Endianness** is byte order: little-endian in CPUs, big-endian on the network.
> - Text is **Unicode** code points encoded as **UTF-8** bytes; byte length ≠ character count.

> [!INTERVIEW] Common questions: why 0.1 + 0.2 ≠ 0.3, how two's complement works, the binary-search midpoint overflow, the maximum value of a 32-bit integer, why not to store money as floats, and what UTF-8 is. Bit manipulation problems build on all of this.

::quiz {"q":"What's the largest value of a signed 32-bit integer, approximately?","options":["65 thousand","2.1 billion","4.3 billion","9 quintillion"],"answer":1,"explain":"2³¹ − 1 = 2,147,483,647."}

::quiz {"q":"Why does 0.1 + 0.2 print 0.30000000000000004?","options":["A bug in JavaScript","0.1 and 0.2 can't be represented exactly in binary floating point, so tiny errors add up","Integer overflow","Rounding to 2 decimals"],"answer":1,"explain":"Like 1/3 in decimal, 0.1 has no exact binary representation."}

::quiz {"q":"How many bytes does the letter 'A' take in UTF-8?","options":["1","2","3","4"],"answer":0,"explain":"ASCII characters are 1 byte, identical to ASCII."}
