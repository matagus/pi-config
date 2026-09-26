# pi-config

How I work with [pi](https://pi.dev/), the AI coding agent — my live `~/.pi` directory.

This repo **is** `~/.pi`. Everything in it is what actually runs on my machine, not a curated
sample: prompt templates, subagent definitions, an orchestration skill, custom extensions, and
settings. Most of the value is in [`agent/prompts/`](agent/prompts) — the slash commands I use
every day for review, git plumbing, and explanations.

## Install

```bash
git clone https://github.com/matagus/pi-config ~/.pi
cd ~/.pi && npm install          # installs pi packages declared in settings.json
pi                             # first run bootstraps provider + model state
```

Then supply the credentials pi needs — they are deliberately **not** in this repo (see
[What's not versioned](#whats-not-versioned)). At minimum you need a provider login (`/login`)
and, if you want to reuse my model names unchanged, a LiteLLM proxy reachable at
`http://localhost:4000/v1` serving the aliases in `agent/settings.json`. Otherwise edit
`defaultModel` / `enabledModels` down to models you actually have.

## Layout

| Path | What it is |
|---|---|
| `agent/prompts/` | Slash-command prompt templates → `/name` in any session |
| `agent/agents/` | Subagent definitions used by the orchestrator skill |
| `agent/skills/ORCHESTRATOR.md` | Multi-agent delegation playbook |
| `agent/extensions/` | Custom pi extensions (TypeScript, auto-discovered) |
| `agent/settings.json` | Provider, models, packages, theme, TUI, thinking budgets |
| `agent/zentui.json` | [pi-zentui](https://github.com/lmilojevicc/pi-zentui) statusline/editor config |
| `agent/bin/` | Vendored CLI helpers (currently `fd`, untracked binary) |

Project-scoped equivalents live in `<repo>/.pi/prompts/` and load once the project is trusted.

## Prompt templates

Invoke as `/<filename-without-.md>`. Arg placeholders: `$1`…`$n`, `$@` (all args).

### Review — the core of my workflow

Both review prompts produce findings in [conventional comments](https://conventionalcomments.org)
format (`label (decoration): subject`) with a lowercase, hedged, question-phrased tone, and both
refuse to add AI attribution to anything they write or post — the review carries my name, so it
has to read like me.

| Command | What it does |
|---|---|
| `/review-pr <number>` | Reviews a GitHub PR the way I would manually: establish the problem the PR solves, ask *me* how I'd have solved it **before** showing the diff, judge the diff against that sketch, then walk every comment through my own words. Nothing posts until I approve the numbered list; blocking findings ⇒ `REQUEST_CHANGES`, otherwise `APPROVE`. |
| `/review-changes` | Same standard applied to the working tree (staged + unstaged + untracked). Findings land in chat with file:line pointers and a verdict line; nothing is posted to GitHub and nothing is edited unless I accept. |

### Git plumbing

| Command | What it does |
|---|---|
| `/branch-commit-and-push` | Branch off `main` → commit → push → open a PR via `gh`; flags likely secrets before committing. |
| `/rebase-onto-main` | Update `main`, rebase the feature branch onto it. Classifies each conflict hunk as **mechanical** (resolve silently) or **needs-human-input** (stop and ask with 2–4 options). Never `--skip`, never weakens a test to make a rebase pass. |
| `/sync-main-after-merge` | After a PR merges on GitHub: fast-forward local `main`, delete the local branch. No local `git merge`, no `-D` without permission. |

### Understanding code

| Command | What it does |
|---|---|
| `/explain-diff` | Long-form interactive HTML explainer of a change: background, intuition with toy data, walkthrough, five quiz questions. Rendered through the artifacts viewer. |
| `/viz-explain-diff` | The scannable version: TL;DR card, one before/after diagram, visual diff, three quiz questions, ~100 words per section. |

### Meta & misc

| Command | What it does |
|---|---|
| `/create-prompt` | Writes a new prompt template. Always asks global vs. project scope first, never overwrites an existing file silently. |
| `/awesome-django:add-posts <url...>` | Repo-specific: adds articles to my [awesome-django-articles](https://github.com/matagus/awesome-django-articles) list, verifying every link resolves and matching the file's existing conventions. Kept here as a worked example of a repo-scoped command. |

## Subagents + orchestration

Subagent machinery is [pi-herdr-agents](https://github.com/giuseppecrj/pi-herdr-agents) — it adds
the `subagent` / `subagent_send` / `subagents_list` tools and runs children in herdr panes or
managed git worktrees. It ships its own bundled roles (`worker`, `scout`, `planner`,
`adversarial-reviewer`, …); my custom roles below sit in the **global** tier, which takes
precedence over bundled definitions:

```
project .pi/agents/   >   global ~/.pi/agent/agents/   >   package-bundled agents
```

`agent/skills/ORCHESTRATOR.md` is the delegation playbook: the orchestrating session never reads
source or writes code itself — it routes to specialized agents, parallelizes independent work in
background panes, and always closes with parallel verification.

My 13 role definitions live in `agent/agents/*.md`, each pinning a model and thinking level:

| Agent | Model | Role |
|---|---|---|
| `plan`, `debugger` | `deepseek-r1` | Architecture / diagnosis / root cause |
| `reviewer` | `claude-sonnet-4-6` | Code review |
| `implementer`, `htmx-specialist`, `linter`, `explore` | `kimi-k2-5` | Implementation, htmx+Django UI, checks, focused search |
| `refactor`, `test`, `general-purpose` | `qwen3-coder-next` | Behavior-preserving cleanup, suites, open-ended multi-step |
| `researcher`, `documenter`, `migrator` | `deepseek-v3-2` | Docs lookup/writing, Django migrations |

Panes are herdr-managed (`pi-herdr-agents`, `pi-herdr-status`); managed git worktrees come from
[`pi-worktrees`](https://github.com/0xkuze/pi-worktrees), installed from npm.

## Extensions

Hand-written, in `agent/extensions/`:

- **`answer-length.ts`** — right after you press Enter, offers a word cap (50/100/200/300/500,
  custom, or unlimited) injected as a system directive for the run. Sticky across prompts until
  `/len off`. Soft limit: the model is asked, not forced.

(`herdr-agent-state.ts` also lives here but is installed and overwritten by herdr itself, so it is
not versioned.)

Everything else comes from the package list in `settings.json`: web access + search, artifacts,
context-mode, LSP routes, GitHub PR tooling, Langfuse tracing, loop-police and cc-safety-net
(guardrails), session finder/manager/bookmark, promptsmith, zentui, pretty, task lists, and more.

## Notable settings

- `compaction.enabled: false` — I prefer explicit context control over automatic summarization.
- `thinkingBudgets`: minimal 1K / low 4K / medium 16K / high 64K, with per-model defaults in
  `modelThinkingLevels`.
- `hideThinkingBlock: false` — I read the reasoning.
- `tuiMode: "regular"`, `treeFilterMode: "no-tools"`, dark theme with a zentui statusline.

## What's not versioned

Deliberately excluded, and worth knowing about if you fork this:

- **Credentials & provider state**: `auth.json`, `models.json`, `models-store.json*`,
  `litellm-models-dev.json`, `trust.json`, `pi-langfuse.json`, `claude-plugins.json`.
- **History & memory**: `sessions/`, `memory/`, `projects-memory/`, `pi-hermes-memory/`,
  `artifacts/`, `web-search-cache/`, `context-mode/`, sqlite lock files.
- **Machine-local state**: per-extension directories (`pi-pretty/`, `powerline-footer/`,
  `session-finder/`, `pi-bookmark/`, …), `npm/`, `git/` (cloned package sources), `tmp/`.
- **Binaries**: `agent/bin/fd`.

The `.gitignore` uses an allowlist under `agent/` — only `prompts/`, `agents/`, `skills/`,
`extensions/`, `settings.json`, `bin/` (scripts only), and `zentui.json` are candidates for
commit, and everything private is re-listed explicitly so a future allowlist change can't leak it.

⚠️ `agent/settings.json` is tracked as-is: its `enabledModels` reflect the model aliases on my
private LiteLLM gateway. Change them to yours before pointing anything at real infrastructure.

## License

MIT — do whatever you like with the prompts and agents.
