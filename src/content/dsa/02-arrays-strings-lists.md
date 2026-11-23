---
title: Arrays, Strings, Linked Lists, Stacks and Queues
summary: The everyday building blocks. How arrays store items side by side and why that makes them fast, why building strings in a loop can be accidentally slow, when a linked list is the right tool, and how stacks and queues model "undo", browser history, task lines and much more, with the patterns interviewers love.
---

::widget Scene {"title": "Arrays vs linked lists: the same playlist two ways", "sub": "read, insert in the middle, append, and why the CPU cache decides", "nodes": [{"id": "arr", "kind": "cells", "label": "array (contiguous memory)", "x": 0.0, "y": 0.0, "values": ["A", "B", "C", "D", "", ""]}, {"id": "ll", "kind": "cells", "label": "linked list (nodes anywhere, each points to the next)", "x": 5.58, "y": 5.58, "values": ["A→", "B→", "C→", "D"]}], "metrics": [["op", "Operation"], ["arr", "Array"], ["ll", "Linked list"]], "steps": [{"short": "Layout", "tag": "Layout", "title": "Array: songs side by side. List: each node holds a song and a pointer", "body": "<p>That one difference explains every trade-off.</p>", "metrics": {"op": ["-"], "arr": ["contiguous"], "ll": ["scattered + pointers"]}}, {"short": "Index", "tag": "Read i", "title": "Play song #3: array computes base + 3 × size", "body": "<p>One step, any index: O(1).</p>", "set": {"arr": {"marks": {"2": "green"}, "ptr": {"i": 2}}}, "metrics": {"op": ["get(2)"], "arr": ["O(1)", "good"]}}, {"short": "Walk", "tag": "Read i", "title": "The list must walk from the head: A → B → C", "body": "<p>O(n), no way to jump.</p>", "set": {"ll": {"marks": {"0": "orange", "1": "orange", "2": "green"}, "ptr": {"walk": 2}}}, "metrics": {"ll": ["O(n)", "bad"]}}, {"short": "InsArr", "tag": "Insert middle", "title": "Insert X after B in the array", "body": "<p>Shift C and D right first, then write X: O(n) moves.</p>", "set": {"arr": {"marks": {"2": "orange", "3": "orange", "4": "orange"}, "ptr": {}, "values": ["A", "B", "X", "C", "D", ""]}, "ll": {"marks": {}, "ptr": {}}}, "metrics": {"op": ["insert after B"], "arr": ["O(n) shifts"]}}, {"short": "InsLL", "tag": "Insert middle", "title": "In the list: X.next = C; B.next = X", "body": "<p>Two pointer changes: O(1), once you already hold B. Finding B is still O(n).</p>", "set": {"ll": {"marks": {"1": "green", "2": "green"}, "ptr": {}, "values": ["A→", "B→", "X→", "C→", "D"]}}, "metrics": {"ll": ["O(1) given the node", "good"]}}, {"short": "Append", "tag": "Append", "title": "Append to a full array: allocate double, copy, then add", "body": "<p>Rare copies → O(1) amortised. Python lists and Java ArrayLists do this.</p>", "set": {"arr": {"marks": {"5": "blue"}, "ptr": {}, "values": ["A", "B", "X", "C", "D", "E"]}}, "metrics": {"op": ["append E"], "arr": ["O(1) amortised"]}}, {"short": "Cache", "tag": "Cache", "title": "Loop over all songs: the array wins massively", "body": "<p>Contiguous memory = whole cache lines of useful data and prefetching. List nodes are scattered: a cache miss per node.</p>", "set": {"arr": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green", "5": "green"}, "ptr": {}}, "ll": {"marks": {"0": "red", "1": "red", "2": "red", "3": "red", "4": "red"}, "ptr": {}}}, "metrics": {"op": ["iterate all"], "arr": ["fast (cache-friendly)", "good"], "ll": ["slow (pointer chasing)", "bad"]}}, {"short": "Memory", "tag": "Memory", "title": "Lists also pay a pointer per element", "body": "<p>8 extra bytes per node, plus allocator overhead.</p>", "set": {"arr": {"marks": {}, "ptr": {}}, "ll": {"marks": {}, "ptr": {}}}}, {"short": "When", "tag": "Choose", "title": "When does a list win?", "body": "<p>Frequent insert/delete at known positions (LRU cache, queues), or when elements must never move in memory. Otherwise default to arrays.</p>", "note": {"kind": "key", "text": "Array: O(1) index, O(n) middle insert, cache-friendly. Linked list: O(n) index, O(1) splice at a known node, cache-unfriendly. Use arrays by default."}}]}

::widget Scene {"title": "Arrays: why a[i] is instant", "sub": "items side by side in memory", "nodes": [{"id": "a", "kind": "cells", "label": "int a[8] at address 1000", "x": 3.1, "y": 3.1, "values": [7, 3, 9, 4, 1, 8, 2, 6]}], "metrics": [["addr", "Address of a[i]"], ["cost", "Cost"]], "steps": [{"short": "Side by side", "tag": "Concept", "title": "An array is boxes in a row", "body": "<p>An array stores its items <b>right next to each other</b> in memory. Each integer takes 4 bytes, so 8 integers occupy 32 bytes in a row, starting at address 1000.</p>", "metrics": {"addr": ["-"], "cost": ["-"]}}, {"short": "Jump to a[5]", "tag": "Read", "title": "Reading a[5]: one multiplication, no searching", "body": "<p>To read <code>a[5]</code>, the computer doesn't walk past items 0–4. It computes <b>1000 + 5 × 4 = 1020</b> and reads that address directly.</p>", "set": {"a": {"marks": {"5": "orange"}, "ptr": {"a[5]": 5}}}, "metrics": {"addr": ["1000 + 5×4 = 1020"], "cost": ["O(1)", "good"]}}, {"short": "Any index", "tag": "Read", "title": "Same cost for a[0] or a[7]", "body": "<p>Every index costs the same single calculation. That's why array access is <b>O(1)</b>, and why arrays are the fastest structure to loop over: the CPU loads neighbouring items into cache together.</p>", "set": {"a": {"marks": {"0": "orange", "7": "orange"}, "ptr": {"a[0]": 0, "a[7]": 7}}}, "metrics": {"addr": ["1000, 1028"]}}, {"short": "Insert in middle", "tag": "Cost", "title": "Inserting at the front shifts everything", "body": "<p>To insert 5 at index 0, every item must move one place right to make room, 8 moves. Inserting or deleting in the middle is <b>O(n)</b>.</p>", "set": {"a": {"marks": {"1": "blue", "2": "blue", "3": "blue", "4": "blue", "5": "blue", "6": "blue", "7": "blue", "8": "blue", "0": "green"}, "ptr": {"new": 0}, "values": [5, 7, 3, 9, 4, 1, 8, 2, 6]}}, "metrics": {"cost": ["O(n) shifts", "bad"]}, "note": {"kind": "key", "text": "Arrays: instant reads by index, cheap appends at the end, expensive inserts and deletes in the middle."}}]}

::widget Scene {"title": "Dynamic arrays: growing by doubling", "sub": "Python list, Java ArrayList, C++ vector", "nodes": [{"id": "a", "kind": "cells", "label": "capacity 4", "x": 3.1, "y": 3.1, "values": [5, 8, 2, 9]}], "metrics": [["size", "Size / capacity"], ["copies", "Copies so far"]], "steps": [{"short": "Full", "tag": "Setup", "title": "The array is full: 4 of 4 slots used", "body": "<p>A fixed array can't grow. A <b>dynamic array</b> hides a fixed array inside and replaces it with a bigger one when it fills up.</p>", "set": {"a": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue"}, "ptr": {}}}, "metrics": {"size": ["4 / 4"], "copies": ["0"]}}, {"short": "Append 7", "tag": "Grow", "title": "Appending a 5th item: allocate double the space", "body": "<p>There's no room, so it allocates a new array of <b>8</b> slots, copies the 4 items across, and adds 7. This append cost 5 operations.</p>", "set": {"a": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue", "4": "green"}, "ptr": {"new": 4}, "values": [5, 8, 2, 9, 7, "", "", ""]}}, "metrics": {"size": ["5 / 8"], "copies": ["4", "bad"]}}, {"short": "Cheap appends", "tag": "Fast path", "title": "The next three appends are instant", "body": "<p>Slots 5–7 are free, so appending 1, 6 and 3 each costs one write. No copying.</p>", "set": {"a": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue", "4": "blue", "5": "green", "6": "green", "7": "green"}, "ptr": {}, "values": [5, 8, 2, 9, 7, 1, 6, 3]}}, "metrics": {"size": ["8 / 8"], "copies": ["4"]}}, {"short": "Amortized O(1)", "tag": "Insight", "title": "Doubling makes appends O(1) on average", "body": "<p>Copies happen at sizes 4, 8, 16, 32… Each doubling copies n items, but then gives n free slots. Spread out, every append costs a <b>constant</b> amount on average, \"amortized O(1)\".</p>", "note": {"kind": "key", "text": "Growing by a constant (say +10 each time) would make appends O(n) on average. Growing by a factor (×2, ×1.5) is what keeps them cheap."}}]}

::widget Scene {"title": "Two pointers: find a pair that sums to 20", "sub": "sorted input, one pass from both ends", "nodes": [{"id": "a", "kind": "cells", "label": "sorted numbers", "x": 3.1, "y": 3.1, "values": [1, 3, 4, 6, 8, 11, 14, 17]}], "metrics": [["sum", "a[L] + a[R]"], ["move", "Decision"], ["checks", "Checks"]], "steps": [{"short": "Start", "tag": "Setup", "title": "Goal: two numbers that add up to 20", "body": "<p>Checking every pair would take 28 comparisons. Because the list is <b>sorted</b>, we can start one pointer at each end and walk them towards each other.</p>", "set": {"a": {"marks": {"0": "orange", "7": "orange"}, "ptr": {"L": 0, "R": 7}}}, "metrics": {"sum": ["-"], "move": ["-"], "checks": ["0"]}}, {"short": "Too small", "tag": "Compare", "title": "1 + 17 = 18: too small, so move L right", "body": "<p>18 is less than 20. Moving <code>R</code> left would only make the sum smaller, so the only useful move is <code>L</code> → right, to a bigger number. That rules out every pair using 1.</p>", "set": {"a": {"marks": {"0": "orange", "7": "orange"}, "ptr": {"L": 0, "R": 7}}}, "metrics": {"sum": ["18 < 20"], "move": ["L → right"], "checks": ["1"]}}, {"short": "Found", "tag": "Match", "title": "3 + 17 = 20, found it", "body": "<p>Two checks instead of up to 28.</p>", "set": {"a": {"marks": {"1": "green", "7": "green", "0": "dark"}, "ptr": {"L": 1, "R": 7}}}, "metrics": {"sum": ["20 ✓", "good"], "move": ["stop"], "checks": ["2", "good"]}}, {"short": "The rule", "tag": "Rule", "title": "Too small → move L right. Too big → move R left.", "body": "<p>Each comparison throws away one number for good, so we finish in at most n steps: <b>O(n)</b> instead of O(n²).</p>", "note": {"kind": "key", "text": "Two pointers work when the data is ordered, so moving one pointer always pushes the answer in a known direction."}}]}

::widget Scene {"title": "Sliding window: best sum of 3 in a row", "sub": "reuse work instead of recomputing", "nodes": [{"id": "a", "kind": "cells", "label": "daily sales", "x": 3.1, "y": 3.1, "values": [2, 1, 5, 1, 3, 2, 6, 1]}], "metrics": [["win", "Window sum"], ["best", "Best so far"], ["ops", "Additions"]], "steps": [{"short": "First window", "tag": "Setup", "title": "Sum the first 3 days: 2 + 1 + 5 = 8", "body": "<p>We want the best total over any <b>3 consecutive</b> days. Summing every window from scratch costs 3 additions each time.</p>", "set": {"a": {"marks": {"0": "blue", "1": "blue", "2": "blue"}, "ptr": {"start": 0, "end": 2}}}, "metrics": {"win": ["8"], "best": ["8"], "ops": ["3"]}}, {"short": "Slide", "tag": "Slide", "title": "Slide right: add the new day, drop the old one", "body": "<p>Next window: instead of re-adding three numbers, take 8, <b>add</b> the new day (1) and <b>subtract</b> the day that left (2): 8 + 1 − 2 = 7.</p>", "set": {"a": {"marks": {"1": "blue", "2": "blue", "3": "blue"}, "ptr": {"start": 1, "end": 3}}}, "metrics": {"win": ["8 + 1 − 2 = 7"], "ops": ["5"]}}, {"short": "Slide again", "tag": "Slide", "title": "7 + 3 − 1 = 9: a new best", "body": "<p>Each slide costs 2 operations no matter how wide the window is.</p>", "set": {"a": {"marks": {"2": "blue", "3": "blue", "4": "blue"}, "ptr": {"start": 2, "end": 4}}}, "metrics": {"win": ["9"], "best": ["9", "good"], "ops": ["7"]}}, {"short": "Best window", "tag": "Result", "title": "Keep sliding: 3 + 2 + 6 = 11 is the best", "body": "<p>Windows: 8, 7, 9, 6, 11, 9. The best is days 4–6 with 11. One pass, <b>O(n)</b>, instead of O(n × k).</p>", "set": {"a": {"marks": {"4": "blue", "5": "blue", "6": "blue"}, "ptr": {"start": 4, "end": 6}}}, "metrics": {"win": ["11"], "best": ["11", "good"], "ops": ["~2 per step"]}, "note": {"kind": "key", "text": "Variable-size windows use the same idea: expand the right edge until the window breaks a rule, then shrink the left edge until it's valid again (e.g. longest substring without repeats)."}}]}

::widget Scene {"title": "Prefix sums: any range total in one subtraction", "sub": "precompute running totals once", "nodes": [{"id": "a", "kind": "cells", "label": "values", "x": 1.55, "y": 1.55, "values": [3, 1, 4, 1, 5, 9, 2, 6]}, {"id": "p", "kind": "cells", "label": "running total (prefix)", "x": 6.51, "y": 6.51, "values": [3, 4, 8, 9, 14, 23, 25, 31]}], "metrics": [["q", "Question"], ["ans", "Answer"], ["cost", "Cost per question"]], "steps": [{"short": "Values", "tag": "Setup", "title": "Many questions: \"sum from i to j?\"", "body": "<p>Adding up a range each time costs O(n) per question. With thousands of questions, that adds up.</p>", "show": ["a"], "metrics": {"q": ["-"], "ans": ["-"], "cost": ["O(n)", "bad"]}}, {"short": "Running total", "tag": "Precompute", "title": "Build running totals once", "body": "<p>prefix[i] = everything up to and including i. Each is the previous total plus one value: 3, 4, 8, 9, 14, 23, 25, 31. One pass, O(n).</p>", "show": ["a", "p"]}, {"short": "Ask", "tag": "Query", "title": "Sum of positions 2–5 = prefix[5] − prefix[1]", "body": "<p>Total up to 5 is 23. Total up to 1 is 4. Subtract: 23 − 4 = <b>19</b> = 4 + 1 + 5 + 9. ✓</p>", "set": {"a": {"marks": {"2": "blue", "3": "blue", "4": "blue", "5": "blue"}, "ptr": {}}, "p": {"marks": {"5": "orange", "1": "orange"}, "ptr": {"j": 5, "i−1": 1}}}, "metrics": {"q": ["sum[2..5]"], "ans": ["23 − 4 = 19", "good"], "cost": ["O(1)", "good"]}, "note": {"kind": "key", "text": "Like reading two odometer values to get the distance between towns. Works in 2D too (any rectangle of an image) and with hash maps for \"how many subarrays sum to k\"."}}]}

::widget Scene {"title": "Linked lists: nodes that point to the next", "sub": "cheap inserts, no random access", "nodes": [{"id": "h", "kind": "cube", "label": "head: 7", "x": 3.1, "y": 3.1, "size": 2.0, "color": "purple"}, {"id": "b", "kind": "cube", "label": "3", "x": 6.3, "y": -0.1, "size": 2.0, "color": "purple"}, {"id": "c", "kind": "cube", "label": "9", "x": 9.5, "y": -3.3, "size": 2.0, "color": "purple"}, {"id": "d", "kind": "cube", "label": "4 → null", "x": 12.7, "y": -6.5, "size": 2.0, "color": "purple"}, {"id": "x", "kind": "cube", "label": "new: 5", "x": 13.17, "y": 3.57, "size": 2.0, "color": "green"}], "links": [["h", "b"], ["b", "c"], ["c", "d"]], "metrics": [["op", "Operation"], ["cost", "Cost"]], "steps": [{"short": "Chain", "tag": "Concept", "title": "Each node holds a value and a pointer", "body": "<p>A linked list scatters nodes anywhere in memory; each one remembers where the <b>next</b> one is. The list itself only knows the <b>head</b>.</p>", "show": ["h", "b", "c", "d"], "metrics": {"op": ["-"], "cost": ["-"]}}, {"short": "Find", "tag": "Read", "title": "Finding the 3rd item means walking from the head", "body": "<p>No address arithmetic here: to reach the 3rd node you follow head → next → next. Access by position is <b>O(n)</b>.</p>", "show": ["h", "b", "c", "d"], "flow": [[["h", "b", "c"], "#f59e0b", "walk"]], "focus": ["c"], "metrics": {"op": ["get(2)"], "cost": ["O(n)", "bad"]}}, {"short": "Insert", "tag": "Insert", "title": "Inserting after 3: just rewire two pointers", "body": "<p>Create node 5, point it at 9, then point 3 at 5. Nothing else moves, <b>O(1)</b> once you're at the right spot.</p>", "show": ["h", "b", "c", "d", "x"], "focus": ["x"], "flow": [["b", "x", "#22c55e", "3 → 5"], ["x", "c", "#22c55e", "5 → 9"]], "metrics": {"op": ["insert after 3"], "cost": ["O(1)", "good"]}, "note": {"kind": "key", "text": "Arrays win at indexed reads and cache-friendly loops; linked lists win at inserting and removing in the middle when you already hold the node, that's why LRU caches use them."}}]}

::widget Scene {"title": "Reversing a linked list", "sub": "three pointers: prev, curr, next", "nodes": [{"id": "a", "kind": "cube", "label": "1", "x": 3.1, "y": 3.1, "size": 2.0, "color": "purple"}, {"id": "b", "kind": "cube", "label": "2", "x": 6.3, "y": -0.1, "size": 2.0, "color": "purple"}, {"id": "c", "kind": "cube", "label": "3", "x": 9.5, "y": -3.3, "size": 2.0, "color": "purple"}, {"id": "d", "kind": "cube", "label": "4", "x": 12.7, "y": -6.5, "size": 2.0, "color": "purple"}], "links": [["a", "b"], ["b", "c"], ["c", "d"]], "metrics": [["prev", "prev"], ["curr", "curr"], ["done", "Reversed so far"]], "steps": [{"short": "Start", "tag": "Setup", "title": "Goal: 1→2→3→4 becomes 4→3→2→1", "body": "<p>We walk the list once, flipping each arrow to point backwards. We need to remember the node behind us (<code>prev</code>) and the one ahead (<code>next</code>), or we'd lose the rest of the list.</p>", "metrics": {"prev": ["null"], "curr": ["1"], "done": ["-"]}}, {"short": "Flip 1", "tag": "Flip", "title": "Save next, point 1 back at null", "body": "<p><code>next = curr.next</code> (2). <code>curr.next = prev</code> (null). Move on: prev = 1, curr = 2.</p>", "set": {"a": {"badge": "→ null"}}, "focus": ["a"], "metrics": {"prev": ["1"], "curr": ["2"], "done": ["1"]}}, {"short": "Flip 2", "tag": "Flip", "title": "Point 2 back at 1", "body": "<p>Same three moves: save 3, point 2 → 1, advance.</p>", "set": {"b": {"badge": "→ 1"}}, "focus": ["b"], "flow": [["b", "a", "#a855f7", "2 → 1"]], "metrics": {"prev": ["2"], "curr": ["3"], "done": ["2 → 1"]}}, {"short": "Finish", "tag": "Done", "title": "When curr is null, prev is the new head", "body": "<p>After flipping 3 and 4, <code>curr</code> runs off the end and <code>prev</code> = 4 is the new head: 4→3→2→1. One pass, O(n) time, O(1) extra memory.</p>", "set": {"c": {"badge": "→ 2"}, "d": {"badge": "new head"}}, "flow": [["d", "c", "#a855f7", ""], ["c", "b", "#a855f7", ""]], "metrics": {"prev": ["4"], "curr": ["null"], "done": ["4→3→2→1", "good"]}, "note": {"kind": "key", "text": "Draw the three pointers before coding. Most linked-list bugs come from overwriting curr.next before saving it."}}]}

::widget Scene {"title": "Fast & slow pointers: detecting a cycle", "sub": "Floyd's tortoise and hare", "nodes": [{"id": "n1", "kind": "cube", "label": "1", "x": 3.1, "y": 3.1, "size": 1.8, "color": "purple"}, {"id": "n2", "kind": "cube", "label": "2", "x": 6.1, "y": 0.1, "size": 1.8, "color": "purple"}, {"id": "n3", "kind": "cube", "label": "3", "x": 9.1, "y": -2.9, "size": 1.8, "color": "purple"}, {"id": "n4", "kind": "cube", "label": "4", "x": 9.62, "y": -8.38, "size": 1.8, "color": "purple"}, {"id": "n5", "kind": "cube", "label": "5", "x": 15.1, "y": -8.9, "size": 1.8, "color": "purple"}, {"id": "n6", "kind": "cube", "label": "6", "x": 14.58, "y": -3.42, "size": 1.8, "color": "purple"}], "links": [["n1", "n2"], ["n2", "n3"], ["n3", "n4"], ["n4", "n5"], ["n5", "n6"], ["n6", "n3"]], "metrics": [["slow", "Slow (1 step)"], ["fast", "Fast (2 steps)"]], "steps": [{"short": "A loop", "tag": "Problem", "title": "This list loops back on itself", "body": "<p>Node 6 points back to 3, so walking the list never ends. How can we detect that without remembering every node we've seen?</p>", "metrics": {"slow": ["1"], "fast": ["1"]}, "set": {"n1": {"badge": "S F"}}}, {"short": "Run", "tag": "Move", "title": "Slow moves 1 step, fast moves 2", "body": "<p>After one move: slow at 2, fast at 3. After two: slow at 3, fast at 5.</p>", "set": {"n1": {"badge": null}, "n3": {"badge": "S"}, "n5": {"badge": "F"}}, "metrics": {"slow": ["3"], "fast": ["5"]}}, {"short": "Meet", "tag": "Detect", "title": "Inside the loop, fast gains one step per move, they must meet", "body": "<p>Slow → 4, fast → 3 (5→6→3). Then slow → 5, fast → 5. <b>They meet</b>: there's a cycle. If there were no cycle, fast would simply reach the end.</p>", "set": {"n3": {"badge": null}, "n5": {"badge": "S F meet!"}}, "focus": ["n5"], "metrics": {"slow": ["5", "good"], "fast": ["5", "good"]}, "note": {"kind": "key", "text": "O(n) time, O(1) memory. The same trick finds the middle of a list (when fast reaches the end, slow is halfway) and the start of the cycle."}}]}

::widget Scene {"title": "Stacks: last in, first out", "sub": "the undo button, the call stack, browser back", "nodes": [{"id": "s", "kind": "cells", "label": "stack (top on the right)", "x": 3.1, "y": 3.1, "values": ["A"]}], "metrics": [["op", "Operation"], ["top", "Top"], ["cost", "Cost"]], "steps": [{"short": "Push", "tag": "Push", "title": "push(A): add to the top", "body": "<p>A stack is like a pile of plates: you can only add or remove at the <b>top</b>. Typing \"A\" in an editor pushes an action onto the undo stack.</p>", "set": {"s": {"marks": {"0": "blue"}, "ptr": {"top": 0}}}, "metrics": {"op": ["push A"], "top": ["A"], "cost": ["O(1)", "good"]}}, {"short": "Push more", "tag": "Push", "title": "push(B), push(C)", "body": "<p>Two more actions. The newest is always on top.</p>", "set": {"s": {"marks": {"2": "blue"}, "ptr": {"top": 2}, "values": ["A", "B", "C"]}}, "metrics": {"op": ["push B, push C"], "top": ["C"]}}, {"short": "Pop", "tag": "Pop", "title": "pop(): take the newest off", "body": "<p>Undo! <code>pop()</code> removes C, the <b>last</b> thing added is the <b>first</b> out (LIFO).</p>", "set": {"s": {"marks": {"1": "orange"}, "ptr": {"top": 1}, "values": ["A", "B"]}}, "metrics": {"op": ["pop → C"], "top": ["B"]}}, {"short": "Uses", "tag": "Insight", "title": "Where stacks show up", "body": "<p>Your programming language's <b>call stack</b> (each function call is pushed, each return pops), undo/redo, the browser back button, matching brackets, and depth-first search.</p>", "note": {"kind": "key", "text": "Push and pop are both O(1), a dynamic array with an index for the top is all you need."}}]}

::widget Scene {"title": "Balanced brackets with a stack", "sub": "is \"{[()]}(]\" valid code?", "nodes": [{"id": "in", "kind": "cells", "label": "input", "x": 0.93, "y": 0.93, "values": ["{", "[", "(", ")", "]", "}", "(", "]"]}, {"id": "st", "kind": "cells", "label": "stack of open brackets", "x": 6.82, "y": 6.82, "values": [" "]}], "metrics": [["rule", "Rule"], ["res", "Result"]], "steps": [{"short": "Opening", "tag": "Push", "title": "Opening brackets are pushed", "body": "<p>Read left to right. Every opening bracket <code>{ [ (</code> goes on the stack, it's waiting for its partner.</p>", "set": {"in": {"marks": {"0": "green", "1": "green", "2": "orange"}, "ptr": {"i": 2}}, "st": {"marks": {"2": "blue"}, "ptr": {}, "values": ["{", "[", "("]}}, "metrics": {"rule": ["open → push"], "res": ["…"]}}, {"short": "Closing", "tag": "Match", "title": "A closing bracket must match the top", "body": "<p><code>)</code> arrives. The top of the stack is <code>(</code>, a match, so pop it. Then <code>]</code> matches <code>[</code>, and <code>}</code> matches <code>{</code>.</p>", "set": {"in": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green", "5": "orange"}, "ptr": {"i": 5}}, "st": {"marks": {}, "ptr": {}, "values": [" "]}}, "metrics": {"rule": ["close → must match top, pop"]}}, {"short": "Mismatch", "tag": "Fail", "title": "\"(\" then \"]\": wrong partner", "body": "<p>Next <code>(</code> is pushed. Then <code>]</code> arrives but the top is <code>(</code>, mismatch. The string is <b>invalid</b>.</p>", "set": {"in": {"marks": {"0": "green", "1": "green", "2": "green", "3": "green", "4": "green", "5": "green", "6": "green", "7": "red"}, "ptr": {"i": 7}}, "st": {"marks": {"0": "blue"}, "ptr": {}, "values": ["("]}}, "metrics": {"res": ["invalid", "bad"]}}, {"short": "Rule", "tag": "Insight", "title": "Valid only if every close matches and the stack ends empty", "body": "<p>The most recently opened bracket must close first, exactly a stack's LIFO order. Compilers, JSON parsers and HTML validators all use this idea. O(n) time.</p>", "note": {"kind": "key", "text": "Whenever \"the most recent unfinished thing must be finished first\", reach for a stack."}}]}

::widget Scene {"title": "Queues: first in, first out", "sub": "print jobs, task queues, BFS", "nodes": [{"id": "q", "kind": "cells", "label": "queue (front on the left)", "x": 3.1, "y": 3.1, "values": ["job1"]}], "metrics": [["op", "Operation"], ["front", "Front"]], "steps": [{"short": "Enqueue", "tag": "Add", "title": "enqueue: join at the back", "body": "<p>A queue is a line at a ticket counter: newcomers join the <b>back</b>, service happens at the <b>front</b>.</p>", "set": {"q": {"marks": {"0": "blue"}, "ptr": {"front": 0}, "values": ["job1", "job2", "job3"]}}, "metrics": {"op": ["enqueue ×3"], "front": ["job1"]}}, {"short": "Dequeue", "tag": "Remove", "title": "dequeue: serve the oldest", "body": "<p><code>dequeue()</code> removes job1, the <b>first</b> in is the <b>first</b> out (FIFO). Fair ordering.</p>", "set": {"q": {"marks": {"0": "orange"}, "ptr": {"front": 0}, "values": ["job2", "job3"]}}, "metrics": {"op": ["dequeue → job1"], "front": ["job2"]}}, {"short": "The trap", "tag": "Gotcha", "title": "Don't remove from the front of an array", "body": "<p>Removing index 0 of an array shifts everything left: O(n). Use a <b>linked list</b>, a <b>circular buffer</b> (next lesson), or your language's deque (<code>collections.deque</code>, <code>ArrayDeque</code>) for O(1) at both ends.</p>", "note": {"kind": "key", "text": "Queues appear everywhere: message queues between services, the OS's run queue, network buffers, and breadth-first search."}}]}

::widget Scene {"title": "Circular buffers: a queue that never moves data", "sub": "fixed-size array, two wrapping indices", "nodes": [{"id": "r", "kind": "cells", "label": "buffer of 6 slots", "x": 3.1, "y": 3.1, "values": ["", "", "", "", "", ""]}], "metrics": [["head", "head (read)"], ["tail", "tail (write)"], ["n", "Items"]], "steps": [{"short": "Write", "tag": "Write", "title": "Write at tail, then tail = (tail + 1) % 6", "body": "<p>Audio drivers, network cards and log buffers use a fixed ring. Write 4 items: they go into slots 0–3.</p>", "set": {"r": {"marks": {"0": "blue", "1": "blue", "2": "blue", "3": "blue"}, "ptr": {"head": 0, "tail": 4}, "values": ["a", "b", "c", "d", "", ""]}}, "metrics": {"head": ["0"], "tail": ["4"], "n": ["4"]}}, {"short": "Read", "tag": "Read", "title": "Read at head; nothing shifts", "body": "<p>Read a and b: head moves to 2. The data doesn't move, only the index does. O(1).</p>", "set": {"r": {"marks": {"2": "blue", "3": "blue"}, "ptr": {"head": 2, "tail": 4}, "values": ["", "", "c", "d", "", ""]}}, "metrics": {"head": ["2"], "n": ["2"]}}, {"short": "Wrap", "tag": "Wrap", "title": "Writing past the end wraps to slot 0", "body": "<p>Write e, f, g: e→4, f→5, and g wraps to slot 0 because <code>(5 + 1) % 6 = 0</code>. The array is used like a circle.</p>", "set": {"r": {"marks": {"2": "blue", "3": "blue", "4": "blue", "5": "blue", "0": "green"}, "ptr": {"head": 2, "tail": 1}, "values": ["g", "", "c", "d", "e", "f"]}}, "metrics": {"tail": ["1 (wrapped)"], "n": ["5"]}, "note": {"kind": "key", "text": "When tail catches up with head the buffer is full: either block the writer or overwrite the oldest data (common for logs and audio)."}}]}

::widget Scene {"title": "Monotonic stack: the next warmer day", "sub": "for each day, how long until it gets warmer?", "nodes": [{"id": "t", "kind": "cells", "label": "temperatures", "x": 0.93, "y": 0.93, "values": [73, 74, 75, 71, 69, 72, 76, 73]}, {"id": "s", "kind": "cells", "label": "stack: days still waiting", "x": 6.82, "y": 6.82, "values": [" "]}], "metrics": [["ans", "Answers found"]], "steps": [{"short": "Waiting", "tag": "Idea", "title": "Keep the days that haven't found a warmer day yet", "body": "<p>Brute force checks every later day for each day: O(n²). Instead keep a stack of days still waiting, with temperatures <b>decreasing</b> from bottom to top.</p>", "set": {"t": {"marks": {"2": "orange"}, "ptr": {"i": 2}}, "s": {"marks": {}, "ptr": {}, "values": ["75"]}}, "metrics": {"ans": ["day0→1, day1→1"]}}, {"short": "Cool days", "tag": "Push", "title": "71 and 69 are cooler: they wait too", "body": "<p>Each new cooler day is pushed. The stack is now 75, 71, 69.</p>", "set": {"t": {"marks": {"4": "orange"}, "ptr": {"i": 4}}, "s": {"marks": {"2": "blue"}, "ptr": {}, "values": ["75", "71", "69"]}}}, {"short": "Warm day", "tag": "Pop", "title": "72 arrives: it answers 69 and 71", "body": "<p>72 is warmer than the top (69): day 4 waited 1 day, pop. Still warmer than 71: day 3 waited 2 days, pop. 75 is warmer than 72, so stop and push 72.</p>", "set": {"t": {"marks": {"5": "green"}, "ptr": {"i": 5}}, "s": {"marks": {"1": "blue"}, "ptr": {}, "values": ["75", "72"]}}, "metrics": {"ans": ["+ day4→1, day3→2", "good"]}}, {"short": "Why O(n)", "tag": "Insight", "title": "Each day is pushed once and popped once", "body": "<p>So the whole pass is O(n). The same pattern solves \"next greater element\", stock span, and largest rectangle in a histogram.</p>", "note": {"kind": "key", "text": "A monotonic stack remembers only the candidates that can still be an answer, throwing away the rest as soon as they can't."}}]}











::widget Scene {"title": "Two pointers: a pair that sums to 18", "sub": "sorted input, one pass from both ends", "nodes": [{"id": "a", "kind": "cells", "label": "sorted numbers", "x": 3.1, "y": 3.1, "values": [1, 3, 4, 6, 8, 11, 14, 17]}], "metrics": [["sum", "a[L] + a[R]"], ["move", "Decision"], ["checks", "Checks"]], "steps": [{"short": "Start", "tag": "Setup", "title": "Pointers at both ends", "body": "<p>Find two numbers that add to <b>18</b>. Checking every pair would be 28 comparisons. Because the list is sorted, two pointers can do it in one pass.</p>", "set": {"a": {"marks": {"0": "orange", "7": "orange"}, "ptr": {"L": 0, "R": 7}}}, "metrics": {"sum": ["1 + 17 = 18?"], "move": ["-"], "checks": ["0"]}}, {"short": "Too small?", "tag": "Compare", "title": "1 + 17 = 18 … wait, let's try a target of 20", "body": "<p>Let's make it interesting: target <b>20</b>. 1 + 17 = 18 is <b>too small</b>. The only way to grow the sum is to move <code>L</code> right to a bigger number.</p>", "set": {"a": {"marks": {"0": "orange", "7": "orange"}, "ptr": {"L": 0, "R": 7}}}, "metrics": {"sum": ["18 < 20"], "move": ["L → right"], "checks": ["1"]}}, {"short": "Move L", "tag": "Move", "title": "3 + 17 = 20, found it", "body": "<p>Now L points at 3. 3 + 17 = 20. Done after 2 checks.</p>", "set": {"a": {"marks": {"1": "green", "7": "green", "0": "dark"}, "ptr": {"L": 1, "R": 7}}}, "metrics": {"sum": ["20 ✓", "good"], "move": ["stop"], "checks": ["2", "good"]}}, {"short": "Too big?", "tag": "Rule", "title": "If the sum is too big, move R left", "body": "<p>The rule is symmetric: sum too small → move L right; sum too big → move R left. Each step rules out a whole row of pairs, so the total is at most n steps: <b>O(n)</b> instead of O(n²).</p>", "note": {"kind": "key", "text": "Two pointers work when the data is sorted (or has some order) so that moving one pointer always moves the answer in a known direction."}}]}






## Arrays: a row of numbered lockers

> [!ANALOGY] An array is a row of numbered lockers in a school hallway, all the same size, standing side by side. To open locker 57, you don't walk past lockers 1 to 56, you know exactly where it is: the start of the row plus 57 locker-widths. That's why reading any item of an array by its position is instant, no matter how long the row is.

An **array** stores items **next to each other in memory**. The computer finds item `i` with one calculation, *start address + i × item size*, so `arr[i]` is **O(1)**.

That same layout explains the weaknesses:

| Operation | Cost | Why |
|---|---|---|
| Read or change `arr[i]` | O(1) | One address calculation |
| Add at the end | O(1) amortized | Usually there's spare room (chapter 1's doubling) |
| Insert or remove at the front or middle | **O(n)** | Every later item must shift one locker over |
| Find a value (unsorted) | O(n) | Check lockers one by one |
| Find a value (sorted) | O(log n) | Binary search (Algorithms track) |

> [!EXAMPLE] **A slow "queue" bug.** Code that uses a Python list as a waiting line, adding with `append` and taking from the front with `pop(0)`, works fine in testing. With 100,000 items in production, every `pop(0)` shifts 99,999 items, and the program crawls. The fix: use `collections.deque`, which is built for removing from both ends quickly. (More on queues below.)

**Tips that come from this:** if you know roughly how many items you'll have, create the list at that size up front; and prefer adding and removing at the **end** of an array.

## Strings: arrays of characters (with surprises)

A string is an array of characters, but "character" is trickier than it looks.

Computers store text as numbers. Every character in every language (and every emoji) has a number called a **code point** in the **Unicode** standard: `A` is 65, `₹` is 8377. Most of the web stores text as **UTF-8** which uses 1 byte for English letters and 2–4 bytes for others. That's why:

- the "length" of a Hindi or Tamil word in many languages doesn't match the number of letters you see, because some visible characters are made of several code points combined;
- cutting a string at an arbitrary byte position can break a character in half and produce garbage.

> [!EXAMPLE] A tweet-limit counter, a username validator or a "first 100 characters" preview that counts bytes instead of visible characters will cut emoji and many Indian-language words in half. Real apps use "grapheme"-aware functions for anything users see.

### The string-building trap

In Python, Java, JavaScript, Go and C#, strings are **immutable**: they can never be changed after creation. So `s = s + "x"` doesn't add to `s`, it creates a brand-new string and copies everything into it.

```python
# Slow: each += copies the whole string so far → O(n²) total
report = ""
for line in lines:
    report += line + "\n"

# Fast: collect pieces, join once → O(n)
report = "\n".join(lines)
```

With 100,000 lines, the first version copies billions of characters. The fix in every language is the same idea: collect pieces and join once (`StringBuilder` in Java, `strings.Builder` in Go, `"".join()` in Python, an array and `.join()` in JavaScript).

## A powerful array trick: prefix sums

Suppose you're asked many times: "what's the total sales between day 30 and day 90?" Adding up 60 numbers each time is slow if there are millions of questions.

Instead, build a **running total** once: `prefix[i]` = total of all days before day `i`. Then any range total is a single subtraction:

`total(day 30 to day 89) = prefix[90] − prefix[30]`

> [!ANALOGY] Your car's odometer. To know how far you drove between two cities, you don't re-measure the road, you subtract the odometer reading at the first city from the reading at the second.

```python
def build_prefix(sales):
    prefix = [0]
    for s in sales:
        prefix.append(prefix[-1] + s)       # running total
    return prefix

prefix = build_prefix(daily_sales)
range_total = prefix[90] - prefix[30]       # O(1) per question
```

Prefix sums turn up in surprisingly many interview problems, "how many subarrays add up to k?" is solved by combining them with a hash map (next chapter).

## Linked lists: a scavenger hunt

> [!ANALOGY] A linked list is a scavenger hunt. Each clue tells you where the next clue is hidden. To find the 50th clue, you must follow the first 49. But adding a new clue in the middle is easy: change one clue to point to the new one, and have the new one point onward. Nothing else moves.

Each item (a **node**) holds a value and a pointer to the next node. Nodes can be anywhere in memory.

| Operation | Array | Linked list |
|---|---|---|
| Get the k-th item | O(1) | O(k), follow k pointers |
| Insert/remove at the front | O(n) | **O(1)** |
| Insert/remove next to a node you already have | O(n) | **O(1)** |
| Memory per item | just the item | item + pointer(s) |
| Speed of scanning in practice | very fast (side by side) | slower (scattered, chapter 1) |

A **doubly linked list** stores both "next" and "previous" pointers, so you can remove a node in O(1) when you hold just that node.

When are linked lists the right choice? When you constantly add and remove items in the middle and already hold a reference to the position, like the **recently-used list in an LRU cache** (next chapter), or the operating system's lists of waiting processes. For everyday "list of things", arrays usually win because they're so much friendlier to the CPU's caches.

> [!NOTE] **The sentinel trick.** Linked list code is full of special cases: empty list, removing the head, removing the tail. Put a permanent dummy node at each end (a **sentinel**) and the special cases disappear, every real node always has a node before and after it.

Classic linked-list techniques worth knowing:

- **Reverse a list** by walking it once and flipping each pointer.
- **Detect a cycle** with two pointers, one moving one step at a time and one moving two (the "tortoise and hare"). If there's a loop, the fast one eventually laps the slow one.
- **Find the middle** the same way: when the fast pointer reaches the end, the slow one is in the middle.

```python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:          # the hare lapped the tortoise
            return True
    return False
```

## Stacks: last in, first out

> [!ANALOGY] A stack of plates. You add plates on top and take plates from the top. The last plate you put down is the first one you pick up.

A **stack** supports **push** (add to the top) and **pop** (remove from the top), both O(1). An array with additions and removals at the end is a perfect stack.

Stacks are everywhere:

- **Undo** in every editor: each action is pushed; Undo pops the most recent.
- **Back button** in your browser.
- **Function calls**: every call pushes a frame on the call stack; returning pops it (OS track). Infinite recursion fills it up, a **stack overflow**.
- **Checking brackets** in code editors and compilers:

```python
def brackets_balanced(text):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in text:
        if ch in '([{':
            stack.append(ch)                           # remember what we opened
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:  # must close the most recent opener
                return False
    return not stack                                   # nothing left unclosed

brackets_balanced("if (a[0] == {b}) {}")   # True
brackets_balanced("(]")                     # False
```

### The monotonic stack

A powerful variation keeps the stack's items in increasing (or decreasing) order. It answers questions like **"for each day, how many days until a warmer temperature?"** in a single pass:

```python
def days_until_warmer(temps):
    answer = [0] * len(temps)
    stack = []                                   # indexes of days still waiting for a warmer day
    for today, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:    # today is warmer than those waiting days
            past = stack.pop()
            answer[past] = today - past
        stack.append(today)
    return answer

days_until_warmer([30, 31, 28, 27, 35])  # [1, 3, 2, 1, 0]
```

Each day is pushed once and popped at most once, so it's O(n), even though there's a loop inside a loop.

## Queues: first in, first out

> [!ANALOGY] A line at a ticket counter. People join at the back and are served from the front, in the order they arrived.

A **queue** supports **enqueue** (add to the back) and **dequeue** (take from the front), both O(1) when built properly. Don't use a plain array with removal from the front (the slow bug at the top of this chapter); use:

- a **deque** (double-ended queue) from your language's library, Python's `collections.deque`, Java's `ArrayDeque`;
- or a **circular buffer**: a fixed array where "front" and "back" positions wrap around to the start, like a running track. Network cards, audio systems and logging libraries use these because they never need to allocate memory.

Queues model anything that waits its turn: print jobs, customer support tickets, tasks in a thread pool (OS track), messages in Kafka (System Design track), and the "breadth-first search" algorithm (Algorithms track).

A **deque** allows adding and removing at **both** ends, which unlocks another classic: the **sliding window maximum** ("the highest price in every 5-minute window"), solved in O(n) by keeping a deque of candidates in decreasing order.

> [!RECAP]
> - **Arrays** store items side by side: O(1) access by position, O(1) amortized append, O(n) insert/remove in the middle. Usually the fastest choice in practice.
> - **Strings** are arrays of characters, with Unicode complications; they're immutable in most languages, so build them with join/builders, not `+=` in a loop.
> - **Prefix sums** answer range-total questions in O(1).
> - **Linked lists** give O(1) insert/remove when you hold the position, but O(n) access and poor cache behavior.
> - **Stacks** (last in, first out) power undo, the back button, function calls and bracket checking; **monotonic stacks** solve "next greater" problems in O(n).
> - **Queues** (first in, first out) model waiting lines; use a deque or circular buffer, never `pop(0)` on an array.

> [!INTERVIEW] Bread-and-butter questions: reverse a linked list, detect a cycle, merge two sorted lists, valid brackets, a min-stack (a stack that also returns its minimum in O(1)), a queue built from two stacks, sliding window maximum, and "next greater element" with a monotonic stack.

::quiz {"q":"Building a 100,000-line report with report += line inside a loop is slow in Python/Java. Why?","options":["Python is slow","Strings are immutable, so each += copies the whole string so far, O(n²) in total","The loop is infinite","Memory runs out immediately"],"answer":1,"explain":"Collect pieces and join once for O(n)."}

::quiz {"q":"Which structure does a browser's Back button behave like?","options":["Queue","Stack","Hash map","Tree"],"answer":1,"explain":"The most recently visited page is the first one you go back to: last in, first out."}

::quiz {"q":"Why is removing from the front of a Python list with pop(0) slow for large lists?","options":["It sorts the list","Every remaining item has to shift one position left, O(n)","It copies the list twice","It's actually fast"],"answer":1,"explain":"Use collections.deque for O(1) removal from the front."}
