# pi-config

How I work with [pi](https://pi.dev/), the AI coding agent — my live `~/.pi` directory.

This repo **is** `~/.pi`: a backup/sync mirror of what actually runs on my machines, not a
template. Prompt templates, subagent definitions, an orchestration skill, custom extensions,
settings. Most of the value is in [`agent/prompts/`](agent/prompts) — the slash commands I use
every day for review, git plumbing, and explanations.

Detailed reference lives in [`docs/`](docs): [subagents](docs/agents.md),
[packages](docs/packages.md).

## This is personal infrastructure, not a starter kit

There are no setup instructions here on purpose. The config depends on services that only exist on
my network, and reproducing it elsewhere means rebuilding my whole stack — which I'm not claiming
is a good idea for anyone else:

- **Private LiteLLM AI Gateway** at `http://localhost:4000/v1` (on my LAN/Tailscale). It serves
custom aliases like `qwen3.8-flash`, `kimi-k2-5`, and `deepseek-v3-2` — these names mean nothing
to any public provider. `defaultProvider` is `litellm`, all 44 `enabledModels` and every subagent
`model:` are its aliases; without the gateway there are no models at all, and roles pinned to dead
aliases fail at *spawn* time, not load time.
- **Local Langfuse** for tracing/metrics via `@narumitw/pi-langfuse`, pointed at a self-hosted
instance. Its config (`agent/pi-langfuse.json`) holds project keys and is gitignored.
- Local state that never gets committed: `auth.json`, sessions, memory, caches
([What's not versioned](#whats-not-versioned)).

If you poke around anyway: read [`agent/prompts/`](agent/prompts) and
[`agent/agents/`](agent/agents) for ideas worth stealing, and treat everything model-, package-,
and service-related as noise. Pi packages install through `settings.json → packages` and pi itself
— plain `npm install` against this repo does nothing. See [docs/packages.md](docs/packages.md).

## Layout

| Path | What it is |
|---|---|
| `agent/prompts/` | Slash-command prompt templates → `/name` in any session |
| `agent/agents/` | Subagent definitions used by the orchestrator skill |
| `agent/skills/ORCHESTRATOR.md` | Multi-agent delegation playbook |
| `agent/extensions/` | Custom pi extensions (TypeScript, auto-discovered) |
| `agent/settings.json` | Provider, models, packages, theme, TUI, thinking budgets |
| `agent/zentui.json` | [pi-zentui](https://github.com/lmilojevicc/pi-zentui) statusline/editor config |
| `docs/` | Subagent and package reference |
| `agent/bin/` | Vendored CLI helpers — allowlisted for `*.py`/`*.sh`, but currently holds only an untracked `fd` binary (I keep `fd` installed natively via brew; search prompts fall back to `find` without it) |

Project-scoped equivalents live in `<repo>/.pi/prompts/` and `<repo>/.pi/agents/`, and load once
the project is trusted.

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
| `/create-prompt` | Writes a new prompt template. Always asks global vs. project scope first, never overwrites an existing file silently. I use it instead of hand-writing files — it enforces the frontmatter format. |
| `/awesome-django:add-posts <url...>` | Repo-specific: adds articles to my [awesome-django-articles](https://github.com/matagus/awesome-django-articles) list, verifying every link resolves and matching the file's existing conventions. Kept here as a worked example of a repo-scoped command. |

## Subagents + orchestration

Subagent machinery is [pi-herdr-agents](https://github.com/giuseppecrj/pi-herdr-agents) — it adds
the `subagent` / `subagent_send` / `subagents_list` tools and runs children in herdr panes or
managed git worktrees. It ships bundled roles (`worker`, `scout`, `planner`,
`adversarial-reviewer`, …); my definitions sit in the **global** tier, which takes precedence over
bundled ones:

```
project .pi/agents/   >   global ~/.pi/agent/agents/   >   package-bundled agents
```

`agent/skills/ORCHESTRATOR.md` is the delegation playbook: the orchestrating session never reads
source or writes code itself — it routes to specialized agents, parallelizes independent work in
background panes, and always closes with parallel verification.

My 13 role definitions live in `agent/agents/*.md`, each pinning a model and thinking level across
five aliases on my gateway (`deepseek-r1` for planning/diagnosis, `claude-sonnet-4-6` for review,
`kimi-k2-5` for implementation and search, `qwen3-coder-next` for refactor/test/general work,
`deepseek-v3-2` for docs/research/migrations). The full role → model → thinking table and how I
maintain it are in [docs/agents.md](docs/agents.md).

⚠️ **Ten of the thirteen are written for *my* Django/Python projects** — their system prompts
hardcode ruff, mypy, pytest, htmx, and Django conventions. Only `explore`, `plan`, and
`general-purpose` are domain-neutral.

Panes are herdr-managed ([`pi-herdr-agents`](https://github.com/giuseppecrj/pi-herdr-agents),
[`pi-herdr-status`](https://github.com/dereknex/pi-extensions)); managed git worktrees come from
[`pi-worktrees`](https://github.com/0xkuze/pi-worktrees), installed from npm.

## Extensions

Hand-written, in `agent/extensions/`:

- **`answer-length.ts`** — right after you press Enter, offers a word cap (50/100/200/300/500,
  custom, or unlimited) injected as a system directive for the run. Sticky across prompts until
  `/len off`. Soft limit: the model is asked, not forced.

(`herdr-agent-state.ts` also lives here but is installed and overwritten by herdr's own pi
integration, so it is not versioned.)

Everything else comes from the 36-entry `packages` list in `settings.json`: web access and search,
artifacts, context-mode, LSP routes, GitHub PR tooling, Langfuse tracing, loop-police and
cc-safety-net guardrails, session finder/manager/bookmark, promptsmith, zentui, pretty, task lists,
and more. Each one is named with what it adds — and linked to its source repo — in
[docs/packages.md](docs/packages.md).

## Notable settings

- `compaction.enabled: false` — I prefer explicit context control over automatic summarization.
- `thinkingBudgets`: minimal 1K / low 4K / medium 16K / high 64K, with per-model defaults in
  `modelThinkingLevels`.
- `hideThinkingBlock: false` — I read the reasoning.
- `tuiMode: "regular"`, `treeFilterMode: "no-tools"`, dark theme with a zentui statusline.

## What's not versioned

Deliberately excluded from this backup:

- **Credentials & provider state**: `auth.json`, `models.json`, `models-store.json*`,
  `litellm-models-dev.json`, `trust.json`, `pi-langfuse.json`, `claude-plugins.json`.
- **History & memory**: `sessions/`, `memory/`, `projects-memory/`, `pi-hermes-memory/`,
  `artifacts/`, `web-search-cache/`, `context-mode/`, sqlite lock files.
- **Machine-local state**: per-extension directories (`pi-pretty/`, `powerline-footer/`,
  `session-finder/`, `pi-bookmark/`, …), `npm/`, `git/` (cloned package sources), `tmp/`.
- **Binaries**: `agent/bin/fd` (the `bin/` allowlist only admits `*.py`/`*.sh`; I install `fd`
  natively with brew).
- **Pi packages** installed via `pi install` (`agent/npm/`, `agent/git/`) and the root
  `package.json` / `package-lock.json` / `node_modules/`. Three deps (`@joemccann/pi-pdf`,
  `@juicesharp/rpiv-ask-user-question`, `pi-goal-x`) live *only* in that untracked `package.json`
  and don't survive a restore — when I rebuild a machine I re-add them as `npm:` entries in
  `settings.packages` so there's one install mechanism again.
- **Langfuse keys**: `agent/pi-langfuse.json` points the tracer at my local instance.

The `.gitignore` uses an allowlist under `agent/` — only `prompts/`, `agents/`, `skills/`,
`extensions/`, `settings.json`, `bin/` (scripts only), and `zentui.json` are candidates for
commit, and everything private is re-listed explicitly so a future allowlist change can't leak it.
Before every push I audit:

```bash
git ls-files agent/                  # exactly what would go public
git check-ignore -v agent/auth.json  # prove a given secret is still ignored
```

One caveat about syncing between my machines: `sessions/` and `memory/` are excluded, so a fresh
checkout starts with no history. I copy `auth.json`, `trust.json`, `models.json`, and
`agent/sessions/` manually when I actually want continuity — `/find` (pi-session-finder) only
searches what's present locally.

⚠️ `agent/settings.json` is tracked as-is: its `enabledModels` publish the model aliases on my
private gateway, and every one of them is meaningless outside my network — which is exactly why
this repo works as my backup and not as anyone's starting point.

## License

MIT — do whatever you like with the prompts and agents.
