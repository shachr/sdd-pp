---
name: openspec-handoff-ai-hero
description: Run the AI Hero flow (mattpocock/skills - grill-with-docs, to-spec, to-tickets, implement, tdd, code-review) against an OpenSpec change folder, writing every output into openspec/changes/<id>/execution/. Use after openspec-handoff when handoff.md says tool ai-hero.
---

# AI Hero on an OpenSpec change

Thin wrapper: you run the real AI Hero skills, with **this change folder as the issue tracker** and **the OpenSpec deltas as the requirements**. Everything below overrides the skills' default locations; nothing else about them changes.

Paths are relative to `openspec/changes/<id>/` (the "change folder").

## Before you start

- Read `handoff.md`. `tool` must be `ai-hero`; you are `implementation_model`. If you are not that model, stop and say so.
- Read `proposal.md`, `design.md`, every `specs/**/spec.md`. These are the source of truth.
- AI Hero skills set `disable-model-invocation: true`. If you cannot call them with the Skill tool, ask the user to type the slash command (`/to-spec`), or read the installed `SKILL.md` and follow its process yourself with the overrides below.
- **Issue tracker override (applies to every AI Hero skill for this change):** "publish to the issue tracker" means "write a file into the change folder". Ignore `docs/agents/issue-tracker.md` and `.scratch/` for this change. Do not open GitHub/Linear issues for it.

## Flow

| AI Hero step | Run it? | Output (override) |
|---|---|---|
| `grill-with-docs` | Only if `design.md` lists open questions that block execution | Answers go into `design.md` (via `/opsx:update`) or the deltas; project ADRs / glossary stay where AI Hero writes them - link them from `handoff.md` |
| `to-spec` | Yes | `execution/spec.md` |
| `to-tickets` | Yes | `execution/tickets/NN-<slug>.md` (local-markdown ticket template, one file per ticket) |
| `implement` (single session) or `implement-spec` (subagents) | Yes | Code + tests; ticks `tasks.md` |
| `tdd` | Inside implement | - |
| `code-review` | Optional self-review inside implement | `execution/reviews/self-review.md` |
| Final review | Always | `/adversarial-review <id>` (different model) |

### to-spec overrides (`execution/spec.md`)

- First line: `> Source of truth: [proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md) · [handoff](../handoff.md)`
- **Problem Statement / Solution**: one line each linking `../proposal.md#why` and `#what-changes`. Do not restate.
- **User Stories**: replace with a *Requirement map* - one bullet per requirement **name** linking the delta (`../specs/<cap>/spec.md`), plus the test seam that will prove it. Never paste SHALL/MUST text or scenarios.
- **Implementation Decisions**, **Testing Decisions**: write them in full - this is AI Hero's real value-add.
- **Out of Scope**: link the proposal / design Non-Goals.
- Still confirm the test seams with the user (to-spec step 2) unless the user said to proceed autonomously; then record the seams you chose.

### to-tickets overrides (`execution/tickets/`)

- One file per ticket, `NN-<slug>.md`, numbered in dependency order, using AI Hero's local ticket template (`What to build`, `Blocked by`, `Status`, acceptance checkboxes).
- First line of each ticket: `> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/<cap>/spec.md) · [execution spec](../spec.md)`
- Acceptance criteria reference scenarios by name (`Scenario "Name given" passes`) instead of copying WHEN/THEN text.
- Size: at most 8 tickets (hard cap 12). More means the change is too big - stop and split it (see `.openspec-handoff/small-changes.md`).

### After tickets exist

1. Run `openspec instructions tasks --change "<id>"` and write `tasks.md`: one checkbox per ticket linking its file, plus the review/verify group from the template.
2. Run `node .openspec-handoff/scripts/check-handoff.mjs <id>`; fix errors.
3. Implement with `implement` (or `implement-spec`). When a ticket is done, set its `Status:` to `done` and tick its `tasks.md` box in the same commit.
4. Run `/adversarial-review <id>`, fix Critical/Important findings, then `openspec validate <id> --strict` and `/opsx:verify <id>`.
