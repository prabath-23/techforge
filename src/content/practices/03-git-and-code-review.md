---
title: Git and Code Review — How Teams Change Code Together
summary: What Git really stores (snapshots, not differences), why a branch is just a pointer, merging vs rebasing explained with a picture in your head, recovering from mistakes, branching strategies teams actually use, and how to write and review pull requests that make the team better.
---

## The folder called final_v3_REALLY_FINAL

> [!STORY] Before version control, teams emailed zip files around. `report_final.doc`, `report_final_v2.doc`, `report_final_v3_REALLY_FINAL.doc`. Two people edited the same file and one person's work silently vanished. Nobody could say what changed last Tuesday or why. In 2005 Linus Torvalds, needing a new tool for Linux kernel development, wrote **Git** in about two weeks. Today almost all software is built with it.

## What Git actually stores

Most people think Git stores **differences** between versions. It actually stores **snapshots**: each commit records what every file looked like at that moment. (Unchanged files aren't duplicated — Git just points to the same stored copy.)

Git has a small number of object types, each named by a hash of its contents:

- **Blob:** the contents of one file.
- **Tree:** a folder — a list of names pointing to blobs and other trees.
- **Commit:** a pointer to the top-level tree, plus author, message and a pointer to the **parent** commit(s).

Because each commit points to its parent, the history forms a chain — and because names are content hashes, changing anything in history changes every hash after it. That's why history can't be silently tampered with.

::widget Stepper {"type":"flow","cols":4,"title":"What happens when you commit","what":"The journey of your changes from the files you edited to a new commit, and what a branch really is.","steps":["Press Play from left to right.","Notice the staging area between editing and committing.","Find what actually changes when 'the branch moves forward'."],"nodes":[["Working folder","The files you're editing right now."],["git add → staging area","Saves the chosen files' contents as blobs and records them in the 'index' — a draft of your next commit. You can stage some changes and not others."],["git commit","Builds trees from the staging area and creates a commit pointing to that snapshot and to the previous commit."],["The branch moves","The branch (say, main) is just a tiny file containing one commit hash. Committing updates it to point at the new commit. That's all a branch is."]]}

> [!ANALOGY] A branch is a **bookmark** in a book, not a copy of the book. Creating a branch is instant and free because you're only adding a bookmark. `HEAD` is "the bookmark you're currently reading from".

## Merging vs rebasing

You branched off `main` to build a feature. Meanwhile, teammates added commits to `main`. How do you combine the work?

- **Merge** creates a new commit with **two parents**, joining the two lines of history. Nothing is rewritten; the history shows exactly what happened, including the fork.
- **Rebase** takes your commits and **replays them on top of** the latest `main`, as if you'd started from there. The history becomes one straight line — but your commits get new hashes, because they're new commits.

> [!ANALOGY] Two people writing chapters of a book in parallel. **Merging** is stapling both drafts together with a note saying "combined here". **Rebasing** is rewriting your chapters as if you'd started after reading the other person's latest version — tidier, but it's a rewrite.

> [!WARN] **Never rebase commits that others have already pulled.** Their copies point to the old commits; yours point to new ones, and the histories diverge in confusing ways. Rebase your own unpublished work freely; merge (or use pull-request squash merges) for shared branches. If you must update a pushed branch you own, use `git push --force-with-lease`, which refuses to overwrite work you haven't seen.

**Conflicts** happen when both sides changed the same lines. Git marks the region in the file, and a human decides the right result — then runs the tests.

## Undoing mistakes

| Situation | Command |
|---|---|
| Throw away uncommitted changes to a file | `git restore file.js` |
| Unstage a file | `git restore --staged file.js` |
| Fix the last commit's message or add a forgotten file | `git commit --amend` (only if not pushed) |
| Undo a pushed commit safely | `git revert <hash>` — adds a new commit that reverses it |
| Move the branch back, keeping changes | `git reset --soft HEAD~1` |
| "I lost a commit!" | `git reflog` — lists everywhere HEAD has been; almost nothing is truly lost |
| Find which commit introduced a bug | `git bisect` — binary search through history |

> [!EXAMPLE] **git bisect in action.** A test that passed last month fails today, with 300 commits in between. Mark one good commit and one bad, and Git checks out the middle commit for you to test. Each answer halves the range: about 8 tests to find the exact commit among 300 (log₂ 300 ≈ 8). It's binary search (Algorithms track) applied to history.

## Branching strategies

- **Trunk-based development:** everyone merges small changes into `main` at least daily, using short-lived branches and **feature flags** to hide unfinished work. Used by most high-performing teams (it pairs with CI/CD — Cloud track, chapter 6).
- **GitHub Flow:** branch off `main`, open a pull request, review, merge, deploy. Simple and common.
- **Git Flow:** long-lived `develop` and `release` branches. Suited to software released in versions (like mobile apps or libraries), but heavy for web services that deploy continuously.

Long-lived branches cause painful merges. The longer two branches live apart, the more they diverge.

## Commits and pull requests that help reviewers

A good commit message explains **why**:

```text
Round payment amounts to 2 decimals before calling provider

The provider rejects amounts like 1080.0000001 that come from
floating-point discount calculations, which caused ~0.3% of
student renewals to fail. Rounding at the boundary fixes it.

Fixes BILL-482
```

A good pull request:

- Is **small** — under a few hundred lines. Review quality drops sharply on large changes.
- Has a description: what changed, **why**, how it was tested, and screenshots for UI changes.
- Does **one thing**: don't mix a refactor with a feature.

## Reviewing code well

Code review catches bugs, but just as importantly it **spreads knowledge**, so more than one person understands every part of the system.

- **Look for what matters:** correctness, edge cases, security, clarity, tests, and whether the design fits. Let linters and formatters handle style automatically.
- **Be kind and specific.** Comment on the code, not the person. Ask questions: "What happens if `items` is empty here?" lands better than "This is wrong."
- **Mark how important a comment is:** "nit:" for small optional suggestions, versus "blocking:" for must-fix issues.
- **Review promptly.** Waiting days for a review slows everyone down; many teams aim to respond within a few hours.
- **Approve when it's better than before**, not when it's perfect.

> [!RECAP]
> - Git stores **snapshots** as blobs, trees and commits, named by hash; a **branch** is just a pointer to a commit.
> - **Merge** joins histories; **rebase** replays commits for a straight line — never rebase shared history.
> - Recover with `restore`, `revert`, `reset`, **`reflog`**; find bugs with **`bisect`**.
> - Prefer **trunk-based** development with small, short-lived branches.
> - Write commit messages that explain **why**; keep pull requests **small**; review kindly, specifically and promptly.

> [!INTERVIEW] Expect questions like "merge vs rebase?", "how would you undo a commit that's already pushed?", "how do you recover a lost commit?", and behavioral questions about a disagreement in code review and how you resolved it.

::quiz {"q":"What is a Git branch?","options":["A full copy of the repository","A movable pointer to a single commit","A folder of diffs","A remote server"],"answer":1,"explain":"Which is why creating a branch is instant."}

::quiz {"q":"How should you undo a commit that teammates have already pulled?","options":["git reset --hard and force push","git revert, which adds a new commit reversing it","Delete the repository","git commit --amend"],"answer":1,"explain":"Revert doesn't rewrite shared history."}

::quiz {"q":"About how many steps does git bisect need to find a bad commit among 1,000?","options":["1,000","500","About 10","1"],"answer":2,"explain":"Binary search: log₂ 1000 ≈ 10."}
