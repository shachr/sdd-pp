---
name: openspec-handoff
description: Hand an OpenSpec change (handoff-driven schema) to its execution tool - the last OpenSpec stage. The tool was chosen in the setup phase (project default) or per change at proposal time, and its design session already ran (execution/grill.md or execution/brainstorm.md). Writes handoff.md, lints it, and ends by printing the exact next steps for the tool (planning, /sdd-spec-check, implement, code review, verify, archive) without running them. Use when the user says "hand off", "/sdd-handoff", or wants AI Hero or Superpowers to implement an OpenSpec change.
---

# OpenSpec handoff

The change has been through the proposal phase: proposal + spec deltas (OpenSpec, *what*) and the execution tool's design session (`execution/grill.md` for AI Hero, `execution/brainstorm.md` for Superpowers - *how*). Handoff is OpenSpec's last stage: it records who implements the change and how, then hands control to the engineer. Stay thin: do not plan, implement or restate requirements.

**Input**: `<change-id>`. The tool is not an input: it is resolved (per-change override, else the project default). No model is recorded.

## Steps

1. **Resolve the tool.** `node .openspec-handoff/scripts/execution-tool.mjs <id> --json`. It reads the session file's `tool:` front matter, else the project default (`.openspec-handoff/project.json`). If no tool is set, stop: the setup phase was skipped (`npx <toolkit> init --tool <tool>`, or `/sdd-tool --default <tool>`). If the session file for that tool is missing, stop: run the design session first (`/opsx:continue` on the proposal, see the tool's wrapper skill, *Design session*). If the user now wants the other tool, see `.openspec-handoff/switching-tools.md` (the session is redone).
2. **Check the change is ready.** `openspec status --change "<id>" --json`: `schemaName` is `handoff-driven`; `proposal` and `specs` are `done`. `openspec validate "<id>" --strict` passes. A `design.md` in the change folder is a smell: design lives in the session file.
3. **Split gate.** The specs stage ends with `/sdd-split-check <id>` (`execution/split-check.md`). If it has not run, run it now. Over 5 requirements or 2 capabilities it is a warning (the ~300-line estimate comes later, after planning, in /sdd-spec-check): propose slices and wait for the engineer (the /sdd-split-check command); do not hand off a change the engineer decided to split. A split parent (`slices.md`, schema split-plan) is never handed off - hand off its slices.
4. **Write `handoff.md`.** `openspec instructions handoff --change "<id>"` and its template. Fill:
   - `tool`: the tool `/sdd-tool <id>` reports (it must match the session file: `execution/grill.md` = ai-hero, `execution/brainstorm.md` = superpowers; exactly one of them)
   - `harness` (optional): claude-code, cursor, codex, opencode or other; omit it if unsure
   - `base_ref`: `git rev-parse HEAD` right now
   - `apply_mode`: the tool's own implement command - ai-hero: `implement` (one session) or `implement-spec` (subagents); superpowers: `executing-plans` (inline) or `subagent-driven-development`. Default to the subagent variant only if the harness has a subagent tool.
   - links to `proposal.md`, every `specs/**/spec.md` delta and the session file - links only
5. **Commit** (`handoff(<id>): <tool>`). `base_ref` stays the commit before any implementation.
6. **Print the next steps and stop.** Run `node .openspec-handoff/scripts/next-steps.mjs <id>` and show its output to the user verbatim (the engineer reprints it later with `/sdd-next-steps <id>`). Do **not** run any of them: planning (to-spec + to-tickets, or writing-plans), `/sdd-spec-check`, implementation, code review, `/opsx:verify` and `/opsx:archive` are the engineer's, run through the wrapper skill (`openspec-handoff-ai-hero` / `openspec-handoff-superpowers`). There is no OpenSpec tasks stage and `/opsx:apply` is not used.

## Guardrails

- Requirements live only in `specs/**/spec.md`. If execution needs new behaviour, update the delta and re-run `openspec validate <id> --strict` - never describe behaviour in handoff.md or execution/.
- One change = one PR. One change = one execution tool.
