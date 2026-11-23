---
title: Computational Geometry Basics
summary: Algorithms for points, lines and shapes — the cross product and orientation test that answer most questions, checking whether segments intersect, polygon area with the shoelace formula, point-in-polygon tests, convex hulls, closest pairs, distances on the Earth's surface, and spatial indexes (grids, quadtrees, geohashes) that power maps, ride-hailing and games.
---

## Which drivers are near me?

> [!STORY] When you open a ride-hailing app, it shows the cars around you within a second or two. Behind that: tens of thousands of drivers in a city sending their location every few seconds, and millions of riders asking "who's within 2 km of this point?". Checking the distance to every driver for every request would be far too slow. The app also needs to know whether your pickup point is inside an airport zone with special rules, and the shortest way around a lake. All of these are **computational geometry** problems — and a surprising number of them start with one tiny calculation: the cross product.

## Points, vectors and the one operation you need

Represent a point as (x, y). The vector from A to B is (Bx − Ax, By − Ay).

The **cross product** of two 2D vectors u and v is a single number:

```python
def cross(o, a, b):
    """Cross product of OA and OB. > 0: O→A→B turns left (counter-clockwise);
    < 0: turns right (clockwise); 0: the three points are on one line."""
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
```

> [!ANALOGY] Walking from point O to A, then turning towards B. Do you turn left, turn right, or keep going straight? The sign of the cross product tells you — and "which way do I turn?" turns out to answer most geometry questions.

Its absolute value is also **twice the area** of triangle OAB.

The **dot product** `u·v = ux·vx + uy·vy` tells you about angles: positive if the vectors point roughly the same way, zero if perpendicular, negative if opposite. Used for "is the target in front of the player?" in games and lighting in graphics.

> [!WARN] Floating-point rounding (Architecture track, chapter 1) makes "exactly zero" checks unreliable. Use integers when coordinates allow, or compare with a small tolerance (`abs(x) < 1e-9`). Many geometry bugs are precision bugs.

## Do two segments intersect?

Segments AB and CD cross if A and B are on **opposite sides** of line CD, **and** C and D are on opposite sides of line AB — each checked with the sign of a cross product (plus special handling when points are collinear and overlap).

```python
def segments_intersect(a, b, c, d):
    d1, d2 = cross(c, d, a), cross(c, d, b)
    d3, d4 = cross(a, b, c), cross(a, b, d)
    if ((d1 > 0) != (d2 > 0)) and d1 != 0 and d2 != 0 and \
       ((d3 > 0) != (d4 > 0)) and d3 != 0 and d4 != 0:
        return True
    def on_seg(p, q, r):   # r collinear with pq and within its bounding box
        return min(p[0], q[0]) <= r[0] <= max(p[0], q[0]) and min(p[1], q[1]) <= r[1] <= max(p[1], q[1])
    return (d1 == 0 and on_seg(c, d, a)) or (d2 == 0 and on_seg(c, d, b)) or \
           (d3 == 0 and on_seg(a, b, c)) or (d4 == 0 and on_seg(a, b, d))
```

Used for detecting crossing roads in map data, collisions in games, and whether a planned path crosses a restricted boundary.

## Polygon area: the shoelace formula

For a polygon with vertices listed in order, sum the cross products of consecutive vertices:

```python
def polygon_area(pts):
    s = 0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2
# The sign of s (before abs) tells you whether the vertices go counter-clockwise (+) or clockwise (−).
```

Named for the criss-cross pattern of multiplication, like lacing a shoe. Used for land plot areas, building footprints and checking polygon orientation in map data.

## Is a point inside a polygon?

**Ray casting:** draw a ray from the point in any direction (say, to the right) and count how many polygon edges it crosses. **Odd = inside, even = outside.**

> [!ANALOGY] Walking in a straight line from inside a fenced field towards the horizon. Every time you climb over the fence, you switch between inside and outside. Count the climbs: odd means you started inside.

```python
def point_in_polygon(p, poly):
    x, y = p
    inside = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % len(poly)]
        if (y1 > y) != (y2 > y):                               # edge spans the ray's height
            x_cross = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < x_cross:
                inside = not inside
    return inside
```

This is **geofencing**: is this delivery address inside the service zone? Is this rider inside the airport pickup area? Has this truck left its allowed region?

## Convex hull: the rubber band

The **convex hull** of a set of points is the smallest convex polygon containing them all — imagine stretching a rubber band around nails on a board and letting it snap tight.

::widget Stepper {"type":"flow","cols":3,"title":"Building a convex hull with Andrew's monotone chain","what":"How the convex hull of scattered points is built in O(n log n): sort the points, then build the lower and upper boundaries using left/right turn checks.","steps":["Press Play and follow the construction.","Notice the single test used throughout: does the boundary turn left or right?","Find why each point is added and removed at most once."],"nodes":[["Sort the points","Sort by x (then y). This is the O(n log n) step."],["Build the lower hull","Go left to right, adding each point to a stack. While the last two points on the stack and the new point make a RIGHT turn (cross ≤ 0), pop the middle point — it's inside the hull."],["Build the upper hull","Go right to left with the same rule, building the top boundary."],["Join them","Combine the lower and upper hulls, dropping the duplicate end points. Each point is pushed and popped at most once per pass, so this part is O(n)."],["Result","The vertices of the convex hull in counter-clockwise order — the 'rubber band'."],["Uses","Collision detection (simple outer shapes), the farthest pair of points, outlining a cluster on a map, robot path planning, and image processing."]]}

```python
def convex_hull(points):
    pts = sorted(set(points))
    if len(pts) <= 2: return pts
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0: lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0: upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]
```

## Closest pair of points

Checking every pair is O(n²). A **divide-and-conquer** algorithm does it in O(n log n): split the points by x, solve each half, then check only points within the current best distance of the dividing line — and each such point needs comparing with only a handful of neighbors. In practice, a **grid** (below) often does it as well.

## Distances on a real map

On a flat grid, distance is √(Δx² + Δy²) (Euclidean) or |Δx| + |Δy| (**Manhattan** — city blocks). But latitude and longitude are on a **sphere**: one degree of longitude is ~111 km at the equator and ~0 km at the poles. Use the **haversine** formula for great-circle distance:

```python
from math import radians, sin, cos, asin, sqrt

def haversine_km(lat1, lon1, lat2, lon2):
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))       # Earth's radius ≈ 6,371 km

haversine_km(18.52, 73.86, 19.08, 72.88)   # Pune → Mumbai ≈ 120 km in a straight line
```

Road distance needs a graph shortest-path algorithm on the road network (chapter 4 — Dijkstra, A*).

## Spatial indexes: answering "what's near here?"

The ride-hailing question needs an index that groups nearby things together.

- **Uniform grid:** divide the map into cells (say 500 m squares); each driver is listed in its cell. A nearby search checks the rider's cell and its neighbors. Simple and fast when density is even.
- **Quadtree:** recursively split a square into four whenever it holds too many points — fine cells downtown, coarse cells in the countryside.
- **Geohash:** interleave the bits of latitude and longitude into a string like `tdr1y` — nearby places usually share a prefix, so ordinary sorted indexes and prefix searches find neighbors (Redis `GEOSEARCH` uses a geohash-like encoding).
- **S2 (Google) and H3 (Uber):** divide the sphere into hierarchical cells — S2 uses squares projected from a cube, H3 uses **hexagons**, whose neighbors are all equally far away (handy for surge-pricing zones and demand heatmaps).
- **R-trees:** group nearby shapes (rectangles, polygons) into nested bounding boxes — used by PostGIS, SQLite's spatial extension and most GIS databases.

> [!EXAMPLE] **"Drivers within 2 km", end to end.** Drivers' locations update a map from H3 cell → set of drivers. For a rider, compute their cell, gather the cell and its rings of neighbors covering 2 km, and filter candidates by exact haversine distance. Then rank by **estimated travel time** on the road network, not straight-line distance. The System Design track's ride-hailing case study builds on this.

> [!RECAP]
> - The **cross product** gives orientation (left/right/straight) and area; the **dot product** gives angle relationships. Watch floating-point precision.
> - **Segment intersection** = two orientation checks each way, plus collinear cases.
> - **Shoelace formula** for polygon area; **ray casting** for point-in-polygon (geofencing).
> - **Convex hull** in O(n log n) with the monotone chain; closest pair in O(n log n).
> - Use **haversine** for distances on Earth; road distance needs graph search.
> - **Spatial indexes** — grids, quadtrees, geohashes, S2/H3, R-trees — make "what's near here?" fast.

> [!INTERVIEW] Geometry appears in "K closest points to origin" (heap), rectangle overlap and area, valid square, max points on a line (slopes via GCD), and in design rounds for proximity search (geohash, quadtree, H3) — e.g. designing Uber or Yelp.

::quiz {"q":"What does the sign of the cross product of OA and OB tell you?","options":["The distance between A and B","Whether going O→A→B turns left, right, or goes straight","The angle in degrees","Whether the points are integers"],"answer":1,"explain":"Positive = counter-clockwise (left), negative = clockwise (right), zero = collinear."}

::quiz {"q":"A ray from a point crosses a polygon's edges 3 times. Where is the point?","options":["Outside","Inside","On the edge","Unknown"],"answer":1,"explain":"Odd number of crossings means inside."}

::quiz {"q":"Why can't you use plain Euclidean distance on latitude/longitude for long distances?","options":["It's too slow","The Earth is a sphere — degrees of longitude shrink toward the poles; use the haversine formula","Coordinates are negative","GPS is inaccurate"],"answer":1,"explain":"Great-circle distance accounts for the curvature."}
