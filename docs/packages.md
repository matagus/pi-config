# Packages

Everything pi loads on my machines that is *not* hand-written lives in
`settings.json → packages` (36 entries). Pi installs and updates these itself — there is no
lockfile to commit, and `package.json` / `node_modules/` are gitignored.

```bash
pi install npm:pi-wtf --global      # add a package
pi remove npm:pi-wtf --global       # drop it
```

Declarations land in `~/.pi/agent/settings.json`, which is why restoring this repo plus one
bootstrap run reproduces the whole set on a machine of mine. Sources resolve into two untracked
trees: `agent/npm/node_modules/` for `npm:` entries and `agent/git/github.com/<owner>/<repo>/` for
`git:` entries.

Every package name below links to its source repository (for scoped packages that share a monorepo,
the link goes to the monorepo, not the package subfolder). For anything not listed here, the
community indexes are [`awesome-pi-agent`](https://github.com/qualisero/awesome-pi-agent) and
[`awesome-pi`](https://github.com/bubbleptr/awesome-pi).

## Web & research

| Package | What it adds |
|---|---|
| [`pi-web-access`](https://github.com/nicobailon/pi-web-access) | `web_search` (many providers), `fetch_content`, repo cloning, PDF + YouTube/video understanding |
| [`context-mode`](https://github.com/mksglu/context-mode) | `ctx_execute` / `ctx_execute_file` / `ctx_index` / `ctx_search` — process big outputs in a sandbox so raw bytes never enter context |
| [`@jakeryderv/pi-artifacts`](https://github.com/jakeryderv/pi-artifacts) | `scaffold_artifact` / `render_artifact` / `export_artifact` — markdown & HTML visualization bundles |
| [`visual-explainer`](https://github.com/nicobailon/visual-explainer) | Skill that generates HTML diagrams, diff/plan reviews, slide decks |
| [`pi-markdown-preview`](https://github.com/omaclaren/pi-markdown-preview) | Rendered markdown + LaTeX preview (terminal, browser, PDF) |
| [`@joemccann/pi-pdf`](https://github.com/joemccann/pi-pdf) | PDF toolkit (extract, merge/split, forms) — installed via root `package.json`, not `settings.packages` |

## Review & code quality

| Package | What it adds |
|---|---|
| [`pi-pr-review`](https://github.com/10ego/pi-pr-review) | Parallel tiered subagent review of GitHub PRs, host-gated COMMENT/APPROVE |
| [`pi-simplify`](https://github.com/MattDevy/pi-extensions) | Reviews recently changed code for clarity and maintainability |
| [`@narumitw/pi-lsp`](https://github.com/narumiruna/pi-extensions) | Language-agnostic `lsp_diagnostics` / `lsp_fix` through a shared runner |
| [`@narumitw/pi-github-pr`](https://github.com/narumiruna/pi-extensions) | PR review, checks, and comment status in the TUI |
| [`pi-herdr-agents`](https://github.com/giuseppecrj/pi-herdr-agents) | Async subagents in herdr panes / managed worktrees; ships bundled roles |
| [`pi-herdr-status`](https://github.com/dereknex/pi-extensions) | Reports active model + status to herdr's sidebar |
| [`pi-worktrees`](https://github.com/0xkuze/pi-worktrees) | Create/switch/delete managed git worktrees from the TUI |

Guardrail note: `read,bash` on a report-only role is an allowlist, **not** a sandbox — shell
commands can still mutate files. Report-only roles need Bash restricted to inspection.

## Safety & loop control

| Package | What it adds |
|---|---|
| [`cc-safety-net`](https://github.com/kenryu42/cc-safety-net) | Blocks destructive commands and secret-file access |
| [`pi-loop-police`](https://github.com/sebaxzero/pi-loop-police) | Detects and interrupts runaway thinking/tool-call loops before they burn the window |
| [`pi-goal-x`](https://github.com/tmonk/pi-goal-x) | Durable long-running objectives with structured tasks (root `package.json`) |

Both guardrails have their own config files that are **not** versioned here — see
[../README.md#whats-not-versioned](../README.md). Tuning guidance lives in the
`loop-police-postmortem` skill once installed.

## Sessions & navigation

| Package | What it adds |
|---|---|
| [`pi-session-finder`](https://github.com/pungggi/pi-session-finder) | `/find <keywords>` full-text search across all past sessions |
| [`pi-session-manager`](https://github.com/vahidkowsari/pi-session-manager) | Browse, resume, rename, delete sessions |
| [`pi-bookmark`](https://github.com/vaultboy001/pi-bookmark) | `/pin` `/unpin` `/bookmarks` — resume pinned sessions from any workspace |
| [`pi-scroll`](https://github.com/beowulf11/pi-scroll) | Keyboard-driven session history search with previews |
| [`pi-treex`](https://github.com/travisp/pi-treex) | Native `/tree` with sticky-left pane and detail view |
| [`pi-context-view`](https://github.com/dimk90/pi-context-view) | Visualize context usage incl. base prompt, tool defs, injections |
| [`pi-inspector`](https://github.com/link-duan/pi-inspector) | Browser dashboard of live system prompt + full transcript |
| [`pi-wtf`](https://github.com/travisp/pi-wtf) | Recover / rewind / undo the last prompt after a mistake |

## Prompt authoring

| Package | What it adds |
|---|---|
| [`pi-prompt-template-model`](https://github.com/nicobailon/pi-prompt-template-model) | Per-template model selection; drives the `model:` frontmatter in prompts |
| [`pi-promptsmith`](https://github.com/ayagmar/pi-promptsmith) (`git:`) | Prompt template iteration |
| [`@vanillagreen/pi-prompt-stash`](https://github.com/vanillagreencom/kendex) | Per-session prompt stash (`alt+s`) |
| [`@jyooi/pi-ask-user-question`](https://github.com/jyooi/pi-ask-user-question) | Structured `ask_user_question` tool |
| [`@juicesharp/rpiv-ask-user-question`](https://github.com/juicesharp/rpiv-mono) | Alternative questionnaire tool (root `package.json`) |
| [`@juicesharp/rpiv-advisor`](https://github.com/juicesharp/rpiv-mono) | Model-requested second opinion from a stronger reviewer |

Use `/create-prompt` (see [`../agent/prompts/create-prompt.md`](../agent/prompts/create-prompt.md))
rather than hand-writing template files — it enforces the frontmatter format and asks global vs.
project scope first.

## UI & platform

| Package | What it adds |
|---|---|
| [`pi-provider-litellm`](https://github.com/balcsida/pi-provider-litellm) | My private LiteLLM gateway as a provider — **required** for every model alias here |
| [`pi-zentui`](https://github.com/lmilojevicc/pi-zentui) (`git:`) | Statusline + editor config, driven by `agent/zentui.json` |
| [`@heyhuynhgiabuu/pi-pretty`](https://github.com/heyhuynhgiabuu/pi-pretty) | Syntax-highlighted reads, colored bash output, tree listings |
| [`pi-live-terminal`](https://github.com/tanishqkancharla/pi-live-terminal) | tmux-backed live terminal widget |
| [`pi-auto-session-titles`](https://github.com/edxeth/pi-auto-session-titles) (`git:`) | Auto-generated session titles |
| [`@thunstack/pi-task-list`](https://github.com/aashishd/pi-task-tracker) | Implicit task-list tracking without a plan mode |
| [`pi-caffeinated`](https://github.com/tanishqkancharla/pi-caffeinated) | Keep-awake toggle |
| [`@penumbral-labs/pi-copy-code`](https://github.com/penumbral-labs/pi-copy-code) | Ergonomic copying of assistant code blocks |

## Two install paths (a wart, not a design)

`settings.packages` is what makes a restore reproducible. The root `package.json` holds three
extras (`@joemccann/pi-pdf`, `@juicesharp/rpiv-ask-user-question`, `pi-goal-x`) that arrived via
`npm install` rather than `pi install`. That file is gitignored, so **those three do not survive a
machine restore.** TODO for me: re-add them as `npm:` entries in `settings.packages` — one
mechanism beats two.
