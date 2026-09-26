---
description: Create a new pi prompt template and save it globally or only for the current project. Use when the user invokes /create-prompt, asks to add a slash prompt, or wants a reusable prompt template.
argument-hint: "[command-name] [what the prompt should do]"
---

# Create a prompt template

Turn the user's request into a new pi prompt template (a Markdown file invoked as `/name`).

User-supplied text after the slash command: `$@`

Do **not** write the file until the user has chosen **where it is saved**.

## 1. Scope — always ask (required)

Call `ask_user_question` **before** creating any file. One question, two options. Do not skip this even if the user already hinted at a location; pre-select by putting their implied choice first and labeling it `(Recommended)`.

- **header**: `Save where` (max 16 characters)
- **question**: `Where should this prompt be available?`
- **options**:
  1. **Global (all projects)** — `~/.pi/agent/prompts/<name>.md`. Available in every pi session.
  2. **This project only** — `<cwd>/.pi/prompts/<name>.md` where `<cwd>` is the **current working directory at the moment this command runs**. Not used in other repos. Create `.pi/prompts/` if it is missing. Project prompts load only after the project is trusted.

If the user types a custom location, map it to one of those two trees or refuse if it is neither.

## 2. Name and spec

- Slash name = filename without `.md`, kebab-case, `[a-z0-9-]+` (e.g. `review-pr` → `/review-pr`).
- Prefer `$1` as the command name when it already looks like a slug; otherwise derive a short name from `$@` / the conversation.
- If the name is still unclear, ask a second `ask_user_question` (header `Slash name`) with a suggested slug as option 1 `(Recommended)` and a second option they can replace by typing a custom name.
- If the chosen file already exists, ask before overwrite: keep existing, overwrite, or pick a different name. Do not silently replace.

The template body must encode **what the new prompt should do**, from `$@` and this conversation. If that is too vague to write a useful template, ask one clarifying question and then proceed — do not invent an unrelated workflow.

## 3. File format

Write a single `.md` file, non-recursive in that `prompts/` folder (pi does not scan subdirectories).

```markdown
---
description: <one line: what it does and when to use it, including /<name>>
argument-hint: "<required> [optional]"   # omit this line if the prompt takes no args
---

# <Title>

<instructions for the agent when the user runs /<name>>
```

Follow the style of existing templates in `~/.pi/agent/prompts/` (YAML frontmatter, numbered steps, explicit safety). Use `$1`, `$@`, `${1:-default}` in the **new** template only when it should accept arguments. `description` is required. Filename = command name.

Do not create a subagent, skill, or workflow unless the user asked for those instead of a prompt.

## 4. Write and confirm

1. Create the target directory if needed.
2. Write only that one file. If the write tool cannot access `~/.pi/agent/prompts`, write it via the bash tool (`mkdir -p ~/.pi/agent/prompts` plus a quoted heredoc). This machine is macOS with zsh, so use POSIX paths under `$HOME` — never drive letters or backslashes.
3. Reply in **under 80 words**: slash command (`/name`), **global** vs **this project**, full file path, and that they may need a new pi session (or prompt reload) before `/name` appears.

Do not commit, push, or edit unrelated files.
