---
title: Strings as Data Structures — Tries, Suffix Arrays and Automata
summary: Data structures built specifically for searching text — tries for prefixes and autocomplete, radix trees in routers and databases, suffix arrays and the LCP array for finding any substring in huge texts, the idea behind suffix trees, Aho-Corasick automata for searching many patterns at once, and how search engines and genome tools apply them.
---

## Searching a 3-billion-letter book

> [!STORY] The human genome is about 3 billion letters long (A, C, G and T). A sequencing machine produces hundreds of millions of short fragments — "reads" of around 150 letters — and each must be located in the genome. Scanning 3 billion letters for each of 500 million reads would take years. Tools like BWA and Bowtie do it in hours, using **index structures built over every suffix of the genome**, compressed so the whole index fits in a few gigabytes of memory. The same ideas power code search, plagiarism detection and data compression.

The Algorithms track covers string **algorithms** (KMP, Rabin-Karp, edit distance). This chapter covers the **data structures** that preprocess text so that many searches become fast.

## Tries: trees of prefixes

A **trie** (from "retrieval", often pronounced "try") stores a set of strings as a tree where each edge is a character. Words sharing a prefix share a path.

::widget Stepper {"type":"tree","title":"A trie containing car, card, care, cat and dog","what":"Each box is a node reached by following characters from the root. A filled marker means a complete word ends there.","steps":["Click the root and follow c → a → r.","Notice that car, card and care share the path c-a-r.","Find all words starting with 'ca' by exploring everything below that node."],"nodes":[["(root)","The empty prefix. Children: 'c' and 'd'."],["c → a","Prefix 'ca'. Every word below here starts with 'ca' — exactly what autocomplete needs."],["d → o → g ●","The word 'dog' ends here."],["r ●  (car)","'car' is a complete word, and the node continues to longer words."],["t ●  (cat)","'cat' ends here."],["d ● (card), e ● (care)","Children of 'car': 'card' and 'care'. Finding all completions of 'car' = collecting everything in this subtree."]]}

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False

class Trie:
    def __init__(self): self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    def starts_with(self, prefix):          # all words with this prefix
        node = self.root
        for ch in prefix:
            if ch not in node.children: return []
            node = node.children[ch]
        out, stack = [], [(node, prefix)]
        while stack:
            n, s = stack.pop()
            if n.is_word: out.append(s)
            for ch, child in n.children.items(): stack.append((child, s + ch))
        return out
```

Lookups and inserts take O(length of the word), regardless of how many words are stored.

Uses:

- **Autocomplete** and search suggestions (store a popularity score at each node, or the top-k completions per node).
- **Spell checkers** and word games (Boggle, Scrabble move generation).
- **IP routing:** longest-prefix match on address bits (Networking track) uses binary tries.
- Interview classics: implement a trie, word search II (trie + backtracking on a grid), replace words, maximum XOR of two numbers (a binary trie over bits).

### Radix trees: compressed tries

Plain tries waste memory on long chains of single-child nodes. A **radix tree** (Patricia trie) merges each chain into one edge labeled with a whole substring ("ca" → "r" → {"d", "e"}). Used in the Linux kernel (page cache indexing), routing tables, Redis (streams and cluster key tracking), HTTP routers in web frameworks (matching `/users/:id/orders`) and Ethereum's state storage (Merkle-Patricia tries).

## Suffix arrays: every substring, searchable

A trie of **words** finds prefixes of words. To find **any substring** in a long text, index every **suffix** — because every substring is a prefix of some suffix.

A **suffix array** is simply the starting positions of all suffixes, **sorted alphabetically**. For `banana`:

| Rank | Start | Suffix |
|---|---|---|
| 0 | 5 | a |
| 1 | 3 | ana |
| 2 | 1 | anana |
| 3 | 0 | banana |
| 4 | 4 | na |
| 5 | 2 | nana |

Suffix array = `[5, 3, 1, 0, 4, 2]`.

To find every occurrence of `"ana"`: **binary search** the sorted suffixes for those starting with "ana" — ranks 1 and 2, at positions 3 and 1. Search time: O(m log n) for a pattern of length m in a text of length n.

> [!ANALOGY] A book index taken to the extreme: instead of indexing chosen words, you index **every position** in the book by the text that follows it, sorted alphabetically. Any phrase you can think of can then be found by flipping to the right spot in the alphabetical list.

### The LCP array

Alongside, the **LCP array** stores the length of the **longest common prefix** between each pair of adjacent sorted suffixes (for banana: `[-, 1, 3, 0, 0, 2]`). With it you can answer, quickly:

- **Longest repeated substring:** the maximum LCP value ("ana", length 3).
- **Number of distinct substrings:** total substrings minus the sum of LCPs.
- **Longest common substring of two strings:** concatenate them with a separator and look for the largest LCP between suffixes from different strings.

Suffix arrays can be built in O(n log n) with simple doubling algorithms, or O(n) with advanced ones (SA-IS), and use just a few bytes per character.

### Suffix trees and the FM-index

A **suffix tree** is a compressed trie of all suffixes, answering substring queries in O(m) — theoretically elegant, but memory-hungry (often 10–20 bytes per character). In practice, suffix arrays are preferred.

The **FM-index**, built on the Burrows-Wheeler transform (the same transform used in `bzip2` compression), compresses the text **and** its index together while still supporting fast pattern counting and location. That's how genome aligners fit the human genome's index in a few gigabytes.

## Aho-Corasick: many patterns at once

Sometimes you have **thousands of patterns** — banned words, virus signatures, keywords to highlight — and want to find all of them in a stream of text in one pass.

**Aho-Corasick** builds a trie of all the patterns, then adds **failure links**: from each node, a link to the longest proper suffix of the current match that is also a prefix of some pattern (the same idea as KMP's failure function, generalized). The text is scanned once, character by character, following trie edges or failure links, reporting matches as they're reached.

Time: O(text length + total pattern length + number of matches) — independent of how many patterns there are.

> [!EXAMPLE] **Real uses of Aho-Corasick:** the original Unix `fgrep`, antivirus engines matching thousands of signatures, intrusion detection systems (Snort) scanning network packets, content filters, and ad-blockers matching URL patterns.

## Where search engines fit

Web and document search engines (Elasticsearch, Lucene) mostly use an **inverted index** instead: for each **word**, a sorted list of documents (and positions) containing it (System Design track, search systems). It's ideal for word-based queries. Suffix-based structures shine when there are **no word boundaries** — DNA, code search across arbitrary substrings, some Asian languages, binary data — or when you need any-substring matching.

| Need | Structure |
|---|---|
| Prefix lookup, autocomplete | Trie / radix tree |
| Any substring in a large fixed text | Suffix array (+ LCP), FM-index |
| Many patterns in a stream | Aho-Corasick |
| Word-based full-text search | Inverted index |
| A single pattern, one time | KMP / Rabin-Karp (Algorithms track) |

> [!RECAP]
> - A **trie** stores strings by shared prefixes: O(length) operations; great for autocomplete and prefix queries. **Radix trees** compress chains and appear in kernels, routers and web frameworks.
> - A **suffix array** is all suffixes sorted; binary search finds any substring in O(m log n). The **LCP array** answers repeated- and common-substring questions.
> - **Suffix trees** are faster but bigger; the **FM-index** compresses text plus index (genome aligners).
> - **Aho-Corasick** finds many patterns in one pass using a trie plus failure links.
> - Word-based search uses **inverted indexes**; suffix structures handle arbitrary substrings.

> [!INTERVIEW] Implement a trie (insert, search, startsWith) and use it for word search or autocomplete; mention suffix arrays for "longest repeated substring"; mention Aho-Corasick when asked to match many keywords efficiently.

::quiz {"q":"What is the time to look up a word in a trie?","options":["O(number of words)","O(length of the word)","O(log number of words)","O(1) always"],"answer":1,"explain":"It's independent of how many words are stored."}

::quiz {"q":"Why can a suffix array find any substring?","options":["It stores every substring","Every substring is a prefix of some suffix, and the suffixes are sorted, so binary search works","It uses hashing","It's a trie of words"],"answer":1,"explain":"Search for suffixes starting with the pattern."}

::quiz {"q":"You need to find 10,000 banned words in a live chat stream. Which structure fits?","options":["10,000 separate KMP searches","Aho-Corasick automaton","A suffix array of the chat","A Bloom filter"],"answer":1,"explain":"One pass over the text, regardless of the number of patterns."}
