---
title: "Case Studies III: Chess, Snake & Ladder, Logger, Pub-Sub, KV Store, File System, ATM, Task Scheduler"
summary: Eight more machine-coding problems — game modeling (chess move validation, snake and ladder), infrastructure components (logging framework with chain of responsibility, in-memory pub-sub, a key-value store with TTL and transactions, an in-memory file system with Composite), an ATM with state and cash dispensing, and a delayed task scheduler.
---

::widget Scene {"title": "Designing a rate limiter class", "sub": "interface, token bucket internals, lazy refill, thread safety, distribution", "nodes": [{"id": "api", "kind": "server", "label": "API handler", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "rl", "kind": "doc", "label": "RateLimiter", "x": 8.22, "y": -0.78}, {"id": "reg", "kind": "cube", "label": "Bucket registry (map)", "x": 12.72, "y": -5.28, "color": "purple"}, {"id": "bk", "kind": "cube", "label": "TokenBucket (client 42)", "x": 17.22, "y": -9.78, "color": "orange"}, {"id": "clk", "kind": "cube", "label": "Clock", "x": 11.33, "y": -15.67, "color": "teal"}, {"id": "redis", "kind": "cache", "label": "Redis (multi-server)", "x": 18.92, "y": 0.92, "color": "red"}], "links": [["api", "rl"], ["rl", "reg"], ["reg", "bk"], ["bk", "clk", {"dashed": true}], ["reg", "redis", {"dashed": true}]], "metrics": [["tok", "Tokens"], ["res", "Last call"], ["note", "Note"]], "steps": [{"short": "API", "tag": "Interface", "title": "Start with the interface: allow(clientId) → bool", "body": "<p>Callers shouldn't know whether it's a token bucket or a sliding window. Config: capacity 5, refill 1 token/s.</p>", "show": ["api", "rl"], "metrics": {"tok": ["—"], "res": ["—"], "note": ["—"]}}, {"short": "Lookup", "tag": "Registry", "title": "Find (or create) the bucket for client 42", "body": "<p>A concurrent map from clientId to bucket. computeIfAbsent creates one atomically on first use.</p>", "show": ["api", "rl", "reg", "bk"], "flow": [[["api", "rl", "reg", "bk"], "#3b82f6", "allow(42)"]], "metrics": {"tok": ["5 (new, full)"]}}, {"short": "Take", "tag": "Bucket", "title": "A request takes a token if one is available", "body": "<p>5 → 4. Allowed.</p>", "set": {"bk": {"badge": "4 tokens"}}, "flow": [["bk", "api", "#22c55e", "true"]], "metrics": {"tok": ["4"], "res": ["allowed", "good"]}}, {"short": "Burst", "tag": "Bucket", "title": "A burst of 4 more requests drains it to 0", "body": "<p>Bursts up to capacity are allowed — that's the point of a bucket.</p>", "set": {"bk": {"badge": "0 tokens"}}, "metrics": {"tok": ["0"]}}, {"short": "Reject", "tag": "Bucket", "title": "The next request is rejected: HTTP 429", "body": "<p>Return Retry-After so well-behaved clients know when to come back.</p>", "flow": [["bk", "api", "#ef4444", "false → 429"]], "metrics": {"res": ["rejected", "bad"]}}, {"short": "Lazy", "tag": "Refill", "title": "No background thread refills buckets", "body": "<p>On each call: tokens = min(capacity, tokens + elapsed × rate), using the last-refill timestamp. Millions of idle clients cost nothing.</p>", "show": ["api", "rl", "reg", "bk", "clk"], "flow": [["bk", "clk", "#14b8a6", "now()"]], "metrics": {"note": ["lazy refill on access"]}}, {"short": "Later", "tag": "Refill", "title": "3 seconds later: 3 tokens", "body": "<p>Allowed again.</p>", "set": {"bk": {"badge": "3 → 2 tokens"}}, "flow": [["bk", "api", "#22c55e", "true"]], "metrics": {"tok": ["2"], "res": ["allowed", "good"]}}, {"short": "Threads", "tag": "Concurrency", "title": "Two threads for client 42 at once", "body": "<p>Refill-then-take must be atomic: lock the bucket (or use compare-and-swap on a packed state). Different clients never block each other.</p>", "set": {"bk": {"badge": "synchronized"}}}, {"short": "Clock", "tag": "Testing", "title": "Inject the Clock", "body": "<p>Tests advance a fake clock by 3 s instead of sleeping. Deterministic and instant.</p>", "focus": ["clk"], "metrics": {"note": ["fake clock in tests"]}}, {"short": "Evict", "tag": "Memory", "title": "Evict buckets idle for an hour", "body": "<p>Otherwise the map grows with every client ever seen.</p>"}, {"short": "Many", "tag": "Distribution", "title": "Several API servers: keep buckets in Redis", "body": "<p>A small Lua script does refill + take atomically on the Redis server.</p>", "show": ["api", "rl", "reg", "bk", "clk", "redis"], "flow": [["reg", "redis", "#ef4444", "EVAL take(42)"]], "metrics": {"note": ["shared limits across servers"]}}, {"short": "Recap", "tag": "Design", "title": "Design summary", "body": "<p>Interface + pluggable algorithms (token bucket, sliding window), per-client buckets in a concurrent map, lazy refill, injected clock, eviction, optional Redis backend.</p>", "note": {"kind": "key", "text": "Talk through: API, algorithm state, refill math, atomicity, memory growth, testing, and going distributed."}}]}




## Case study 8: Chess

> [!STORY] Two players face each other across a chessboard app. Each move must be checked: is it your turn, can that piece move that way, is the path clear, and — the subtle one — does the move leave your own king in check? Then the app must notice checkmate and stalemate, and let you undo a move.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Chess — class diagram", "classes": [{"name": "Game", "col": 1, "row": 0, "fields": ["- board: Board", "- turn: Color", "- history: Deque<Move>", "- status: Status"], "methods": ["+ move(from, to)", "+ undo()"], "desc": "Enforces the global rules: whose turn, legal moves only, never leave your king in check, detect checkmate and stalemate."}, {"name": "Board", "col": 1, "row": 1, "fields": ["- cells: Piece[8][8]"], "methods": ["+ at(pos)", "+ apply(from, to): Move", "+ undo(move)", "+ isInCheck(color)", "+ legalMoves(color)"], "desc": "The 8×8 grid. Can apply a move tentatively and undo it, which is how 'does this leave my king in check?' is tested."}, {"name": "Piece", "col": 1, "row": 2, "fields": ["- color: Color"], "methods": ["+ candidateMoves(board, from)"], "desc": "Each piece type knows its own movement — polymorphism instead of a giant switch on piece type.", "stereo": "abstract"}, {"name": "Rook", "col": 0, "row": 3, "fields": [], "methods": ["+ candidateMoves(...)"], "desc": "Slides along rows and columns until blocked."}, {"name": "Knight", "col": 1, "row": 3, "fields": [], "methods": ["+ candidateMoves(...)"], "desc": "Jumps in an L shape; isn't blocked by pieces in between."}, {"name": "Pawn", "col": 2, "row": 3, "fields": [], "methods": ["+ candidateMoves(...)"], "desc": "Moves forward, captures diagonally, plus special rules: double first step, en passant, promotion."}, {"name": "Move", "col": 2, "row": 0, "fields": ["- from, to", "- piece, captured", "- promotion"], "methods": [], "desc": "A record of one move: enough information to undo it (Command / Memento)."}, {"name": "Player", "col": 0, "row": 0, "fields": [], "methods": ["+ chooseMove(game): Move"], "desc": "Human or computer — an interface, so an AI player can be dropped in.", "stereo": "interface"}], "relations": [["Game", "Board", "composition"], ["Board", "Piece", "aggregation", "holds"], ["Rook", "Piece", "inherits"], ["Knight", "Piece", "inherits"], ["Pawn", "Piece", "inherits"], ["Game", "Move", "association", "history"], ["Game", "Player", "uses"]]}


### Modeling

```text
Game ─ Board (8×8 Cells) ─ Pieces (King, Queen, Rook, Bishop, Knight, Pawn) ─ Players (White/Black) ─ Move history ─ Status (ACTIVE, CHECK, CHECKMATE, STALEMATE, RESIGNED, DRAW)
```

Each piece type knows its **movement rule** (polymorphism — no `switch` on type), and the `Game` validates moves against **global rules** (turn order, path blocking, not leaving your own king in check, castling, en passant, promotion).

```java
enum Color { WHITE, BLACK; Color opponent() { return this == WHITE ? BLACK : WHITE; } }
record Pos(int r, int c) { boolean valid() { return r >= 0 && r < 8 && c >= 0 && c < 8; } }
record Move(Pos from, Pos to, Piece piece, Piece captured, PieceType promotion) {}

abstract sealed class Piece permits King, Queen, Rook, Bishop, Knight, Pawn {
    final Color color; Piece(Color c) { color = c; }
    /** Pseudo-legal destinations (ignores check). */
    abstract List<Pos> candidateMoves(Board b, Pos from);
    protected List<Pos> slide(Board b, Pos from, int[][] dirs) {          // shared by Rook, Bishop, Queen
        List<Pos> out = new ArrayList<>();
        for (int[] d : dirs) {
            Pos p = new Pos(from.r() + d[0], from.c() + d[1]);
            while (p.valid()) {
                Piece q = b.at(p);
                if (q == null) out.add(p);
                else { if (q.color != color) out.add(p); break; }      // capture, then stop
                p = new Pos(p.r() + d[0], p.c() + d[1]);
            }
        }
        return out;
    }
}
final class Rook extends Piece { Rook(Color c) { super(c); }
    List<Pos> candidateMoves(Board b, Pos f) { return slide(b, f, new int[][]{{1,0},{-1,0},{0,1},{0,-1}}); } }
final class Bishop extends Piece { Bishop(Color c) { super(c); }
    List<Pos> candidateMoves(Board b, Pos f) { return slide(b, f, new int[][]{{1,1},{1,-1},{-1,1},{-1,-1}}); } }
final class Knight extends Piece { Knight(Color c) { super(c); }
    List<Pos> candidateMoves(Board b, Pos f) {
        int[][] j = {{1,2},{2,1},{-1,2},{-2,1},{1,-2},{2,-1},{-1,-2},{-2,-1}};
        return Arrays.stream(j).map(d -> new Pos(f.r() + d[0], f.c() + d[1]))
            .filter(p -> p.valid() && (b.at(p) == null || b.at(p).color != color)).toList(); } }
// Queen, King, Pawn similar (Pawn: forward 1/2 from start, diagonal captures, en passant, promotion)

final class Game {
    private final Board board = Board.standard(); private Color turn = Color.WHITE; private final Deque<Move> history = new ArrayDeque<>();
    public synchronized void move(Pos from, Pos to) {
        Piece p = board.at(from);
        if (p == null || p.color != turn) throw new IllegalMoveException("not your piece");
        if (!p.candidateMoves(board, from).contains(to)) throw new IllegalMoveException("piece can't move there");
        Move m = board.apply(from, to);                                        // tentatively apply
        if (board.isInCheck(turn)) { board.undo(m); throw new IllegalMoveException("king would be in check"); }
        history.push(m);
        turn = turn.opponent();
        if (board.legalMoves(turn).isEmpty()) status = board.isInCheck(turn) ? Status.CHECKMATE : Status.STALEMATE;
    }
    private Status status = Status.ACTIVE;
    public void undo() { if (!history.isEmpty()) { board.undo(history.pop()); turn = turn.opponent(); } }   // Command-style history
}
```

**Discussion**: legal-move generation = pseudo-legal moves filtered by "doesn't leave own king in check" (apply/undo); `isInCheck` scans whether any opponent piece attacks the king's square; special moves need extra state (castling rights, en-passant target); move history enables undo (Command/Memento) and PGN export; a `Player` interface with `HumanPlayer` and `AIPlayer` (minimax with alpha-beta) implementations; a clock per player (Strategy for time controls).

## Case study 9: Snake and Ladder (and turn-based games generally)

> [!STORY] The board game from childhood: roll the dice, move your token, climb ladders, slide down snakes, first to square 100 wins. It's simple enough to code in an evening — which is why interviewers use it to see whether you separate the **rules**, the **board** and the **dice** cleanly enough to change any one of them.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Snake and Ladder — class diagram", "classes": [{"name": "SnakeLadderGame", "col": 1, "row": 0, "fields": ["- board: Board", "- dice: Dice", "- turns: Deque<String>", "- positions: Map"], "methods": ["+ playTurn(): Optional<winner>"], "desc": "Runs turns in order: roll, move, apply any snake or ladder, check for a winner."}, {"name": "Board", "col": 0, "row": 1, "fields": ["- size: int", "- jumps: Map<Integer,Integer>"], "methods": ["+ resolve(pos): int"], "desc": "Snakes and ladders are the same thing — a 'jump' from one square to another — so they share one map. Validates that no jump starts at the final square."}, {"name": "Dice", "col": 2, "row": 1, "fields": [], "methods": ["+ roll(): int"], "desc": "An interface, so tests can use a dice with a fixed sequence of rolls.", "stereo": "interface"}, {"name": "RandomDice", "col": 2, "row": 2, "fields": ["- rng: Random", "- count: int"], "methods": ["+ roll()"], "desc": "Real dice: one or more random rolls added together."}, {"name": "RulesStrategy", "col": 1, "row": 1, "fields": [], "methods": ["+ nextPosition(pos, roll, board)"], "desc": "Optional: variant rules (exact landing on 100, extra turn on a six) without touching the game loop.", "stereo": "interface"}], "relations": [["SnakeLadderGame", "Board", "composition"], ["SnakeLadderGame", "Dice", "uses"], ["RandomDice", "Dice", "implements"], ["SnakeLadderGame", "RulesStrategy", "uses"]]}


```java
final class Board {
    private final int size; private final Map<Integer, Integer> jumps;               // snakes and ladders unified: start → end
    Board(int size, Map<Integer, Integer> snakes, Map<Integer, Integer> ladders) {
        this.size = size; this.jumps = new HashMap<>(snakes); this.jumps.putAll(ladders);
        jumps.forEach((s, e) -> { if (s < 1 || s >= size || e < 1 || e > size || s.equals(e)) throw new IllegalArgumentException("bad jump " + s + "→" + e); });
    }
    int resolve(int pos) { return jumps.getOrDefault(pos, pos); }
    int size() { return size; }
}
interface Dice { int roll(); }
final class RandomDice implements Dice { private final Random rng; private final int count;
    RandomDice(Random rng, int count) { this.rng = rng; this.count = count; }
    public int roll() { int s = 0; for (int i = 0; i < count; i++) s += 1 + rng.nextInt(6); return s; } }

final class SnakeLadderGame {
    private final Board board; private final Dice dice; private final Deque<String> turns; private final Map<String, Integer> pos = new HashMap<>();
    SnakeLadderGame(Board b, Dice d, List<String> players) { board = b; dice = d; turns = new ArrayDeque<>(players); players.forEach(p -> pos.put(p, 0)); }
    /** Plays one turn; returns the winner if the game ended. */
    Optional<String> playTurn() {
        String p = turns.pollFirst(); int roll = dice.roll(); int next = pos.get(p) + roll;
        if (next <= board.size()) pos.put(p, board.resolve(next));                       // overshoot → stay (common rule)
        if (pos.get(p) == board.size()) return Optional.of(p);
        turns.addLast(p);
        return Optional.empty();
    }
}
```

Points: snakes and ladders are the same abstraction (a jump); `Dice` is injectable (a fixed sequence for tests); rules that vary (exact landing, extra turn on 6, three 6s forfeit) become a `RulesStrategy`. **Tic-tac-toe** variant: check win in O(1) per move by keeping row/column/diagonal counters (+1 for X, −1 for O; |count| == n means a win).

## Case study 10: Logging framework

> [!STORY] Every serious application writes logs: "user 42 logged in", "payment failed: card declined". A logging library must let developers choose how much detail to record, send each message to several places (the console, a file, a monitoring service), format it as plain text or JSON — and never slow down the request that's being logged.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Logging framework — class diagram", "classes": [{"name": "Logger", "col": 1, "row": 0, "fields": ["- name: String", "- level: Level", "- appenders: List<Appender>"], "methods": ["+ info(msg)", "+ error(msg, t)", "+ log(level, msg, t)"], "desc": "What application code calls. Drops messages below its level immediately (cheap), otherwise creates a LogEvent and hands it to every appender."}, {"name": "Appender", "col": 1, "row": 1, "fields": [], "methods": ["+ append(event)"], "desc": "A destination for log events. An interface, so new destinations can be added without changing Logger.", "stereo": "interface"}, {"name": "ConsoleAppender", "col": 0, "row": 2, "fields": ["- min: Level", "- formatter: Formatter"], "methods": ["+ append(event)"], "desc": "Prints events at or above its own level."}, {"name": "AsyncAppender", "col": 1, "row": 2, "fields": ["- inner: Appender", "- queue: BlockingQueue"], "methods": ["+ append(event)", "+ close()"], "desc": "A Decorator: wraps any appender, queues events, and writes them on a background thread so logging never blocks a request. Never drops errors; may drop debug messages when the queue is full."}, {"name": "FileAppender", "col": 2, "row": 2, "fields": ["- path, rotation"], "methods": ["+ append(event)"], "desc": "Writes to files, rotating them by size or date."}, {"name": "Formatter", "col": 0, "row": 1, "fields": [], "methods": ["+ format(event): String"], "desc": "Turns an event into text — plain or JSON (Strategy pattern).", "stereo": "interface"}, {"name": "LogEvent", "col": 2, "row": 0, "fields": ["- time, level, logger", "- thread, message", "- error, context"], "methods": [], "desc": "One immutable log record, including request context like a trace ID."}], "relations": [["Logger", "Appender", "aggregation", "sends to"], ["ConsoleAppender", "Appender", "implements"], ["AsyncAppender", "Appender", "implements"], ["FileAppender", "Appender", "implements"], ["AsyncAppender", "Appender", "association", "wraps"], ["ConsoleAppender", "Formatter", "uses"], ["Logger", "LogEvent", "association", "creates"]]}


### Requirements

Log levels (DEBUG < INFO < WARN < ERROR < FATAL); multiple **appenders/sinks** (console, file, remote) each with its own minimum level and **formatter**; configurable per logger name; thread-safe; **asynchronous** to avoid blocking request threads.

```java
enum Level { DEBUG, INFO, WARN, ERROR, FATAL }
record LogEvent(Instant time, Level level, String logger, String thread, String message, Throwable error, Map<String, String> context) {}

interface Formatter { String format(LogEvent e); }
final class JsonFormatter implements Formatter { public String format(LogEvent e) { return "{\"ts\":\"" + e.time() + "\",\"level\":\"" + e.level() + "\",\"msg\":\"" + escape(e.message()) + "\"}"; } }

interface Appender { void append(LogEvent e); }
final class ConsoleAppender implements Appender {
    private final Level min; private final Formatter fmt;
    ConsoleAppender(Level min, Formatter fmt) { this.min = min; this.fmt = fmt; }
    public void append(LogEvent e) { if (e.level().compareTo(min) >= 0) System.out.println(fmt.format(e)); }
}

/** Decorator: makes any appender asynchronous with a bounded queue (drops DEBUG/INFO when full instead of blocking). */
final class AsyncAppender implements Appender, AutoCloseable {
    private final Appender inner; private final BlockingQueue<LogEvent> queue; private final Thread worker; private volatile boolean running = true;
    AsyncAppender(Appender inner, int capacity) {
        this.inner = inner; this.queue = new ArrayBlockingQueue<>(capacity);
        worker = new Thread(() -> { while (running || !queue.isEmpty()) { try { LogEvent e = queue.poll(100, TimeUnit.MILLISECONDS); if (e != null) inner.append(e); } catch (InterruptedException ex) { return; } } }, "log-writer");
        worker.setDaemon(true); worker.start();
    }
    public void append(LogEvent e) {
        if (e.level().compareTo(Level.WARN) >= 0) { try { queue.put(e); } catch (InterruptedException ex) { Thread.currentThread().interrupt(); } }  // never drop errors
        else queue.offer(e);                                                              // backpressure: shed low-priority logs
    }
    public void close() throws InterruptedException { running = false; worker.join(); }
}

final class Logger {
    private final String name; private final Level level; private final List<Appender> appenders;
    Logger(String name, Level level, List<Appender> appenders) { this.name = name; this.level = level; this.appenders = List.copyOf(appenders); }
    public void info(String msg) { log(Level.INFO, msg, null); }
    public void error(String msg, Throwable t) { log(Level.ERROR, msg, t); }
    public void log(Level l, String msg, Throwable t) {
        if (l.compareTo(level) < 0) return;                                               // cheap early exit
        LogEvent e = new LogEvent(Instant.now(), l, name, Thread.currentThread().getName(), msg, t, MDC.copy());
        for (Appender a : appenders) a.append(e);
    }
}
```

Patterns: Strategy (formatters), Decorator (async, filtering, sampling appenders), **Chain of Responsibility** (an alternative where each handler processes levels it cares about and passes on), Singleton-ish `LoggerFactory` caching loggers by name, Observer-like fan-out to appenders. Discuss MDC/context propagation (request IDs), log rotation in the file appender, and why async logging needs a bounded queue and a shutdown flush.

## Case study 11: In-memory pub-sub (message broker)

> [!STORY] Build a mini-Kafka that runs inside one program: services publish messages to named topics, and any number of subscribers each receive every message, reading at their own pace and able to rewind. It's a great exercise in combining a data structure (an append-only log) with concurrency (waiting for new messages).

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "In-memory pub-sub — class diagram", "classes": [{"name": "Broker", "col": 1, "row": 0, "fields": ["- topics: Map<String,Topic>", "- pool: ExecutorService"], "methods": ["+ publish(topic, payload): long", "+ subscribe(topic, id, handler)"], "desc": "The entry point. Creates topics on demand and runs each subscriber on its own (virtual) thread."}, {"name": "Topic", "col": 0, "row": 1, "fields": ["- log: List<Message>", "- lock, newData: Condition"], "methods": ["+ publish(payload): long", "+ awaitAt(offset): Message"], "desc": "An append-only log. Readers that have caught up wait on a condition until new messages arrive."}, {"name": "Subscriber", "col": 2, "row": 1, "fields": ["- id", "- offset: AtomicLong", "- handler"], "methods": ["+ run()", "+ resetOffset(o)"], "desc": "Reads the topic from its own offset at its own pace; commits the offset only after handling a message (at-least-once delivery)."}, {"name": "Message", "col": 1, "row": 1, "fields": ["- offset: long", "- payload", "- timestamp"], "methods": [], "desc": "One immutable message with its position in the log."}], "relations": [["Broker", "Topic", "composition"], ["Broker", "Subscriber", "association", "runs"], ["Subscriber", "Topic", "uses", "reads"], ["Topic", "Message", "composition", "stores"]]}


Requirements: topics; publishers publish messages; multiple subscribers per topic each receive every message; each subscriber consumes at its own pace with an **offset**; subscribers can reset offsets (replay).

```java
record Message(long offset, String payload, Instant ts) {}

final class Topic {
    private final String name; private final List<Message> log = new CopyOnWriteArrayList<>();   // append-only (Kafka-like)
    private final ReentrantLock lock = new ReentrantLock(); private final Condition newData = lock.newCondition();
    Topic(String name) { this.name = name; }
    long publish(String payload) {
        lock.lock();
        try { long off = log.size(); log.add(new Message(off, payload, Instant.now())); newData.signalAll(); return off; }
        finally { lock.unlock(); }
    }
    Message awaitAt(long offset) throws InterruptedException {
        lock.lock();
        try { while (offset >= log.size()) newData.await(); return log.get((int) offset); }
        finally { lock.unlock(); }
    }
}

final class Subscriber implements Runnable {
    private final String id; private final Topic topic; private final Consumer<Message> handler; private final AtomicLong offset = new AtomicLong();
    Subscriber(String id, Topic t, Consumer<Message> h) { this.id = id; this.topic = t; this.handler = h; }
    public void run() {
        while (!Thread.currentThread().isInterrupted()) {
            try { Message m = topic.awaitAt(offset.get()); handler.accept(m); offset.incrementAndGet(); }   // commit after processing: at-least-once
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            catch (RuntimeException e) { /* retry with backoff, or move to a dead-letter topic after N attempts */ }
        }
    }
    void resetOffset(long o) { offset.set(o); }
}

final class Broker {
    private final Map<String, Topic> topics = new ConcurrentHashMap<>(); private final ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();
    Topic topic(String name) { return topics.computeIfAbsent(name, Topic::new); }
    void subscribe(String topic, String subscriberId, Consumer<Message> handler) { pool.submit(new Subscriber(subscriberId, topic(topic), handler)); }
    long publish(String topic, String payload) { return topic(topic).publish(payload); }
}
```

Discussion: push vs pull; per-subscriber offsets decouple slow consumers; retention (truncate the log by time/size); ordering per topic; at-least-once semantics and idempotent handlers; consumer groups (partition the work among subscribers sharing a group id) — then compare with Kafka (System Design → messaging).

## Case study 12: Key-value store with TTL and transactions

> [!STORY] Build a tiny Redis: get and set values, give keys an expiry time ("forget this login code in 5 minutes"), count how many keys hold a given value instantly, and support transactions — `BEGIN`, make changes, then `COMMIT` or `ROLLBACK` — even nested inside each other.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Key-value store — class diagram", "classes": [{"name": "KvStore", "col": 1, "row": 0, "fields": ["- data: Map<String,Entry>", "- valueCounts: Map<String,Integer>", "- txUndo: Deque<Map>"], "methods": ["+ get(k)", "+ set(k, v, ttl)", "+ delete(k)", "+ count(v)", "+ begin() / commit() / rollback()"], "desc": "The store. Expires keys lazily when they're read; keeps a running count per value; each open transaction has an undo log recording each key's previous value."}, {"name": "Entry", "col": 0, "row": 1, "fields": ["- value", "- expiresAtMillis"], "methods": ["+ expired(now): bool"], "desc": "A stored value plus its expiry time."}, {"name": "Clock", "col": 2, "row": 1, "fields": [], "methods": ["+ now(): long"], "desc": "Injected time source, so expiry can be tested without waiting.", "stereo": "interface"}, {"name": "EvictionPolicy", "col": 1, "row": 1, "fields": [], "methods": ["+ victim(): String"], "desc": "Optional: which key to drop when memory is full (LRU, LFU).", "stereo": "interface"}], "relations": [["KvStore", "Entry", "composition", "stores"], ["KvStore", "Clock", "uses"], ["KvStore", "EvictionPolicy", "uses"]]}


Requirements: `get/set/delete`, per-key **TTL**, nested **transactions** with `BEGIN`, `ROLLBACK`, `COMMIT`; `count(value)` in O(1).

```java
final class KvStore {
    private record Entry(String value, long expiresAtMillis) { boolean expired(long now) { return expiresAtMillis > 0 && now >= expiresAtMillis; } }
    private final Map<String, Entry> data = new HashMap<>();
    private final Map<String, Integer> valueCounts = new HashMap<>();
    private final Deque<Map<String, Optional<Entry>>> txUndo = new ArrayDeque<>();   // per-transaction undo log: key → previous entry
    private final LongSupplier clock;
    KvStore(LongSupplier clock) { this.clock = clock; }

    public synchronized Optional<String> get(String k) {
        Entry e = data.get(k);
        if (e == null) return Optional.empty();
        if (e.expired(clock.getAsLong())) { remove(k); return Optional.empty(); }           // lazy expiry
        return Optional.of(e.value());
    }
    public synchronized void set(String k, String v, Duration ttl) { record(k); put(k, new Entry(v, ttl == null ? 0 : clock.getAsLong() + ttl.toMillis())); }
    public synchronized void delete(String k) { record(k); remove(k); }
    public synchronized int count(String v) { return valueCounts.getOrDefault(v, 0); }

    public synchronized void begin() { txUndo.push(new HashMap<>()); }
    public synchronized void rollback() {
        if (txUndo.isEmpty()) throw new IllegalStateException("NO TRANSACTION");
        txUndo.pop().forEach((k, prev) -> { if (prev.isPresent()) put(k, prev.get()); else remove(k); });
    }
    public synchronized void commit() {
        if (txUndo.isEmpty()) throw new IllegalStateException("NO TRANSACTION");
        Map<String, Optional<Entry>> top = txUndo.pop();
        if (!txUndo.isEmpty()) top.forEach((k, prev) -> txUndo.peek().putIfAbsent(k, prev));   // merge into parent so outer rollback still works
    }

    private void record(String k) { if (!txUndo.isEmpty()) txUndo.peek().putIfAbsent(k, Optional.ofNullable(data.get(k))); }  // first write in tx wins
    private void put(String k, Entry e) { remove(k); data.put(k, e); valueCounts.merge(e.value(), 1, Integer::sum); }
    private void remove(String k) { Entry old = data.remove(k); if (old != null) valueCounts.merge(old.value(), -1, (a, b) -> a + b == 0 ? null : a + b); }
}
```

Discussion: **lazy expiry** on access plus an **active sweeper** that samples keys with TTLs (Redis does both); undo logs vs copying state for transactions (memory vs speed); a TTL min-heap for efficient expiry; eviction policies when memory is full (LRU/LFU as a Strategy); persistence via an append-only log + snapshots; replication — then you're building Redis.

## Case study 13: In-memory file system (Composite)

> [!STORY] Folders inside folders inside folders, and files at the bottom — and "how big is this folder?" means adding up everything inside it, however deep. This is the textbook use of the **Composite** pattern: treat a single file and a whole folder the same way.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "In-memory file system — class diagram", "classes": [{"name": "FileSystem", "col": 1, "row": 0, "fields": ["- root: DirNode"], "methods": ["+ mkdir(path)", "+ ls(path)", "+ append(path, text)", "+ du(path)"], "desc": "Resolves paths ('/a/b/c.txt') by walking down from the root, creating folders as needed."}, {"name": "FsNode", "col": 1, "row": 1, "fields": ["- name"], "methods": ["+ size(): long"], "desc": "Anything in the tree. Both files and folders answer size(), so callers don't care which is which (Composite).", "stereo": "abstract"}, {"name": "FileNode", "col": 0, "row": 2, "fields": ["- content"], "methods": ["+ size()", "+ append(s)", "+ read()"], "desc": "A file: its size is its content length."}, {"name": "DirNode", "col": 2, "row": 2, "fields": ["- children: TreeMap<String,FsNode>"], "methods": ["+ size()"], "desc": "A folder: its size is the sum of its children's sizes. Children are kept sorted so 'ls' is alphabetical."}], "relations": [["FileNode", "FsNode", "inherits"], ["DirNode", "FsNode", "inherits"], ["DirNode", "FsNode", "aggregation", "contains"], ["FileSystem", "DirNode", "association", "root"]]}


`mkdir -p`, `ls`, `addContentToFile`, `readContentFromFile`, `rm`, `mv`, sizes of directories.

```java
abstract sealed class FsNode permits FileNode, DirNode {
    final String name; FsNode(String n) { name = n; }
    abstract long size();
}
final class FileNode extends FsNode { private final StringBuilder content = new StringBuilder(); FileNode(String n) { super(n); }
    long size() { return content.length(); } void append(String s) { content.append(s); } String read() { return content.toString(); } }
final class DirNode extends FsNode { final TreeMap<String, FsNode> children = new TreeMap<>(); DirNode(String n) { super(n); }   // sorted → ls is ordered
    long size() { return children.values().stream().mapToLong(FsNode::size).sum(); } }

final class FileSystem {
    private final DirNode root = new DirNode("");
    private DirNode walkDirs(String[] parts, int upto, boolean create) {
        DirNode cur = root;
        for (int i = 0; i < upto; i++) {
            if (parts[i].isEmpty()) continue;
            FsNode next = cur.children.get(parts[i]);
            if (next == null) { if (!create) throw new NoSuchElementException(parts[i]); next = new DirNode(parts[i]); cur.children.put(parts[i], next); }
            if (!(next instanceof DirNode d)) throw new IllegalArgumentException(parts[i] + " is a file");
            cur = d;
        }
        return cur;
    }
    public synchronized void mkdir(String path) { String[] p = path.split("/"); walkDirs(p, p.length, true); }
    public synchronized List<String> ls(String path) {
        String[] p = path.split("/"); if (path.equals("/")) return List.copyOf(root.children.keySet());
        DirNode parent = walkDirs(p, p.length - 1, false); FsNode n = parent.children.get(p[p.length - 1]);
        if (n == null) throw new NoSuchElementException(path);
        return n instanceof DirNode d ? List.copyOf(d.children.keySet()) : List.of(n.name);
    }
    public synchronized void append(String path, String content) {
        String[] p = path.split("/"); DirNode parent = walkDirs(p, p.length - 1, true);
        FsNode n = parent.children.computeIfAbsent(p[p.length - 1], FileNode::new);
        if (!(n instanceof FileNode f)) throw new IllegalArgumentException("is a directory"); f.append(content);
    }
    public synchronized long du(String path) { String[] p = path.split("/"); return path.equals("/") ? root.size() : walkDirs(p, p.length - 1, false).children.get(p[p.length - 1]).size(); }
}
```

Extensions: permissions and owners, symbolic links (cycle detection), search by name/extension (a Visitor or Specification filter over the tree), and a real file system's inode/directory design (OS → File Systems).

## Case study 14: ATM

> [!STORY] You insert your card, enter your PIN, ask for ₹2,500, and the ATM counts out one ₹2,000 note and one ₹500 note. Behind that: a strict sequence of states (you can't withdraw before entering a PIN), a bank on the other end of a network that might not answer, and a little algorithm deciding which notes to give from the ones it has left.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "ATM — class diagram", "classes": [{"name": "Atm", "col": 1, "row": 0, "fields": ["- state: AtmState", "- card, session", "- dispenser: CashDispenser"], "methods": ["+ insertCard(card)", "+ enterPin(pin)", "+ withdraw(amount)", "+ eject()"], "desc": "The machine. Delegates each action to its current state (State pattern)."}, {"name": "AtmState", "col": 0, "row": 1, "fields": [], "methods": ["+ insertCard / enterPin / withdraw / eject"], "desc": "States: Idle → CardInserted → Authenticated → Dispensing. Each allows only what makes sense.", "stereo": "interface"}, {"name": "BankGateway", "col": 2, "row": 1, "fields": [], "methods": ["+ verifyPin(card, pin)", "+ debit(account, amount, requestId)", "+ reverse(requestId)"], "desc": "The bank's system behind an Adapter. Debits carry a request ID so a retried request isn't charged twice, and can be reversed if dispensing fails.", "stereo": "interface"}, {"name": "CashDispenser", "col": 1, "row": 1, "fields": ["- denomination", "- count", "- next: CashDispenser"], "methods": ["+ plan(amount): Map"], "desc": "A Chain of Responsibility: the ₹2,000 handler takes as many notes as it can, then passes the remainder to the ₹500 handler, and so on."}, {"name": "Card", "col": 2, "row": 0, "fields": ["- number (masked)", "- bank"], "methods": [], "desc": "The inserted card. Three wrong PINs and the card is retained."}], "relations": [["Atm", "AtmState", "association", "current"], ["Atm", "CashDispenser", "composition"], ["CashDispenser", "CashDispenser", "association", "next"], ["Atm", "BankGateway", "uses"], ["Atm", "Card", "association", "reads"]]}


**States**: Idle → CardInserted → Authenticated → (TransactionSelected) → Dispensing → Idle, with Ejected/OutOfService. Operations: insert card, enter PIN (3 attempts → card retained), check balance, withdraw, deposit, transfer. The bank is an external system behind an interface (Adapter); the ATM must handle **network failure mid-withdrawal** with a reversal/idempotency key.

Cash dispensing is a **Chain of Responsibility** over denominations:

```java
abstract class CashDispenser {
    private CashDispenser next; protected final int denomination; protected int count;
    CashDispenser(int denomination, int count) { this.denomination = denomination; this.count = count; }
    CashDispenser then(CashDispenser n) { next = n; return n; }
    /** Plan notes for amount; returns notes per denomination or throws if impossible. */
    Map<Integer, Integer> plan(int amount) {
        int use = Math.min(amount / denomination, count);
        int rest = amount - use * denomination;
        Map<Integer, Integer> out = new TreeMap<>(Comparator.reverseOrder());
        if (rest > 0) { if (next == null) throw new IllegalArgumentException("cannot dispense exact amount"); out.putAll(next.plan(rest)); }
        if (use > 0) out.put(denomination, use);
        return out;
    }
}
// chain: 2000 → 500 → 200 → 100. Plan first, then commit: debit the account (idempotent request id), then physically dispense, then decrement counts.
```

(Greedy can fail for some denomination/stock combinations — e.g., amount 600 with only 500s and 200s: greedy takes 500 and leaves 100. A robust ATM tries alternatives with backtracking/DP over available notes — Algorithms → greedy vs DP.)

## Case study 15: Delayed task scheduler

> [!STORY] "Send this reminder in 30 minutes." "Retry the payment in 10 seconds." "Every hour, clean up expired sessions." Almost every backend needs a scheduler that runs tasks at the right time, on several worker threads, and lets you cancel them — and the interesting part is waking up at exactly the right moment when a new, sooner task arrives.

### The design

Here's the class diagram before any code. Click each class to read its job in plain words, and notice which parts are interfaces — those are the parts expected to change.

::widget ClassDiagram {"title": "Task scheduler — class diagram", "classes": [{"name": "TaskScheduler", "col": 1, "row": 0, "fields": ["- queue: PriorityQueue<Job>", "- lock, changed: Condition", "- workers: ExecutorService"], "methods": ["+ schedule(task, delay, period): Handle", "- loop()"], "desc": "A dispatcher thread waits until the earliest job is due, hands it to the worker pool, and re-queues periodic jobs. A newly scheduled sooner job wakes the dispatcher early via the condition."}, {"name": "Job", "col": 0, "row": 1, "fields": ["- runAt: long", "- period: long", "- task: Runnable", "- cancelled: AtomicBoolean"], "methods": [], "desc": "One scheduled task. Ordered by runAt in a min-heap (DSA track)."}, {"name": "ExecutorService", "col": 2, "row": 1, "fields": [], "methods": ["+ submit(task)"], "desc": "The worker thread pool that actually runs tasks, so a slow task never delays the dispatcher.", "stereo": "interface"}, {"name": "Handle", "col": 1, "row": 1, "fields": ["- cancelled: AtomicBoolean"], "methods": ["+ cancel()"], "desc": "Returned to the caller so they can cancel a job before it runs."}], "relations": [["TaskScheduler", "Job", "composition", "queues"], ["TaskScheduler", "ExecutorService", "uses"], ["TaskScheduler", "Handle", "association", "returns"], ["Handle", "Job", "association", "cancels"]]}


Requirements: `schedule(task, delay)`, `scheduleAtFixedRate(task, period)`, cancel, multiple worker threads, tasks run as close to their time as possible.

```java
final class TaskScheduler {
    private record Job(long runAt, long periodMillis, Runnable task, long seq, AtomicBoolean cancelled) {}
    private final PriorityQueue<Job> queue = new PriorityQueue<>(Comparator.comparingLong(Job::runAt).thenComparingLong(Job::seq));
    private final ReentrantLock lock = new ReentrantLock(); private final Condition changed = lock.newCondition();
    private final ExecutorService workers; private final AtomicLong seq = new AtomicLong();

    TaskScheduler(int threads) {
        workers = Executors.newFixedThreadPool(threads);
        Thread dispatcher = new Thread(this::loop, "scheduler"); dispatcher.setDaemon(true); dispatcher.start();
    }
    public AtomicBoolean schedule(Runnable task, Duration delay, Duration period) {
        AtomicBoolean cancelled = new AtomicBoolean();
        lock.lock();
        try { queue.add(new Job(System.currentTimeMillis() + delay.toMillis(), period == null ? 0 : period.toMillis(), task, seq.incrementAndGet(), cancelled)); changed.signal(); }   // wake dispatcher: new job may be earliest
        finally { lock.unlock(); }
        return cancelled;                                                       // caller sets true to cancel
    }
    private void loop() {
        while (true) {
            lock.lock();
            try {
                while (queue.isEmpty()) changed.await();
                long wait = queue.peek().runAt() - System.currentTimeMillis();
                if (wait > 0) { changed.await(wait, TimeUnit.MILLISECONDS); continue; }   // re-check: an earlier job may have arrived
                Job j = queue.poll();
                if (j.cancelled().get()) continue;
                workers.submit(j.task());                                       // run off the dispatcher thread
                if (j.periodMillis() > 0) queue.add(new Job(j.runAt() + j.periodMillis(), j.periodMillis(), j.task(), seq.incrementAndGet(), j.cancelled()));
            } catch (InterruptedException e) { return; } finally { lock.unlock(); }
        }
    }
}
```

Discussion: a min-heap keyed by run time plus a condition variable that wakes early when a sooner job arrives; fixed-rate vs fixed-delay semantics; exceptions in tasks must not kill workers; use `System.nanoTime` for intervals in production; persistence and distribution (leader election, at-least-once execution, idempotent jobs) when it becomes a distributed cron (System Design → case studies); **timing wheels** (Kafka, Netty) for millions of timers.

## More LLD problems to practice

Cache with pluggable eviction (LRU/LFU/FIFO via Strategy), rate limiter (LLD chapter 4), URL shortener service class, notification service (multi-channel with templates, retries and user preferences), meeting room scheduler (interval trees, conflict detection), inventory/order management, hotel booking, car rental, ride-sharing matching core, stock exchange order book (price-time priority with two heaps/TreeMaps per symbol), Google Calendar, Twitter feed service class, Uno/card games, coffee machine (Decorator for add-ons), traffic signal controller (State), cricket scoreboard (Observer), and an online auction system (concurrency on bids).

::quiz {"q":"In the chess design, how do you ensure a move doesn't leave your own king in check?","options":["Each piece checks it in candidateMoves","Apply the move tentatively, test whether your king is attacked, and undo it if so","Kings can't be attacked","Only check at checkmate"],"answer":1,"explain":"Generate pseudo-legal moves per piece, then filter by king safety with apply/undo."}

::quiz {"q":"How does the KV store support nested transactions with ROLLBACK?","options":["Copies the entire map on BEGIN only","Keeps a stack of undo logs recording each key's previous value on first write; commit merges into the parent log","Uses database locks","It can't support nesting"],"answer":1,"explain":"Undo logs are compact and merging preserves outer-transaction rollback."}

::quiz {"q":"Why does the task scheduler's dispatcher wait on a condition with a timeout instead of sleeping?","options":["Sleeping is deprecated","A newly scheduled job may be due sooner than the current earliest, so the dispatcher must be woken early by signal()","Conditions are faster","To save memory"],"answer":1,"explain":"sleep() can't be interrupted by new earlier work; await(timeout) + signal can."}
