---
description: Syncs local main after a branch was merged on GitHub, then deletes the local feature branch. Use when the user asks to move to main, update main, sync main after a merge, clean up a merged branch, or switch off a branch that is already merged on GitHub.
---

# Sync main after GitHub merge

The feature branch is **already merged on GitHub** (via PR). Do **not** run `git merge` locally. Update local `main` from `origin`, then delete the local copy of the feature branch.

Do **not** force-push, skip hooks, delete remote branches, or amend published commits unless the user explicitly asks.

## Default sequence

Context: `<branch1>` is the merged feature branch (current branch unless the user named another).

1. Record `<branch1>` (`git branch --show-current`). Refuse to proceed from a detached HEAD unless the user names a branch.
2. Require a clean worktree (`git status`). If there are uncommitted changes, stop and ask: stash, commit, or abort. Do not stash silently.
3. `git checkout main`
4. `git fetch origin`
5. `git pull origin main`
6. `git branch -d <branch1>` (safe delete — only succeeds if fully merged into current HEAD)

If `main` does not exist locally, check for `master` (or `git remote show origin` default branch) and ask before using a different base.

Run git via the bash tool (zsh on macOS), from the repo root. Prefer sequential calls over `&&` chains so a failed checkout/pull does not continue.

## Before starting

- Confirm the repo and `<branch1>` in one short sentence, then run the sequence. Do not ask for confirmation of the happy path.
- If `<branch1>` is `main` (or the default branch), stop — there is no feature branch to clean up.

## After a clean run

Report in **fewer than 50 words**: whether `main` is up to date, whether `<branch1>` was deleted, and any step that failed. Do not push unless the user asks.

## If branch delete fails

`git branch -d` refuses when the branch is not merged into current `main`. Do **not** use `-D` unless the user explicitly asks to force-delete.

1. Report why delete failed (`git branch -d` stderr).
2. Suggest: confirm the PR merged on GitHub, re-run fetch/pull, or that local `main` may be behind.
3. Stop — do not delete unmerged work without explicit user approval.

## Safety

- No `git merge` — merging happens on GitHub
- No `git branch -D` unless the user explicitly asks
- No `git push --force` unless the user explicitly asks
- No `git reset --hard` except to recover a mess **and** only if the user asked
- No updating git config
- Hooks stay enabled
