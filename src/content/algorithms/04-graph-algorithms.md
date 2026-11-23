---
title: Graph Algorithms — Shortest Routes, Dependencies and Networks
summary: The algorithms behind maps apps, build tools and network design. Finding the fewest steps (BFS), the fastest route with travel times (Dijkstra and A*), handling negative costs (Bellman-Ford), ordering tasks that depend on each other (topological sort), connecting everything at the lowest cost (minimum spanning trees), and finding single points of failure.
---

> [!NOTE] This chapter builds on **Data Structures → Graphs and Union-Find**, which explains what graphs are, how they're stored, and how BFS and DFS explore them. Here we use those tools to solve real problems.

Keep this playground handy. Paint walls and "mud" (slow terrain), then compare the algorithms:

::widget GraphSearch {}

## 1. Fewest steps: breadth-first search

When every step costs the same — moves in a puzzle, hops in a social network, clicks between web pages — **BFS** finds the shortest path. It explores in rings: everything 1 step away, then 2 steps, then 3. The first time it reaches the goal, no shorter path can exist.

Two useful variations:

- **Multi-source BFS.** Start from **all** sources at once by putting them all in the queue at distance 0. "How far is every house from its **nearest** fire station?" is answered in a single pass instead of one BFS per station.

> [!EXAMPLE] **"Rotting oranges"**, a common interview puzzle: a grid of oranges where every rotten orange rots its neighbors each minute. How many minutes until all are rotten? Put every initially rotten orange in the queue at minute 0 and run BFS; the deepest level reached is the answer. Spreading infections, fire and network broadcasts are all modeled the same way.

- **Bidirectional BFS.** Search from both the start and the goal and stop when the two searches meet. Each side only needs to go half as deep, which is dramatically less work in large graphs like social networks.

## 2. The fastest route: Dijkstra's algorithm

Real roads have different lengths and speeds. The route with the fewest turns isn't necessarily the fastest. We need shortest paths in a **weighted** graph.

In 1956, Dutch computer scientist **Edsger Dijkstra** designed the algorithm in about twenty minutes, sitting at a café in Amsterdam, without pen and paper. It's still inside virtually every routing system.

> [!ANALOGY] Imagine water flooding out from your starting point through a network of pipes, where each pipe's length is its travel time. The water reaches nearby junctions first. Every time the water reaches a junction, that's the earliest possible arrival time there — nothing can beat water that has already arrived. Dijkstra's algorithm simulates this flood, always handling next the junction the water reaches soonest.

The algorithm:

1. Set the start's distance to 0 and every other place's distance to infinity.
2. Repeatedly take the **unfinished place with the smallest known distance** (a heap gives you this quickly — DSA track, chapter 5). Its distance is now **final**.
3. For each road leaving it, check whether going through it gives a neighbor a shorter distance than known so far, and if so, update it.

```python
import heapq
def shortest_times(roads, start):          # roads[place] = [(neighbor, minutes), ...]
    best = {start: 0}
    heap = [(0, start)]
    while heap:
        time, place = heapq.heappop(heap)
        if time > best.get(place, float("inf")):
            continue                        # an outdated entry; we already found a faster way here
        for nxt, minutes in roads[place]:
            t = time + minutes
            if t < best.get(nxt, float("inf")):
                best[nxt] = t
                heapq.heappush(heap, (t, nxt))
    return best
```

Its cost is **O((V + E) log V)**. Why does it work? When the closest unfinished place is taken from the heap, any other route to it would have to pass through some place that's at least as far away, and adding more road can only make it longer. **This argument requires that no road has a negative cost** — which is why Dijkstra can give wrong answers if negative weights exist.

> [!EXAMPLE] **Inside maps apps.** Running plain Dijkstra over a continent's road network (tens of millions of junctions) for every request would be too slow. Google Maps, Apple Maps and open-source engines like OSRM **preprocess** the road network — for example, adding "shortcut" edges that skip over minor roads (contraction hierarchies) — so a cross-country route is computed in milliseconds. The core idea is still Dijkstra's. And the internet itself uses it: routers running OSPF (Networking track, chapter 2) compute paths with Dijkstra.

## 3. Searching smarter: A*

Dijkstra explores in **all** directions equally, like a flood. If you're driving from Delhi to Mumbai, it wastes effort exploring roads toward Kolkata.

**A\*** ("A-star") adds a sense of direction. It prioritizes places by **distance traveled so far + an estimate of the distance remaining** (for example, the straight-line distance to the goal). As long as the estimate never **overestimates** the true remaining distance, A* still finds the optimal route — while exploring far fewer places. Run A* and Dijkstra in the playground above and count the explored cells.

> [!EXAMPLE] **Video games** use A* for almost all character pathfinding — enemies navigating around walls, units moving across a strategy map. The estimate is usually the straight-line or grid distance to the target.

## 4. Negative costs: Bellman-Ford

Sometimes edges have **negative** weights — for example, in currency exchange, where you can represent "gaining value" as negative cost. Dijkstra breaks. **Bellman-Ford** handles it by simply relaxing **every edge**, V − 1 times (a shortest path can't use more than V − 1 edges). It's slower — **O(V · E)** — but it has a bonus: if any distance still improves in an extra round, there's a **negative cycle**, a loop you could go around forever to reduce your cost.

> [!EXAMPLE] **Spotting arbitrage.** Convert exchange rates to weights with a logarithm (−log(rate)), and a negative cycle means a sequence of currency trades that ends with more money than you started with. Trading systems use exactly this check. Bellman-Ford's idea also powered RIP, one of the internet's early routing protocols.

## 5. Doing things in the right order: topological sort

You can't put on your shoes before your socks. You can't take Data Structures before Programming 101. A build tool can't compile a program before compiling the libraries it uses. These are **dependencies**, and they form a **DAG** — a directed graph with no cycles.

A **topological order** lists the tasks so that every task comes after everything it depends on.

**Kahn's algorithm** builds the order directly:

1. Count, for each task, how many unfinished tasks it depends on.
2. Put every task with a count of 0 (nothing it's waiting for) in a queue.
3. Repeatedly take a task, add it to the order, and reduce the count of every task that depends on it. Any task whose count reaches 0 joins the queue.

```python
from collections import deque
def build_order(tasks, depends_on):          # depends_on = [(task, prerequisite), ...]
    waiting = {t: 0 for t in tasks}
    unlocks = {t: [] for t in tasks}
    for task, prereq in depends_on:
        waiting[task] += 1
        unlocks[prereq].append(task)
    ready = deque(t for t in tasks if waiting[t] == 0)
    order = []
    while ready:
        t = ready.popleft()
        order.append(t)
        for nxt in unlocks[t]:
            waiting[nxt] -= 1
            if waiting[nxt] == 0:
                ready.append(nxt)
    if len(order) < len(tasks):
        raise ValueError("circular dependency!")   # some tasks wait on each other forever
    return order
```

If some tasks never reach a count of 0, they're waiting on each other: a **cycle** — a circular dependency.

> [!EXAMPLE] **Where topological sorting runs every day:** `npm install` and `pip` installing packages in dependency order; build systems like Bazel and Gradle; spreadsheets recalculating cells in the right order after you change one; data pipeline tools like Airflow scheduling jobs; and package managers refusing to install when they detect a circular dependency.

## 6. Connecting everything at the lowest cost: minimum spanning trees

A telecom company needs to connect 50 towns with fiber cable. Every possible link has a cost. Which links should it build so that **every town is connected**, at the **lowest total cost**? (It doesn't need every town directly linked to every other — just connected somehow.)

That's a **minimum spanning tree (MST)**: a set of edges that connects every vertex with no cycles and the smallest total weight.

**Kruskal's algorithm** is beautifully simple:

1. Sort all possible links from cheapest to most expensive.
2. Go through them in order. Add a link **unless it connects two towns that are already connected** (it would be redundant). Union-find (DSA track, chapter 6) answers "already connected?" instantly.

```python
def cheapest_network(n_towns, links):           # links = [(cost, town_a, town_b), ...]
    groups = UnionFind(n_towns)                 # from the DSA chapter
    chosen, total = [], 0
    for cost, a, b in sorted(links):
        if groups.union(a, b):                  # False if a and b were already connected
            chosen.append((a, b)); total += cost
    return total, chosen
```

**Prim's algorithm** does the same job by growing one connected network from a starting town, always adding the cheapest link that reaches a new town.

Beyond cables and pipelines, MSTs are used to **cluster** data (build the MST, then remove the most expensive links to split it into groups) and as a step in approximating harder problems like the traveling salesman.

## 7. Finding weak points: bridges and articulation points

In a network, a **bridge** is a link whose failure would split the network in two; an **articulation point** is a node whose failure would. Finding them tells you where a single failure would disconnect users. A variation of DFS (Tarjan's algorithm) finds all of them in one O(V + E) pass.

> [!EXAMPLE] Network and infrastructure teams run this kind of analysis on their topology to find **single points of failure**: the one router, data center link or undersea cable whose loss would cut off a region. The same problem appears in interviews as "critical connections in a network".

## Which algorithm should I use?

| Situation | Algorithm | Cost |
|---|---|---|
| Every step costs the same | BFS | O(V + E) |
| Non-negative weights, one start | Dijkstra | O((V + E) log V) |
| Non-negative weights, one known goal, good estimate | A* | ≤ Dijkstra |
| Negative weights, or detect negative cycles | Bellman-Ford | O(V · E) |
| Shortest paths between all pairs, small graph | Floyd-Warshall | O(V³) |
| Order tasks with dependencies | Topological sort (Kahn's) | O(V + E) |
| Connect everything as cheaply as possible | Kruskal / Prim | O(E log E) |
| Find single points of failure | Bridges / articulation points (DFS) | O(V + E) |

> [!RECAP]
> - **BFS** finds fewest-step paths; multi-source BFS handles "nearest of many".
> - **Dijkstra** finds fastest routes with non-negative weights by finalizing the closest place first; **A\*** adds a direction estimate to explore less.
> - **Bellman-Ford** handles negative weights and detects negative cycles.
> - **Topological sort** orders dependent tasks and detects circular dependencies.
> - **Minimum spanning trees** (Kruskal with union-find, or Prim) connect everything at minimum cost.
> - **Bridges and articulation points** reveal single points of failure.

> [!INTERVIEW] Most-asked graph problems: number of islands, course schedule (topological sort / cycle detection), rotting oranges (multi-source BFS), word ladder (BFS), network delay time (Dijkstra), cheapest flights within K stops (Bellman-Ford-style), connect all points at minimum cost (MST), redundant connection (union-find), critical connections (bridges). Name the algorithm, justify it (weights? negative weights? dependencies?), and state the cost.

::quiz {"q":"Why can Dijkstra's algorithm give wrong answers when some edges have negative weights?","options":["The heap can't store negative numbers","It finalizes the closest unfinished place, assuming no later path can be shorter — a negative edge breaks that assumption","It loops forever","It only works on trees"],"answer":1,"explain":"Its correctness argument depends on non-negative weights."}

::quiz {"q":"Kahn's algorithm ends with fewer tasks in its order than there are tasks. What does that mean?","options":["The graph is disconnected","There's a circular dependency","Some tasks are optional","The algorithm has a bug"],"answer":1,"explain":"Tasks in a cycle never reach zero unfinished prerequisites."}

::quiz {"q":"Which algorithm finds the cheapest set of cables that connects every office?","options":["Dijkstra","Topological sort","Minimum spanning tree (Kruskal or Prim)","BFS"],"answer":2,"explain":"Connecting all vertices at minimum total edge weight is exactly the MST problem."}
