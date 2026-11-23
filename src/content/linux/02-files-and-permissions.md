---
title: Files, Directories and Permissions
summary: How Linux organizes everything into one tree, what lives in /etc, /var and /proc, links and inodes, reading and changing permissions (rwx, chmod, chown), why "permission denied" happens, and special cases like sudo, setuid and the sticky bit.
---

::widget Scene {"title": "Reading rwxr-x---", "sub": "one deploy script, three kinds of users, and a permissions fix", "nodes": [{"id": "perm", "kind": "cells", "label": "-rwxr-x--- deploy deploy deploy.sh", "x": 3.1, "y": 3.1, "values": ["-", "r", "w", "x", "r", "-", "x", "-", "-", "-"]}], "metrics": [["who", "Who is asking"], ["bits", "Bits that apply"], ["res", "Result"]], "steps": [{"short": "Parts", "tag": "Read", "title": "Type, then three groups of three: owner, group, others", "body": "<p>- = regular file. rwx = read, write, execute.</p>", "set": {"perm": {"marks": {"0": "dark", "1": "blue", "2": "blue", "3": "blue", "4": "purple", "5": "purple", "6": "purple", "7": "orange", "8": "orange", "9": "orange"}, "ptr": {}}}, "metrics": {"who": ["-"], "bits": ["owner | group | others"], "res": ["-"]}}, {"short": "Owner", "tag": "Owner", "title": "User deploy (the owner) runs it", "body": "<p>Only the owner bits apply: rwx → read, edit and execute.</p>", "set": {"perm": {"marks": {"1": "green", "2": "green", "3": "green"}, "ptr": {}}}, "metrics": {"who": ["deploy (owner)"], "bits": ["rwx"], "res": ["can run and edit", "good"]}}, {"short": "Group", "tag": "Group", "title": "Asha is in the deploy group", "body": "<p>Group bits r-x: she can read and run it, not change it.</p>", "set": {"perm": {"marks": {"4": "green", "5": "red", "6": "green"}, "ptr": {}}}, "metrics": {"who": ["asha (group)"], "bits": ["r-x"], "res": ["run, not edit"]}}, {"short": "Other", "tag": "Others", "title": "www-data is neither", "body": "<p>Others: --- → Permission denied.</p>", "set": {"perm": {"marks": {"7": "red", "8": "red", "9": "red"}, "ptr": {}}}, "metrics": {"who": ["www-data (other)"], "bits": ["---"], "res": ["denied"]}}, {"short": "Octal", "tag": "Numbers", "title": "As a number: r=4, w=2, x=1 → 750", "body": "<p>7 (4+2+1), 5 (4+1), 0. chmod 750 deploy.sh.</p>", "set": {"perm": {"marks": {}, "ptr": {}}}, "metrics": {"bits": ["750"]}}, {"short": "Dir", "tag": "Directories", "title": "On directories: r = list, w = create/delete, x = enter", "body": "<p>A file's own permissions don't stop someone with w on the directory from deleting it.</p>"}, {"short": "Bad", "tag": "Problem", "title": "Someone ran chmod 777 \"to fix it\"", "body": "<p>Now anyone on the box can edit a script that deploy runs, instant privilege escalation.</p>", "set": {"perm": {"marks": {"1": "red", "2": "red", "3": "red", "4": "red", "5": "red", "6": "red", "7": "red", "8": "red", "9": "red"}, "ptr": {}, "values": ["-", "r", "w", "x", "r", "w", "x", "r", "w", "x"]}}, "metrics": {"bits": ["777"], "res": ["anyone can modify", "bad"]}}, {"short": "Fix", "tag": "Fix", "title": "chmod 750 and chown deploy:deploy", "body": "<p>Fix the real cause (wrong owner or group) instead of opening everything.</p>", "set": {"perm": {"marks": {"1": "green", "2": "green", "3": "green", "4": "green", "6": "green"}, "ptr": {}, "values": ["-", "r", "w", "x", "r", "-", "x", "-", "-", "-"]}}, "metrics": {"bits": ["750"], "res": ["least privilege", "good"]}}, {"short": "Special", "tag": "Special bits", "title": "setuid, setgid, sticky", "body": "<p>setuid runs as the file's owner (e.g. passwd); sticky on /tmp means only owners can delete their files. umask sets defaults for new files.</p>", "note": {"kind": "key", "text": "Permissions = owner/group/others × read/write/execute. Fix ownership rather than chmod 777; remember directory permissions differ."}}]}


## Everything is a file

> [!STORY] A new engineer deploys an app and it crashes with `Permission denied: /var/log/myapp/app.log`. They try `chmod 777` on everything they can find, it works, and they've just let every user on the machine read and rewrite the app's logs and config, including a database password. The right fix was one command giving the app's user ownership of its log folder. Understanding permissions takes ten minutes and saves you from both the error and the overreaction.

Linux presents almost everything as a file in **one tree** starting at `/`: documents, devices (`/dev/sda` is a disk), running processes (`/proc/1234`), even kernel settings (`/proc/sys/...`). The same tools, `cat`, `ls`, `echo`, work on all of them.

## A map of the tree

| Path | What lives there |
|---|---|
| `/etc` | System configuration: `/etc/hosts`, `/etc/ssh/sshd_config`, service settings |
| `/home/asha` | Users' personal files (`~` is a shortcut for yours) |
| `/root` | The administrator's home |
| `/usr/bin`, `/usr/lib` | Installed programs and libraries |
| `/var` | Data that changes: `/var/log` (logs), `/var/lib` (databases, Docker), caches |
| `/tmp` | Temporary files, often wiped on reboot |
| `/proc`, `/sys` | Virtual files describing processes and the kernel, generated live |
| `/dev` | Devices: disks, terminals, `/dev/null` |
| `/opt` | Add-on software |

## Moving around and handling files

```bash
pwd                      # where am I?
ls -lah                  # list all files, long format, human-readable sizes
cd /var/log; cd -; cd ~  # go somewhere; go back; go home
cp -r src/ backup/       # copy a folder
mv old.txt new.txt       # move or rename
rm -r build/             # delete a folder (there is no recycle bin!)
mkdir -p a/b/c           # create nested folders
find . -name "*.log" -mtime +7       # files ending .log, older than 7 days
du -sh * | sort -h       # what's taking up space here?
df -h                    # how full are the disks?
```

## Inodes and links

A file's **name** and its **data** are separate. The data and metadata (owner, permissions, size, timestamps) live in an **inode**; a directory is just a list of names pointing to inode numbers.

- A **hard link** is a second name for the same inode. Delete one name, and the data survives through the other.
- A **symbolic link** (`ln -s target linkname`) is a small file containing a **path**. If the target moves, the link breaks.

> [!NOTE] Two surprises explained by inodes: deleting a huge log file that a process still has open **doesn't free the space** (the inode stays alive until the process closes it, find it with `lsof | grep deleted`), and a disk can be "full" with free space left if it has run out of **inodes** because of millions of tiny files (`df -i`).

## Permissions

`ls -l` shows something like:

```text
-rwxr-x---  1 deploy  web  4096  Nov 23 09:14  deploy.sh
```

- First character: `-` file, `d` directory, `l` symlink.
- Then three groups of three: **owner** (`rwx`), **group** (`r-x`), **others** (`---`).
- Owner is `deploy`, group is `web`.

::widget Stepper {"type":"hub","title":"Reading rwxr-x--- and what r, w, x mean","what":"The center is a permission string; each box explains one part of it. Files and directories interpret r, w and x differently.","steps":["Click the center first.","Click each part and work out what the 'web' group can do with deploy.sh.","Find what x means on a directory, the cause of many confusing errors."],"nodes":[["rwxr-x---","Owner: read, write, execute. Group: read and execute. Everyone else: nothing. In numbers: 7, 5, 0 → chmod 750."],["r (read) = 4","On a file: view its contents. On a directory: list the names inside it."],["w (write) = 2","On a file: change its contents. On a directory: create, delete or rename files inside it, even files you don't own!"],["x (execute) = 1","On a file: run it as a program. On a directory: enter it and reach files inside. Without x on every folder along the path, you get 'Permission denied' even if the file itself is readable."],["Who is checked","Linux checks: are you the owner? use the owner bits. Otherwise, are you in the group? use the group bits. Otherwise, the 'others' bits. Root bypasses most checks."],["Common numbers","644 = normal file (owner edits, everyone reads). 600 = private (SSH keys, secrets). 755 = program or folder everyone can use. 700 = private folder."]]}

```bash
chmod 640 config.yml            # owner rw, group r, others nothing
chmod u+x deploy.sh             # add execute for the owner
chown deploy:web /var/log/myapp # change owner and group
sudo -u deploy touch /var/log/myapp/test   # test as that user
id                              # which user and groups am I?
```

> [!WARN] `chmod 777` "fixes" permission errors by letting anyone do anything. It's almost never right. Find out **which user** the process runs as (`ps -o user= -p PID`) and give **that user** exactly the access it needs.

## sudo and the root user

**root** (user ID 0) can do almost anything. Instead of logging in as root, administrators use `sudo command` to run one command with root privileges, which is logged and controlled by `/etc/sudoers`. Least privilege applies here too.

## Special bits

- **setuid** on a program makes it run as its **owner** not as you. `passwd` uses it to edit `/etc/shadow` (owned by root). A buggy setuid-root program is a classic privilege-escalation target.
- **setgid** on a directory makes new files inherit the directory's group, useful for shared team folders.
- **Sticky bit** on a directory (like `/tmp`, shown as `drwxrwxrwt`) means users can only delete their **own** files, even though everyone can write there.
- **umask** sets default permissions for new files (a umask of 022 makes new files 644).

> [!RECAP]
> - Everything is in **one tree**: config in `/etc`, logs in `/var/log`, live kernel info in `/proc` and `/sys`.
> - Names point to **inodes**; hard links share an inode, symlinks store a path. Deleted-but-open files still use space.
> - Permissions: **owner / group / others** × **read / write / execute**; on directories, x means "can enter".
> - Use `chmod`, `chown` and `id`; avoid `chmod 777`; prefer `sudo` to logging in as root.
> - Special bits: **setuid** **setgid** **sticky** (`/tmp`).

> [!INTERVIEW] Expect "what does 755 mean?", "why do I get permission denied on a file I can read?" (missing x on a parent directory), "disk full but du shows little" (deleted open files or inodes), and hard vs symbolic links.

::quiz {"q":"What does chmod 640 give the group?","options":["Read and write","Read only","Nothing","Execute only"],"answer":1,"explain":"6 = rw for owner, 4 = r for group, 0 for others."}

::quiz {"q":"A file is readable by you, but opening it gives 'Permission denied'. A likely cause?","options":["The disk is full","A parent directory lacks execute (x) permission for you","The file is too large","It's a hard link"],"answer":1,"explain":"x on a directory is needed to reach anything inside it."}

::quiz {"q":"You deleted a 20 GB log file but df still shows the disk full. Why?","options":["df is cached","A running process still has the file open, so its inode isn't freed","Linux keeps a recycle bin","The file was a symlink"],"answer":1,"explain":"Restart or signal the process, or truncate the file instead of deleting it."}
