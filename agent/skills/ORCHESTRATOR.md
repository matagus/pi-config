# ORCHESTRATOR

## When to Use

Use when given a complex task that requires coordination across multiple steps, files, or specialized expertise. The orchestrator skill guides delegation to specialized subagents for implementation, research, testing, or review—never implementing directly.

Trigger: "orchestrate this work", "deploy a plan", "coordinate multi-step work", or when a task requires multiple agents, files, or phases.

## Agent Selection Guide

### Complexity-Based Delegation

| Task Complexity | Agent Type | Use Case |
|----------------|------------|----------|
| **Simple** (1-2 files, clear scope) | `implementer` or `refactor` | Direct implementation with clear spec |
| **Moderate** (3-5 files, coordinated changes) | `implementer` + `test` | Implementation + validation |
| **Complex** (multiple files, architectural decisions) | `plan` → `implementer` + `reviewer` | Architecture → implementation + review |
| **Research** (unknown patterns, docs lookup) | `researcher` or `explore` | Finding patterns, reading docs |
| **Debugging** (errors, tracebacks) | `debugger` | Root cause analysis |
| **Testing** (running suites, failures) | `test` | Execute and analyze tests |
| **Review** (PR-style feedback) | `reviewer` | Code quality assessment |
| **Linting** (style, types, formatting) | `linter` | Code quality checks |
| **Documentation** (README, docstrings) | `documenter` | Docs generation/updates |
| **Migrations** (Django schema/data) | `migrator` | Migration creation/troubleshooting |
| **HTMX-specific** (partial templates, views) | `htmx-specialist` | HTMX features and patterns |
| **General exploration** (open-ended, unclear scope) | `general-purpose` | Broad searches, multi-step tasks |
| **Code cleanup** (extract functions, add types) | `refactor` | Improve structure without behavior change |

### Model Selection

| Task | Recommended Model |
|------|------------------|
| Strategic planning | `litellm/deepseek-r1` (Plan agent) |
| Debugging | `litellm/deepseek-r1` (Debugger agent) |
| Code review | `litellm/claude-sonnet-4-6` (Reviewer agent) |
| Implementation | `litellm/kimi-k2-5` (Implementer/Refactor/HTMX) |
| Testing | `litellm/qwen3-coder-next` (Test/Linter agents) |
| Documentation | `litellm/deepseek-v3-2` (Documenter/Migrator) |
| General research | `litellm/deepseek-v3-2` (Researcher) |
| General purpose / multi-step | `litellm/qwen3-coder-next` (general-purpose agent) |

## Agent Selection Guide: When to Use Each Type

### Explore vs General-Purpose
- **Use `explore`** when you need fast, focused file/code location (pattern matching, grep, "where is X defined?"). It's read-only and specialized.
- **Use `general-purpose`** for open-ended tasks, ambiguous requirements, or multi-step explorations where the path isn't clear (e.g., "investigate why feature X fails" or "find and document all uses of pattern Y").

### when to Use Refactor
- Extract repeated code into reusable functions/methods
- Add type hints to function signatures
- Add docstrings to modules, classes, and public methods
- Reduce cyclomatic complexity (flatten nested ifs, early returns)
- Improve naming (variables, functions, classes)
- Split large functions/classes into cohesive units

**Note:** Refactor never changes behavior — it's for code quality, not feature work.

### When to Use Researcher
- "How do I do X in Django 5.x?"
- "What's the best approach for Y pattern?"
- "Compare library A vs B for Z use case"
- Research only — never modifies project files

### When to Use Migrator (Django-specific)
- Generate migrations after model changes
- Write data migrations (RunPython operations)
- Review migrations for safety (data loss, locks, missing reversals)
- Resolve migration conflicts
- Squash migration candidates

### When to Use Documenter
- Write/update README, CHANGELOG, API docs
- Add/Update docstrings
- Improve inline comments
- Document prerequisites and gotchas

### When to Use Debugger
- Investigate errors and tracebacks
- Root cause analysis for failures
- Debug unexpected behavior
- Identify fix proposals

## Procedure

### Step 1 — Explore
Spawn an Explore or researcher agent to understand the codebase. Use `run_in_background: false` when you need its output to plan next steps. NEVER read source files yourself to "understand."

### Step 2 — Plan
Use the explore agent's summary to create a task list and decide how to split work across agents. Use the agent selection guide to pick the right specialized agent for each task component. If complex, spawn a Plan agent. The orchestrator synthesizes and decides, but does NOT read raw code.

### Step 3 — Implement
Delegate ALL implementation to implementer/refactor/htmx-specialist/migrator agents:
- Use `run_in_background: true` for independent tasks to parallelize
- Use `run_in_background: false` only when the next agent depends on this one's output
- Chain dependent tasks: `implementer` → `test` → `reviewer` for high-stakes changes
- Use `max_turns` appropriately: simple fixes (8-10), complex features (12-15)

For Django model changes, schema refactors, or data transformations, delegate to a **migrator** agent first (it creates migrations, then the refactor agent applies the code changes). This ensures migrations and code stay in sync.

### Step 4 — Verify and Test (MANDATORY)
After ALL implementation agents complete, ALWAYS spawn verification agents in parallel. Do NOT perform verification manually via bash — delegate to specialized agents:

- **Always spawn a `test` agent** — to run the test suite and validate the changes work
- **Always spawn a `linter` agent** — to check code quality, formatting, and Django system checks
- **For Django model/schema changes**: ALSO spawn a `migrator` agent (not just verification — this was already used in Step 3) to ensure migrations are complete, safe, and reversible
- **For architectural changes**: Also spawn a `reviewer` for thorough feedback
- **For bugs**: Also spawn a `debugger` to confirm the fix
- **For open-ended tasks**: Use `general-purpose` for exploration and validation

These verification agents run in parallel (`run_in_background: true`). Wait for their results before reporting to the user.

**Never skip this step.** Never substitute manual bash calls for agent delegation. The orchestrator does NOT run tests, linters, or checks itself — it delegates.

### Step 5 — Report
Summarize results to the user in under 100 words. Show what changed and where.

## Pitfalls

- Do NOT pass `inherit_context: true` unless absolutely necessary — it defeats context isolation
- Do NOT read full source files "to plan" — the explore agent's summary IS your planning input
- Do NOT run agents sequential when they're independent — parallelize with background agents
- If an agent fails: steer it, or spawn a replacement with a different model. NEVER do the work yourself.
- Never use `edit`, `write`, or `bash` for implementation — always delegate to specialized agents
- Never read more than 2 files (max 50 lines each) for verification only

## Verification

- All code changes trace back to subagents
- Context window remains lean (no raw source code in conversation)
- Only allowed tools used (Agent, get_subagent_result, steer_subagent, task_list_*, memory_*, skill_manage, and minimal read for verification)
- Model selection matches task complexity
- No direct code writing or file editing by orchestrator
