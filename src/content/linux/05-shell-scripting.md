---
title: Shell Scripting That Doesn't Break
summary: Writing bash scripts that behave predictably — the safety settings every script should start with, variables, quoting, conditionals, loops and functions, handling arguments and errors, cleaning up with traps, scheduling with cron, and knowing when a script should become a real program.
---

## The backup script that deleted everything

> [!STORY] A team's nightly cleanup script contained `rm -rf "$BACKUP_DIR/"*`. One night the config file that set `BACKUP_DIR` failed to load. The variable was empty, so the command became `rm -rf /*` — and the script, running as root, started deleting the server. Real incidents like this (including a well-known one in a popular game's Linux installer in 2015) come from scripts that **keep going** after something unexpected happens. A few lines at the top of every script prevent most of them.

## The safety header

```bash
#!/usr/bin/env bash
set -euo pipefail
```

- `set -e` — **exit** immediately if any command fails, instead of carrying on with broken state.
- `set -u` — treat an **unset variable** as an error. The story's empty `BACKUP_DIR` would have stopped the script.
- `set -o pipefail` — a pipeline fails if **any** stage fails, not just the last one.

And for destructive commands, be explicit:

```bash
: "${BACKUP_DIR:?BACKUP_DIR must be set}"   # abort with a message if empty or unset
rm -rf -- "${BACKUP_DIR:?}/"*
```

> [!ANALOGY] `set -euo pipefail` is a car's automatic emergency braking. A careful driver rarely needs it, but the one time they look away, it stops the car before something terrible happens.

## Variables and quoting

```bash
name="Asha"                 # no spaces around =
greeting="Hello, $name"
files_count=$(ls | wc -l)   # command substitution
echo "${name}_backup"       # braces separate the name from following text
echo "${PORT:-8080}"        # default value if PORT is unset or empty
readonly MAX_RETRIES=5
```

**Always double-quote variables** (chapter 1): `"$file"`, `"$@"`.

## Conditions

```bash
if [[ -f "$config" ]]; then          # file exists
  echo "found config"
elif [[ -d "$dir" && -w "$dir" ]]; then   # directory exists and is writable
  echo "will write to $dir"
else
  echo "nothing to do" >&2           # messages about problems go to stderr
  exit 1
fi

[[ "$env" == "prod" ]] && echo "careful!"
[[ $count -gt 10 ]]                  # numeric comparison: -eq -ne -lt -le -gt -ge
(( count > 10 ))                     # arithmetic form
```

Prefer `[[ … ]]` over `[ … ]` in bash: it handles empty variables and patterns more safely.

## Loops

```bash
for host in web1 web2 web3; do
  ssh "$host" uptime
done

for f in /var/log/app/*.log; do
  gzip -- "$f"
done

while IFS= read -r line; do          # read a file line by line, safely
  echo "processing: $line"
done < urls.txt

for i in {1..5}; do echo "attempt $i"; done
```

> [!WARN] Never loop over `$(ls)` or `$(cat file)` — names with spaces get split apart. Use globs (`for f in *.log`) or `while read -r`.

## Functions, arguments and exit codes

```bash
log() { printf '%s [%s] %s\n' "$(date +%FT%T)" "$1" "$2" >&2; }

retry() {                                  # retry a command with backoff
  local attempts=$1; shift
  local n=1
  until "$@"; do
    if (( n >= attempts )); then log ERROR "failed after $n attempts: $*"; return 1; fi
    log WARN "attempt $n failed, retrying in $((n*2))s"
    sleep $((n*2)); ((n++))
  done
}

usage() { echo "usage: $0 <environment> [--dry-run]" >&2; exit 2; }

[[ $# -ge 1 ]] || usage                    # $# = number of arguments
env=$1                                     # $1, $2… = arguments; "$@" = all of them
dry_run=false
[[ "${2:-}" == "--dry-run" ]] && dry_run=true

retry 5 curl -fsS "https://deploy.example.com/$env/health"
```

- Every command returns an **exit code**: 0 for success, non-zero for failure. `$?` holds the last one.
- Functions use `return`; the script uses `exit`.
- `local` keeps variables inside a function.

## Cleaning up with trap

```bash
tmpdir=$(mktemp -d)
trap 'rm -rf -- "$tmpdir"' EXIT         # runs however the script ends — success, error or Ctrl-C

curl -fsS "$url" -o "$tmpdir/data.json"
process "$tmpdir/data.json"
```

`trap … EXIT` is like a `finally` block: temporary files, lock files and background processes get cleaned up even when something fails.

## A complete, well-behaved script

```bash
#!/usr/bin/env bash
# Compress app logs older than N days and upload them to object storage.
set -euo pipefail

days=${1:-7}
log_dir=${LOG_DIR:?LOG_DIR must be set}
bucket=${BUCKET:?BUCKET must be set}

log() { printf '%s %s\n' "$(date +%FT%T)" "$*" >&2; }

find "$log_dir" -name '*.log' -mtime +"$days" -print0 |
while IFS= read -r -d '' file; do
  log "archiving $file"
  gzip -- "$file"
  aws s3 cp -- "$file.gz" "s3://$bucket/$(hostname)/" --only-show-errors
  rm -- "$file.gz"
done
log "done"
```

(`-print0` and `read -d ''` handle file names containing spaces or even newlines.)

## Scheduling with cron

```text
# m  h  dom mon dow   command          (edit with: crontab -e)
  30 2  *   *   *     /opt/scripts/archive-logs.sh 7 >> /var/log/archive.log 2>&1
  */5 * *   *   *     /opt/scripts/healthcheck.sh
```

Cron runs with a **minimal environment** — a short `PATH` and none of your shell settings — so use full paths and set variables inside the script. Always redirect output somewhere you'll see it. On systemd machines, **timers** offer logging and retry behavior for free.

## Check your scripts

**ShellCheck** (`shellcheck script.sh`) finds unquoted variables, broken loops and dozens of other traps automatically. Run it in your editor and in CI.

> [!NOTE] **When to stop using bash.** Once a script passes ~100 lines, needs data structures, parses JSON heavily, or needs tests, rewrite it in Python or Go. Bash is superb glue; it's a poor application language.

> [!RECAP]
> - Start every script with `#!/usr/bin/env bash` and **`set -euo pipefail`**; guard destructive commands with `${VAR:?}`.
> - **Quote** variables; use `[[ … ]]`, `for … in` globs and `while read -r` safely.
> - Use **functions**, `local`, meaningful **exit codes**, messages to **stderr**, and **trap … EXIT** for cleanup.
> - Cron needs full paths and logged output; consider systemd timers.
> - Lint with **ShellCheck**; move to a real language when scripts grow.

> [!INTERVIEW] DevOps and SRE interviews may ask you to write a short script (retry a health check, rotate logs, loop over hosts) or spot bugs in one — unquoted variables, missing `set -e`, parsing `ls`.

::quiz {"q":"What does set -u protect against?","options":["Slow commands","Using an unset variable, which would otherwise silently become empty","Unicode errors","Running as root"],"answer":1,"explain":"It would have stopped the empty BACKUP_DIR disaster."}

::quiz {"q":"How do you ensure a temp directory is removed even if the script fails?","options":["Delete it at the last line","trap 'rm -rf -- \"$tmpdir\"' EXIT","Use /tmp — it's auto-deleted","set -e"],"answer":1,"explain":"The EXIT trap runs on success, failure and interruption."}

::quiz {"q":"Why does a script that works in your terminal fail under cron?","options":["Cron can't run bash","Cron runs with a minimal environment — different PATH and no shell profile","Cron runs as a different OS","Scripts must be compiled"],"answer":1,"explain":"Use full paths and set variables inside the script."}
