---
description: Updates local main from origin and rebases the current (or named) feature branch onto origin/main. Use when the user asks to update, sync, refresh, or rebase a branch onto main, catch up with main, or run their usual checkout-main / fetch / pull / rebase flow. Handles rebase conflicts by asking before resolving anything that needs human, product, or design input.
---

# Rebase onto main

Bring `main` up to date, then rebase the working feature branch onto `origin/main`. Prefer this over merge-from-main unless the user explicitly asks to merge.

Do **not** force-push, skip hooks, amend published commits, or `git rebase --skip` unless the user explicitly asks.

## Default sequence

Context: working on `<branch1>` (current branch unless the user named another).

1. Record `<branch1>` (`git branch --show-current`). Refuse to proceed from a detached HEAD unless the user names a branch.
2. Require a clean worktree (`git status`). If there are uncommitted changes, stop and ask: stash, commit, or abort. Do not stash silently.
3. `git checkout main`
4. `git fetch origin`
5. `git pull origin main`
6. `git checkout <branch1>`
7. `git rebase origin/main`

If `main` does not exist locally, check for `master` (or `git remote show origin` default branch) and ask before using a different base.

Run git via the bash tool (zsh on macOS), from the repo root. Prefer sequential calls over `&&` chains so a failed checkout/pull does not continue.

## Before starting

- Confirm the repo and `<branch1>` in one short sentence, then run the sequence. Do not ask for confirmation of the happy path.
- If a rebase is already in progress (`git status` / `.git/rebase-merge` or `.git/rebase-apply`), do not start a second one. Report state and ask: continue, abort, or inspect.

## After a clean rebase

Report:

- Branch name
- Whether it moved (`git status -sb` / how many commits onto `origin/main`)
- That updating the remote needs `git push --force-with-lease` and **do not push** unless the user asks

## Conflicts

When rebase stops with conflicts:

1. Stop rewriting code. Collect facts first:
   - `git status`
   - `git diff` (and `git diff --name-only --diff-filter=U`)
   - `git log --oneline origin/main..HEAD` and the commit being applied (`git rebase --show-current-patch` or look at `.git/rebase-merge/stopped-sha`)
2. Classify **every** conflicted hunk (see below).
3. **Ask first** for any hunk that is not mechanical. Do not apply a guessed resolution, then mention it afterward.
4. Only after answers (or a clear mechanical-only set): edit files, `git add` those paths, `git rebase --continue`.
5. Repeat until the rebase finishes or the user asks to abort (`git rebase --abort`).

Never:

- `git rebase --skip` to “get past” a conflict
- `git add` unresolved files or `git add -A` without inspecting
- Delete the other side’s feature to make the rebase succeed
- Resolve tests by weakening or deleting assertions to match whichever side compiles

### Mechanical (agent may resolve without asking)

Safe only when the intended result is obvious from the conflict markers and nearby code:

- Duplicate identical lines / imports / includes (keep one)
- Import/order/formatting-only overlap
- Trivial list/map merge where both additions are independent and do not interact
- Changelog / lockfile / generated file regeneration after both sides touched it (regenerate rather than hand-merge when the project has a standard command)

If a “mechanical” hunk might change runtime behavior, treat it as needs-ask.

### Needs human / product input (ask before any edit)

Stop and ask when resolving would choose behavior, scope, or copy. Ask specific questions, listing file + conflict, both sides in plain language, and 2–4 options. Do not dump raw conflict markers as the only explanation.

Ask when any of these apply:

- Business rules, calculations, tax/payroll/legal amounts, dates, flags, entitlements
- API contracts, request/response shapes, error codes, auth
- UX copy, labels, user-visible defaults
- Two features both belong but interact (ordering, precedence, which wins)
- Main deleted code the branch still uses, or the branch deleted code main still uses
- Tests or specs disagree on expected behavior
- Ambiguous “both added different implementations of the same function”
- You cannot tell which side is newer **and** correct
- Product/design/PM would reasonably care about the outcome

Example questions:

- “`foo.py` tax exemption: main caps at $500; this branch uses $750. Which limit is current?”
- “Main removed `LegacyClient`; this branch still calls it. Keep a shim, migrate the call, or drop the branch change?”
- “Both sides added a `retry` helper with different backoff. Keep one, or compose both? Which policy?”

If several files share one product decision, ask once and apply the answer everywhere.

### If the user is unavailable or the question is blocked

Do not guess. Leave the rebase in progress, list remaining conflicted files, and say exactly what is needed to continue. Offer `git rebase --abort` as the safe undo.

## Safety

- No `git push --force` (use `--force-with-lease` only when the user asked to publish the rebased branch)
- No `git reset --hard` except to recover a mess **and** only if the user asked
- No updating git config
- Hooks stay enabled
- If pull/rebase would overwrite unpublished work, stop and explain
