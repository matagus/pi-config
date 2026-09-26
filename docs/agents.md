# Subagents

Thirteen role definitions in `agent/agents/*.md`, consumed by
[pi-herdr-agents](https://github.com/giuseppecrj/pi-herdr-agents). Each pins a model and a
thinking level in frontmatter so delegation is deterministic — the orchestrator picks a *role*,
not a model.

## Discovery order

Verified against `pi-herdr-agents` (its README, "Role discovery"):

```
project .pi/agents/<name>.md  >  global $PI_CODING_AGENT_DIR/agents/<name>.md  >  package-bundled
```

Global wins over bundled, which is how these thirteen shadow the bundled `worker` / `scout` /
`planner` set for colliding names. Precedence resolves *before* visibility filtering: a hidden
project-local agent with the same name as a visible global one still wins and the global one
disappears from `subagents_list`. Set `roles.bundled: false` in
`$PI_CODING_AGENT_DIR/herdr-agents/config.json` to exclude bundled roles entirely.

Inspect what is actually live:

```bash
/subagents          # or the subagents_list tool — shows name, source tier, model
```

## Role → model → thinking

| Role | Model | Thinking | Purpose |
|---|---|---|---|
| `plan` | `litellm/deepseek-r1` | minimal | Architecture, implementation strategy, critical-file list. Read-only. |
| `debugger` | `litellm/deepseek-r1` | medium | Errors, tracebacks, root cause |
| `reviewer` | `litellm/claude-sonnet-4-6` | medium | PR-style review: logic, patterns, error handling, maintainability |
| `implementer` | `litellm/kimi-k2-5` | minimal | Well-scoped feature code from a spec + file paths |
| `htmx-specialist` | `litellm/kimi-k2-5` | minimal | htmx partials, Django view wiring, progressive enhancement |
| `linter` | `litellm/kimi-k2-5` | minimal | Runs ruff/mypy, reports and optionally auto-fixes |
| `explore` | `litellm/kimi-k2-5` | minimal | Fast read-only search: find files by pattern, grep symbols, "where is X" |
| `refactor` | `litellm/qwen3-coder-next` | medium | Behavior-preserving restructuring, naming, complexity |
| `test` | `litellm/qwen3-coder-next` | minimal | Runs pytest/django test, parses failures, suggests fixes |
| `general-purpose` | `litellm/qwen3-coder-next` | — | Open-ended multi-step research/search. No thinking pinned. |
| `researcher` | `litellm/deepseek-v3-2` | low | Web + docs investigation, "best approach for Y" |
| `documenter` | `litellm/deepseek-v3-2` | minimal | READMEs, docstrings, API docs, inline comments |
| `migrator` | `litellm/deepseek-v3-2` | medium | Django migrations: create, review, conflict resolution |

All five distinct models are aliases on my private LiteLLM gateway and are present in
`settings.json → enabledModels`, so this table is only valid on my machines.

## Stack-specific by design

`reviewer`, `debugger`, `documenter`, `linter`, `researcher`, `migrator`, `htmx-specialist`,
`refactor`, `test`, and `implementer` open with "You are a … specialist **for a Django/Python
project**" and their bodies hardcode ruff / mypy / pytest / htmx / Django conventions — that's my
daily work. Only `explore`, `plan`, and `general-purpose` are domain-neutral. On a non-Python repo
the ten Django-shaped ones don't error; they just quietly give Python advice, which is why I keep
their scope stated in the first line of each body.

## When a gateway alias changes

Every `model:` value is a LiteLLM alias served by my gateway at `http://localhost:4000/v1`
(`pi-provider-litellm`). Retiring an alias upstream fixes nothing here by itself: changing
`defaultModel`/`enabledModels` in `settings.json` only covers the *parent* session; the children
still read their own frontmatter.

```bash
# what to edit, all at once
rg -n '^model:' agent/agents/*.md
# then re-run after editing to confirm nothing dangles
rg -n '^model:' agent/agents/*.md | sort -u -t: -k3
```

For each value printed, confirm it exists in `enabledModels` — a role pointing at a disabled or
nonexistent alias fails at spawn time, not at load time, so `/subagents` will still list it
happily. To see what the gateway actually serves right now:

```bash
curl -s http://localhost:4000/v1/models | python3 -m json.tool | rg '"id"'
```

## Orchestration rules

[`../agent/skills/ORCHESTRATOR.md`](../agent/skills/ORCHESTRATOR.md) is the playbook. The short
version of what it enforces:

- The orchestrating session never reads source or writes code itself — it routes.
- Independent work goes to background panes in parallel; dependent writes stay sequential.
- Every delegation closes with parallel verification, not a single self-check.
- Children are leaves: they don't push, merge, deploy, or spawn further agents.

Two gotchas that cost me time:

**Ordinary panes for read-only roles.** Worktrees are for parallel *writers* starting from
committed state. The base is committed HEAD, so uncommitted parent changes are not copied into a
worktree — spawn `explore` and reviewers in plain panes with `cwd` set instead.

**Set `model` and `thinking` explicitly on orchestrated children.** Omitting them inherits the
parent's runtime, which silently defeats the per-role routing in the table above and makes cost
unpredictable. `task:<category>` is for when I want the configured category candidates rather than
a fixed pick.

## Adding a role

Drop a file at `agent/agents/<name>.md` with frontmatter:

```markdown
---
description: "One sentence saying what it does AND when to call it. This is the only text the
  orchestrator sees when choosing."
display_name: My Role
tools: read, bash, grep, edit, write
model: litellm/some-alias
thinking: medium
---

Body = the system prompt. State the stack ("for a Django/Python project") in the first line,
because that is exactly what a future reader needs to spot as wrong.
```

Keep `description` specific about *when to use it* — role selection is a description match, not a
body read. Prefer `skills` (plural) over the legacy singular `skill`. When supplying
`display_name`, keep it identical across edits so overrides stay predictable. State the stack
("for a Django/Python project") in the first body line, because that is exactly what a future
reader (me included) needs to spot as out-of-scope.
