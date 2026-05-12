---
name: agent-delegation
description: "Use when the primary agent must decide whether to delegate via the Task tool, which subagent id to call, and how to keep child-session prompts small. Use when multiple subagents could apply, or before large read-only review, verification, security review, or external doc research."
---

# Subagent delegation (OpenCode)

Must respect `permission.task` in the active primary agent's frontmatter (`agents/<id>.md` — `build` vs `plan` vs `orchestrator` have different allowlists). The `plan` agent cannot invoke `test-verifier`, `code-reviewer`, `security-reviewer`, or `docs-reviewer` via Task. The **`orchestrator`** agent drives Task `plan-runner`, `code-executor`, and the usual reviewers per its prompt; it does not implement code directly.

- Always spawn the subagents respecting the models defined for each one.
- Use `code-explorer` for reading and exploring codebase files, architecture mapping, and symbol location. This is the dedicated read-only exploration agent.
- Use `explore` for fast read-only codebase discovery when `code-explorer` is unnecessary (built-in platform agent).
- Use `code-executor` for implementing and writing code. This agent writes only — delegate exploration to `code-explorer` first when needed.
- Use `general` for heavier multi-step research or exploration when `explore` is too narrow — **Task** only if `permission.task` allows it (**`build`** commonly does). The **`orchestrator`** agent does **not** list `general`; use **`code-explorer`** or **`explore`** instead.
- Use `spec-critic` before implementation when the task is ambiguous, architectural, or spans multiple modules.
- Use `api-docs-researcher` before coding against third-party APIs, SDKs, migrations, or recent framework behavior.
- Load `skill: test-driven-development` before delegating any implementation work to `code-executor` or when the `build` agent begins coding — enforces test-first (red-green-refactor) for all non-trivial changes.
- Use `test-verifier` after implementation.
- Use `security-reviewer` when auth, secrets, file handling, shell execution, external input, network calls, permissions, or multi-tenant logic are involved.
- Use `code-reviewer` before finalizing any meaningful diff. This agent reviews only — it does not write or explore.
- Use `docs-reviewer` when user-facing behavior, config, env vars, CLI, API shape, or setup steps changed.

## Gold rule: minimal child prompt

Every Task invocation should include:

1. **Goal** in one or two sentences.
2. **Scope**: exact paths, commit/diff, or “read-only” constraints already known to the parent.
3. **Expected return shape**: use the numbered sections that agent’s system prompt requires (e.g. blocking vs non-blocking lists).

Do not paste the entire parent conversation into the subagent unless necessary.

## When not to delegate

- Single trivial edit or one obvious tool call.
- User asked explicitly for a single-thread reply.
- Subagent is denied for the current primary (`permission.task`).

## Anti-patterns (avoid)

- Do **not** call `code-reviewer` until there is a **stable diff** (known paths / commit / clear scope); reviewing “what we might do” wastes context.
- Do **not** call `test-verifier` without **repo root**, **expected commands** (or confirmation to discover them from project docs), and **what “done” means** (acceptance criteria).
- Do **not** chain multiple heavy subagents in parallel on the same prompt without a reason; finish one feedback cycle first.
- Do **not** use long `@` lists for subagents that are **`hidden: true`**; use **Task** instead so permissions and tool contracts stay clear.

## Definitions location

Global defaults live under `~/.config/opencode/agents/<id>.md`. Project overrides: `.opencode/agents/<id>.md`.
