---
title: Case Studies V — Notification Service, Cache Library and Meeting Scheduler
summary: Three machine-coding problems about building reusable components — a notification service that sends through many channels with templates, preferences and retries; a generic in-memory cache library with pluggable eviction policies (LRU, LFU) and TTL; and a meeting room scheduler that books rooms and finds common free time — each with a class diagram, core code and discussion points.
---

::widget Scene {"title": "LRU cache: O(1) get and put", "sub": "a hash map for lookup plus a doubly linked list for recency — capacity 3", "nodes": [{"id": "list", "kind": "cells", "label": "list: most recent → least recent", "x": 0.0, "y": 0.0, "values": ["", "", ""]}, {"id": "map", "kind": "cells", "label": "hash map keys", "x": 5.58, "y": 5.58, "values": ["", "", ""]}], "metrics": [["op", "Operation"], ["ret", "Returns"], ["evict", "Evicted"]], "steps": [{"short": "Why", "tag": "Idea", "title": "Two needs, two structures", "body": "<p>Find a key fast → hash map. Know which key is least recently used, and move keys to \"most recent\" fast → doubly linked list. The map points to list nodes.</p>", "metrics": {"op": ["—"], "ret": ["—"], "evict": ["—"]}}, {"short": "Put A", "tag": "put", "title": "put(A, 1): new node at the head", "body": "<p>Insert into the map and at the front of the list.</p>", "set": {"list": {"marks": {"0": "blue"}, "ptr": {}, "values": ["A", "", ""]}, "map": {"marks": {"0": "blue"}, "ptr": {}, "values": ["A", "", ""]}}, "metrics": {"op": ["put(A)"]}}, {"short": "Put B", "tag": "put", "title": "put(B, 2), then put(C, 3)", "body": "<p>Newest at the head. Now the cache is full.</p>", "set": {"list": {"marks": {"0": "blue"}, "ptr": {}, "values": ["C", "B", "A"]}, "map": {"marks": {}, "ptr": {}, "values": ["A", "B", "C"]}}, "metrics": {"op": ["put(B), put(C)"]}}, {"short": "Get A", "tag": "get", "title": "get(A): map finds A's node instantly", "body": "<p>Return 1, and since A was just used, move it to the head: unlink (fix neighbours' pointers), relink at front. O(1).</p>", "set": {"list": {"marks": {"0": "green"}, "ptr": {}, "values": ["A", "C", "B"]}, "map": {"marks": {"0": "green"}, "ptr": {}, "values": ["A", "B", "C"]}}, "metrics": {"op": ["get(A)"], "ret": ["1"]}}, {"short": "Put D", "tag": "evict", "title": "put(D, 4) while full: evict the tail", "body": "<p>The tail (B) is the least recently used. Remove it from the list AND from the map.</p>", "set": {"list": {"marks": {"2": "red"}, "ptr": {}, "values": ["A", "C", "B"]}, "map": {"marks": {"1": "red"}, "ptr": {}, "values": ["A", "B", "C"]}}, "metrics": {"op": ["put(D)"], "evict": ["B"]}}, {"short": "Insert D", "tag": "put", "title": "Insert D at the head", "body": "<p>Size stays at capacity.</p>", "set": {"list": {"marks": {"0": "blue"}, "ptr": {}, "values": ["D", "A", "C"]}, "map": {"marks": {"1": "blue"}, "ptr": {}, "values": ["A", "D", "C"]}}}, {"short": "Get B", "tag": "miss", "title": "get(B): not in the map → miss", "body": "<p>Return -1 (or load from the source and put it).</p>", "set": {"list": {"marks": {}, "ptr": {}, "values": ["D", "A", "C"]}, "map": {"marks": {}, "ptr": {}, "values": ["A", "D", "C"]}}, "metrics": {"op": ["get(B)"], "ret": ["-1 (miss)"], "evict": ["—"]}}, {"short": "Update", "tag": "put", "title": "put(C, 30): key exists → update value and move to head", "body": "<p>No eviction when overwriting.</p>", "set": {"list": {"marks": {"0": "green"}, "ptr": {}, "values": ["C", "D", "A"]}}, "metrics": {"op": ["put(C, 30)"], "ret": ["—"]}}, {"short": "Sentinels", "tag": "Detail", "title": "Dummy head and tail nodes", "body": "<p>With sentinels, insert and remove never special-case an empty list or the ends. Fewer bugs in interviews.</p>"}, {"short": "Thread", "tag": "Concurrency", "title": "Make it thread-safe", "body": "<p>Even get() mutates the list, so a read lock isn't enough. Use one lock, or shard the cache into N independent LRUs by key hash to reduce contention.</p>"}, {"short": "Library", "tag": "Extend", "title": "Turning it into a library", "body": "<p>Eviction policy as a strategy (LRU, LFU, FIFO), TTL per entry, size by bytes not count, hit/miss metrics, and a loader for cache-aside.</p>", "note": {"kind": "key", "text": "LRU = hash map (key → node) + doubly linked list (recency). Every operation is O(1). Remember to delete from both on eviction."}}]}




## Case study 19: Notification service

> [!STORY] An online pharmacy sends order confirmations by email, delivery updates by SMS and push, and payment receipts on WhatsApp. Each product team wrote its own code for each channel, so when the company switched SMS providers it had to change eleven services, and some customers who had opted out of marketing SMS still received them. A single notification component — with channels behind one interface, templates, user preferences and retries — fixes all of that.

### Requirements

- Send a notification of a given **type** (order shipped, OTP, promotion) to a user through one or more **channels** (email, SMS, push, WhatsApp).
- Render **templates** with variables ("Hi {{name}}, your order {{orderId}} has shipped").
- Respect **user preferences** (opt-outs per type and channel; quiet hours) — except critical ones like OTPs.
- **Retry** failures with backoff; fall back to another provider or channel; never send duplicates for the same event.
- Easy to add a new channel or provider.

### The design

::widget ClassDiagram {"title":"Notification service — class diagram","what":"The classes of a notification component. A dispatcher checks preferences, renders a template, and hands the message to a channel; each channel hides its providers behind one interface.","steps":["Click NotificationService first.","Find where opt-outs and quiet hours are enforced.","Notice how adding a Telegram channel would need only one new class."],"classes":[{"name":"NotificationService","col":1,"row":0,"fields":["- preferences: PreferenceStore","- templates: TemplateEngine","- channels: Map<ChannelType, Channel>","- dedupe: IdempotencyStore"],"methods":["+ notify(request: NotificationRequest): List<DeliveryResult>"],"desc":"Entry point. For each requested channel: skip duplicates, check preferences, render the template, send, record the result. Failures are queued for retry."},{"name":"NotificationRequest","col":0,"row":0,"fields":["- eventId","- userId","- type: NotificationType","- channels","- data: Map"],"methods":[],"desc":"What to send. eventId makes sending idempotent: the same 'order 123 shipped' event is never delivered twice."},{"name":"PreferenceStore","col":0,"row":1,"fields":["- optOuts: Map<User, Set<(Type, Channel)>>","- quietHours"],"methods":["+ allowed(user, type, channel, now): bool"],"desc":"User choices. Critical types (OTP, security alerts) bypass opt-outs; promotions respect quiet hours."},{"name":"TemplateEngine","col":0,"row":2,"fields":["- templates: Map<(Type, Channel, Locale), Template>"],"methods":["+ render(type, channel, locale, data): Message"],"desc":"Per-channel, per-language templates: an email has a subject and HTML body; an SMS must fit 160 characters."},{"name":"Channel","stereo":"interface","col":2,"row":1,"fields":[],"methods":["+ send(user, message): DeliveryResult"],"desc":"One interface for every channel, so the service never knows provider details."},{"name":"SmsChannel","col":2,"row":2,"fields":["- providers: List<SmsProvider>"],"methods":["+ send(user, message)"],"desc":"Tries the primary provider, falls back to the secondary on failure (chain of responsibility). Similar classes: EmailChannel, PushChannel, WhatsAppChannel."},{"name":"SmsProvider","stereo":"interface","col":3,"row":2,"fields":[],"methods":["+ deliver(phone, text)"],"desc":"Adapter pattern: wraps each vendor's API (Twilio, Gupshup, MSG91) behind one method. Switching vendors is a configuration change."},{"name":"RetryQueue","col":3,"row":0,"fields":["- delayed jobs"],"methods":["+ schedule(request, channel, attempt)"],"desc":"Failed sends are retried with exponential backoff and jitter, up to a limit, then sent to a dead-letter list for investigation."}],"relations":[["NotificationService","PreferenceStore","uses"],["NotificationService","TemplateEngine","uses"],["NotificationService","Channel","aggregation"],["NotificationService","RetryQueue","uses"],["NotificationService","NotificationRequest","uses"],["SmsChannel","Channel","implements"],["SmsChannel","SmsProvider","aggregation"]]}

### Core logic

```python
class NotificationService:
    def notify(self, req):
        results = []
        for ch in req.channels:
            key = f"{req.event_id}:{ch}"
            if not self.dedupe.first_time(key):                   # already sent for this event
                continue
            if not self.prefs.allowed(req.user_id, req.type, ch, now()):
                results.append(DeliveryResult(ch, "SKIPPED_BY_PREFERENCE")); continue
            user = self.users.get(req.user_id)
            msg = self.templates.render(req.type, ch, user.locale, {**req.data, "name": user.name})
            try:
                results.append(self.channels[ch].send(user, msg))
            except TransientError:
                self.retry.schedule(req, ch, attempt=1)
                results.append(DeliveryResult(ch, "RETRY_SCHEDULED"))
        return results

class SmsChannel:
    def send(self, user, msg):
        last_error = None
        for provider in self.providers:                           # primary, then fallbacks
            try:
                provider.deliver(user.phone, msg.text)
                return DeliveryResult("SMS", "SENT", provider=provider.name)
            except ProviderError as e:
                last_error = e
        raise TransientError(last_error)
```

### Discussion points

- **Patterns:** strategy/interface per channel, **adapter** per vendor, chain of responsibility for fallbacks, template method for rendering.
- **Idempotency** by event ID; **retries** with backoff; **dead-letter** handling.
- **Priorities:** OTPs go through a fast, separate queue so a marketing blast can't delay them.
- **Rate limits** per user (no more than N promotional messages per day) and per provider.
- At system scale, this becomes the notification-service design in System Design track chapter 9 — queues, workers, provider webhooks for delivery status.

## Case study 20: Cache library with pluggable eviction

> [!STORY] Three teams in one company each wrote their own in-memory cache: one evicts the least recently used item, one never evicts and slowly runs out of memory, and one has a subtle threading bug. The platform team is asked to build **one** cache library everybody can use, where the eviction policy, capacity and expiry are configuration — and that's safe when many threads use it at once.

### Requirements

- `get(key)`, `put(key, value, ttl=None)`, `delete(key)` — all O(1) on average.
- A fixed **capacity**; when full, evict according to a **policy**: LRU (least recently used), LFU (least frequently used), FIFO, and easy to add more.
- Optional **time-to-live** per entry.
- **Thread-safe**; expose hit/miss statistics.

### The design

::widget ClassDiagram {"title":"Cache library — class diagram","what":"A generic cache whose storage, eviction policy and expiry are separate pieces. The cache asks the policy which key to evict; policies track access order or frequency in O(1).","steps":["Click Cache first.","Click LRUPolicy and LFUPolicy to compare how each finds a victim in O(1).","Find where thread safety is handled."],"classes":[{"name":"Cache<K,V>","col":1,"row":0,"fields":["- store: Map<K, Entry<V>>","- capacity: int","- policy: EvictionPolicy<K>","- lock: RLock","- stats: CacheStats","- clock: Clock"],"methods":["+ get(key): V?","+ put(key, value, ttl?)","+ delete(key)"],"desc":"The public API. Holds entries in a hash map; notifies the policy on every access; asks it for a victim when full. A lock (or striped locks) makes it thread-safe."},{"name":"Entry<V>","col":0,"row":1,"fields":["- value: V","- expiresAt: time?"],"methods":["+ expired(now): bool"],"desc":"A value plus optional expiry. Expired entries are removed lazily on access and periodically by a sweeper."},{"name":"EvictionPolicy<K>","stereo":"interface","col":2,"row":0,"fields":[],"methods":["+ onAccess(key)","+ onInsert(key)","+ onRemove(key)","+ victim(): K"],"desc":"Strategy pattern: the cache doesn't know HOW victims are chosen. Each policy maintains its own O(1) structure."},{"name":"LRUPolicy","col":1,"row":2,"fields":["- order: DoublyLinkedList<K>","- nodes: Map<K, Node>"],"methods":["+ onAccess: move to front","+ victim: tail"],"desc":"Most recently used at the front; the tail is the victim. Hash map to node gives O(1) moves (try the LRU figure in the DSA track)."},{"name":"LFUPolicy","col":2,"row":2,"fields":["- freq: Map<K, int>","- buckets: Map<int, LinkedHashSet<K>>","- minFreq: int"],"methods":["+ onAccess: move to freq+1 bucket","+ victim: oldest in minFreq bucket"],"desc":"Keys grouped by access count; ties broken by recency. Tracking the minimum frequency keeps every operation O(1)."},{"name":"FIFOPolicy","col":3,"row":2,"fields":["- queue: LinkedHashSet<K>"],"methods":["+ victim: oldest inserted"],"desc":"Simplest policy: ignores accesses."},{"name":"CacheStats","col":0,"row":0,"fields":["- hits","- misses","- evictions"],"methods":["+ hitRate()"],"desc":"Observability: a cache you can't measure can't be tuned."}],"relations":[["Cache<K,V>","Entry<V>","composition"],["Cache<K,V>","EvictionPolicy<K>","uses"],["Cache<K,V>","CacheStats","composition"],["LRUPolicy","EvictionPolicy<K>","implements"],["LFUPolicy","EvictionPolicy<K>","implements"],["FIFOPolicy","EvictionPolicy<K>","implements"]]}

### Core logic

```python
import threading, time
from collections import OrderedDict

class LRUPolicy:
    def __init__(self): self.order = OrderedDict()
    def on_insert(self, k): self.order[k] = None
    def on_access(self, k): self.order.move_to_end(k)
    def on_remove(self, k): self.order.pop(k, None)
    def victim(self): return next(iter(self.order))          # least recently used

class Cache:
    def __init__(self, capacity, policy, clock=time.monotonic):
        self.capacity, self.policy, self.clock = capacity, policy, clock
        self.store = {}                                       # key -> (value, expires_at)
        self.lock = threading.RLock()
        self.hits = self.misses = 0

    def get(self, key):
        with self.lock:
            item = self.store.get(key)
            if item is None or (item[1] is not None and item[1] <= self.clock()):
                if item: self._remove(key)                    # lazily drop expired entries
                self.misses += 1
                return None
            self.policy.on_access(key)
            self.hits += 1
            return item[0]

    def put(self, key, value, ttl=None):
        with self.lock:
            expires = self.clock() + ttl if ttl else None
            if key in self.store:
                self.store[key] = (value, expires); self.policy.on_access(key); return
            if len(self.store) >= self.capacity:
                self._remove(self.policy.victim())
            self.store[key] = (value, expires); self.policy.on_insert(key)

    def _remove(self, key):
        self.store.pop(key, None); self.policy.on_remove(key)
```

### Discussion points

- **Strategy pattern** isolates eviction; the **clock is injected**, so TTL behaviour is testable without sleeping.
- **Thread safety:** one lock is simple; under heavy contention use **lock striping** (several shards, each with its own lock and capacity share) — like Java's ConcurrentHashMap and Caffeine.
- **Cache stampede:** many threads missing the same key at once all recompute it. Offer `get_or_load(key, loader)` that lets one thread load while others wait (single-flight).
- **Better policies:** modern caches (Caffeine's W-TinyLFU) combine recency and frequency with a small probabilistic frequency sketch (DSA track, chapter 9).
- **Memory accounting:** capacity by bytes (weigher function) rather than count for values of varying size.

## Case study 21: Meeting room scheduler

> [!STORY] An office with 40 meeting rooms of different sizes keeps running into the same problems: two teams turn up for the same room, a 12-person meeting is booked into a 4-person room, and finding a slot where six busy people are all free takes a dozen emails. A scheduler that books rooms safely and finds common free time solves both.

### Requirements

- Rooms with capacity and equipment (video conferencing, whiteboard).
- **Book** a room for a time interval for a meeting with attendees; no overlapping bookings per room.
- **Find available rooms** for an interval with at least N seats and required equipment.
- **Find common free slots** of a given length for a set of attendees within a working-hours window.
- Cancel and reschedule; recurring meetings (weekly stand-up) as an extension.

### The design

::widget ClassDiagram {"title":"Meeting room scheduler — class diagram","what":"Classes for booking rooms and finding free time. Each room and each person has a calendar of non-overlapping intervals; the scheduler queries and books against them.","steps":["Click Scheduler first.","Find which class enforces 'no overlapping bookings'.","Follow findCommonFreeSlots: merge busy intervals, then look at the gaps."],"classes":[{"name":"Scheduler","col":1,"row":0,"fields":["- rooms: List<Room>","- calendars: Map<OwnerId, Calendar>","- roomSelector: RoomSelectionStrategy"],"methods":["+ availableRooms(interval, seats, equipment)","+ book(organizer, attendees, interval, needs): Meeting","+ findCommonFreeSlots(people, window, duration): List<Interval>","+ cancel(meetingId)"],"desc":"Coordinates booking and searching. Booking adds the meeting to the room's calendar and every attendee's calendar."},{"name":"Calendar","col":0,"row":1,"fields":["- intervals: SortedList<Interval>","- lock"],"methods":["+ isFree(interval): bool","+ add(interval, meetingId): bool","+ busyIn(window): List<Interval>"],"desc":"Non-overlapping, sorted intervals. isFree uses binary search to check only neighbours: O(log n). add() checks and inserts atomically."},{"name":"Room","col":1,"row":1,"fields":["- id","- name","- capacity","- equipment: Set"],"methods":["+ fits(seats, equipment): bool"],"desc":"A bookable room with its own Calendar."},{"name":"Meeting","col":2,"row":1,"fields":["- id","- organizer","- attendees","- roomId","- interval","- recurrence?"],"methods":[],"desc":"A booked meeting. Recurrence rules (every Monday 10:00) expand into individual occurrences."},{"name":"Interval","col":0,"row":2,"fields":["- start","- end (exclusive)"],"methods":["+ overlaps(other)","+ length()"],"desc":"Half-open time interval (Algorithms track, chapter 9)."},{"name":"RoomSelectionStrategy","stereo":"interface","col":2,"row":0,"fields":[],"methods":["+ choose(candidates, seats): Room"],"desc":"Strategy: pick the smallest room that fits (keeps big rooms free), the nearest to the organizer, or by preference."}],"relations":[["Scheduler","Room","aggregation"],["Scheduler","Calendar","aggregation"],["Scheduler","RoomSelectionStrategy","uses"],["Room","Calendar","composition"],["Calendar","Interval","aggregation"],["Meeting","Interval","composition"]]}

### Core logic

```python
import bisect, threading

class Calendar:
    def __init__(self):
        self.starts, self.items = [], []               # parallel lists sorted by start
        self.lock = threading.Lock()

    def _free(self, s, e):
        i = bisect.bisect_left(self.starts, s)
        if i > 0 and self.items[i - 1][1] > s: return False     # previous ends after we start
        if i < len(self.items) and self.items[i][0] < e: return False   # next starts before we end
        return True

    def add(self, s, e, meeting_id):
        with self.lock:
            if not self._free(s, e): return False
            i = bisect.bisect_left(self.starts, s)
            self.starts.insert(i, s); self.items.insert(i, (s, e, meeting_id))
            return True

def common_free_slots(calendars, window_start, window_end, duration):
    busy = sorted((s, e) for cal in calendars for (s, e, _) in cal.items
                  if s < window_end and e > window_start)
    free, cursor = [], window_start
    for s, e in busy:                                   # walk merged busy time, collecting gaps
        if s - cursor >= duration:
            free.append((cursor, s))
        cursor = max(cursor, e)
    if window_end - cursor >= duration:
        free.append((cursor, window_end))
    return free
```

### Discussion points

- **Booking atomicity across several calendars** (room + attendees): lock calendars in a consistent order (by ID) to avoid deadlock, or treat attendees' calendars as soft (show conflicts) and only the room as a hard constraint — which is what real calendar products do.
- **Room choice** as a strategy; best-fit by capacity keeps large rooms available.
- **Free-time search** is merge-intervals-and-find-gaps (Algorithms track, chapter 9), respecting working hours and time zones.
- **Recurring meetings:** store the rule (RFC 5545 RRULE style) plus exceptions; expand occurrences within the queried window.
- **Time zones:** store times in UTC; convert for display; be careful with daylight-saving transitions for recurring meetings.

> [!RECAP]
> - **Notification service:** channel interface + vendor **adapters**, templates, preference checks, idempotency by event ID, retries with fallbacks and priorities.
> - **Cache library:** hash map + pluggable **eviction strategies** (LRU with a linked hash map, LFU with frequency buckets), TTL with an injected clock, locking or striping, stampede protection.
> - **Meeting scheduler:** sorted interval calendars with O(log n) conflict checks, consistent lock ordering, best-fit room strategy, merge-and-gap free-time search.

> [!INTERVIEW] These "build a reusable component" problems test interfaces and extensibility: name the patterns you use (strategy, adapter, observer), show where invariants are enforced, write O(1)/O(log n) core operations, and discuss thread safety.

::quiz {"q":"How do you switch SMS vendors without touching NotificationService?","options":["Rewrite the service","Wrap each vendor behind a common provider interface (adapter) and change configuration","Add an if/else per vendor","Use email instead"],"answer":1,"explain":"The service only knows the Channel and Provider interfaces."}

::quiz {"q":"What makes LFU eviction O(1)?","options":["Sorting keys by frequency on every access","Buckets of keys per frequency plus tracking the minimum frequency","A binary search tree","Scanning all keys"],"answer":1,"explain":"Moving a key to the next bucket and evicting from the min bucket are both O(1)."}

::quiz {"q":"How do you find a slot when several people are all free?","options":["Try every minute of the day","Merge everyone's busy intervals in sorted order and take the gaps long enough for the meeting","Ask each person","Pick a random time"],"answer":1,"explain":"Classic merge-intervals-and-gaps."}
