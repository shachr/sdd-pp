---
name: openspec-handoff-ai-hero
description: Run the AI Hero flow (mattpocock/skills - grill-with-docs, to-spec, to-tickets, implement, tdd, code-review) against an OpenSpec change folder, with the OpenSpec delta as the spec and every output written into openspec/changes/<id>/execution/. Use after openspec-handoff when handoff.md says tool ai-hero.
---

# AI Hero on an OpenSpec change

Thin wrapper: you run the real AI Hero skills unmodified, with **this change folder as the issue tracker** and **the OpenSpec proposal + delta as the spec**. OpenSpec owns *what* (proposal, deltas). AI Hero owns *how* (design, tickets, code, review).

Paths are relative to `openspec/changes/<id>/` (the "change folder").

## Before you start

- Read `handoff.md`. `tool` must be `ai-hero`; you are `implementation_model`. If you are not that model, stop and say so.
- Read `proposal.md` and every `specs/**/spec.md`. They are the spec. There is no OpenSpec `design.md`: design is yours.
- AI Hero skills set `disable-model-invocation: true`. If you cannot call them with the Skill tool, ask the user to type the slash command, or read the installed `SKILL.md` and follow its process yourself.
- The issue tracker is the change folder: `docs/agents/issue-tracker.md` (installed from `.openspec-handoff/issue-tracker-openspec.md` by `/setup-matt-pocock-skills` -> "Other") says where tickets go. Nothing goes to `.scratch/` or GitHub/Linear.

## Flow

| AI Hero step | Run it? | Output |
|---|---|---|
| `grill-with-docs` (= `grilling` + `domain-modeling`) | **Yes**, on the proposal + delta. If the user delegated decisions, answer each round yourself with the recommended answer (or a better one) and record it. | `execution/design.md`; glossary terms -> `GLOSSARY.md`, ADRs -> `docs/adr/` (AI Hero's durable homes; link them from `execution/design.md`) |
| `to-spec` | **Yes** - it combines the user-facing view with Implementation/Testing Decisions. Its seams check (step 2) is answered from the grilling record. | `execution/spec.md` (see overrides) |
| `to-tickets` | **Yes**, from `execution/spec.md` + the delta (scenarios are cited by name) | `execution/tickets/NN-<slug>.md` |
| `/spec-check` | Yes, end of planning (stop on GAPS) | `execution/spec-check.md` |
| `implement` (single session) or `implement-spec` (subagents), with `tdd` - as `apply_mode` in handoff.md | Yes, started by the engineer (not `/opsx:apply`) | code + tests; ticks `tasks.md` |
| `code-review` | Yes (implement calls it) | `execution/reviews/code-review.md` |
| `/adversarial-review` | Optional (different model) | `execution/reviews/<ts>-<model>.md` |

### grill-with-docs output (`execution/design.md`)

- First line: `> Source of truth: [proposal](../proposal.md) · [specs/<cap>/spec.md](../specs/<cap>/spec.md) · [handoff](../handoff.md)`
- `## Grilling record`: each round's questions and the answers (mark answers given on the user's behalf as such).
- `## Decisions`: the design tree's settled decisions - module boundaries, interfaces, data shapes, algorithms, test seams. These are *how*, never *what*.
- A question whose answer changes behaviour is not a design decision: stop, update the delta (`/opsx:update` or edit `specs/`), re-run `openspec validate <id> --strict`, then continue. Never write the new behaviour into design.md.
- Link `GLOSSARY.md` / ADRs written by domain-modeling.

### to-spec overrides (`execution/spec.md`)

- First line: `> Source of truth: [proposal](../proposal.md) · [spec delta](../specs/<cap>/spec.md) · [design](design.md)`
- **Problem Statement** / **Solution**: one or two sentences that point at `../proposal.md` (Why / What Changes) - do not retell them.
- **User Stories**: numbered, each naming the requirement it covers as `"Requirement: <name>"` with a link to the delta (check-handoff fails on a story that names none or a nonexistent one), plus the scenarios it stands for by name. A story that no requirement covers is a behaviour gap: add it to the delta first.
- **Implementation Decisions**, **Testing Decisions**, **Out of Scope**, **Further Notes**: in full, as the template says (no file paths or code snippets). Settled decisions from `execution/design.md` are summarised here; link them rather than repeating the grilling record.
- Publishing = writing the file (`docs/agents/issue-tracker.md`); `Status: ready-for-agent` line near the top.
- `check-handoff` warns (does not fail) if one of the user-facing sections has no link to the proposal/delta or reuses the delta's wording.

### to-tickets overrides (`execution/tickets/`)

- One file per ticket, `NN-<slug>.md`, numbered in dependency order, AI Hero's local ticket template (`What to build`, `Blocked by`, `Status`, checkboxes).
- First line: `> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/<cap>/spec.md) · [spec](../spec.md) · [design](../design.md)`
- **What to build**: name the requirement(s) this slice makes work, by name + link (`[delta](../../specs/<cap>/spec.md) - "Requirement: <name>"`), plus the slice's path through the code in your own words. Do not re-describe the behaviour.
- Checkboxes: one per scenario, by name only: `- [ ] Scenario "<name>" passes`. Never copy WHEN/THEN text or values.
- Title: name the slice ("truncate: limit validation"), not the rule ("truncate rejects limits below one").
- At most 8 tickets (hard cap 12). More means the change is too big - stop and split it (`.openspec-handoff/small-changes.md`).
- to-tickets step 4 ("Quiz the user"): if decisions were delegated, approve the breakdown yourself and note it in `execution/design.md`.

## Phase boundary

- **Planning** (right after `/handoff`, or when `/opsx:propose|ff|continue` reaches `tasks`): grill-with-docs, to-spec, to-tickets, `tasks.md`, then `/spec-check`. No code changes.
- **Implementation** (the engineer runs `implement` or `implement-spec`, as recorded in `apply_mode`; `/opsx:apply` is not used): implement/tdd per ticket, code-review, then verify.

### Planning: after tickets exist

1. Run `openspec instructions tasks --change "<id>"` and write `tasks.md`: one checkbox per ticket linking its file, plus the review group from the template.
2. Run `node .openspec-handoff/scripts/check-handoff.mjs <id>`; fix every error (copied requirement text, delta headers, SHALL sentences) and read the warnings (likely paraphrases, user-facing sections without links).
3. Run `/spec-check <id>`; stop on GAPS. Stop here if you were invoked for planning.

### Implementation (the engineer runs `implement` / `implement-spec`)

1. Implement with the `apply_mode` command. When a ticket is done, set its `Status:` to `done` and tick its `tasks.md` box in the same commit.
2. `code-review` (implement calls it) -> `execution/reviews/code-review.md`; fix Critical/Important findings and tick 2.1. `openspec validate <id> --strict` (2.2); `check-handoff` (2.3). `/adversarial-review` is optional.
3. Run `/opsx:verify <id>` and save the report verbatim to `execution/verify.md`. Then `/opsx:archive <id>` as written (agent-driven sync).
