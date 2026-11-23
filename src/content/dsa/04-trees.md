---
title: Trees — Keeping Data Organized and Sorted
summary: How tree structures model hierarchies like folders and org charts, how binary search trees keep data sorted for fast lookups, why they can secretly degrade into a slow line and how self-balancing trees prevent it, and why every major database stores its indexes in B-trees.
---

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
