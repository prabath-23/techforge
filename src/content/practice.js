// Practice bank. Problems point to their LeetCode number; hints, approach and complexity are our own.
// p(id, title, lc, difficulty, pattern, [hints...], approach, complexity, chapter?)
const p = (id, title, lc, diff, pattern, hints, approach, cx, read) => ({ id, title, lc, diff, pattern, hints, approach, cx, read })

export const PATTERNS = [
  'Arrays & hashing', 'Two pointers', 'Sliding window', 'Stack & monotonic stack', 'Binary search',
  'Linked lists', 'Trees', 'Heaps', 'Graphs', 'Backtracking', 'Dynamic programming', 'Greedy & intervals', 'Design',
]

export const PROBLEMS = [
  // Arrays & hashing
  p('two-sum', 'Two Sum', 1, 'Easy', 'Arrays & hashing', ['For each number you need exactly one partner: target − x.', 'What structure answers "have I seen this value?" in O(1)?'], 'One pass with a hash map value → index. For each x, check if target − x is in the map; otherwise store x. Check before inserting so an element is never paired with itself.', 'O(n) time, O(n) space', 'algorithms/solving-interview-problems'),
  p('group-anagrams', 'Group Anagrams', 49, 'Medium', 'Arrays & hashing', ['Anagrams share something you can use as a key.', 'Sorted letters, or a 26-count tuple.'], 'Map from a canonical key (sorted string or letter-count tuple) to a list of words; return the map\'s values.', 'O(n·k log k) with sorting, O(n·k) with counts', 'dsa/hash-tables'),
  p('top-k-frequent', 'Top K Frequent Elements', 347, 'Medium', 'Arrays & hashing', ['Count first.', 'You don\'t need a full sort: a size-k heap, or buckets indexed by frequency.'], 'Count with a hash map, then bucket sort: bucket[f] = numbers with frequency f; walk buckets from high to low until k are collected.', 'O(n) with buckets (O(n log k) with a heap)', 'dsa/heaps-and-tries'),
  p('product-except-self', 'Product of Array Except Self', 238, 'Medium', 'Arrays & hashing', ['No division. Each answer = (product of everything left) × (product of everything right).', 'Two passes: prefix products, then suffix products.'], 'First pass writes prefix products into the output; second pass from the right multiplies by a running suffix product.', 'O(n) time, O(1) extra space'),
  p('longest-consecutive', 'Longest Consecutive Sequence', 128, 'Medium', 'Arrays & hashing', ['Sorting is O(n log n), can a set do better?', 'Only start counting from numbers that have no predecessor (x − 1 not in set).'], 'Put all numbers in a set. For each x where x − 1 is absent, count x, x+1, x+2… while present. Each number is visited a constant number of times.', 'O(n)'),
  p('subarray-sum-k', 'Subarray Sum Equals K', 560, 'Medium', 'Arrays & hashing', ['A subarray sum is prefix[j] − prefix[i].', 'Count how many earlier prefixes equal current − k.'], 'Running prefix sum with a hash map of prefix → count (starting {0: 1}). At each step add count[prefix − k] to the answer, then record prefix.', 'O(n)', 'dsa/arrays-strings-lists'),

  // Two pointers
  p('valid-palindrome', 'Valid Palindrome', 125, 'Easy', 'Two pointers', ['Compare from both ends.', 'Skip non-alphanumeric characters and compare lowercase.'], 'Left and right pointers moving inward, skipping non-alphanumerics; return false on the first mismatch.', 'O(n), O(1) space'),
  p('three-sum', '3Sum', 15, 'Medium', 'Two pointers', ['Sort first.', 'Fix one number, then solve two-sum on the rest with two pointers; skip duplicates.'], 'Sort; for each i (skipping duplicate values), run two pointers on i+1..n−1 looking for −nums[i]; move pointers past duplicates after each match.', 'O(n²)', 'algorithms/searching-two-pointers-windows'),
  p('container-water', 'Container With Most Water', 11, 'Medium', 'Two pointers', ['Start with the widest container.', 'Moving the taller side can never help, why?'], 'Pointers at both ends; area = width × min height; always move the shorter side inward, tracking the best area.', 'O(n)'),
  p('trapping-rain', 'Trapping Rain Water', 42, 'Hard', 'Two pointers', ['Water above i = min(max left, max right) − height[i].', 'With two pointers, the side with the smaller max is already determined.'], 'Two pointers with leftMax and rightMax; process the side whose max is smaller, adding max − height, and move it inward.', 'O(n), O(1) space'),

  // Sliding window
  p('best-time-stock', 'Best Time to Buy and Sell Stock', 121, 'Easy', 'Sliding window', ['Track the cheapest price so far.', 'Profit today = price − cheapest so far.'], 'One pass keeping the minimum price seen and the best difference.', 'O(n)'),
  p('longest-no-repeat', 'Longest Substring Without Repeating Characters', 3, 'Medium', 'Sliding window', ['Grow the window right; when a character repeats, jump the left edge.', 'Store each character\'s last index; left = max(left, last[c] + 1).'], 'Sliding window with a last-seen map; update the best length at each step.', 'O(n)', 'algorithms/searching-two-pointers-windows'),
  p('char-replacement', 'Longest Repeating Character Replacement', 424, 'Medium', 'Sliding window', ['Window is valid if length − (count of most frequent char) ≤ k.', 'You never need to decrease the max count.'], 'Expand right, update counts and maxCount; while window − maxCount > k, shrink from the left.', 'O(n)'),
  p('min-window', 'Minimum Window Substring', 76, 'Hard', 'Sliding window', ['Count what you need; track how many requirements are currently satisfied.', 'Expand until valid, then shrink while still valid.'], 'Need-count map + "formed" counter. Expand right; when all requirements are met, shrink left recording the smallest window.', 'O(n + m)'),
  p('sliding-max', 'Sliding Window Maximum', 239, 'Hard', 'Sliding window', ['A heap works but is O(n log k).', 'Keep a deque of indices with decreasing values.'], 'Monotonic deque: pop expired indices from the front, pop smaller values from the back, push i; front is the max.', 'O(n)', 'algorithms/advanced-patterns-deque-scc-strings'),

  // Stack
  p('valid-parens', 'Valid Parentheses', 20, 'Easy', 'Stack & monotonic stack', ['The most recent open bracket must close first.', 'Push opens; on a close, check the top.'], 'Stack of expected closers; mismatch or leftover items mean invalid.', 'O(n)', 'dsa/arrays-strings-lists'),
  p('min-stack', 'Min Stack', 155, 'Medium', 'Stack & monotonic stack', ['Each level can remember the minimum below it.'], 'Second stack holding the minimum so far at each level (or push pairs).', 'O(1) per operation', 'dsa/design-a-data-structure'),
  p('daily-temps', 'Daily Temperatures', 739, 'Medium', 'Stack & monotonic stack', ['For each day, the next warmer day.', 'Keep a stack of days still waiting for an answer (temperatures decreasing).'], 'Monotonic decreasing stack of indices; when a warmer day arrives, pop and fill answers.', 'O(n)'),
  p('largest-rect', 'Largest Rectangle in Histogram', 84, 'Hard', 'Stack & monotonic stack', ['For each bar, how far can it extend left and right while being the shortest?', 'An increasing stack finds both boundaries when a bar is popped.'], 'Increasing stack of indices; when the current bar is lower, pop and compute area with width between the new top and current index. Add a sentinel 0 at the end.', 'O(n)'),

  // Binary search
  p('binary-search', 'Binary Search', 704, 'Easy', 'Binary search', ['Keep an interval that must contain the answer.', 'Be precise about lo ≤ hi and mid ± 1.'], 'Classic lo/hi loop; compare mid and discard half.', 'O(log n)', 'algorithms/searching-two-pointers-windows'),
  p('rotated-search', 'Search in Rotated Sorted Array', 33, 'Medium', 'Binary search', ['One half around mid is always sorted.', 'Check whether the target lies in the sorted half.'], 'At each step decide which side is sorted (nums[lo] ≤ nums[mid]) and whether the target is within it; discard the other half.', 'O(log n)'),
  p('koko', 'Koko Eating Bananas', 875, 'Medium', 'Binary search', ['Binary search the answer (speed), not the array.', 'Feasibility: hours(speed) = Σ ceil(pile / speed) ≤ h.'], 'Search speeds 1..max(pile) for the smallest feasible one.', 'O(n log max)', 'algorithms/searching-two-pointers-windows'),
  p('median-two', 'Median of Two Sorted Arrays', 4, 'Hard', 'Binary search', ['Binary search a partition of the shorter array.', 'Left halves must all be ≤ right halves.'], 'Partition A at i and B at (m+n+1)/2 − i; adjust i until maxLeft ≤ minRight on both sides; median from the boundary values.', 'O(log min(m, n))'),

  // Linked lists
  p('reverse-list', 'Reverse Linked List', 206, 'Easy', 'Linked lists', ['Three pointers: prev, cur, next.'], 'Iterate, pointing each node back to prev.', 'O(n), O(1) space', 'dsa/arrays-strings-lists'),
  p('cycle', 'Linked List Cycle', 141, 'Easy', 'Linked lists', ['Two runners at different speeds.'], 'Floyd\'s fast/slow pointers meet iff there is a cycle.', 'O(n), O(1) space', 'dsa/arrays-strings-lists'),
  p('merge-k', 'Merge k Sorted Lists', 23, 'Hard', 'Linked lists', ['Always take the smallest head among k lists.', 'A min-heap of the current heads.'], 'Push each list head into a heap; pop the smallest, append, push its next.', 'O(N log k)', 'dsa/heaps-and-tries'),
  p('lru', 'LRU Cache', 146, 'Medium', 'Linked lists', ['O(1) lookup → hash map. O(1) recency updates → doubly linked list.'], 'Map key → node; on get/put move the node to the front; evict the tail when over capacity. Use sentinel head/tail.', 'O(1) per operation', 'lld/case-studies-services-and-libraries'),

  // Trees
  p('max-depth', 'Maximum Depth of Binary Tree', 104, 'Easy', 'Trees', ['Depth = 1 + max(depth of children).'], 'Recursive DFS (or BFS by levels).', 'O(n)', 'dsa/trees'),
  p('validate-bst', 'Validate Binary Search Tree', 98, 'Medium', 'Trees', ['Checking only parent–child isn\'t enough.', 'Pass down a valid (low, high) range.'], 'DFS with bounds: each node must lie strictly within (low, high); left gets (low, node), right gets (node, high). Or check in-order is strictly increasing.', 'O(n)', 'dsa/trees'),
  p('lca', 'Lowest Common Ancestor of a Binary Tree', 236, 'Medium', 'Trees', ['If p and q are found in different subtrees, the current node is the answer.'], 'Recursive: return the node if it is p or q; combine results from left and right, both non-null means current node is the LCA.', 'O(n)'),
  p('level-order', 'Binary Tree Level Order Traversal', 102, 'Medium', 'Trees', ['BFS with a queue.', 'Process one level at a time using the queue\'s size.'], 'Queue; for each level, pop len(queue) nodes and push their children.', 'O(n)', 'dsa/trees'),
  p('max-path', 'Binary Tree Maximum Path Sum', 124, 'Hard', 'Trees', ['At each node: best path going down one side (returned) vs best path through the node (recorded).', 'Ignore negative branches with max(0, …).'], 'DFS returns node.val + max(0, left, right) upward; update a global best with node.val + max(0,left) + max(0,right).', 'O(n)', 'algorithms/advanced-dynamic-programming'),
  p('serialize', 'Serialize and Deserialize Binary Tree', 297, 'Hard', 'Trees', ['Pre-order with null markers is enough to rebuild.'], 'Pre-order DFS writing values and "#" for nulls; rebuild by consuming tokens recursively in the same order.', 'O(n)'),

  // Heaps
  p('kth-largest', 'Kth Largest Element in an Array', 215, 'Medium', 'Heaps', ['A min-heap of size k keeps the k largest.', 'Or quickselect for expected O(n).'], 'Min-heap of size k (top is the answer), or quickselect around random pivots.', 'O(n log k) or expected O(n)', 'algorithms/randomized-algorithms'),
  p('median-stream', 'Find Median from Data Stream', 295, 'Hard', 'Heaps', ['Split numbers into a lower and an upper half.', 'Max-heap for the lower half, min-heap for the upper; keep sizes balanced.'], 'Two heaps; after each insert rebalance so sizes differ by at most one; median from the tops.', 'O(log n) add, O(1) median', 'dsa/design-a-data-structure'),
  p('task-scheduler', 'Task Scheduler', 621, 'Medium', 'Heaps', ['The most frequent task determines the frame.', 'Formula: (maxCount − 1) × (n + 1) + number of tasks with maxCount.'], 'Answer = max(len(tasks), (maxFreq − 1)(n + 1) + countOfMaxFreq). A heap simulation also works.', 'O(n)'),

  // Graphs
  p('num-islands', 'Number of Islands', 200, 'Medium', 'Graphs', ['Each unvisited land cell starts a new island.', 'Flood-fill it with DFS/BFS.'], 'Scan the grid; on land, increment the count and DFS/BFS to mark the whole island visited.', 'O(rows × cols)', 'dsa/graphs-and-union-find'),
  p('course-schedule', 'Course Schedule', 207, 'Medium', 'Graphs', ['Prerequisites form a directed graph; you need to know if it has a cycle.', 'Kahn\'s algorithm: repeatedly take courses with in-degree 0.'], 'Topological sort with in-degrees; if fewer than n courses are processed, there is a cycle.', 'O(V + E)', 'dsa/graphs-and-union-find'),
  p('rotting-oranges', 'Rotting Oranges', 994, 'Medium', 'Graphs', ['All rotten oranges spread at the same time.', 'Multi-source BFS, counting levels as minutes.'], 'Queue every rotten orange initially; BFS level by level; answer is the number of levels, or −1 if fresh oranges remain.', 'O(rows × cols)'),
  p('network-delay', 'Network Delay Time', 743, 'Medium', 'Graphs', ['Weighted shortest paths from one source.', 'Dijkstra; the answer is the largest shortest distance.'], 'Dijkstra with a min-heap from k; if some node is unreachable return −1, else max distance.', 'O(E log V)', 'algorithms/graph-algorithms'),
  p('redundant-conn', 'Redundant Connection', 684, 'Medium', 'Graphs', ['The first edge that connects two already-connected nodes closes a cycle.'], 'Union-find; for each edge, if find(u) == find(v) return it, else union.', 'O(E α(V))', 'dsa/graphs-and-union-find'),
  p('word-ladder', 'Word Ladder', 127, 'Hard', 'Graphs', ['Words are nodes; one-letter changes are edges.', 'BFS for fewest steps; generic patterns like h*t speed up neighbour lookup.'], 'Precompute pattern → words; BFS from beginWord counting levels until endWord.', 'O(N × L²)'),
  p('critical-connections', 'Critical Connections in a Network', 1192, 'Hard', 'Graphs', ['These are bridges.', 'DFS with discovery times and low-link values.'], 'Tarjan bridge-finding: edge (v, c) is critical if low[c] > tin[v].', 'O(V + E)', 'algorithms/advanced-patterns-deque-scc-strings'),

  // Backtracking
  p('subsets', 'Subsets', 78, 'Medium', 'Backtracking', ['Each element is in or out.'], 'Recursive choose/skip, or iterate bitmasks 0..2ⁿ−1.', 'O(n · 2ⁿ)', 'algorithms/backtracking-strings-bits'),
  p('permutations', 'Permutations', 46, 'Medium', 'Backtracking', ['Pick an unused element for each position, then undo.'], 'Backtrack with a used[] array (or in-place swaps).', 'O(n · n!)'),
  p('combination-sum', 'Combination Sum', 39, 'Medium', 'Backtracking', ['Allow reuse by not advancing the start index after choosing.', 'Stop when the remaining target goes negative.'], 'DFS(start, remaining): for i from start, choose candidates[i] and recurse with i (reuse allowed).', 'exponential, pruned'),
  p('n-queens', 'N-Queens', 51, 'Hard', 'Backtracking', ['One queen per row.', 'Sets for used columns, r − c diagonals and r + c anti-diagonals give O(1) checks.'], 'Place row by row; skip attacked columns; undo on return.', 'O(n!) pruned', 'algorithms/backtracking-strings-bits'),

  // DP
  p('climbing-stairs', 'Climbing Stairs', 70, 'Easy', 'Dynamic programming', ['ways(n) = ways(n − 1) + ways(n − 2).'], 'Fibonacci-style DP with two variables.', 'O(n), O(1) space', 'algorithms/dynamic-programming'),
  p('house-robber', 'House Robber', 198, 'Medium', 'Dynamic programming', ['At each house: rob it (plus best two back) or skip it (best one back).'], 'dp[i] = max(dp[i−1], dp[i−2] + nums[i]) with two rolling variables.', 'O(n)'),
  p('coin-change', 'Coin Change', 322, 'Medium', 'Dynamic programming', ['Greedy fails for some coin sets.', 'dp[x] = 1 + min(dp[x − coin]).'], 'Bottom-up over amounts 0..target; unreachable stays infinity → −1.', 'O(amount × coins)', 'algorithms/dynamic-programming'),
  p('lis', 'Longest Increasing Subsequence', 300, 'Medium', 'Dynamic programming', ['O(n²): lis[i] = 1 + max(lis[j]) for smaller earlier values.', 'O(n log n): tails array + binary search.'], 'Maintain tails[k] = smallest tail of an increasing subsequence of length k+1; bisect_left and replace.', 'O(n log n)', 'algorithms/advanced-dynamic-programming'),
  p('lcs', 'Longest Common Subsequence', 1143, 'Medium', 'Dynamic programming', ['2-D table over prefixes of both strings.', 'Equal chars extend the diagonal; otherwise take the max of skipping either.'], 'dp[i][j] = dp[i−1][j−1] + 1 if equal else max(dp[i−1][j], dp[i][j−1]).', 'O(m·n)'),
  p('edit-distance', 'Edit Distance', 72, 'Medium', 'Dynamic programming', ['Three operations map to three neighbouring cells.'], 'dp[i][j] = dp[i−1][j−1] if equal, else 1 + min(insert, delete, replace).', 'O(m·n)', 'algorithms/dynamic-programming'),
  p('partition-subset', 'Partition Equal Subset Sum', 416, 'Medium', 'Dynamic programming', ['Find a subset summing to total / 2.', '0/1 knapsack with booleans; iterate capacity downward.'], 'If total is odd → false. Boolean dp over sums, updating from high to low for each number.', 'O(n × sum)', 'algorithms/advanced-dynamic-programming'),
  p('word-break', 'Word Break', 139, 'Medium', 'Dynamic programming', ['dp[i] = can the first i characters be segmented?'], 'dp[0] = true; dp[i] = any(dp[j] and s[j:i] in dict).', 'O(n² ) with a set (bounded by max word length)'),
  p('burst-balloons', 'Burst Balloons', 312, 'Hard', 'Dynamic programming', ['Think about which balloon in a range bursts LAST.', 'Interval DP over (i, j).'], 'Pad with 1s; dp[i][j] = max over k of dp[i][k] + dp[k][j] + v[i]·v[k]·v[j]; fill by increasing length.', 'O(n³)', 'algorithms/advanced-dynamic-programming'),

  // Greedy & intervals
  p('merge-intervals', 'Merge Intervals', 56, 'Medium', 'Greedy & intervals', ['Sort by start.', 'Extend the last merged interval while they overlap.'], 'Sort; if current.start ≤ last.end then last.end = max(last.end, current.end) else append.', 'O(n log n)', 'algorithms/intervals-and-sweep-lines'),
  p('meeting-rooms-2', 'Meeting Rooms II', 253, 'Medium', 'Greedy & intervals', ['Count overlaps at the busiest moment.', 'Sweep sorted start/end events, or a min-heap of end times.'], 'Sort by start; min-heap of end times; pop when the earliest end ≤ new start; heap size = rooms.', 'O(n log n)', 'algorithms/intervals-and-sweep-lines'),
  p('non-overlapping', 'Non-overlapping Intervals', 435, 'Medium', 'Greedy & intervals', ['Keep the interval that ends earliest.'], 'Sort by end; greedily keep intervals that start after the last kept end; answer = n − kept.', 'O(n log n)', 'algorithms/greedy'),
  p('jump-game', 'Jump Game', 55, 'Medium', 'Greedy & intervals', ['Track the furthest index reachable so far.'], 'Scan; if i > furthest return false; furthest = max(furthest, i + nums[i]).', 'O(n)'),
  p('gas-station', 'Gas Station', 134, 'Medium', 'Greedy & intervals', ['If total gas ≥ total cost a solution exists.', 'When the running tank goes negative, start after this station.'], 'One pass with total and current tank; reset start when current < 0.', 'O(n)'),

  // Design
  p('randomized-set', 'Insert Delete GetRandom O(1)', 380, 'Medium', 'Design', ['Array for random access, hash map for positions.', 'Delete by swapping with the last element.'], 'vals[] + pos{}; remove swaps with last, updates its index, pops.', 'O(1) average', 'dsa/design-a-data-structure'),
  p('lfu', 'LFU Cache', 460, 'Hard', 'Design', ['Group keys by frequency, each group in LRU order.', 'Track the minimum frequency.'], 'key → (value, freq); freq → ordered dict; minFreq. On access move key to freq+1; evict from minFreq on overflow.', 'O(1) per operation', 'dsa/design-a-data-structure'),
  p('time-map', 'Time Based Key-Value Store', 981, 'Medium', 'Design', ['Timestamps per key arrive in increasing order.'], 'key → list of (timestamp, value); get uses binary search for the last timestamp ≤ t.', 'O(1) set, O(log n) get', 'dsa/design-a-data-structure'),
  p('design-twitter', 'Design Twitter', 355, 'Medium', 'Design', ['Feed = merge of followees\' recent tweets.', 'Max-heap keyed by time, k-way merge for 10 items.'], 'followees set per user; tweets list per user with global time; heap merge of each followee\'s latest tweets.', 'O(k log k) per feed', 'dsa/design-a-data-structure'),
  p('trie', 'Implement Trie (Prefix Tree)', 208, 'Medium', 'Design', ['Each node maps a character to a child and marks word ends.'], 'Nested nodes with children map + isEnd flag; insert/search/startsWith walk character by character.', 'O(L) per operation', 'dsa/heaps-and-tries'),
]

// System design rehearsal: you write each section before revealing the model answer.
export const DESIGN_SECTIONS = [
  { id: 'req', label: 'Requirements', hint: 'Functional features, non-functional goals (latency, availability, consistency), and what is out of scope.' },
  { id: 'est', label: 'Estimates', hint: 'Users, requests per second (avg and peak), storage per item and in total, bandwidth.' },
  { id: 'api', label: 'API', hint: 'The main endpoints or messages, with key parameters.' },
  { id: 'data', label: 'Data model & storage', hint: 'Entities, keys, which database and why, partitioning.' },
  { id: 'hld', label: 'High-level design', hint: 'Components and the main read and write paths.' },
  { id: 'deep', label: 'Deep dives', hint: 'The 1–2 hardest parts: hot keys, consistency, fan-out, ordering, failure handling.' },
  { id: 'scale', label: 'Bottlenecks & trade-offs', hint: 'What breaks first, how you would scale it, and what you traded away.' },
]

const d = (id, title, prompt, read, model) => ({ id, title, prompt, read, model })
export const DESIGNS = [
  d('url', 'URL shortener', 'Design a service like bit.ly: create short links, redirect fast, optional custom aliases and expiry, click analytics.', 'system-design/case-studies', {
    req: 'Shorten, redirect, custom alias, expiry, click counts. Redirect p99 < 50 ms, highly available; analytics may lag; links never collide.',
    est: '100M new links/month ≈ 40 writes/s; 100:1 reads ≈ 4k redirects/s (peak ~10k). 5 years × 1.2B × 500 B ≈ 3 TB.',
    api: 'POST /links {url, alias?, expiresAt?} → {code}; GET /{code} → 302 Location; GET /links/{code}/stats.',
    data: 'links(code PK, long_url, owner, created, expires). Key-value or SQL sharded by hash(code). Clicks as events to a stream → aggregated tables.',
    hld: 'Write API → ID range allocator (ZooKeeper) → base62 code → DB. Redirect API → Redis cache → DB on miss → 302. Click event to Kafka → analytics workers.',
    deep: 'IDs: counter ranges per server, base62 7 chars (3.5 trillion). Aliases via conditional insert. Hot links absorbed by cache/CDN. 302 (not 301) so clicks are counted.',
    scale: 'Cache hit rate drives cost; DB writes are tiny. Trade-off: 302 adds origin load vs 301 caching. Expiry by lazy check + background cleanup; never reuse codes.',
  }),
  d('chat', 'Chat system (WhatsApp)', 'Design 1:1 and group chat with online presence, delivery receipts, offline delivery and multi-device sync.', 'system-design/case-studies-ii', {
    req: 'Send/receive 1:1 and groups (≤ 500), ordering per chat, sent/delivered/read receipts, offline push, history sync, multi-device.',
    est: '500M DAU × 40 msgs = 20B/day ≈ 230k msgs/s avg; 100 B each → 2 TB/day of messages.',
    api: 'WebSocket: send{chatId, clientMsgId, body}, ack{seq}, deliver{…}, receipt{…}; REST: GET /chats/{id}/messages?after=seq.',
    data: 'messages partitioned by chat_id, clustered by seq (Cassandra/Scylla). Presence/routing in Redis with TTLs. Per-device cursors.',
    hld: 'Clients ↔ WebSocket gateways (stateful). Message service assigns per-chat seq, stores, looks up recipient gateways in the routing registry, pushes; offline → APNs/FCM.',
    deep: 'Ordering by server seq per chat (not client clocks). Idempotency via clientMsgId. Reconnect sync from last seq. Groups: store once, fan out delivery; huge channels pull.',
    scale: 'Gateway connection counts (~100k each) and registry hot spots. E2E encryption means server can\'t read content. Trade-off: at-least-once + dedupe vs exactly-once.',
  }),
  d('feed', 'News feed', 'Design a social news feed: users follow others and see a ranked feed of recent posts.', 'system-design/case-studies', {
    req: 'Post, follow, home feed (ranked, paginated), likes/comments counts. Feed load < 200 ms; eventual consistency OK.',
    est: '300M DAU, 2 posts/day → ~7k posts/s; feed reads 10/day → ~35k/s; avg 200 followers, celebrities 50M.',
    api: 'POST /posts; POST /follow; GET /feed?cursor=…&limit=20.',
    data: 'posts by id; follows graph; precomputed feed lists per user in Redis (post IDs); counters separately.',
    hld: 'Write: post service stores post → fan-out workers push ID into followers\' feed caches. Read: feed service reads ID list, hydrates posts, ranks, returns.',
    deep: 'Hybrid fan-out: push for normal users, pull at read time for celebrities. Ranking with a candidate + scoring step. Cursor pagination.',
    scale: 'Fan-out write amplification; cache memory; hot celebrity posts. Trade-off: push = fast reads/expensive writes; pull = cheap writes/slow reads.',
  }),
  d('ratelimit', 'Distributed rate limiter', 'Design a rate limiter for an API gateway: 100 requests/minute per API key across 50 gateway nodes.', 'system-design/reliability-patterns', {
    req: 'Per-key limits, multiple tiers, low added latency (< 2 ms), accurate enough across nodes, return 429 with Retry-After.',
    est: '200k req/s across gateways; 5M active keys.',
    api: 'Internal: allow(key, cost) → {allowed, remaining, resetAt}.',
    data: 'Token bucket per key in Redis (tokens, lastRefill) or sliding-window counters; config per plan.',
    hld: 'Gateway calls a local limiter that checks Redis via an atomic Lua script (refill + take). Optionally local pre-limits to cut Redis load.',
    deep: 'Atomicity via Lua/EVAL; clock source; hot keys sharded; behaviour if Redis is down (fail open vs closed per endpoint).',
    scale: 'Redis cluster sharded by key; local caching with periodic sync for approximate limits. Trade-off: accuracy vs latency and availability.',
  }),
  d('notify', 'Notification service', 'Design a service that sends email, SMS and push notifications for many product teams, with preferences and no duplicates.', 'system-design/case-studies-ii', {
    req: 'Multi-channel, templates, user preferences/opt-outs, scheduling, priorities, retries, no duplicates, delivery tracking.',
    est: '50M notifications/day, peaks 20k/s during campaigns.',
    api: 'POST /notify {eventId, userId, template, data, channels?, priority}.',
    data: 'notifications log (eventId unique), preferences, templates, delivery status per channel.',
    hld: 'API validates + dedupes on eventId → priority queues per channel (Kafka/SQS) → channel workers → providers; webhooks update status.',
    deep: 'Idempotency on eventId; per-provider rate limits and failover; quiet hours; transactional vs marketing separation.',
    scale: 'Provider throughput limits; retry storms. Trade-off: at-least-once delivery with dedupe vs occasional duplicate SMS.',
  }),
  d('uber', 'Ride-hailing matching', 'Design the matching part of a ride-hailing app: drivers stream locations; riders request rides and get matched.', 'system-design/case-studies-iii', {
    req: 'Driver location every 4 s, nearby search, match within seconds, no double booking, trip state, live tracking.',
    est: '500k online drivers → 125k location writes/s; 5k ride requests/s at peak.',
    api: 'PUT /drivers/{id}/location; POST /rides; driver app offer/accept over persistent connection.',
    data: 'In-memory geo index (geohash/H3 cells → drivers) per city; trips in a durable DB; driver locks with TTL.',
    hld: 'Location service → geo index. Matching service queries nearby cells → ETA service ranks → lock driver → offer → accept → trip service.',
    deep: 'Locking drivers to avoid double dispatch; offer timeouts; cell boundary search; surge pricing inputs.',
    scale: 'Partition by city/region; location writes are the volume problem (in-memory, latest-only). Trade-off: optimal global matching vs fast local greedy matching.',
  }),
]

export const STORY_PROMPTS = [
  'A hard technical problem you solved (e.g. scaling the HIDS manager or an agent performance issue)',
  'A production incident you handled',
  'Disagreeing with a senior engineer or another team',
  'Improving detection quality / reducing false positives',
  'A browser feature or Chromium rebase you drove',
  'A time you failed or made a mistake',
  'Mentoring or raising the bar on a team',
  'Delivering under a tight deadline / ambiguous requirements',
]
