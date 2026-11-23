---
title: The Shell — How Commands, Pipes and Redirection Work
summary: What actually happens when you type a command and press Enter — how the shell finds programs, expands wildcards and variables, connects programs with pipes, redirects input and output, and why quoting matters. The foundation for every other command-line skill.
---

::widget Scene {"title": "A pipeline: four small programs, one answer", "sub": "top 3 IPs hitting your server — built step by step", "nodes": [{"id": "log", "kind": "doc", "label": "access.log", "x": 3.72, "y": 3.72}, {"id": "c1", "kind": "cpu", "label": "awk '{print $1}'", "x": 7.52, "y": -0.08, "color": "blue"}, {"id": "c2", "kind": "cpu", "label": "sort", "x": 11.32, "y": -3.88, "color": "purple"}, {"id": "c3", "kind": "cpu", "label": "uniq -c", "x": 15.12, "y": -7.68, "color": "orange"}, {"id": "c4", "kind": "cpu", "label": "sort -rn | head -3", "x": 18.92, "y": -11.48, "color": "green"}], "links": [["log", "c1"], ["c1", "c2"], ["c2", "c3"], ["c3", "c4"]], "metrics": [["cmd", "Command so far"], ["out", "Output"]], "steps": [{"short": "Q", "tag": "Question", "title": "Which IPs hit the server most today?", "body": "<p>A 2 GB log. No script needed — combine small tools.</p>", "show": ["log"], "metrics": {"cmd": ["—"], "out": ["—"]}}, {"short": "Look", "tag": "Explore", "title": "head -3 access.log", "body": "<p>Look at the data first: \"203.0.113.9 - - [24/Nov…] \\\"GET /api\\\" 200 …\". The IP is field 1.</p>", "metrics": {"cmd": ["head -3 access.log"], "out": ["see the format"]}}, {"short": "Awk", "tag": "Extract", "title": "awk '{print $1}' access.log", "body": "<p>Print only the first field of each line.</p>", "show": ["log", "c1"], "flow": [["log", "c1", "#3b82f6", "lines"]], "metrics": {"cmd": ["awk '{print $1}'"], "out": ["one IP per line"]}}, {"short": "Sort", "tag": "Group", "title": "| sort", "body": "<p>uniq only merges adjacent duplicates, so sort first.</p>", "show": ["log", "c1", "c2"], "flow": [["c1", "c2", "#a855f7", "IPs"]], "metrics": {"cmd": ["… | sort"], "out": ["identical IPs together"]}}, {"short": "Uniq", "tag": "Count", "title": "| uniq -c", "body": "<p>Collapse runs and count them: \"  412 203.0.113.9\".</p>", "show": ["log", "c1", "c2", "c3"], "flow": [["c2", "c3", "#f59e0b", "sorted"]], "metrics": {"cmd": ["… | uniq -c"], "out": ["count + IP"]}}, {"short": "Top", "tag": "Rank", "title": "| sort -rn | head -3", "body": "<p>Sort numerically, largest first, keep three.</p>", "show": ["log", "c1", "c2", "c3", "c4"], "flow": [["c3", "c4", "#22c55e", "counts"]], "metrics": {"cmd": ["… | sort -rn | head -3"], "out": ["top 3 IPs", "good"]}}, {"short": "Streams", "tag": "How", "title": "Each | connects one program's stdout to the next one's stdin", "body": "<p>They all run at the same time, streaming — the 2 GB file is never loaded into memory at once.</p>"}, {"short": "Err", "tag": "stderr", "title": "Errors go to stderr, not down the pipe", "body": "<p>2>/dev/null hides them; 2>&1 merges them in; > file saves output; >> appends.</p>"}, {"short": "Save", "tag": "Reuse", "title": "Wrap it in a function or alias", "body": "<p>topips() { awk '{print $1}' \"$1\" | sort | uniq -c | sort -rn | head -\"${2:-3}\"; }</p>", "note": {"kind": "key", "text": "Unix philosophy: small tools that do one thing, connected by pipes that stream text. Look at the data, extract, sort, count, rank."}}]}

## Why engineers live in the terminal

> [!STORY] A production server is misbehaving. There's no graphical desktop — just an SSH connection and a blinking cursor. A senior engineer types one line: `grep ' 500 ' access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head`. Two seconds later she knows the exact URL causing 90% of the errors. A junior colleague would have downloaded a 4 GB log file and tried to open it in a text editor. The difference isn't talent; it's knowing how the shell composes small tools.

The **shell** (bash, zsh, fish) is a program that reads what you type, turns it into programs to run, and connects them together. It's not the terminal window — the terminal just displays text; the shell interprets it.

## What happens when you press Enter

::widget Stepper {"type":"flow","cols":4,"title":"The life of a command line","what":"The steps the shell takes between you pressing Enter and a program running, for the example: ls -l $HOME/*.txt > list.txt","steps":["Press Play and follow the example through each step.","Notice that ls never sees the * or $HOME — the shell has already replaced them.","Find the step where the new process is created (fork and exec, from the OS track)."],"nodes":[["1. Read and split","The shell reads the line and splits it into words, respecting quotes: ls, -l, $HOME/*.txt, >, list.txt."],["2. Expand","Variables are replaced ($HOME → /home/asha), then wildcards (globs): /home/asha/*.txt becomes the actual matching file names."],["3. Set up redirection","> list.txt means: open list.txt for writing and make it the command's standard output instead of the screen."],["4. Find the program","Is ls a shell builtin or alias? If not, search each folder in $PATH in order until /usr/bin/ls is found."],["5. fork and exec","The shell creates a child process (fork) and replaces it with the ls program (exec), passing the expanded arguments."],["6. Wait","The shell waits for ls to exit and stores its exit status in $? — 0 means success, anything else means failure."]]}

> [!ANALOGY] The shell is a restaurant waiter. You say "the usual, but spicier, to go". The waiter translates that into an exact order for the kitchen (expansion), decides where the food goes — a takeaway box instead of a plate (redirection) — finds the right cook (PATH lookup), and comes back to tell you whether it worked (exit status). The cook never hears the word "usual".

## Three standard streams

Every process starts with three open "files":

| Stream | Number | Default |
|---|---|---|
| **stdin** (standard input) | 0 | The keyboard |
| **stdout** (standard output) | 1 | The terminal |
| **stderr** (standard error) | 2 | The terminal |

Errors go to a separate stream so they don't pollute the real output you're piping to the next program.

### Redirection

```bash
sort names.txt > sorted.txt        # stdout to a file (overwrite)
echo "done" >> run.log             # append
grep pattern < input.txt           # stdin from a file
make 2> errors.txt                 # only stderr to a file
make > all.txt 2>&1                # stdout to the file, then stderr to wherever stdout goes
command > /dev/null 2>&1           # throw everything away
```

> [!WARN] Order matters in `> file 2>&1`: redirections are applied left to right. `2>&1 > file` sends stderr to the **terminal** (where stdout pointed at that moment) and only stdout to the file.

## Pipes: the Unix superpower


A **pipe** `|` connects one program's stdout to the next program's stdin. Both run **at the same time**; data streams through without temporary files.

```bash
# The 10 IP addresses that hit our server most often
cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head
```

> [!ANALOGY] An assembly line. Each worker does one simple job — cut, sort, count, sort again, take the top 10 — and passes the result down the belt. No worker needs to know about the others. This is the **Unix philosophy**: small programs that do one thing well and work together through text.

The exit status of a pipeline is normally the **last** command's. In scripts, `set -o pipefail` makes it fail if **any** stage fails (chapter 5).

## Quoting: the source of many bugs

```bash
file="my report.txt"
rm $file          # DANGER: becomes  rm my report.txt  → tries to delete "my" and "report.txt"
rm "$file"        # correct: one argument, "my report.txt"

echo '$HOME'      # single quotes: literal → $HOME
echo "$HOME"      # double quotes: variables expanded, but no word splitting or globbing
echo "today is $(date +%A)"   # command substitution: run a command, insert its output
```

Rule of thumb: **always double-quote variables** unless you specifically want splitting.

## Combining commands

```bash
mkdir build && cd build        # run the second only if the first succeeded
ping -c1 host || echo "down"   # run the second only if the first failed
make; make install             # run both regardless
long_job &                     # run in the background
```

## Getting help and moving fast

- `man ls`, `ls --help`, and `tldr ls` (community examples) explain any command.
- `type ls` shows whether something is a builtin, alias or program; `which python` shows which file runs.
- **Ctrl-R** searches your command history; **Tab** completes names; `!!` repeats the last command (`sudo !!`).
- **Ctrl-C** stops the running program; **Ctrl-D** ends input; **Ctrl-L** clears the screen.

> [!RECAP]
> - The **shell** splits, **expands** variables and wildcards, sets up **redirection**, finds the program on **$PATH**, then **fork + exec**s it and records the **exit status**.
> - Every process has **stdin (0), stdout (1), stderr (2)**; redirect with `>`, `>>`, `<`, `2>`, `2>&1`.
> - **Pipes** connect small tools into powerful pipelines — the Unix philosophy.
> - **Quote** variables (`"$file"`); use `$(…)` for command substitution; `&&` and `||` chain on success or failure.

> [!INTERVIEW] "What happens when you type `ls` and press Enter?" is a classic — answer with expansion, PATH lookup, fork/exec and wait. Also: the difference between stdout and stderr, and what `2>&1` does.

::quiz {"q":"In `ls *.txt`, who expands *.txt into file names?","options":["ls","The shell, before ls runs","The kernel","The terminal"],"answer":1,"explain":"ls only ever sees the list of matching names."}

::quiz {"q":"How do you send both stdout and stderr to out.log?","options":["cmd 2>&1 > out.log","cmd > out.log 2>&1","cmd | out.log","cmd >> 2 out.log"],"answer":1,"explain":"Redirections apply left to right: stdout to the file first, then stderr to the same place."}

::quiz {"q":"Why write rm \"$file\" rather than rm $file?","options":["It's faster","Without quotes, a name with spaces is split into several arguments","Quotes make it recursive","There's no difference"],"answer":1,"explain":"Always quote variables."}
