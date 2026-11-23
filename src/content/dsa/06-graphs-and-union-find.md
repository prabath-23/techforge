---
title: Graphs and Union-Find — Modeling Connections
summary: How graphs model anything made of connections — friendships, roads, the web, dependencies between tasks — how to store them in memory, how to spot a graph hidden inside a puzzle, and how the "union-find" structure answers "are these two connected?" almost instantly.
---

## Everything is connected

Lots of real-world data isn't a list or a hierarchy — it's a **network**:

- **Social networks:** people connected by friendships or follows.
- **Maps:** intersections connected by roads, each with a distance or travel time.
- **The web:** pages connected by links.
- **Software:** packages that depend on other packages; tasks that must finish before others can start.
- **Computer networks:** routers connected by cables (Networking track).

All of these are **graphs**: a set of **vertices** (also called nodes — the things) and **edges** (the connections between them).

> [!ANALOGY] A metro map is a graph. Stations are vertices; the track segments between stations are edges. "What's the fewest stops from A to B?", "if this station closes, can I still get from X to Y?" and "which stations are interchange hubs?" are all graph questions.

## Kinds of graphs

- **Directed vs undirected.** Facebook friendship is **undirected** (if I'm your friend, you're mine). Instagram follows are **directed** (I can follow you without you following me). Edges in a directed graph have arrows.
- **Weighted vs unweighted.** Roads have **weights** (kilometers or minutes); "is connected to" doesn't.
- **Cycles.** A path that leads back to where it started. A directed graph with **no** cycles is a **DAG** (directed acyclic graph) — the shape of build systems, task pipelines, spreadsheet formulas, course prerequisites and Git history.
- A **tree** (chapter 4) is just a connected graph with no cycles.

## Storing a graph in memory

Two main ways:

**Adjacency list** — for each vertex, a list of its neighbors. Memory grows with the number of edges. This is the standard choice, because real graphs are usually **sparse**: each person has a few hundred friends, not millions.

```python
from collections import defaultdict
graph = defaultdict(list)
for a, b in [("Asha", "Ben"), ("Asha", "Chen"), ("Ben", "Dev")]:
    graph[a].append(b)
    graph[b].append(a)            # undirected: add both directions
# graph["Asha"] → ["Ben", "Chen"]
```

**Adjacency matrix** — an n × n grid where cell [i][j] says whether i and j are connected. Checking one specific connection is O(1), but it needs n² memory: a matrix for 1 million users would need a trillion cells. Use it only for small or very dense graphs.

| | Adjacency list | Adjacency matrix |
|---|---|---|
| Memory | vertices + edges | vertices² |
| Is A connected to B? | scan A's list | O(1) |
| List A's neighbors | fast | scan a whole row |
| Best for | almost everything | small or dense graphs |

> [!EXAMPLE] **Facebook's social graph** has billions of people and hundreds of billions of friendships. It's stored as adjacency lists spread across thousands of machines, in a system called TAO, which answers questions like "which of your friends liked this post?" billions of times a day.

## Graphs hiding in problems

The hardest part of graph problems is often **noticing** that they're graph problems. Many puzzles are graphs in disguise:

- **A grid or maze.** Each cell is a vertex; neighboring open cells are connected. "Count the islands in this map" or "find the shortest path through the maze".
- **States of a puzzle.** Each configuration of a puzzle is a vertex; each legal move is an edge. "What's the minimum number of moves to solve this?" becomes "what's the shortest path from the start state to the goal state?"
- **Word ladders.** Turn "cold" into "warm" changing one letter at a time, using only real words: words are vertices, words differing by one letter are connected.

## Exploring a graph: breadth-first and depth-first

Two fundamental ways to visit every reachable vertex:

- **Breadth-first search (BFS)** explores in **rings**: first all neighbors of the start, then all their neighbors, and so on, using a **queue**. Because it moves outward one step at a time, the first time it reaches any vertex is by a **shortest path** (fewest edges).
- **Depth-first search (DFS)** goes as **deep** as it can along one path, then backtracks and tries the next branch, using recursion or a **stack**. It's the basis of cycle detection, topological ordering and many puzzle solvers.

> [!ANALOGY] Searching for a lost child in a park. **BFS** is a search party walking outward in expanding circles from where the child was last seen — the first time they find the child, they've found the closest route. **DFS** is one person following one path all the way to its end, coming back, and trying the next path.

Watch them on the same grid (green = start, red = goal; drag to draw walls):

::widget GraphSearch {}

```python
from collections import deque
def fewest_hops(graph, start, goal):
    distance = {start: 0}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == goal:
            return distance[node]
        for nxt in graph[node]:
            if nxt not in distance:              # mark when FIRST discovered, so nothing is queued twice
                distance[nxt] = distance[node] + 1
                queue.append(nxt)
    return None                                   # goal not reachable

def count_islands(grid):                          # grid of "1" (land) and "0" (water)
    rows, cols, seen, islands = len(grid), len(grid[0]), set(), 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1" and (r, c) not in seen:
                islands += 1                      # found new land: explore the whole island
                stack = [(r, c)]
                while stack:
                    i, j = stack.pop()
                    if (i, j) in seen or not (0 <= i < rows and 0 <= j < cols) or grid[i][j] != "1":
                        continue
                    seen.add((i, j))
                    stack += [(i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)]
    return islands
```

Both BFS and DFS visit each vertex and edge once: **O(vertices + edges)**. The Algorithms track's graph chapter builds on them with shortest paths on weighted graphs (Dijkstra, the algorithm in maps apps), dependency ordering (topological sort) and more.

> [!EXAMPLE] **"Degrees of separation" on LinkedIn** ("2nd-degree connection") is BFS from your profile: your connections are 1 step away, their connections 2 steps, and so on.

## Union-Find: "are these two connected?"

Sometimes you don't need paths at all — just **groups**. Connections keep arriving ("cable added between router 4 and router 9", "account A and account B share an email address"), and you need to answer, at any moment, "are X and Y in the same group?"

The **union-find** structure (also called **disjoint set union**) does this astonishingly fast. Each group is a little tree, and each tree's root acts as the group's **representative**.

- **find(x)**: follow parent pointers from x up to the root. Two items are in the same group if they have the same root.
- **union(x, y)**: find both roots; if they're different, attach one root under the other, merging the groups.

> [!ANALOGY] Every club has a president. To check whether two people are in the same club, ask each one "who's your president?" (they might ask their recruiter, who asks theirs, up the chain). When two clubs merge, one president agrees to report to the other. To keep the chains short, after asking, everyone remembers the president directly next time (**path compression**), and smaller clubs always join under larger ones (**union by size**).

With those two tricks, each operation takes **effectively constant time** — mathematically, it's bounded by a function that stays below 5 for any input that could fit in the universe.

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))       # everyone starts as their own group
        self.size = [1] * n
    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # shortcut: point closer to the root
            x = self.parent[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                   # already in the same group (adding this edge would form a cycle)
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra               # smaller group joins the larger
        self.size[ra] += self.size[rb]
        return True
```

Where union-find shines:

- **Network connectivity:** "after these cables are added, is every office connected?"
- **Merging duplicate accounts:** users who share an email or phone number are the same person — union them as you discover links.
- **Building the cheapest network** (Kruskal's minimum spanning tree algorithm, Algorithms track): add the cheapest cables first, skipping any cable that connects two already-connected points.
- **Detecting a redundant connection:** an edge whose two ends are already in the same group creates a cycle.
- **Image processing:** grouping neighboring pixels of the same color into regions.

Its one limitation: it can merge groups, but not split them apart again.

> [!RECAP]
> - A **graph** is vertices plus edges; it models networks of all kinds. Graphs can be directed or undirected, weighted or not; a **DAG** has no cycles.
> - Store sparse graphs as **adjacency lists**; use a matrix only for small or dense graphs.
> - Many problems are **hidden graphs**: grids, puzzle states, word ladders.
> - **BFS** explores in rings with a queue and finds fewest-edge paths; **DFS** goes deep with a stack. Both are O(V + E).
> - **Union-find** tracks connected groups with near-constant-time find and union, using path compression and union by size.

> [!INTERVIEW] The hardest skill is recognizing the graph: "minimum number of moves/steps" → BFS on states; "connected groups / provinces / islands" → DFS, BFS or union-find; "dependencies / prerequisites" → DAG and topological sort; "cheapest way to connect everything" → minimum spanning tree. Say whether you mark vertices as visited when you add them to the queue (correct for BFS) or when you remove them.

::quiz {"q":"How should you store a social network of 100 million users, each with a few hundred friends?","options":["An adjacency matrix","Adjacency lists","One list of every possible pair","A single string"],"answer":1,"explain":"A matrix would need 10^16 cells; lists only store actual friendships."}

::quiz {"q":"'Minimum number of moves to solve this puzzle' (every move counts the same) is best solved with…","options":["DFS","BFS over the puzzle's states","Union-find","Sorting"],"answer":1,"explain":"BFS finds fewest-step paths in unweighted graphs; each state is a vertex."}

::quiz {"q":"What makes union-find operations nearly constant time?","options":["Hashing","Path compression combined with union by size (or rank)","Sorting the elements first","Storing an adjacency matrix"],"answer":1,"explain":"Together they keep every tree extremely flat."}
