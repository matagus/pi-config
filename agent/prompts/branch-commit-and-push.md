---
description: Create a git branch off main (if not already on one), commit all staged and unstaged changes, push, open a PR with the gh CLI, and report the branch name, PR number, and link. Use when the user invokes /branch-commit-and-push or asks to ship current changes as a PR.
argument-hint: "[branch-name or context for the PR]"
---

# Branch, commit, push, and open a PR

Ship the current working-tree changes: branch (if needed) → commit → push → PR → report.

Optional user input (branch name and/or context for the PR): `$@`

## Steps

1. **Inspect state.** Run `git status --short` and `git branch --show-current`.
   - If there are no staged or unstaged changes, stop and tell the user there is nothing to commit.
   - Scan the changed paths for likely secrets (`.env`, keys, tokens, credentials). If found, ask the user before committing them.
2. **Branch from main if needed.**
   - If already on a non-main feature branch, keep using it (do not re-branch).
   - If on `main` (or `master`), create a new branch: `git checkout -b <name>`.
   - Branch name: use `$@` if it looks like a slug; otherwise derive a short kebab-case name from the changes (e.g. `refactor/dry-cache-getters`, `fix/login-timeout`).
3. **Commit everything.** `git add -A` the staged and unstaged changes (nothing else — no unrelated edits), then commit with a concise message summarizing the change. Prefer conventional-commit style (`fix:`, `feat:`, `refactor(scope):`, ...).
4. **Push.** `git push -u origin <branch>`.
5. **Open the PR.** Use `gh pr create` with:
   - Title: the commit subject.
   - Body: 2–4 lines — what changed and why, plus verification status (tests run, linters clean) when known from this session.
   - Base branch: the repo default (usually `main`).
6. **Report back briefly.** Share the branch name, PR number, and PR URL. Nothing else unless something failed.

## Safety

- Never force-push or rewrite history.
- Never commit to `main`/`master` directly — always branch first.
- If `gh` is unavailable or unauthenticated, push the branch anyway and tell the user the compare URL to open the PR manually.
- If the push or PR step fails, report the exact error instead of retrying blindly.
