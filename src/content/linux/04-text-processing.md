---
title: Text Processing — grep, sed, awk, sort, uniq and jq
summary: The tools that let you answer questions about gigabytes of logs and data in seconds — searching with grep and regular expressions, slicing columns with cut and awk, counting and ranking with sort and uniq, editing with sed, and querying JSON with jq — built up through real log-analysis tasks.
---

::widget Scene {"title": "Count and rank with sort | uniq -c", "sub": "which API endpoints return the most 500 errors?", "nodes": [{"id": "rows", "kind": "cells", "label": "log lines (status · path)", "x": 3.1, "y": 3.1, "values": ["200 /api/a", "500 /api/pay", "200 /api/b", "500 /api/pay", "500 /api/cart"]}], "metrics": [["cmd", "Stage"], ["out", "Result"]], "steps": [{"short": "Grep", "tag": "Filter", "title": "grep ' 500 ' access.log", "body": "<p>Keep only error lines. -c counts, -v inverts, -E for regex.</p>", "set": {"rows": {"marks": {"1": "red", "3": "red", "4": "red", "0": "dark", "2": "dark"}, "ptr": {}}}, "metrics": {"cmd": ["grep 500"], "out": ["3 lines"]}}, {"short": "Cut", "tag": "Extract", "title": "awk '{print $7}': just the path", "body": "<p>Or cut -d' ' -f7 for simple delimiters.</p>", "set": {"rows": {"marks": {}, "ptr": {}, "values": ["/api/pay", "/api/pay", "/api/cart", "", ""]}}, "metrics": {"cmd": ["awk print $7"], "out": ["paths"]}}, {"short": "Sort", "tag": "Group", "title": "sort", "body": "<p>Bring identical paths together.</p>", "set": {"rows": {"marks": {"0": "blue", "1": "blue"}, "ptr": {}, "values": ["/api/cart", "/api/pay", "/api/pay", "", ""]}}}, {"short": "Uniq", "tag": "Count", "title": "uniq -c", "body": "<p>\"1 /api/cart\", \"2 /api/pay\".</p>", "set": {"rows": {"marks": {}, "ptr": {}, "values": ["1 /api/cart", "2 /api/pay", "", "", ""]}}, "metrics": {"cmd": ["uniq -c"], "out": ["counts"]}}, {"short": "Rank", "tag": "Rank", "title": "sort -rn | head", "body": "<p>/api/pay is the worst offender.</p>", "set": {"rows": {"marks": {"0": "red"}, "ptr": {}, "values": ["2 /api/pay", "1 /api/cart", "", "", ""]}}, "metrics": {"cmd": ["sort -rn"], "out": ["/api/pay first", "good"]}}, {"short": "Time", "tag": "Narrow", "title": "When did it start? Extract the hour and count per hour", "body": "<p>awk '{print substr($4, 14, 2)}' | sort | uniq -c — errors began at 14:00.</p>"}, {"short": "Sed", "tag": "Transform", "title": "sed to rewrite text in a stream", "body": "<p>sed 's#/api/v1#/api#' normalises paths; sed -i edits files in place (back them up first).</p>"}, {"short": "JSON", "tag": "Structured", "title": "JSON logs? Use jq", "body": "<p>jq -r 'select(.status==500) | .path' | sort | uniq -c | sort -rn.</p>", "note": {"kind": "key", "text": "grep filters, awk/cut extract, sort groups, uniq -c counts, sort -rn ranks, sed transforms, jq handles JSON."}}]}


## Answering questions about a 4 GB log

> [!STORY] Black Friday, 11 am. Error rates are climbing and the team needs answers: Which URLs are failing? Since when? Which customers are affected? Is one server worse than the others? Opening the log in an editor isn't an option — it's 4 GB and growing. Every one of these questions can be answered in a single line of shell, in seconds, with a handful of tools that have existed since the 1970s.

Our example — a web server access log, one request per line:

```text
203.0.113.9 - - [23/Nov/2026:11:02:14 +0530] "GET /api/cart HTTP/1.1" 200 512 0.041
198.51.100.4 - - [23/Nov/2026:11:02:14 +0530] "POST /api/checkout HTTP/1.1" 500 87 2.913
```

Fields (separated by spaces): 1 = client IP, 4 = time, 6 = method, 7 = path, 9 = status, 10 = bytes, 11 = seconds taken.

## grep: find lines

```bash
grep ' 500 ' access.log                 # lines containing " 500 "
grep -c ' 500 ' access.log              # just count them
grep -i 'timeout' app.log               # ignore case
grep -v healthcheck access.log          # lines NOT matching
grep -n 'panic' app.log                 # show line numbers
grep -C 3 'OutOfMemory' app.log         # 3 lines of context before and after
grep -rn 'API_KEY' src/                 # search a whole folder
grep -E '" (500|502|503) ' access.log   # extended regex: any of these statuses
zgrep ' 500 ' access.log.2.gz           # search compressed logs
```

> [!NOTE] **ripgrep (`rg`)** is a modern, much faster grep that skips `.gitignore`d files by default. Great for searching code.

### Regular expressions in one minute

| Pattern | Matches |
|---|---|
| `.` | any one character |
| `*` / `+` / `?` | zero or more / one or more / zero or one of the previous thing |
| `^` / `$` | start / end of line |
| `[0-9]` / `[^a-z]` | any digit / anything except a lowercase letter |
| `(a\|b)` | a or b (with `-E`) |
| `\b` | a word boundary |

`grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3} '` matches lines starting with an IPv4 address.

## cut, sort, uniq, head: count and rank

```bash
# Top 10 failing paths
grep ' 500 ' access.log | cut -d' ' -f7 | sort | uniq -c | sort -rn | head
```

Read it as an assembly line (chapter 1):

1. `grep` keeps failing requests.
2. `cut -d' ' -f7` keeps only field 7, the path.
3. `sort` puts identical paths next to each other — `uniq` only merges **adjacent** duplicates.
4. `uniq -c` collapses duplicates and prefixes a count.
5. `sort -rn` sorts by that number, largest first.
6. `head` shows the top 10.

```text
   4812 /api/checkout
    211 /api/payment/confirm
     12 /api/cart
```

Answer found: checkout is the problem.

## awk: a tiny language for columns

`awk` runs a small program on each line, with fields available as `$1`, `$2`, … It's ideal when you need conditions or arithmetic.

```bash
# Requests slower than 2 seconds, showing path and time
awk '$11 > 2 {print $7, $11}' access.log

# Average response time per status code
awk '{sum[$9] += $11; n[$9]++} END {for (s in sum) printf "%s %.3f\n", s, sum[s]/n[s]}' access.log

# Errors per minute (the time field looks like [23/Nov/2026:11:02:14)
awk '$9 == 500 {print substr($4, 2, 17)}' access.log | uniq -c
```

The last one shows exactly **when** errors started — the minute they jump from 2 to 400.

> [!ANALOGY] If `cut` is a pair of scissors, `awk` is a spreadsheet you can drive from one line: filter rows, pick columns, sum and group.

## sed: edit streams of text

```bash
sed 's/http:/https:/g' links.txt          # replace every http: with https:, print result
sed -i.bak 's/DEBUG/INFO/' config.ini      # edit the file in place, keeping a .bak backup
sed -n '100,120p' big.log                  # print only lines 100–120
sed '/^#/d' settings.conf                  # delete comment lines
```

> [!WARN] `sed -i` behaves differently on macOS (needs `-i ''`) and Linux. Using `-i.bak` works on both and leaves a backup.

## Following and slicing logs

```bash
tail -f app.log | grep --line-buffered ERROR    # watch new errors as they arrive
tail -n 1000 app.log | less                      # last 1000 lines, scrollable (/ to search)
wc -l access.log                                 # how many lines?
sort -u ids.txt > unique.txt                     # unique values
comm -13 <(sort old.txt) <(sort new.txt)          # lines only in new.txt
```

## jq: grep and awk for JSON

Modern apps write **structured JSON logs** (Cloud track, chapter 7) and APIs return JSON. `jq` queries it.

```bash
# Pretty-print an API response
curl -s https://api.example.com/orders/42 | jq .

# From JSON log lines: errors from the checkout service, showing time and message
jq -r 'select(.level=="error" and .service=="checkout") | "\(.time) \(.msg)"' app.jsonl

# Count errors by provider
jq -r 'select(.level=="error") | .provider' app.jsonl | sort | uniq -c | sort -rn

# Extract fields from an array
kubectl get pods -o json | jq -r '.items[] | select(.status.phase != "Running") | .metadata.name'
```

> [!EXAMPLE] **Solving the Black Friday incident.** `awk` shows 500s started at 11:00. The top-paths pipeline points to `/api/checkout`. `jq` on the JSON app logs shows every error has `"provider": "provider-b"` and `"error": "timeout"`. Total time: about four minutes, all from the command line. The fix — route payments to the other provider — follows immediately.

> [!RECAP]
> - **grep** finds lines (with regular expressions, `-v`, `-c`, `-C`, `-r`); **ripgrep** is faster.
> - **cut | sort | uniq -c | sort -rn | head** is the classic "count and rank" pipeline — `uniq` needs sorted input.
> - **awk** filters and computes over columns: conditions, sums, averages, grouping.
> - **sed** substitutes and deletes text in streams or files.
> - **jq** queries JSON logs and API responses.

> [!INTERVIEW] Some interviews (SRE, DevOps, backend) ask you to analyze a log on the spot: "find the top 10 IPs" or "count 500s per minute". Build the pipeline out loud, step by step.

::quiz {"q":"Why must you sort before uniq -c?","options":["uniq requires alphabetical input","uniq only merges adjacent duplicate lines","sort speeds up uniq","It doesn't matter"],"answer":1,"explain":"Sorting puts identical lines next to each other."}

::quiz {"q":"Which tool best answers 'average response time per status code' from a space-separated log?","options":["grep","awk","sed","head"],"answer":1,"explain":"awk can sum and group by columns."}

::quiz {"q":"What does grep -v healthcheck do?","options":["Shows only healthcheck lines","Shows lines that do NOT contain healthcheck","Counts healthchecks","Shows verbose output"],"answer":1,"explain":"-v inverts the match."}
