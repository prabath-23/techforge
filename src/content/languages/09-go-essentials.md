---
title: Go Essentials: Types, Structs, Interfaces, Errors, Slices and Maps
summary: Everyday Go: packages and modules, declarations and zero values, structs and methods with value or pointer receivers, implicit interfaces, the error-as-value pattern with wrapping, slices and how append works, maps, defer/panic/recover, generics, and the standard library, with a glossary.
---

::widget Scene {"title": "Go in one small program", "sub": "the essentials, one step at a time", "nodes": [{"id": "pkg", "kind": "doc", "label": "Packages & modules", "x": 0.0, "y": 0.0, "color": "blue"}, {"id": "decl", "kind": "doc", "label": "Declarations", "x": 4.2, "y": -4.2, "color": "purple"}, {"id": "st", "kind": "doc", "label": "Structs & methods", "x": 8.4, "y": -8.4, "color": "orange"}, {"id": "iface", "kind": "doc", "label": "Interfaces", "x": 12.6, "y": -12.6, "color": "teal"}, {"id": "err", "kind": "doc", "label": "Errors as values", "x": 6.51, "y": 6.51, "color": "green"}, {"id": "slice", "kind": "doc", "label": "Slices", "x": 10.71, "y": 2.31, "color": "pink"}, {"id": "map", "kind": "doc", "label": "Maps", "x": 14.91, "y": -1.89, "color": "blue"}, {"id": "defer", "kind": "doc", "label": "defer", "x": 19.11, "y": -6.09, "color": "purple"}, {"id": "gen", "kind": "doc", "label": "Generics", "x": 19.01, "y": 6.41, "color": "orange"}], "links": [], "metrics": [["c", "Concept"], ["n", "Progress"]], "steps": [{"short": "Packages", "tag": "Structure", "title": "Code is organised in packages; go.mod defines a module", "body": "<p>Exported names start with a capital letter. package main + func main() is the entry point.</p>", "show": ["pkg"], "focus": ["pkg"], "metrics": {"c": ["Packages & modules"], "n": ["1 of 9"]}}, {"short": "Variables", "tag": "Variables", "title": ":= declares and infers; every type has a zero value", "body": "<p>0, \"\", false, nil, no uninitialised variables.</p>", "show": ["pkg", "decl"], "focus": ["decl"], "metrics": {"c": ["Declarations"], "n": ["2 of 9"]}}, {"short": "Structs", "tag": "Types", "title": "Structs hold data; methods attach to types", "body": "<p>Pointer receivers (func (o *Order) Pay()) can modify; value receivers get a copy.</p>", "show": ["pkg", "decl", "st"], "focus": ["st"], "metrics": {"c": ["Structs & methods"], "n": ["3 of 9"]}}, {"short": "Interfaces", "tag": "Interfaces", "title": "Interfaces are satisfied implicitly", "body": "<p>Any type with a Read([]byte) (int, error) method is an io.Reader, no \"implements\" keyword.</p>", "show": ["pkg", "decl", "st", "iface"], "focus": ["iface"], "metrics": {"c": ["Interfaces"], "n": ["4 of 9"]}}, {"short": "Errors", "tag": "Errors", "title": "Functions return (value, error); check every error", "body": "<p>Wrap with fmt.Errorf(\"load: %w\", err); test with errors.Is / errors.As.</p>", "show": ["pkg", "decl", "st", "iface", "err"], "focus": ["err"], "metrics": {"c": ["Errors as values"], "n": ["5 of 9"]}}, {"short": "Slices", "tag": "Collections", "title": "Slices are views over arrays: pointer, length, capacity", "body": "<p>append may reallocate, always use the returned slice.</p>", "show": ["pkg", "decl", "st", "iface", "err", "slice"], "focus": ["slice"], "metrics": {"c": ["Slices"], "n": ["6 of 9"]}}, {"short": "Maps", "tag": "Collections", "title": "Maps are hash tables; reading a missing key gives the zero value", "body": "<p>v, ok := m[k] distinguishes \"missing\" from \"zero\". Not safe for concurrent writes.</p>", "show": ["pkg", "decl", "st", "iface", "err", "slice", "map"], "focus": ["map"], "metrics": {"c": ["Maps"], "n": ["7 of 9"]}}, {"short": "defer", "tag": "Control", "title": "defer runs a call when the function returns", "body": "<p>Close files and unlock mutexes right after acquiring them.</p>", "show": ["pkg", "decl", "st", "iface", "err", "slice", "map", "defer"], "focus": ["defer"], "metrics": {"c": ["defer"], "n": ["8 of 9"]}}, {"short": "Generics", "tag": "Generics", "title": "Type parameters with constraints (Go 1.18+)", "body": "<p>func Map[T, U any](xs []T, f func(T) U) []U.</p>", "show": ["pkg", "decl", "st", "iface", "err", "slice", "map", "defer", "gen"], "focus": ["gen"], "metrics": {"c": ["Generics"], "n": ["9 of 9"]}, "note": {"kind": "key", "text": "Go = small language: packages, zero values, structs + methods, implicit interfaces, explicit error values, slices/maps, defer, and goroutines/channels for concurrency."}}]}

## A deliberately small language

Go was designed at Google for large codebases and fast builds: few features, one formatting style (`gofmt`), explicit errors, and first-class concurrency. It powers Kubernetes, Docker, Terraform and countless backend services. This chapter covers the everyday language; the concurrency chapter covers goroutines and channels.

## Packages, modules and structure

```go
// go.mod: module github.com/acme/orders
package main

import (
    "fmt"
    "os"
)

func main() {
    if err := run(os.Args[1:]); err != nil {
        fmt.Fprintln(os.Stderr, "error:", err)
        os.Exit(1)
    }
}
```

- Every file belongs to a package; a directory is a package.
- **Exported** identifiers start with an uppercase letter (`Order`, `Pay`); lowercase is package-private.
- `go mod tidy`, `go build`, `go test ./...`, `go vet`, `gofmt`.

## Declarations and zero values

```go
var count int            // 0
name := "asha"           // short declaration with inference (inside functions)
const maxRetries = 3
var users map[string]User // nil map: reads OK, writes panic, make() it first
```

Every type has a **zero value**: `0`, `""`, `false`, `nil` for pointers, slices, maps, channels, interfaces and functions. Design types so the zero value is useful (`sync.Mutex{}` and `bytes.Buffer{}` are ready to use).

## Structs, methods and embedding

```go
type Order struct {
    ID    string
    Items []Item
    paid  bool
}

func (o *Order) Pay() error {           // pointer receiver: modifies o
    if o.paid { return ErrAlreadyPaid }
    o.paid = true
    return nil
}

func (o Order) Total() (sum int64) {     // value receiver: works on a copy
    for _, it := range o.Items { sum += it.Price * int64(it.Qty) }
    return
}
```

Use pointer receivers when the method modifies the receiver or the struct is large; be consistent per type. **Embedding** (`type Admin struct { User; Level int }`) promotes fields and methods, composition, not inheritance.

## Interfaces

Interfaces are **satisfied implicitly**: define them where they're *used*, keep them small.

```go
type Notifier interface { Notify(ctx context.Context, msg string) error }
```

Any type with that method is a `Notifier`. Common standard ones: `io.Reader`, `io.Writer`, `fmt.Stringer`, `error`. The empty interface `any` holds any value; use type switches (`switch v := x.(type)`) to inspect it.

> [!WARN] An interface holding a nil pointer is **not** nil: returning a `*MyError(nil)` as `error` makes `err != nil` true. Return a plain `nil`.

## Errors

```go
var ErrNotFound = errors.New("not found")

func Load(id string) (*Order, error) {
    row, err := db.Get(id)
    if err != nil {
        return nil, fmt.Errorf("load order %s: %w", id, err)   // wrap with context
    }
    return row, nil
}

if errors.Is(err, ErrNotFound) { /* 404 */ }
var pe *fs.PathError
if errors.As(err, &pe) { /* inspect */ }
```

Errors are values, returned and checked explicitly. `panic` is for truly unrecoverable programmer errors; `recover` in a deferred function can stop a panic (e.g. in an HTTP server per request).

## Slices

A slice is a small struct: pointer to an underlying array, **length** **capacity**.

```go
s := make([]int, 0, 10)   // len 0, cap 10
s = append(s, 1, 2, 3)    // ALWAYS reassign: append may allocate a new array
t := s[1:3]               // shares memory with s!
u := slices.Clone(s)      // independent copy
```

Sub-slices share the underlying array, modifying `t` changes `s`, and holding a small slice of a huge array keeps the whole array alive. The `slices` and `maps` packages (Go 1.21) provide `Sort`, `Contains`, `Index`, `Keys`, etc.

## Maps

```go
counts := map[string]int{}
counts[w]++                     // missing key reads as 0
if v, ok := counts["x"]; ok { … }
delete(counts, "x")
for k, v := range counts { … }  // iteration order is random
```

Maps are **not safe** for concurrent writes, use a `sync.Mutex` or `sync.Map`.

## Control flow and defer

`for` is the only loop (`for i := 0; i < n; i++`, `for cond`, `for range xs`, `for range 10` in Go 1.22). `switch` doesn't fall through by default. `defer` schedules a call for when the function returns (LIFO), ideal for cleanup:

```go
f, err := os.Open(path)
if err != nil { return err }
defer f.Close()

mu.Lock()
defer mu.Unlock()
```

## Generics

```go
func Filter[T any](xs []T, keep func(T) bool) []T {
    out := xs[:0:0]
    for _, x := range xs { if keep(x) { out = append(out, x) } }
    return out
}
type Number interface { ~int | ~int64 | ~float64 }
func Sum[T Number](xs []T) (s T) { for _, x := range xs { s += x }; return }
```

## The standard library you'll use

`net/http` (production-grade server and client), `encoding/json` (struct tags `json:"id"`), `context`, `time`, `sync`, `errors`, `fmt`, `strings`, `strconv`, `sort`/`slices`, `os`, `io`, `bufio`, `log/slog` (structured logging), `testing` (table-driven tests, benchmarks, fuzzing).

## Glossary

| Term | Meaning |
|---|---|
| zero value | default value every type has |
| receiver | the value a method is called on (value or pointer) |
| implicit interface | satisfied by having the methods, no declaration |
| embedding | including a type in a struct to reuse its fields/methods |
| slice header | pointer + length + capacity |
| goroutine / channel | lightweight thread / typed pipe between goroutines |
| context | carries deadlines and cancellation |
| module | versioned collection of packages (`go.mod`) |
| gofmt | the one standard code format |

> [!RECAP]
> - Packages, capitalised exports, modules; zero values everywhere.
> - Structs + methods (pointer vs value receivers); embedding for composition.
> - Small, implicit interfaces; beware nil-pointer-in-interface.
> - Errors as values: wrap with `%w`, check with `errors.Is/As`.
> - Slices share arrays, reassign after `append`; maps aren't concurrency-safe.
> - `defer` for cleanup; generics with constraints; a strong standard library.

> [!INTERVIEW] "Value vs pointer receiver?", "How does append work?", "Why is my nil error not nil?", "How do interfaces work in Go?", "How do you handle errors idiomatically?", "Is a map safe for concurrent use?"

::quiz {"q": "Why must you write `s = append(s, x)`?", "options": ["Style", "append may allocate a new array and return a different slice header", "append returns an error", "To copy the slice"], "answer": 1, "explain": "The returned slice may point to new memory."}

::quiz {"q": "How does a Go type implement an interface?", "options": ["With an implements keyword", "Implicitly, by having the interface's methods", "By embedding the interface", "With annotations"], "answer": 1, "explain": "Structural, implicit satisfaction."}

::quiz {"q": "What does reading a missing key from a map return?", "options": ["An error", "A panic", "The zero value (use v, ok := m[k] to check)", "nil always"], "answer": 2, "explain": "The comma-ok idiom tells you if it existed."}
