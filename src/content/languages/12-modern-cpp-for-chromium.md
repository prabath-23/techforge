---
title: Modern C++ for Browser Engineers: Ownership, Lifetimes and Chromium's base Library
summary: The C++ that browser-team interviews test: RAII, unique_ptr and ownership transfer, scoped_refptr and WeakPtr, move semantics, dangling pointers and use-after-free, raw_ptr/MiraclePtr, Chromium's threading model with sequences and task runners, BindOnce and callbacks, and the lifetime bugs that cause most browser security issues.
---

::widget Scene {"title": "A use-after-free, and how WeakPtr prevents it", "sub": "a posted task outlives the object it points to", "nodes": [{"id": "ui", "kind": "cpu", "label": "UI sequence", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "obj", "kind": "cube", "label": "DownloadView object", "x": 4.5, "y": -4.5, "color": "purple"}, {"id": "task", "kind": "doc", "label": "Posted task: OnDone(this)", "x": 11.94, "y": 2.94, "color": "orange"}, {"id": "io", "kind": "cpu", "label": "Thread pool (I/O)", "x": 16.94, "y": -2.06, "color": "teal"}, {"id": "wp", "kind": "doc", "label": "WeakPtrFactory", "x": 9.5, "y": -9.5, "color": "green"}], "links": [["ui", "obj"], ["obj", "task"], ["task", "io"], ["io", "ui", {"dashed": true}], ["obj", "wp", {"dashed": true}]], "metrics": [["state", "Object state"], ["risk", "Risk"]], "steps": [{"short": "Own", "tag": "Ownership", "title": "The tab owns DownloadView through a std::unique_ptr", "body": "<p>Exactly one owner; when the unique_ptr is destroyed, the object is deleted. No manual delete anywhere.</p>", "show": ["ui", "obj"], "metrics": {"state": ["alive"], "risk": ["-"]}}, {"short": "Post", "tag": "Async", "title": "It starts work on the thread pool and asks for a callback: OnDone(this)", "body": "<p>base::BindOnce(&DownloadView::OnDone, base::Unretained(this)), a raw pointer captured in a task.</p>", "show": ["ui", "obj", "task", "io"], "flow": [["task", "io", "#f59e0b", "PostTaskAndReply"]], "metrics": {"risk": ["raw this in a callback"]}}, {"short": "Close", "tag": "Lifetime", "title": "The user closes the tab: the unique_ptr deletes DownloadView", "body": "<p>The I/O work is still running.</p>", "set": {"obj": {"dim": true, "badge": "deleted"}}, "metrics": {"state": ["freed"]}}, {"short": "UAF", "tag": "Bug", "title": "The reply runs on the UI sequence and calls OnDone on freed memory", "body": "<p>Use-after-free: undefined behaviour, a crash at best, attacker-controlled memory at worst. This bug class is the largest source of high-severity Chromium security bugs.</p>", "flow": [["io", "ui", "#ef4444", "OnDone(dangling)"]], "metrics": {"risk": ["use-after-free", "bad"]}}, {"short": "Weak", "tag": "Fix", "title": "Bind a WeakPtr instead: weak_factory_.GetWeakPtr()", "body": "<p>When the object dies, its WeakPtrFactory (declared last, destroyed first) invalidates every WeakPtr.</p>", "show": ["ui", "obj", "task", "io", "wp"], "set": {"obj": {"dim": false, "badge": null}, "wp": {"badge": "invalidates on destruction"}}}, {"short": "Cancel", "tag": "Safe", "title": "Now when the tab closes, the reply is silently dropped", "body": "<p>Binding a method to a WeakPtr cancels the callback if the object is gone.</p>", "set": {"obj": {"dim": true, "badge": "deleted"}}, "flow": [["io", "ui", "#22c55e", "reply dropped"]], "metrics": {"state": ["freed"], "risk": ["none", "good"]}}, {"short": "Seq", "tag": "Rule", "title": "WeakPtrs must be dereferenced and invalidated on the same sequence", "body": "<p>They're not thread-safe; that's why the reply comes back to the UI sequence.</p>"}, {"short": "MiraclePtr", "tag": "Defence", "title": "raw_ptr<T> (MiraclePtr) for class members", "body": "<p>With BackupRefPtr, freed memory referenced by a raw_ptr is quarantined instead of reused, turning many use-after-frees into non-exploitable crashes.</p>", "note": {"kind": "key", "text": "Make ownership explicit (unique_ptr), never bind raw this into async callbacks (use WeakPtr), stay on the right sequence, and use raw_ptr for non-owning members."}}]}

## Why lifetimes dominate browser security

> [!STORY] Look at any month of Chrome security release notes and you'll see the same phrase again and again: "Use after free in …". Around 70% of serious security bugs in large C++ codebases like Chromium are memory-safety bugs, and use-after-free, using an object after it has been deleted, is the biggest group. Most aren't exotic: an asynchronous callback fires after the object it points to has gone. Browser-team interviews test exactly this: who owns what, how long it lives, and which thread touches it.

## RAII: resources follow scope

**Resource Acquisition Is Initialisation** an object acquires a resource in its constructor and releases it in its destructor. When the object goes out of scope, cleanup happens automatically, even if an exception or early return occurs. Memory, file handles, locks and sockets should all be owned by RAII objects. Modern C++ code almost never calls `delete` directly.

## Ownership with smart pointers

- **`std::unique_ptr<T>`** single owner. Can't be copied, only **moved**: `std::move(ptr)` transfers ownership. The default choice.
- **`scoped_refptr<T>`** (Chromium) / `std::shared_ptr<T>`, shared ownership via reference counting; the object dies when the last reference goes. Use sparingly: shared ownership makes lifetimes hard to reason about and can leak through cycles.
- **`base::WeakPtr<T>`** a non-owning reference that becomes null when the object is destroyed. Ideal for callbacks and observers.
- **Raw pointers / references** non-owning, with *no* safety. In Chromium, class members use **`raw_ptr<T>`** (MiraclePtr) so dangling-pointer use is far less exploitable.

```cpp
class DownloadView {
 public:
  void Start() {
    base::ThreadPool::PostTaskAndReplyWithResult(
        FROM_HERE, {base::MayBlock()}, base::BindOnce(&ComputeHash, path_),
        base::BindOnce(&DownloadView::OnDone, weak_factory_.GetWeakPtr()));
  }
 private:
  void OnDone(std::string hash) { /* runs only if *this is still alive */ }
  base::FilePath path_;
  base::WeakPtrFactory<DownloadView> weak_factory_{this};   // must be the last member
};
```

## Move semantics

Copying large objects is expensive; **moving** transfers their internals (a pointer, a size) and leaves the source valid but empty. Pass ownership into functions by value with `std::move`; return local objects by value (copy elision and move make it cheap). After moving from an object, don't use it except to reassign or destroy it.

Know the **rule of zero/five**: if your class needs a custom destructor, copy or move operation, it probably needs all five, better, design it so it needs none (members manage their own resources).

## Chromium's threading model

Chromium avoids sharing data between threads with locks wherever possible. Instead:

- Work runs as **tasks** posted to **task runners**.
- A **sequence** is a series of tasks that run one at a time in order (possibly on different threads). Objects are usually bound to one sequence and checked with `SEQUENCE_CHECKER`.
- Key sequences: the **UI** thread (browser process main thread), the **IO** thread (IPC), and the **thread pool** for blocking work (`base::MayBlock()`).
- **`PostTaskAndReply`** runs work elsewhere, then replies on the original sequence, so results are handled where the object lives.

### Callbacks

`base::OnceCallback` runs once (most callbacks); `base::RepeatingCallback` may run many times. Bind with `base::BindOnce` / `base::BindRepeating`. Bound arguments are copied or moved in; `base::Unretained(this)` explicitly says "I promise this outlives the callback", a common source of bugs; prefer `GetWeakPtr()`.

## Common lifetime bugs

1. **Callbacks outliving their object** (see lesson) → WeakPtr.
2. **Observers not removed** before the observed object dies → `base::ScopedObservation`.
3. **Iterating a container while a callback modifies it** → copy first or use safe observer lists.
4. **Re-entrancy:** calling out (to JavaScript, to an observer) and returning to find `this` deleted. Hold a WeakPtr and check it after calls that could destroy you.
5. **Cross-thread access** to sequence-bound objects → post a task instead.
6. **Dangling references** to temporaries (`const auto& x = GetString().substr(1)` is fine; storing a `std::string_view` of a temporary is not).

## Tools that catch them

- **AddressSanitizer (ASan)** detects use-after-free and buffer overflows at runtime in tests and fuzzers.
- **ThreadSanitizer (TSan)** data races. **MemorySanitizer** uninitialised reads. **UBSan** undefined behaviour.
- **Dangling pointer detectors** built on raw_ptr in debug builds.
- **Fuzzing** (next chapter), feeds millions of inputs to sanitizer builds.

## Toward memory safety

C++ will be around for decades, so the strategy is layered: safer types (raw_ptr, checked spans and containers with bounds checks, "hardened" libc++), sandboxing (Browser chapter 1), and new components in memory-safe languages (Chromium accepts **Rust** for some third-party and parsing code).

> [!RECAP]
> - RAII; ownership explicit with **unique_ptr**; shared ownership (`scoped_refptr`) rarely.
> - Move semantics transfer ownership cheaply; rule of zero.
> - Chromium: tasks on **sequences** `PostTaskAndReply`, `BindOnce`; avoid `Unretained`, use **WeakPtr**.
> - Use-after-free comes from callbacks, observers, re-entrancy and threads.
> - raw_ptr/MiraclePtr, sanitizers, fuzzing, hardened containers and Rust reduce the damage.

> [!INTERVIEW] "unique_ptr vs shared_ptr?", "Explain move semantics", "How do you post work to another thread in Chromium and get a result back?", "Why is base::Unretained dangerous?", "Walk through a use-after-free you fixed", "What is MiraclePtr?"

::quiz {"q": "A callback is bound with base::Unretained(this) and the object is deleted before it runs. What happens?", "options": ["Nothing", "The callback runs on freed memory, a use-after-free", "Chromium cancels it automatically", "Compile error"], "answer": 1, "explain": "Bind a WeakPtr so the callback is cancelled instead."}

::quiz {"q": "Why must WeakPtrFactory be the last member of a class?", "options": ["Style only", "Members are destroyed in reverse order, so it is destroyed first and invalidates WeakPtrs before other members die", "It must be public", "For speed"], "answer": 1, "explain": "Callbacks can't see a half-destroyed object."}

::quiz {"q": "What does std::move(ptr) do to a unique_ptr?", "options": ["Copies it", "Transfers ownership, leaving the source null", "Deletes the object", "Makes it shared"], "answer": 1, "explain": "unique_ptr is move-only."}
