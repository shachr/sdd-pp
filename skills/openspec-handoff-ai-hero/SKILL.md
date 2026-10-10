---
name: openspec-handoff-ai-hero
description: Run the AI Hero flow (mattpocock/skills - grill-with-docs, to-spec, to-tickets, implement, tdd, code-review) on an OpenSpec change folder. Design session in the proposal phase (grill-with-docs -> execution/grill.md); planning at handoff (to-spec reading grill.md -> execution/spec.md, to-tickets); implementation with implement/tdd and code-review. Use when the change's execution tool is ai-hero.
---

# AI Hero on an OpenSpec change

Thin wrapper: you run the real AI Hero skills unmodified, with **this change folder as the issue tracker** and **the OpenSpec proposal + delta as the spec**. OpenSpec owns *what* (proposal, deltas). AI Hero owns *how* (grill decisions, spec, tickets, code, review).

Paths are relative to `openspec/changes/<id>/` (the "change folder").

- AI Hero skills set `disable-model-invocation: true`. If you cannot call them with the Skill tool, ask the user to type the slash command, or read the installed `SKILL.md` and follow its process yourself.
- The issue tracker is the change folder: `docs/agents/issue-tracker.md` (installed from `.openspec-handoff/issue-tracker-openspec.md` by `/setup-matt-pocock-skills` -> "Other"). Nothing goes to `.scratch/` or GitHub/Linear.

## Flow

| Phase | AI Hero step | Output |
|---|---|---|
| Proposal | `grill-with-docs` (= `grilling` + `domain-modeling`) | `execution/grill.md`; `GLOSSARY.md`, `docs/adr/` (linked) |
| Proposal | (OpenSpec) proposal.md + delta, informed by the session | `proposal.md`, `specs/**/spec.md` |
| Handoff | `to-spec`, reading `execution/grill.md` | `execution/spec.md` |
| Handoff | `to-tickets` | `execution/tickets/NN-<slug>.md` |
| Handoff | `/spec-check` (stop on GAPS) | `execution/spec-check.md` |
| Implementation | `implement` or `implement-spec` (`apply_mode`) + `tdd` - not `/opsx:apply` | code + tests; ticks `tasks.md` |
| Implementation | `code-review` (implement calls it) | `execution/reviews/code-review.md` |
| Verify / archive | `/opsx:verify`, then `/opsx:archive` | `execution/verify.md` |
| Optional | `/adversarial-review` (different model) | `execution/reviews/<ts>-<model>.md` |

## Design session (proposal phase)

Runs when `/opsx:propose`, `/opsx:new` + `/opsx:continue` or `/opsx:ff` reaches the proposal, before `proposal.md` is written. `openspec instructions proposal` says so.

1. `node .openspec-handoff/scripts/execution-tool.mjs <id>` must say `ai-hero` (project default or `--set ai-hero`). `--set` creates `execution/grill.md` with front matter `tool: ai-hero` / `session: grill-with-docs`; create it the same way if it does not exist.
2. Run `grill-with-docs` on the user's request (and the existing main specs it touches). If the user delegated decisions, answer each round yourself with the recommended answer (or a better one) and mark those answers as yours.
3. Write `execution/grill.md`:
   - keep the front matter; first body line `> Source of truth: [proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md)`
   - `## Grilling record`: each round's questions and answers
   - `## Decisions`: settled *how* - module boundaries, interfaces, data shapes, algorithms, test seams
   - `## Scenarios found`: names only of behaviours the grilling surfaced - each one becomes a requirement or scenario in the delta (the delta holds its WHEN/THEN, not this file)
   - links to `GLOSSARY.md` / ADRs written by domain-modeling
4. Hand back to OpenSpec: write `proposal.md` (what/why only - no decisions, file layouts or algorithms; those stay in grill.md) and the delta (every scenario from step 3, `## Purpose` first for a new capability). `openspec validate <id> --strict`. `check-handoff` warns on implementation detail in proposal.md.

## Planning (handoff)

After `/handoff` wrote `handoff.md` (`tool: ai-hero`, the session file must exist):

### to-spec (`execution/spec.md`) - reads `execution/grill.md`

- First line: `> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/<cap>/spec.md) · [grill session](grill.md)`
- The grilling already happened: to-spec's seams check (step 2) is answered from `execution/grill.md`; do not re-grill.
- **Problem Statement** / **Solution**: one or two sentences pointing at `../proposal.md` - do not retell them.
- **User Stories**: numbered, each naming the requirement it covers as `"Requirement: <name>"` with a link to the delta (check-handoff fails on a story that names none or a nonexistent one), plus its scenarios by name. A story no requirement covers is a behaviour gap: add it to the delta first.
- **Implementation Decisions**, **Testing Decisions**, **Out of Scope**, **Further Notes**: in full, as the template says; summarise and link the decisions in `grill.md` rather than repeating the record.
- Publishing = writing the file; `Status: ready-for-agent` line near the top.

### to-tickets (`execution/tickets/`)

- One file per ticket, `NN-<slug>.md`, dependency order, AI Hero's local ticket template (`What to build`, `Blocked by`, `Status`, checkboxes).
- First line: `> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/<cap>/spec.md) · [spec](../spec.md) · [grill session](../grill.md)`
- **What to build**: the requirement(s) this slice makes work, by name + link (`[delta](../../specs/<cap>/spec.md) - "Requirement: <name>"`), plus the slice's path through the code. Do not re-describe behaviour.
- Checkboxes: one per scenario, by name only: `- [ ] Scenario "<name>" passes`.
- At most 8 tickets (hard cap 12). Quiz step: if decisions were delegated, approve the breakdown yourself and note it in `grill.md`.

### Then

1. `openspec instructions tasks --change "<id>"` -> `tasks.md`: one checkbox per ticket, plus the review group.
2. `node .openspec-handoff/scripts/check-handoff.mjs <id>`; fix errors, read warnings.
3. `/spec-check <id>`; stop on GAPS. Planning ends here.

## Implementation (the engineer runs `implement` / `implement-spec`)

1. Implement with the `apply_mode` command. Ticket done: `Status: done` + tick its `tasks.md` box in the same commit.
2. `code-review` -> `execution/reviews/code-review.md`. Run its Standards and Spec reviewers as **fresh sub-agents** (no access to this conversation). Without a sub-agent tool, run the same briefs in another fresh context (a new session or a local model); if neither is possible, write "self-review" at the top. Fix Critical/Important findings; tick 2.1. `openspec validate <id> --strict` (2.2); `check-handoff` (2.3).
3. `/opsx:verify <id>`; save the report verbatim to `execution/verify.md`. Then `/opsx:archive <id>` as written.
