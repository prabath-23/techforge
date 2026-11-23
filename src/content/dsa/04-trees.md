---
title: Trees — Keeping Data Organized and Sorted
summary: How tree structures model hierarchies like folders and org charts, how binary search trees keep data sorted for fast lookups, why they can secretly degrade into a slow line and how self-balancing trees prevent it, and why every major database stores its indexes in B-trees.
---

::widget Scene {"title": "Binary search trees: halve the search at every step", "sub": "insert seven keys, search, then delete a node with two children", "nodes": [{"id": "n50", "kind": "node", "label": "50", "x": 6.0, "y": -6.0, "size": 1.9}, {"id": "n30", "kind": "node", "label": "30", "x": 6.1, "y": 0.1, "size": 1.9}, {"id": "n70", "kind": "node", "label": "70", "x": 12.1, "y": -5.9, "size": 1.9}, {"id": "n20", "kind": "node", "label": "20", "x": 7.7, "y": 4.7, "size": 1.9}, {"id": "n40", "kind": "node", "label": "40", "x": 10.7, "y": 1.7, "size": 1.9}, {"id": "n60", "kind": "node", "label": "60", "x": 13.7, "y": -1.3, "size": 1.9}, {"id": "n80", "kind": "node", "label": "80", "x": 16.7, "y": -4.3, "size": 1.9}], "links": [["n50", "n30"], ["n50", "n70"], ["n30", "n20"], ["n30", "n40"], ["n70", "n60"], ["n70", "n80"]], "metrics": [["op", "Operation"], ["path", "Path"], ["cmp", "Comparisons"]], "steps": [{"short": "Rule", "tag": "Rule", "title": "The rule: left subtree smaller, right subtree larger", "body": "<p>For every node, not just the root.</p>", "show": ["n50"], "metrics": {"op": ["insert 50"], "path": ["root"], "cmp": ["0"]}}, {"short": "Ins30", "tag": "Insert", "title": "Insert 30: smaller than 50 → left", "body": "<p>Then 70: larger → right.</p>", "show": ["n50", "n30", "n70"], "metrics": {"op": ["insert 30, 70"], "path": ["50 → L / R"], "cmp": ["1 each"]}}, {"short": "Ins20", "tag": "Insert", "title": "Insert 20, 40, 60, 80", "body": "<p>40: less than 50 → left; more than 30 → right of 30. Each insert walks down until it finds an empty spot.</p>", "show": ["n50", "n30", "n70", "n20", "n40", "n60", "n80"], "set": {"n40": {"badge": "50 L → 30 R"}}, "metrics": {"op": ["insert 20, 40, 60, 80"], "cmp": ["2 each"]}}, {"short": "Search", "tag": "Search", "title": "Search 60: start at the root", "body": "<p>60 > 50 → go right. Half the tree is now ignored.</p>", "set": {"n50": {"color": "orange"}, "n30": {"dim": true}, "n20": {"dim": true}, "n40": {"dim": true, "badge": null}}, "metrics": {"op": ["search 60"], "path": ["50"], "cmp": ["1"]}}, {"short": "Search2", "tag": "Search", "title": "60 < 70 → go left. Found.", "body": "<p>3 comparisons among 7 keys. With a million keys in a balanced tree: about 20.</p>", "set": {"n70": {"color": "orange"}, "n60": {"color": "green", "badge": "found"}, "n80": {"dim": true}}, "metrics": {"path": ["50 → 70 → 60"], "cmp": ["3", "good"]}}, {"short": "Inorder", "tag": "Traversal", "title": "In-order traversal prints keys sorted", "body": "<p>Left, node, right: 20 30 40 50 60 70 80. A BST is a sorted list you can update quickly.</p>", "set": {"n50": {"color": null}, "n70": {"color": null}, "n60": {"color": null, "badge": null}, "n30": {"dim": false}, "n20": {"dim": false}, "n40": {"dim": false}, "n80": {"dim": false}}, "metrics": {"op": ["in-order"], "path": ["20 30 40 50 60 70 80"]}}, {"short": "DelLeaf", "tag": "Delete", "title": "Delete 20 (a leaf): just remove it", "body": "<p>Deleting a node with one child: link the child to the parent.</p>", "set": {"n20": {"dim": true, "badge": "removed"}}, "metrics": {"op": ["delete 20"]}}, {"short": "Del30", "tag": "Delete", "title": "Delete 30: it has two children", "body": "<p>Can't just remove it. Replace it with its in-order successor — the smallest key in its right subtree: 40.</p>", "set": {"n30": {"color": "red", "badge": "delete"}, "n40": {"color": "green", "badge": "successor"}}, "metrics": {"op": ["delete 30"]}}, {"short": "Swap", "tag": "Delete", "title": "Copy 40 into 30's place, then delete the old 40 (now easy)", "body": "<p>The ordering rule still holds everywhere.</p>", "set": {"n30": {"label": "40", "color": null, "badge": null}, "n40": {"dim": true, "badge": "removed", "color": null}}, "metrics": {"path": ["50, 40, 60, 70, 80"]}}, {"short": "Skew", "tag": "Danger", "title": "Insert 1, 2, 3, 4, 5 in order and the \"tree\" is a line", "body": "<p>Every operation becomes O(n). Self-balancing trees (AVL, red-black) rotate nodes to keep height ≈ log n.</p>", "note": {"kind": "key", "text": "BST: search, insert and delete in O(height). Keep it balanced and height is O(log n). Two-child delete = swap with the in-order successor."}}]}



::widget Scene {"title": "Binary search trees: halve the search at every node", "sub": "left is smaller, right is bigger", "nodes": [{"id": "n8", "kind": "node", "label": "8", "x": 6.0, "y": -6.0, "size": 1.9, "color": "green"}, {"id": "n4", "kind": "node", "label": "4", "x": 6.41, "y": 0.41, "size": 1.9, "color": "green"}, {"id": "n12", "kind": "node", "label": "12", "x": 12.41, "y": -5.59, "size": 1.9, "color": "green"}, {"id": "n2", "kind": "node", "label": "2", "x": 8.32, "y": 5.32, "size": 1.9, "color": "green"}, {"id": "n6", "kind": "node", "label": "6", "x": 11.32, "y": 2.32, "size": 1.9, "color": "green"}, {"id": "n10", "kind": "node", "label": "10", "x": 14.32, "y": -0.68, "size": 1.9, "color": "green"}, {"id": "n14", "kind": "node", "label": "14", "x": 17.32, "y": -3.68, "size": 1.9, "color": "green"}], "links": [["n8", "n4"], ["n8", "n12"], ["n4", "n2"], ["n4", "n6"], ["n12", "n10"], ["n12", "n14"]], "metrics": [["q", "Looking for"], ["at", "At node"], ["steps", "Comparisons"]], "steps": [{"short": "The rule", "tag": "Concept", "title": "Everything left is smaller, everything right is bigger", "body": "<p>Every node splits the remaining values: smaller ones in its left subtree, bigger ones in its right. That rule holds at <b>every</b> node.</p>", "metrics": {"q": ["10"], "at": ["—"], "steps": ["0"]}}, {"short": "Start", "tag": "Search", "title": "Search 10: start at the root, 8", "body": "<p>10 > 8, so 10 can only be in the right subtree. The whole left half (2, 4, 6) is skipped.</p>", "focus": ["n8"], "set": {"n4": {"dim": true}, "n2": {"dim": true}, "n6": {"dim": true}}, "metrics": {"at": ["8"], "steps": ["1"]}}, {"short": "Left at 12", "tag": "Search", "title": "10 < 12: go left", "body": "<p>At 12, 10 is smaller, so go left.</p>", "focus": ["n12"], "set": {"n14": {"dim": true}}, "flow": [["n8", "n12", "#f59e0b", ""]], "metrics": {"at": ["12"], "steps": ["2"]}}, {"short": "Found", "tag": "Found", "title": "Found 10 in 3 comparisons", "body": "<p>A balanced tree with n nodes has about log₂ n levels: 1 million values → about 20 comparisons. Insert works the same way — walk down and attach where the search ends.</p>", "focus": ["n10"], "set": {"n10": {"badge": "found"}}, "flow": [["n12", "n10", "#22c55e", ""]], "metrics": {"at": ["10", "good"], "steps": ["3", "good"]}, "note": {"kind": "warn", "text": "Insert 1, 2, 3, 4, 5 in order and the \"tree\" becomes a straight line — O(n) searches. That's why balanced trees exist."}}]}

::widget Scene {"title": "Tree traversals: in-order, pre-order, post-order, level-order", "sub": "four ways to visit every node", "nodes": [{"id": "n8", "kind": "node", "label": "8", "x": 6.0, "y": -6.0, "size": 1.9, "color": "blue"}, {"id": "n4", "kind": "node", "label": "4", "x": 6.41, "y": 0.41, "size": 1.9, "color": "blue"}, {"id": "n12", "kind": "node", "label": "12", "x": 12.41, "y": -5.59, "size": 1.9, "color": "blue"}, {"id": "n2", "kind": "node", "label": "2", "x": 8.32, "y": 5.32, "size": 1.9, "color": "blue"}, {"id": "n6", "kind": "node", "label": "6", "x": 11.32, "y": 2.32, "size": 1.9, "color": "blue"}, {"id": "n10", "kind": "node", "label": "10", "x": 14.32, "y": -0.68, "size": 1.9, "color": "blue"}, {"id": "n14", "kind": "node", "label": "14", "x": 17.32, "y": -3.68, "size": 1.9, "color": "blue"}], "links": [["n8", "n4"], ["n8", "n12"], ["n4", "n2"], ["n4", "n6"], ["n12", "n10"], ["n12", "n14"]], "metrics": [["order", "Visit order"]], "steps": [{"short": "In-order", "tag": "DFS", "title": "In-order (left, node, right): sorted output", "body": "<p>Visit the left subtree, then the node, then the right subtree. On a BST this prints values <b>in sorted order</b>: 2, 4, 6, 8, 10, 12, 14.</p>", "flow": [[["n2", "n4", "n6", "n8", "n10", "n12", "n14"], "#3b82f6", ""]], "metrics": {"order": ["2 4 6 8 10 12 14"]}}, {"short": "Pre-order", "tag": "DFS", "title": "Pre-order (node, left, right): copy a tree", "body": "<p>Node first: 8, 4, 2, 6, 12, 10, 14. Used to serialize or clone a tree, because parents come before children.</p>", "flow": [[["n8", "n4", "n2", "n6", "n12", "n10", "n14"], "#a855f7", ""]], "metrics": {"order": ["8 4 2 6 12 10 14"]}}, {"short": "Post-order", "tag": "DFS", "title": "Post-order (left, right, node): delete or total up", "body": "<p>Children before parents: 2, 6, 4, 10, 14, 12, 8. Used to free memory or compute folder sizes — you need the children's results first.</p>", "flow": [[["n2", "n6", "n4", "n10", "n14", "n12", "n8"], "#f59e0b", ""]], "metrics": {"order": ["2 6 4 10 14 12 8"]}}, {"short": "Level-order", "tag": "BFS", "title": "Level-order: row by row with a queue", "body": "<p>8; then 4, 12; then 2, 6, 10, 14. A queue gives breadth-first order — useful for \"shortest path in a tree\" or printing levels.</p>", "flow": [[["n8", "n4", "n12", "n2", "n6", "n10", "n14"], "#22c55e", ""]], "metrics": {"order": ["8 | 4 12 | 2 6 10 14"]}, "note": {"kind": "key", "text": "The three depth-first orders differ only in when you \"visit\" the node relative to its children."}}]}

::widget Scene {"title": "Balanced trees: a rotation fixes a lopsided tree", "sub": "AVL and red-black trees keep height ~log n", "nodes": [{"id": "a", "kind": "node", "label": "10", "x": 3.0, "y": -3.0, "size": 1.9, "color": "red"}, {"id": "b", "kind": "node", "label": "20", "x": 9.41, "y": -2.59, "size": 1.9, "color": "red"}, {"id": "c", "kind": "node", "label": "30", "x": 15.82, "y": -2.18, "size": 1.9, "color": "red"}], "links": [["a", "b"], ["b", "c"]], "metrics": [["h", "Height"], ["worst", "Worst search"]], "steps": [{"short": "Lopsided", "tag": "Problem", "title": "Inserting 10, 20, 30 in order makes a chain", "body": "<p>Each new value is bigger, so it always goes right. The tree has degenerated into a linked list: searches become O(n).</p>", "metrics": {"h": ["3"], "worst": ["O(n)", "bad"]}}, {"short": "Rotate", "tag": "Fix", "title": "Rotate left around 20", "body": "<p>A <b>rotation</b> lifts 20 to the root, with 10 on its left and 30 on its right. The left-smaller, right-bigger rule still holds — only the shape changed.</p>", "set": {"a": {"x": 1.6, "y": 6.0, "color": "green"}, "b": {"x": 3.0, "y": -3.0, "color": "green"}, "c": {"color": "green"}}, "metrics": {"h": ["2", "good"], "worst": ["O(log n)", "good"]}}, {"short": "Always", "tag": "Insight", "title": "Self-balancing trees rotate after every insert/delete when needed", "body": "<p><b>AVL trees</b> keep left/right heights within 1; <b>red-black trees</b> use colour rules and rotate less often. Java's TreeMap, C++ std::map and Linux's scheduler use red-black trees. Databases use B-trees (very wide nodes) for the same goal.</p>", "note": {"kind": "key", "text": "Balanced = height stays O(log n), so search, insert and delete stay O(log n) no matter the insert order."}}]}







## Trees are everywhere

Your computer's folders form a tree: one root folder, containing folders, containing more folders and files. So does a company's org chart, a family tree, a web page's HTML structure, and the menu in any app.

In computing, a **tree** is a set of **nodes** connected so that:

- there's one **root** at the top (trees in computer science grow upside down),
- every other node has exactly one **parent**,
- nodes with no children are **leaves**,
- there are no loops.

The **depth** of a node is how many steps it is from the root; the **height** of the tree is the depth of its deepest leaf. Height matters a lot, as you'll see: many operations cost one step per level.

A **binary tree** is a tree where each node has at most two children: a **left** and a **right**.

## Visiting every node: traversals

Most tree algorithms visit every node in a particular order. With recursion, each is a few lines:

```python
class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def preorder(n):   # visit me, then my children — used to copy or save a tree
    if not n: return []
    return [n.val] + preorder(n.left) + preorder(n.right)

def inorder(n):    # left child, me, right child — gives SORTED order in a search tree
    if not n: return []
    return inorder(n.left) + [n.val] + inorder(n.right)

def postorder(n):  # children first, then me — used to delete a tree, or total folder sizes
    if not n: return []
    return postorder(n.left) + postorder(n.right) + [n.val]

from collections import deque
def level_order(root):   # level by level, top to bottom — like reading an org chart row by row
    if not root: return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            n = queue.popleft()
            level.append(n.val)
            if n.left: queue.append(n.left)
            if n.right: queue.append(n.right)
        result.append(level)
    return result
```

> [!EXAMPLE] **Postorder in real life:** to show the size of every folder on your disk, you must know the sizes of a folder's contents before you can total the folder itself. That's a postorder walk: children first, then the parent. Disk-usage tools like `du` work this way.

**Thinking recursively about trees.** Most tree problems become easy if you ask: "if I already had the answer for my left subtree and my right subtree, how would I compute the answer for me?" For example, a tree's height is `1 + max(height(left), height(right))`.

## Binary search trees: a sorted structure you can grow

A **binary search tree (BST)** adds one rule: for every node, **everything in its left subtree is smaller, and everything in its right subtree is larger**.

> [!ANALOGY] The guessing game "I'm thinking of a number between 1 and 100". You guess 50; "lower". You guess 25; "higher". Each answer rules out half the possibilities. A binary search tree stores data so that every lookup plays this game: at each node, go left if what you want is smaller, right if it's larger.

To **search**, start at the root and go left or right at each node until you find the value or hit a dead end. To **insert**, search for where the value would be and attach it there. Each step goes one level down, so the cost is the tree's **height**.

A BST gives you things a hash table can't:

- items **in sorted order** (an in-order traversal),
- "the smallest item greater than X" (next appointment after 3 pm),
- everything **between** two values (all orders between ₹500 and ₹1,000).

### The catch: trees can become a line

The height depends on the **order** items arrive. Insert 50, 25, 75, 10, 30… and you get a nicely bushy tree of height about log₂(n). Insert 10, 20, 30, 40, 50 — already sorted — and every new item goes to the right of the previous one. The "tree" becomes a straight line, and searching it is just as slow as scanning a list: O(n).

Try it: turn off balancing and insert sorted numbers, then turn balancing on and do it again.

::widget BstViz {}

Real data arrives sorted surprisingly often — user IDs, timestamps, order numbers. So production code never uses a plain BST; it uses a **self-balancing** tree.

## Self-balancing trees

After each insert or delete, a self-balancing tree checks whether it has become lopsided and fixes it with **rotations**: small local rearrangements that change the shape while keeping the left-smaller/right-larger order intact.

```text
        30                      20
       /     rotate right      /  \
     20     ────────────▶     10   30
    /
  10
```

Two famous designs:

- **AVL trees** (1962) keep the heights of every node's two subtrees within 1 of each other. Very strictly balanced, so lookups are as fast as possible.
- **Red-black trees** follow a looser set of coloring rules that guarantee the height never exceeds about twice the ideal. They need fewer rotations on insert and delete, so they're popular for data that changes a lot.

Both guarantee **O(log n)** search, insert and delete, no matter what order the data arrives in. With a million items, that's about 20 steps; with a billion, about 30.

> [!EXAMPLE] **Red-black trees you use every day without knowing it:** Java's `TreeMap`, C++'s `std::map`, and inside the Linux kernel — the CPU scheduler keeps ready threads in a red-black tree sorted by how much CPU time each has had (OS track, chapter 5), and the memory manager has used them to track each process's memory regions.

## B-trees: trees for disks and databases

Here's a problem. A database table has a billion rows on disk. A balanced binary tree over a billion keys has height about 30, so each lookup takes 30 steps — and if each step means reading from disk (about 0.1 ms on an SSD, 10 ms on a hard disk), that's far too slow.

What's expensive here isn't comparing keys; it's **each trip to the disk**. And a disk always reads a whole **page** (4–16 KB) at a time, even if you only want one key. So why not put **hundreds of keys in each node**?

That's a **B-tree**. Each node is one disk page, holding hundreds of sorted keys and pointers to hundreds of children. A tree where every node has 500 children reaches a billion keys in just **3–4 levels** — and the top levels are used so often they stay cached in memory. A lookup typically needs **one or two actual disk reads**.

> [!ANALOGY] A library's card catalog. The first drawer label tells you "A–F, G–L, M–R, S–Z". Inside the "M–R" drawer, dividers tell you "Ma–Me, Mi–Mo…". Within two or three steps you're at the exact card, among millions of books, because each level splits the range hundreds of ways instead of just two.

The variant used almost everywhere is the **B+ tree**: all the actual data lives in the bottom level (the **leaves**), and the leaves are linked together in sorted order. So a query like "all orders from last week" finds the first matching leaf and then simply walks along the chain.

::widget Stepper {"type":"tree","title":"A small B+ tree (real ones have hundreds of keys per node)","what":"A B+ tree, shown with only a few keys per node so it fits. The top nodes are signposts; all the real data lives in the bottom leaves, which are linked left to right.","steps":["Click the root and read how it routes searches.","Click a leaf to see where the data lives.","Ask: how would 'all keys between 10 and 45' be found? (Find the first leaf, then follow the links.)"],"nodes":[["Root: [30 | 60]","Signpost: keys under 30 go left, 30 to 59 go to the middle, 60 and up go right. In a real database this node holds hundreds of signposts and is always cached in memory."],["[10 | 20]","A signpost level for keys under 30."],["[40 | 50]","A signpost level for keys from 30 to 59."],["Leaf: 1, 5, 9 →","Leaves hold the actual rows (or pointers to them) and a link to the next leaf."],["Leaf: 10, 15, 19 →","'WHERE id BETWEEN 10 AND 45' starts here, then follows the links rightwards."],["Leaf: 40, 45, 48 →","All leaves are at the same depth, so every lookup costs the same number of page reads."],["Leaf: 50, 55 →","With hundreds of keys per node, a billion rows need only 3–4 levels."]]}

> [!EXAMPLE] **Every time you query a database by an indexed column, you're walking a B+ tree.** PostgreSQL, MySQL, SQL Server, Oracle and SQLite all store their indexes this way, and so do most file systems for their directories (OS track). When a slow query is fixed by "adding an index", what you've added is a B+ tree that turns a full scan of millions of rows into three or four page reads.

## Trees for questions about ranges

Some problems need fast answers to questions like "what's the total of items 1,000 to 5,000?" **while those items keep changing**. Prefix sums (chapter 2) break down when values change, since one update shifts every later total.

- A **segment tree** stores, at each node, a summary (sum, minimum or maximum) of a range of the array. Both updating one item and querying any range take O(log n).
- A **Fenwick tree** does the same for sums, in a compact array, with a clever bit trick.

These show up in competitive programming and in systems like real-time leaderboards and analytics.

> [!RECAP]
> - **Trees** model hierarchies; the cost of most operations depends on the tree's **height**.
> - **Traversals**: preorder, inorder (sorted, for search trees), postorder (children first), level-order.
> - A **binary search tree** keeps smaller keys left and larger keys right, enabling sorted order and range queries.
> - Plain BSTs can **degrade into a line** (O(n)); **AVL** and **red-black** trees rebalance with rotations to guarantee O(log n).
> - **B-trees / B+ trees** pack hundreds of keys per node so a billion keys need only 3–4 levels — the structure behind database indexes.
> - **Segment and Fenwick trees** answer range questions on changing data in O(log n).

> [!INTERVIEW] Common questions: the four traversals (recursive and with a stack/queue), maximum depth, validate a BST (pass down the allowed min/max range — comparing each node only to its children isn't enough), lowest common ancestor, level-order variants, and "why do databases use B+ trees instead of binary trees or hash indexes?" (few disk reads thanks to wide nodes, plus sorted leaves for range queries).

::quiz {"q":"You insert 1, 2, 3, …, 1,000,000 into a plain (unbalanced) BST. How long does a search take?","options":["O(1)","O(log n)","O(n) — the tree has become a straight line","O(n log n)"],"answer":2,"explain":"Sorted input makes every new node a right child of the previous one."}

::quiz {"q":"Why do databases use B+ trees for indexes rather than binary search trees?","options":["Binary trees can't store numbers","Each B+ tree node holds hundreds of keys, so a billion rows need only 3–4 levels (few disk reads), and linked leaves make range queries fast","B+ trees use less CPU","Binary trees don't support sorting"],"answer":1,"explain":"Disk reads dominate cost; wide nodes minimize them."}

::quiz {"q":"Which traversal of a binary search tree outputs its values in sorted order?","options":["Preorder","Inorder","Postorder","Level-order"],"answer":1,"explain":"Left subtree (smaller), node, right subtree (larger)."}
