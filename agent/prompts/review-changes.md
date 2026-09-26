---
description: Reviews the current staged and unstaged git changes against the problem they claim to solve and enumerates findings in chat as conventional comments. Nothing is posted to GitHub. Use when the user invokes /review-changes or asks to review local/uncommitted/working-tree changes.
---

# Local Change Review

Review the working tree the way a careful human reviewer works: the diff is judged against the problem it claims to solve, and every finding is written in **conventional comments** format. Nothing is posted anywhere. The deliverable is a findings list in chat, written so the person who made the changes can act on it.

## Step 1: Establish context — what problem do these changes solve?

1. Run `git status --short` and `git diff --stat HEAD` to see what's in play. If the user named a repo or subfolder, scope to it; otherwise use the repo the changes are in.
2. **No changes** (clean working tree): stop. Tell the user there's nothing staged or unstaged to review, and ask whether they meant a branch diff or a PR (`/review-pr`).
3. Look for an issue/ticket reference (a URL, or a key like `ABC-123`) in the current branch name (`git rev-parse --abbrev-ref HEAD`), then in recent commit subjects on the branch (`git log --oneline origin/main..HEAD`).
4. **Reference found**: fetch it with whatever tracker tooling is available (`gh issue view` for GitHub issues, an installed issue-tracker MCP tool otherwise) and use its summary + description as the problem statement. If no tooling can reach it, ask the user to paste the relevant text.
5. **No reference**: ask the user for the problem statement in one question, and wait. Do not reverse-engineer the intent from the diff and carry on — a review against guessed intent reviews the wrong thing.

State the problem statement back in a couple of sentences so the user can correct it, then go straight to the diff. Do **not** ask them how they would have solved it; they wrote the code, so the question just returns the diff.

## Step 2: Read the changes and build findings

Read everything in the working tree, not just one half of it:

```bash
git diff              # unstaged, tracked files
git diff --staged     # staged
git status --porcelain  # untracked files: read each one in full with the read tool
```

Untracked files are new code with no diff context; they need the closest read, not the lightest. Check repo conventions (`AGENTS.md`, `CONTRIBUTING.md`, linter/formatter config, surrounding code).

Build a **numbered** findings list across four buckets, in this order:

| Bucket | What goes in it |
|--------|-----------------|
| Fit | whether the change actually solves the problem statement, and whether it lives in the right place. A change that works but sits in the wrong layer, or that solves a narrower problem than the one stated, belongs here |
| Gaps | bugs, unhandled edge cases, error paths, anything that could break at runtime |
| Patterns | violations of repo rules files, team standards, or conventions established in the surrounding code |
| Substantial extras | anything else genuinely worth the user's attention. Skip trivia: if it wouldn't change what the author does, it doesn't make the list |

Each finding gets: file path, line number, a short snippet, and a one-sentence explanation.

Also call out anything that is staged but half-finished, or unstaged but clearly meant to ship: a split that doesn't match the intent is itself a finding.

## Step 3: Format each finding as a conventional comment

Every finding MUST follow:

```
<label> [decorations]: <subject>

[discussion]
```

### Labels (never use "praise")

| Label | When to use |
|-------|-------------|
| `suggestion` | proposing an improvement; include a code block with the replacement when possible |
| `issue` | a specific problem: bug, logic error, missing handling |
| `question` | you have a concern but aren't sure it applies |
| `thought` | an idea worth mentioning, non-blocking |
| `nitpick` | trivial preference, always non-blocking |
| `todo` | small necessary change before commit |
| `chore` | a task that must happen before acceptance (e.g. run a script) |
| `note` | informational, non-blocking |

### Decorations (in parentheses after the label)

- `(blocking)`: must be resolved before this ships
- `(non-blocking)`: optional, author's discretion
- `(if-minor)`: resolve only if the fix is trivial
- `(security)`, `(performance)`, `(ux)`: domain-specific flags

### Tone and style rules (CRITICAL)

- **lower case, brief sentences**: no title case, no formal language
- **phrased as questions**: instead of "please change this to X", write "shouldn't this be X?" or "would it make sense to use X here?"
- **never be certain**: hedge with "in my opinion", "to my knowledge", "as far as i know", "i could be wrong, but", "i believe", "might be worth"
- **never include praise**: no "great work", "nice job", "looks good"
- **do include the file path and line number** in the header line; unlike a PR comment, nothing here is attached to a line, so the author needs the pointer
- when the repo has a documented review standard or contributing guide, follow it over the defaults here

## Step 4: Present the findings (the deliverable)

Output the numbered list in chat. This is the whole output; there is no posting step, no `gh` call, and no approval gate.

`````
1. [issue (blocking)] src/orders/totals.py:142 — `total = gross - deductions`
   > issue (blocking): shouldn't this guard against deductions exceeding gross?
   >
   > i could be wrong, but as far as i know nothing upstream clamps the deduction
   > total, so a negative net would flow straight into the ledger write below.

2. [suggestion (non-blocking)] src/orders/totals.py:88 — `for d in deductions:`
   > suggestion (non-blocking): would it make sense to pull this into the existing
   > `sum_deductions` helper? i believe that's what the other two call sites use.
   >
   > ```python
   > total = sum_deductions(deductions)
   > ```
`````

Rules:

- every finding is **numbered** so the user can reference it ("expand 3", "i disagree with 5")
- group by file when there are many, keeping the numbering continuous
- if a finding is speculative because you couldn't run the code, say so in the finding rather than dropping it
- offer once, at the end, to apply the fixes; do not start editing files unless the user asks

## Step 5: Verdict

Close with a one-line verdict beneath the findings list:

- Any `(blocking)` finding: `verdict: needs changes before this ships, N blocking`
- No blocking findings: `verdict: good to commit, N non-blocking notes`

If nothing rose to blocking, say so plainly; hedging a clean review wastes the author's time. If the user disagrees with the verdict, the fix is the findings list: escalate a finding to `(blocking)` or downgrade one, and the verdict follows.

## Attribution: never (CRITICAL)

Do **NOT** add AI attribution of any kind to anything you write or commit as a result of this review: no "generated with" lines, no `Co-Authored-By` bot trailers, no bot signatures, no AI disclaimers. The review is the user's.

## Safety

- Read-only review: never stage, commit, stash, revert, or push anything.
- Never post to GitHub — no `gh pr review`, no `gh api`, no comments anywhere.
- Only edit files if the user explicitly accepts the offer to apply fixes.
