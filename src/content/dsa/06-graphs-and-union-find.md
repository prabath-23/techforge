---
title: Graphs and Union-Find: Modeling Connections
summary: How graphs model anything made of connections, friendships, roads, the web, dependencies between tasks, how to store them in memory, how to spot a graph hidden inside a puzzle, and how the "union-find" structure answers "are these two connected?" almost instantly.
---

::widget Scene {"title": "Breadth-first search: fewest hops first", "sub": "from A, layer by layer, with a queue", "nodes": [{"id": "A", "kind": "node", "label": "A", "x": 3.1, "y": 3.1, "size": 1.9}, {"id": "B", "kind": "node", "label": "B", "x": 3.5, "y": -3.5, "size": 1.9}, {"id": "C", "kind": "node", "label": "C", "x": 9.7, "y": 2.7, "size": 1.9}, {"id": "D", "kind": "node", "label": "D", "x": 10.1, "y": -3.9, "size": 1.9}, {"id": "E", "kind": "node", "label": "E", "x": 13.6, "y": -7.4, "size": 1.9}, {"id": "q", "kind": "cells", "label": "queue", "x": 11.92, "y": 7.92, "values": ["", "", ""]}], "links": [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"], ["D", "E"]], "metrics": [["cur", "Visiting"], ["dist", "Distances"], ["seen", "Seen"]], "steps": [{"short": "Start", "tag": "Init", "title": "Put A in the queue and mark it seen, distance 0", "body": "<p>\"Seen\" stops us adding a node twice.</p>", "set": {"A": {"color": "orange", "badge": "0"}, "q": {"marks": {"0": "orange"}, "ptr": {}, "values": ["A", "", ""]}}, "metrics": {"cur": ["-"], "dist": ["A=0"], "seen": ["A"]}}, {"short": "PopA", "tag": "Visit", "title": "Pop A; add its unseen neighbours B and C (distance 1)", "body": "<p>First-in, first-out means everything at distance 1 is processed before distance 2.</p>", "set": {"A": {"color": "green"}, "B": {"color": "orange", "badge": "1"}, "C": {"color": "orange", "badge": "1"}, "q": {"marks": {}, "ptr": {}, "values": ["B", "C", ""]}}, "metrics": {"cur": ["A"], "dist": ["B=1, C=1"], "seen": ["A B C"]}}, {"short": "PopB", "tag": "Visit", "title": "Pop B; neighbour D is unseen → distance 2", "body": "<p>A is already seen, skip it.</p>", "set": {"B": {"color": "green"}, "D": {"color": "orange", "badge": "2"}, "q": {"marks": {}, "ptr": {}, "values": ["C", "D", ""]}}, "hot": [["B", "D"]], "metrics": {"cur": ["B"], "dist": ["D=2"], "seen": ["A B C D"]}}, {"short": "PopC", "tag": "Visit", "title": "Pop C; D is already seen, skip", "body": "<p>Without the seen set, D would be queued twice (and cycles would loop forever).</p>", "set": {"C": {"color": "green"}, "q": {"marks": {}, "ptr": {}, "values": ["D", "", ""]}}, "metrics": {"cur": ["C"]}}, {"short": "PopD", "tag": "Visit", "title": "Pop D; E is new → distance 3", "body": "<p>Layer by layer, like ripples in a pond.</p>", "set": {"D": {"color": "green"}, "E": {"color": "orange", "badge": "3"}, "q": {"marks": {}, "ptr": {}, "values": ["E", "", ""]}}, "hot": [["D", "E"]], "metrics": {"cur": ["D"], "dist": ["E=3"], "seen": ["A B C D E"]}}, {"short": "PopE", "tag": "Done", "title": "Pop E; no new neighbours; queue empty", "body": "<p>Every node's distance is the fewest hops from A.</p>", "set": {"E": {"color": "green"}, "q": {"marks": {}, "ptr": {}, "values": ["", "", ""]}}, "metrics": {"cur": ["E"], "dist": ["A0 B1 C1 D2 E3", "good"]}}, {"short": "Path", "tag": "Path", "title": "Record each node's parent to rebuild the path", "body": "<p>E ← D ← B ← A: the shortest route A → B → D → E.</p>", "hot": [["A", "B"], ["B", "D"], ["D", "E"]]}, {"short": "Cost", "tag": "Complexity", "title": "O(V + E): each node and edge handled once", "body": "<p>BFS finds shortest paths only when every edge costs the same. Weighted edges need Dijkstra.</p>", "note": {"kind": "key", "text": "BFS = queue + seen set. It explores in order of distance, so the first time you reach a node is via a shortest path (in hops)."}}]}



::widget Scene {"title": "Breadth-first search: fewest hops from A", "sub": "explore in rings using a queue", "nodes": [{"id": "A", "kind": "node", "label": "A", "x": 3.41, "y": 3.41, "size": 1.9, "color": "blue"}, {"id": "B", "kind": "node", "label": "B", "x": 3.4, "y": -3.4, "size": 1.9, "color": "blue"}, {"id": "C", "kind": "node", "label": "C", "x": 10.22, "y": 3.42, "size": 1.9, "color": "blue"}, {"id": "D", "kind": "node", "label": "D", "x": 6.8, "y": -6.8, "size": 1.9, "color": "blue"}, {"id": "E", "kind": "node", "label": "E", "x": 13.62, "y": 0.02, "size": 1.9, "color": "blue"}, {"id": "F", "kind": "node", "label": "F", "x": 13.61, "y": -6.79, "size": 1.9, "color": "blue"}], "links": [["A", "B"], ["A", "C"], ["B", "D"], ["C", "E"], ["D", "F"], ["E", "F"], ["B", "C"]], "metrics": [["queue", "Queue"], ["dist", "Hops found"]], "steps": [{"short": "Start", "tag": "Setup", "title": "Start at A, distance 0", "body": "<p>A graph is nodes plus connections (friends, roads, web links). BFS finds the fewest hops from A to everything, by exploring <b>closest first</b>.</p>", "focus": ["A"], "set": {"A": {"badge": "0"}}, "metrics": {"queue": ["A"], "dist": ["A:0"]}}, {"short": "Ring 1", "tag": "Expand", "title": "A's neighbours are 1 hop away", "body": "<p>Take A off the queue; add its unvisited neighbours B and C with distance 1.</p>", "set": {"B": {"badge": "1"}, "C": {"badge": "1"}}, "flow": [["A", "B", "#3b82f6", ""], ["A", "C", "#3b82f6", ""]], "metrics": {"queue": ["B, C"], "dist": ["B:1 C:1"]}}, {"short": "Ring 2", "tag": "Expand", "title": "Their neighbours are 2 hops away", "body": "<p>From B: D (2). From C: E (2). B–C is already visited, so it's skipped, the visited set stops loops.</p>", "set": {"D": {"badge": "2"}, "E": {"badge": "2"}}, "flow": [["B", "D", "#3b82f6", ""], ["C", "E", "#3b82f6", ""]], "metrics": {"queue": ["D, E"], "dist": ["D:2 E:2"]}}, {"short": "Ring 3", "tag": "Done", "title": "F is 3 hops away", "body": "<p>F is reached first from D, at distance 3. Because BFS goes ring by ring, the first time it reaches a node is via a shortest path. O(V + E).</p>", "set": {"F": {"badge": "3"}}, "flow": [["D", "F", "#22c55e", ""]], "metrics": {"queue": ["(empty)"], "dist": ["F:3", "good"]}, "note": {"kind": "key", "text": "BFS = shortest paths when every edge costs the same (friend suggestions, word ladders, grid mazes). Weighted edges need Dijkstra."}}]}

::widget Scene {"title": "Depth-first search: go deep, then backtrack", "sub": "explore one path to the end using a stack", "nodes": [{"id": "A", "kind": "node", "label": "A", "x": 3.41, "y": 3.41, "size": 1.9, "color": "blue"}, {"id": "B", "kind": "node", "label": "B", "x": 3.4, "y": -3.4, "size": 1.9, "color": "blue"}, {"id": "C", "kind": "node", "label": "C", "x": 10.22, "y": 3.42, "size": 1.9, "color": "blue"}, {"id": "D", "kind": "node", "label": "D", "x": 6.8, "y": -6.8, "size": 1.9, "color": "blue"}, {"id": "E", "kind": "node", "label": "E", "x": 13.62, "y": 0.02, "size": 1.9, "color": "blue"}, {"id": "F", "kind": "node", "label": "F", "x": 13.61, "y": -6.79, "size": 1.9, "color": "blue"}], "links": [["A", "B"], ["A", "C"], ["B", "D"], ["C", "E"], ["D", "F"], ["E", "F"], ["B", "C"]], "metrics": [["stack", "Path (stack)"], ["order", "Visit order"]], "steps": [{"short": "Dive", "tag": "Deep", "title": "From A, keep going to an unvisited neighbour", "body": "<p>A → B → D → F: always take the first unvisited neighbour, going as deep as possible.</p>", "flow": [[["A", "B", "D", "F"], "#a855f7", "dive"]], "metrics": {"stack": ["A B D F"], "order": ["A B D F"]}}, {"short": "Continue", "tag": "Deep", "title": "From F, E is unvisited: go there, then C", "body": "<p>F → E → C. C's neighbours (A, B, E) are all visited, dead end.</p>", "flow": [[["F", "E", "C"], "#a855f7", ""]], "metrics": {"stack": ["A B D F E C"], "order": ["A B D F E C"]}}, {"short": "Backtrack", "tag": "Back", "title": "Dead end: pop back up the path", "body": "<p>Pop C, E, F, D, B, A, checking each for unvisited neighbours. None left: done. Recursion does this automatically using the call stack.</p>", "note": {"kind": "key", "text": "DFS is the tool for: does a path exist, detecting cycles, topological sort, connected components, and solving mazes or puzzles by backtracking."}, "metrics": {"stack": ["(empty)"]}}]}

::widget Scene {"title": "Topological sort: an order that respects dependencies", "sub": "which courses to take first?", "nodes": [{"id": "m", "kind": "node", "label": "Math", "x": 3.41, "y": 3.41, "size": 1.9, "color": "green"}, {"id": "p", "kind": "node", "label": "Programming", "x": 9.3, "y": 9.3, "size": 1.9, "color": "green"}, {"id": "ds", "kind": "node", "label": "Data Structures", "x": 10.2, "y": 2.2, "size": 1.9, "color": "green"}, {"id": "al", "kind": "node", "label": "Algorithms", "x": 11.41, "y": -4.59, "size": 1.9, "color": "green"}, {"id": "ml", "kind": "node", "label": "Machine Learning", "x": 17.3, "y": 1.3, "size": 1.9, "color": "green"}], "links": [["m", "ds"], ["p", "ds"], ["ds", "al"], ["ds", "ml"], ["m", "ml"]], "metrics": [["ready", "Ready (no prerequisites left)"], ["order", "Order so far"]], "steps": [{"short": "Dependencies", "tag": "Problem", "title": "Some courses need others first", "body": "<p>Arrows mean \"must come before\". Build systems, package managers and spreadsheets all need an order that respects every arrow.</p>", "metrics": {"ready": ["Math, Programming"], "order": ["-"]}}, {"short": "Take ready ones", "tag": "Kahn", "title": "Start with nodes that have no incoming arrows", "body": "<p>Math and Programming have no prerequisites. Take them and remove their arrows.</p>", "set": {"m": {"badge": "1"}, "p": {"badge": "2"}}, "metrics": {"ready": ["Data Structures"], "order": ["Math, Programming"]}}, {"short": "Unlock", "tag": "Kahn", "title": "Data Structures is now unlocked, then the rest", "body": "<p>DS has no remaining prerequisites → take it. That unlocks Algorithms and ML (Math is already done).</p>", "set": {"ds": {"badge": "3"}, "al": {"badge": "4"}, "ml": {"badge": "5"}}, "metrics": {"order": ["Math, Prog, DS, Algo, ML", "good"]}}, {"short": "Cycles", "tag": "Gotcha", "title": "If nodes remain but none are ready, there's a cycle", "body": "<p>A → B → A can never be ordered. That's how build tools report \"circular dependency\". O(V + E).</p>", "note": {"kind": "key", "text": "Topological sort = Kahn's algorithm (queue of ready nodes) or DFS post-order reversed."}}]}

::widget Scene {"title": "Union-find: are these two connected?", "sub": "merge groups in near-constant time", "nodes": [{"id": "a", "kind": "node", "label": "Asha", "x": 0.0, "y": 0.0, "size": 1.9, "color": "purple"}, {"id": "b", "kind": "node", "label": "Ben", "x": 3.0, "y": -3.0, "size": 1.9, "color": "purple"}, {"id": "c", "kind": "node", "label": "Chen", "x": 6.0, "y": -6.0, "size": 1.9, "color": "purple"}, {"id": "d", "kind": "node", "label": "Dev", "x": 5.27, "y": 5.27, "size": 1.9, "color": "purple"}, {"id": "e", "kind": "node", "label": "Eli", "x": 8.27, "y": 2.27, "size": 1.9, "color": "purple"}, {"id": "f", "kind": "node", "label": "Fay", "x": 11.27, "y": -0.73, "size": 1.9, "color": "purple"}], "links": [], "metrics": [["groups", "Groups"], ["q", "Question"]], "steps": [{"short": "Alone", "tag": "Setup", "title": "Everyone starts in their own group", "body": "<p>Each person is their own \"representative\". Six groups.</p>", "metrics": {"groups": ["6"], "q": ["-"]}}, {"short": "Union", "tag": "Union", "title": "union(Asha, Ben), union(Ben, Chen), union(Dev, Eli)", "body": "<p>Merging attaches one group's representative under the other's. Asha, Ben and Chen now share a representative; so do Dev and Eli.</p>", "set": {"b": {"badge": "→ Asha"}, "c": {"badge": "→ Asha"}, "e": {"badge": "→ Dev"}}, "metrics": {"groups": ["3"]}}, {"short": "Find", "tag": "Find", "title": "find(Chen) == find(Asha)? Yes. find(Eli) == find(Fay)? No.", "body": "<p>Two people are connected if their representatives match. With <b>path compression</b> and <b>union by rank</b>, each operation is almost O(1).</p>", "focus": ["c", "a"], "metrics": {"q": ["Chen ~ Asha ✓, Eli ~ Fay ✗", "good"]}, "note": {"kind": "key", "text": "Union-find powers Kruskal's minimum spanning tree, detecting cycles while adding edges, and \"number of connected components\" problems."}}]}









## Everything is connected

Lots of real-world data isn't a list or a hierarchy, it's a **network**:

- **Social networks:** people connected by friendships or follows.
- **Maps:** intersections connected by roads, each with a distance or travel time.
- **The web:** pages connected by links.
- **Software:** packages that depend on other packages; tasks that must finish before others can start.
- **Computer networks:** routers connected by cables (Networking track).

All of these are **graphs**: a set of **vertices** (also called nodes, the things) and **edges** (the connections between them).

> [!ANALOGY] A metro map is a graph. Stations are vertices; the track segments between stations are edges. "What's the fewest stops from A to B?", "if this station closes, can I still get from X to Y?" and "which stations are interchange hubs?" are all graph questions.

## Kinds of graphs

- **Directed vs undirected.** Facebook friendship is **undirected** (if I'm your friend, you're mine). Instagram follows are **directed** (I can follow you without you following me). Edges in a directed graph have arrows.
- **Weighted vs unweighted.** Roads have **weights** (kilometers or minutes); "is connected to" doesn't.
- **Cycles.** A path that leads back to where it started. A directed graph with **no** cycles is a **DAG** (directed acyclic graph), the shape of build systems, task pipelines, spreadsheet formulas, course prerequisites and Git history.
- A **tree** (chapter 4) is just a connected graph with no cycles.

## Storing a graph in memory

Two main ways:

**Adjacency list** for each vertex, a list of its neighbors. Memory grows with the number of edges. This is the standard choice, because real graphs are usually **sparse**: each person has a few hundred friends, not millions.

```python
from collections import defaultdict
graph = defaultdict(list)
for a, b in [("Asha", "Ben"), ("Asha", "Chen"), ("Ben", "Dev")]:
    graph[a].append(b)
    graph[b].append(a)            # undirected: add both directions
# graph["Asha"] → ["Ben", "Chen"]
```

**Adjacency matrix** an n × n grid where cell [i][j] says whether i and j are connected. Checking one specific connection is O(1), but it needs n² memory: a matrix for 1 million users would need a trillion cells. Use it only for small or very dense graphs.

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

> [!ANALOGY] Searching for a lost child in a park. **BFS** is a search party walking outward in expanding circles from where the child was last seen, the first time they find the child, they've found the closest route. **DFS** is one person following one path all the way to its end, coming back, and trying the next path.

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

Sometimes you don't need paths at all, just **groups**. Connections keep arriving ("cable added between router 4 and router 9", "account A and account B share an email address"), and you need to answer, at any moment, "are X and Y in the same group?"

The **union-find** structure (also called **disjoint set union**) does this astonishingly fast. Each group is a little tree, and each tree's root acts as the group's **representative**.

- **find(x)**: follow parent pointers from x up to the root. Two items are in the same group if they have the same root.
- **union(x, y)**: find both roots; if they're different, attach one root under the other, merging the groups.

> [!ANALOGY] Every club has a president. To check whether two people are in the same club, ask each one "who's your president?" (they might ask their recruiter, who asks theirs, up the chain). When two clubs merge, one president agrees to report to the other. To keep the chains short, after asking, everyone remembers the president directly next time (**path compression**), and smaller clubs always join under larger ones (**union by size**).

With those two tricks, each operation takes **effectively constant time** mathematically, it's bounded by a function that stays below 5 for any input that could fit in the universe.

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
- **Merging duplicate accounts:** users who share an email or phone number are the same person, union them as you discover links.
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
