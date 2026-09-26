---
description: Reviews a GitHub pull request the way a careful human reviewer works — you sketch your own fix first, the diff is judged against it, and comments post in the user's own words as conventional comments. Use when the user invokes /review-pr <pr-number> or asks to review a GitHub PR.
argument-hint: "<pr-number>"
---

# PR Review

Review PR `<pr-number>` the way a careful human reviewer works: decide how **you** would solve the problem first, judge the diff against that sketch, and post every comment in the reviewer's own words, in **conventional comments** format, as individual inline comments.

If no PR number was provided, run `gh pr list` to show open PRs and stop.

## Step 1: Establish context — what problem does this PR solve?

1. Run `gh pr view <number>` for title, body, head branch, base branch, and repo.
2. Look for an issue/ticket reference (a URL, or a key like `ABC-123`) in the PR title first, then the head branch name, then the body.
3. **Reference found**: fetch it with whatever tracker tooling is available (`gh issue view` for GitHub issues, an installed issue-tracker MCP tool otherwise) and use its summary + description as the problem statement. If no tooling can reach it, ask the user to paste the relevant text.
4. **No reference**: use the PR body as the problem statement.
5. **Neither exists** (no reference, and the body is empty or template boilerplate): **stop here**. Tell the user nothing on this PR says what problem it solves, and to ask the author for context before reviewing. Do not reverse-engineer the intent from the diff and carry on — a review against guessed intent reviews the wrong thing.

## Step 2: The reviewer's sketch (before reading the diff)

Present the problem statement in a few sentences, then ask exactly one question and **wait for the answer**:

> given this problem, how would you have solved it?

Do **not** show the diff or describe the implementation before they answer; the point is a sketch uncontaminated by what the author did. A couple of sentences is enough: rough approach, where the change would live, anything they'd be careful about. Their answer is the reference design, and the delta between it and the diff guides the whole review.

## Step 3: Read the diff and build findings

Run `gh pr diff <number>` and get the latest commit SHA (`gh pr view <number> --json commits --jq .commits[-1].oid`). Check repo conventions (`AGENTS.md`, `CONTRIBUTING.md`, linter/formatter config, surrounding code).

Build a **numbered** findings list across four buckets, in this order:

| Bucket | What goes in it |
|--------|-----------------|
| Divergence | where the implementation differs from the user's sketch: design shape, data flow, where the change lives. Divergence is not automatically wrong; sometimes the author's approach is better than the sketch — say so and why |
| Gaps | bugs, unhandled edge cases, error paths, anything that could break at runtime |
| Patterns | violations of repo rules files, team standards, or conventions established in the surrounding code |
| Substantial extras | anything else genuinely worth the user's attention. Skip trivia: if it wouldn't change what the author does, it doesn't make the list |

Each finding gets: file path, a short snippet, and a one-sentence explanation.

## Step 4: The user addresses each point

Present the findings and have the user respond to each number in their own words:

- **keep**: they restate the concern how they'd say it; their phrasing wins, not yours
- **drop**: the finding dies, no argument
- **reword**: they give the angle, you tighten it

Every posted comment must trace back to something the user actually said. If the user says "post all as-is", push back once: at minimum the blocking items should pass through their own words, because the review carries their name.

## Step 5: Format into conventional comments

Every comment MUST follow:

```
<label> [decorations]: <subject>

[discussion]
```

### Labels (never use "praise")

| Label | When to use |
|-------|-------------|
| `suggestion` | proposing an improvement; include a code suggestion block when possible |
| `issue` | a specific problem: bug, logic error, missing handling |
| `question` | you have a concern but aren't sure it applies |
| `thought` | an idea worth mentioning, non-blocking |
| `nitpick` | trivial preference, always non-blocking |
| `todo` | small necessary change before merge |
| `chore` | a task that must happen before acceptance (e.g. run a script) |
| `note` | informational, non-blocking |

### Decorations (in parentheses after the label)

- `(blocking)`: must be resolved before merge
- `(non-blocking)`: optional, author's discretion
- `(if-minor)`: resolve only if the fix is trivial
- `(security)`, `(performance)`, `(ux)`: domain-specific flags

### Tone and style rules (CRITICAL)

- **lower case, brief sentences**: no title case, no formal language
- **phrased as questions**: instead of "please change this to X", write "shouldn't this be X?" or "would it make sense to use X here?"
- **never be certain**: hedge with "in my opinion", "to my knowledge", "as far as i know", "i could be wrong, but", "i believe", "might be worth"
- **never include praise**: no "great work", "nice job", "looks good"
- **do not mention line numbers** in the comment body; the comment is already attached to the line
- when the repo has a documented review standard or contributing guide, follow it over the defaults here

### Code suggestions

When possible, include a GitHub suggestion block so the author can one-click commit:

`````
suggestion (non-blocking): shouldn't this use `cimg/base:current` instead? as far as i know, that's what the rest of our deploy jobs use and it comes with common tools pre-installed.

```suggestion
    docker:
      - image: cimg/base:current
```
`````

The `suggestion` block MUST contain the exact replacement code for the line(s) the comment is attached to.

## Step 6: Approval gate and posting (CRITICAL, never skip)

Present ALL formatted comments and receive explicit approval before posting anything:

```
1. [label (decorations)] file/path.ext — `short code snippet being referenced`
   > the full comment body that will be posted

2. [label (decorations)] file/path.ext — `another snippet`
   > the full comment body that will be posted
```

Rules:

- every comment is **numbered** so the user can reference it ("drop 3", "reword 5", "post all except 2 and 4")
- the file path + snippet line is for the user's context only and is **NOT** part of the posted comment
- show the **full comment body** exactly as it will appear on the PR
- if the user requests changes, present the updated list and wait for approval again
- **never post a single comment until the user explicitly approves**

Once approved, post everything as **one review** so the inline comments and the verdict land together. Write the payload to a temp file with the write tool at `/tmp/review.json` (on macOS `$TMPDIR` points at a per-user sandbox in `/var/folders/…`; plain `/tmp` avoids quoting that), then submit it:

```json
{
  "commit_id": "<latest commit sha>",
  "event": "REQUEST_CHANGES | APPROVE",
  "body": "<one short line, e.g. left 4 comments, 1 blocking>",
  "comments": [
    {"path": "path/to/file.py", "line": 42, "side": "RIGHT", "body": "<conventional comment>"},
    {"path": "path/to/other.py", "start_line": 10, "start_side": "RIGHT", "line": 14, "side": "RIGHT", "body": "<multi-line comment>"}
  ]
}
```

```bash
gh api repos/{owner}/{repo}/pulls/{number}/reviews --input review.json
```

**Important**: `line` numbers reference the file's actual line numbers in the HEAD commit (right side of the diff), not diff hunk positions. Delete the temp file once the review is posted (`rm <path>`).

## Step 7: Verdict

The verdict is binary; there is no comment-only middle ground.

- Any `(blocking)` comment in the posted set: submit with `event: REQUEST_CHANGES`.
- No blocking comments: submit with `event: APPROVE`. If nothing rose to blocking, the PR has earned the approval; withholding it leaves the author waiting on a verdict that already exists.

State the verdict beneath the comment list at the Step 6 approval gate (e.g. `verdict: APPROVE, no blocking comments`) so the user signs off on comments and verdict together. If the user disagrees with the verdict, the fix is the comment list: escalate a finding to `(blocking)` or downgrade one, and the verdict follows.

## Attribution: never (CRITICAL)

Do **NOT** post AI attribution of any kind: no "generated with" lines, no `Co-Authored-By` bot trailers, no bot signatures, no AI disclaimers. The review is the user's — it was built from their sketch and their words, and it posts under their name.

## Safety

- Never post any comment, review, or verdict before the Step 6 approval.
- Never push commits, edit the PR branch, or merge the PR.
- If a `gh api` call fails, report it and ask before retrying; do not retry blindly and risk duplicate reviews.
