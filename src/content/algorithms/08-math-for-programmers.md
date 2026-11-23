---
title: Math for Programmers: Primes, GCD, Modular Arithmetic and Counting
summary: The number theory and combinatorics that keep showing up in code and interviews, divisibility and the Euclidean algorithm, finding primes with the Sieve of Eratosthenes, modular arithmetic and why answers are "mod 10⁹+7", fast exponentiation, modular inverses, counting with permutations and combinations, and how all of it underpins hashing and cryptography.
---

::widget Scene {"title": "Sieve of Eratosthenes: all primes up to 30", "sub": "cross out multiples instead of testing each number", "nodes": [{"id": "n", "kind": "cells", "label": "numbers 2–30", "x": 3.1, "y": 3.1, "values": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]}], "metrics": [["p", "Current prime"], ["start", "Start crossing at"], ["left", "Primes so far"]], "steps": [{"short": "Start", "tag": "Idea", "title": "Assume every number from 2 to 30 is prime", "body": "<p>Then cross out what isn't.</p>", "metrics": {"p": ["-"], "start": ["-"], "left": ["-"]}}, {"short": "Two", "tag": "p = 2", "title": "2 is prime: cross out 4, 6, 8, … 30", "body": "<p>Every even number except 2 goes.</p>", "set": {"n": {"marks": {"0": "green", "2": "dark", "4": "dark", "6": "dark", "8": "dark", "10": "dark", "12": "dark", "14": "dark", "16": "dark", "18": "dark", "20": "dark", "22": "dark", "24": "dark", "26": "dark", "28": "dark"}, "ptr": {}}}, "metrics": {"p": ["2"], "start": ["4"], "left": ["2"]}}, {"short": "Three", "tag": "p = 3", "title": "3 is still uncrossed → prime. Cross out from 9 = 3²", "body": "<p>6 was already crossed by 2. Any multiple below p² has a smaller prime factor.</p>", "set": {"n": {"marks": {"0": "green", "1": "green", "2": "dark", "4": "dark", "6": "dark", "8": "dark", "10": "dark", "12": "dark", "14": "dark", "16": "dark", "18": "dark", "20": "dark", "22": "dark", "24": "dark", "26": "dark", "28": "dark", "7": "red", "13": "red", "19": "red", "25": "red"}, "ptr": {}}}, "metrics": {"p": ["3"], "start": ["9"], "left": ["2, 3"]}}, {"short": "Five", "tag": "p = 5", "title": "5 is prime. Cross from 25: just 25", "body": "<p>The rest were already gone.</p>", "set": {"n": {"marks": {"0": "green", "1": "green", "3": "green", "2": "dark", "4": "dark", "6": "dark", "7": "dark", "8": "dark", "10": "dark", "12": "dark", "13": "dark", "14": "dark", "16": "dark", "18": "dark", "19": "dark", "20": "dark", "22": "dark", "24": "dark", "25": "dark", "26": "dark", "28": "dark", "23": "red"}, "ptr": {}}}, "metrics": {"p": ["5"], "start": ["25"], "left": ["2, 3, 5"]}}, {"short": "Stop", "tag": "Stop", "title": "Next prime is 7, and 7² = 49 > 30: stop", "body": "<p>Every composite ≤ 30 has a factor ≤ √30 ≈ 5.5.</p>", "metrics": {"p": ["7 (7² > 30)"]}}, {"short": "Result", "tag": "Result", "title": "Everything left is prime", "body": "<p>2 3 5 7 11 13 17 19 23 29.</p>", "set": {"n": {"marks": {"0": "green", "1": "green", "2": "dark", "3": "green", "4": "dark", "5": "green", "6": "dark", "7": "dark", "8": "dark", "9": "green", "10": "dark", "11": "green", "12": "dark", "13": "dark", "14": "dark", "15": "green", "16": "dark", "17": "green", "18": "dark", "19": "dark", "20": "dark", "21": "green", "22": "dark", "23": "dark", "24": "dark", "25": "dark", "26": "dark", "27": "green", "28": "dark"}, "ptr": {}}}, "metrics": {"left": ["10 primes", "good"]}}, {"short": "Cost", "tag": "Complexity", "title": "O(n log log n), practically linear", "body": "<p>Testing each number by trial division would be O(n√n).</p>"}, {"short": "GCD", "tag": "Related", "title": "Euclid's GCD: gcd(48, 18) = gcd(18, 12) = gcd(12, 6) = 6", "body": "<p>Replace (a, b) with (b, a mod b) until b is 0. O(log n) steps.</p>"}, {"short": "ModPow", "tag": "Related", "title": "Fast power: 3¹³ mod m in 4 squarings", "body": "<p>13 = 1101₂: square repeatedly, multiply in the bits that are set. The basis of RSA and hashing.</p>", "note": {"kind": "key", "text": "Sieve: mark multiples starting at p², stop at √n. Pair with GCD and fast modular exponentiation for most number-theory problems."}}]}

::widget Scene {"title": "Euclid's algorithm: greatest common divisor", "sub": "gcd(48, 18)", "nodes": [{"id": "g", "kind": "cells", "label": "a, b", "x": 3.1, "y": 3.1, "values": [48, 18]}], "metrics": [["step", "Step"], ["ans", "GCD"]], "steps": [{"short": "Rule", "tag": "Idea", "title": "gcd(a, b) = gcd(b, a mod b)", "body": "<p>Any number dividing both a and b also divides their remainder. So we can keep shrinking the pair.</p>", "metrics": {"step": ["48 mod 18 = 12"], "ans": ["?"]}}, {"short": "Shrink", "tag": "Step", "title": "(48, 18) → (18, 12) → (12, 6)", "body": "<p>18 mod 12 = 6; 12 mod 6 = 0.</p>", "set": {"g": {"marks": {"0": "blue", "1": "blue"}, "ptr": {}, "values": [12, 6]}}, "metrics": {"step": ["12 mod 6 = 0"]}}, {"short": "Done", "tag": "Done", "title": "When the remainder is 0, the other number is the GCD: 6", "body": "<p>Takes O(log min(a, b)) steps, fast even for 100-digit numbers. Used to simplify fractions and in RSA key generation.</p>", "set": {"g": {"marks": {"0": "green"}, "ptr": {}, "values": [6, 0]}}, "metrics": {"ans": ["6", "good"]}}]}


## The math behind every HTTPS connection

> [!STORY] Every time your browser shows a padlock, it has just done arithmetic with numbers hundreds of digits long, raising numbers to huge powers, **modulo** other huge numbers. It finishes in milliseconds because of an algorithm you can write in six lines: fast exponentiation. The same small toolkit of number theory, greatest common divisors, primes, modular arithmetic, also explains hash tables, random number generators, checksums and a large share of coding-interview problems. You don't need a math degree; you need about ten ideas.

## Divisibility and the GCD

The **greatest common divisor** of two numbers is the largest number dividing both: gcd(48, 18) = 6.

**Euclid's algorithm** (around 300 BC, still the best way) uses one fact: gcd(a, b) = gcd(b, a mod b).

```python
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a
# gcd(48, 18) → gcd(18, 12) → gcd(12, 6) → gcd(6, 0) = 6

def lcm(a, b):
    return a // gcd(a, b) * b        # divide first to avoid overflow
```

It runs in O(log min(a, b)) steps, the numbers shrink at least as fast as the Fibonacci sequence grows.

> [!EXAMPLE] **Where GCD shows up.** Simplifying fractions (6/8 → 3/4); "can you measure exactly 4 litres with 3- and 5-litre jugs?" (yes, if 4 is a multiple of gcd(3, 5)); scheduling events that repeat every 6 and every 10 days, together every lcm(6, 10) = 30 days; rotating an array by k positions using cycles of length gcd(n, k); and aspect ratios (1920×1080 → 16:9).

The **extended Euclidean algorithm** also finds x and y such that a·x + b·y = gcd(a, b), needed for modular inverses below.

## Primes

A **prime** has exactly two divisors: 1 and itself. Every integer > 1 factors uniquely into primes (60 = 2² × 3 × 5).

**Is n prime?** Try dividing by every number up to √n, if n had a factor larger than √n, it would also have one smaller. O(√n).

**All primes up to n:** the **Sieve of Eratosthenes**.

```python
def primes_up_to(n):
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False
    for p in range(2, int(n ** 0.5) + 1):
        if is_prime[p]:
            for multiple in range(p * p, n + 1, p):   # start at p², smaller multiples already crossed out
                is_prime[multiple] = False
    return [i for i, ok in enumerate(is_prime) if ok]
```

> [!ANALOGY] A classroom of numbers standing up. 2 stays standing and tells every even number to sit down. 3 stays and tells every multiple of 3 to sit. 4 is already sitting, so it's skipped. Whoever is still standing at the end is prime.

Time O(n log log n), practically linear. For huge numbers (hundreds of digits, as in cryptography), primality is tested with fast **probabilistic** tests like Miller-Rabin.

## Modular arithmetic: clock math

`a mod m` is the remainder after dividing by m. It's arithmetic on a clock: 10 o'clock + 5 hours = 3 o'clock, because (10 + 5) mod 12 = 3.

The key rules, you can take the remainder at **every** step:

```text
(a + b) mod m = ((a mod m) + (b mod m)) mod m
(a × b) mod m = ((a mod m) × (b mod m)) mod m
(a − b) mod m = ((a mod m) − (b mod m) + m) mod m     ← add m to avoid negatives
```

Division is the exception, you can't simply divide remainders (see inverses below).

### Why answers are "modulo 10⁹ + 7"

Counting problems ("how many ways to climb n stairs?", "how many paths in this grid?") produce numbers with thousands of digits. Problems ask for the answer **mod 1,000,000,007** so it fits in 64-bit integers: it's prime (so inverses exist), and it's just under 2³⁰, so the product of two such remainders fits in 64 bits.

```python
MOD = 10**9 + 7
ways = [1, 1]
for i in range(2, n + 1):
    ways.append((ways[-1] + ways[-2]) % MOD)       # take the remainder every step
```

> [!WARN] Languages differ on negative remainders: in Python, `-3 % 5 == 2`; in Java, C, C++ and JavaScript, `-3 % 5 == -3`. Normalize with `((x % m) + m) % m`.

### Modular arithmetic in real systems

- **Hash tables:** `bucket = hash(key) mod table_size` (DSA track).
- **Round-robin and sharding:** `server = request_id mod N`, and why consistent hashing is needed when N changes (System Design track).
- **Checksums:** ISBN, credit-card (Luhn) and IBAN check digits are modular arithmetic.
- **Random number generators:** linear congruential generators: `x = (a·x + c) mod m`.
- **Circular buffers:** `index = (index + 1) mod capacity`.

## Fast exponentiation

How do you compute 3¹⁰⁰⁰⁰⁰⁰⁰⁰⁰ mod m? Multiplying 3 a billion times is too slow. Instead, **square repeatedly**: 3¹ → 3² → 3⁴ → 3⁸ → …, and combine the squares that make up the exponent in binary.

```python
def power(base, exp, mod):
    result = 1
    base %= mod
    while exp > 0:
        if exp & 1:                       # this bit of the exponent is set
            result = result * base % mod
        base = base * base % mod          # next square
        exp >>= 1
    return result
# Python has it built in: pow(base, exp, mod)
```

13 in binary is 1101, so 3¹³ = 3⁸ × 3⁴ × 3¹. Steps: O(log exp), about 30 multiplications for a billion. RSA, Diffie-Hellman and many other cryptographic operations rest on this (Security track, chapter 2), as does computing Fibonacci numbers fast using matrix powers.

## Modular inverse: dividing under a modulus

To "divide by b" mod m, multiply by b's **inverse**: the number b⁻¹ with b × b⁻¹ ≡ 1 (mod m). It exists only when gcd(b, m) = 1.

- If m is prime, **Fermat's little theorem** gives b⁻¹ = b^(m−2) mod m, one call to fast exponentiation.
- Otherwise, use the extended Euclidean algorithm.

Needed for computing combinations modulo a prime, and in RSA key generation.

## Counting: combinatorics

| Question | Formula | Example |
|---|---|---|
| Ways to **arrange** n distinct items | n! | 5 books on a shelf: 120 |
| Ways to arrange k of n items (order matters) | n! / (n−k)! | Gold, silver, bronze among 10 runners: 720 |
| Ways to **choose** k of n (order doesn't matter) | C(n,k) = n! / (k!(n−k)!) | A 3-person team from 10: 120 |
| Choices with repetition | nᵏ | 4-digit PIN: 10⁴ = 10,000 |
| Distribute n identical items into k groups | C(n+k−1, k−1) | 10 identical sweets among 3 children: 66 |

> [!EXAMPLE] **Paths in a grid.** Moving only right or down from the top-left to the bottom-right of a grid with r rows and c columns of steps takes r + c moves, of which exactly r are "down". The number of paths is C(r + c, r), no DP needed. A 10×10 grid has C(20, 10) = 184,756 paths.

Computing C(n, k) mod p efficiently: precompute factorials and inverse factorials up to n once, then each combination is O(1):

```python
fact = [1] * (N + 1)
for i in range(1, N + 1): fact[i] = fact[i - 1] * i % MOD
inv_fact = [1] * (N + 1)
inv_fact[N] = pow(fact[N], MOD - 2, MOD)
for i in range(N, 0, -1): inv_fact[i - 1] = inv_fact[i] * i % MOD
C = lambda n, k: 0 if k < 0 or k > n else fact[n] * inv_fact[k] % MOD * inv_fact[n - k] % MOD
```

Also useful: **Pascal's rule** C(n, k) = C(n−1, k−1) + C(n−1, k) (a DP table for small n), the **pigeonhole principle** (put 13 people in a room and two share a birth month, used to prove a duplicate must exist), and **inclusion-exclusion** (count numbers up to 100 divisible by 2 or 3: 50 + 33 − 16 = 67).

## A little probability

- **Expected value** the long-run average: the expected roll of a die is 3.5.
- **The birthday paradox:** with just 23 people, there's a >50% chance two share a birthday. In computing, this means **hash collisions** happen far sooner than intuition suggests: with a 32-bit hash, there's a 50% chance of a collision after only about 77,000 items, roughly √(2³²). That's why IDs and content hashes use 128 bits or more.

> [!RECAP]
> - **GCD** via Euclid's algorithm in O(log n); LCM = a / gcd × b.
> - Test primality up to √n; list primes with the **Sieve of Eratosthenes**; use Miller-Rabin for huge numbers.
> - **Modular arithmetic**: reduce after every +, −, ×; normalize negatives; answers mod 10⁹+7 keep numbers small.
> - **Fast exponentiation** in O(log n) underpins cryptography; **modular inverses** (Fermat for prime m) enable division.
> - Counting: n!, permutations, **C(n, k)** (precompute factorials), pigeonhole, inclusion-exclusion; the **birthday paradox** explains hash collisions.

> [!INTERVIEW] Expect GCD/LCM, count primes (sieve), pow(x, n) (fast exponentiation, including negative n), unique paths (combinatorics or DP), "answer mod 10⁹+7" without overflow, and the birthday paradox for ID collisions in design rounds.

::quiz {"q":"What is gcd(84, 36)?","options":["6","12","18","36"],"answer":1,"explain":"84 mod 36 = 12; 36 mod 12 = 0 → 12."}

::quiz {"q":"How many multiplications does fast exponentiation need for an exponent around one billion?","options":["About a billion","About 30 squarings and multiplications (log₂ of the exponent)","About 1,000","Exactly 2"],"answer":1,"explain":"Repeated squaring handles one bit of the exponent per step."}

::quiz {"q":"How many ways to choose a 3-person committee from 8 people?","options":["24","56","336","512"],"answer":1,"explain":"C(8,3) = 8×7×6 / 3! = 56."}
