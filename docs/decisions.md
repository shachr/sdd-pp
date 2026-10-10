# Decision log

Process followed (loosely, AI Hero style): **grill-with-docs → to-spec → to-tickets → implement**.
The user was unavailable, so every question in the "grill" was answered by the implementer
(Grok Bot, acting for shachar bardavid). Each answer below is a decision; revisit any of them freely.

## 1. Grill (questions asked and answered)

| # | Question | Decision | Why |
|---|----------|----------|-----|
| G1 | Fork the built-in `spec-driven` schema or write one from scratch? | Fork `spec-driven` (OpenSpec 1.14.1) and keep `proposal`, `specs`, `design` instructions verbatim; add `handoff` and `execution`, rewrite `tasks`. | Keeps `openspec validate` delta parsing and upstream guidance intact; only the execution half changes. |
| G2 | Where does the task breakdown come from: OpenSpec `tasks.md` or the execution tool? | The execution tool (AI Hero `to-tickets` / Superpowers `writing-plans`) owns the breakdown under `execution/`. `tasks.md` is generated *after* it as a thin, link-only checklist (one checkbox per ticket / plan task). | Avoids doing the breakdown twice; `tasks.md` still exists because OpenSpec `apply`, `status`, `list` and `/opsx:verify` track it. |
| G3 | Artifact order? | `proposal → specs → design → handoff → execution → tasks`; `apply` requires `tasks`. | Handoff must precede execution so the tool and model are recorded before any plan is written. |
| G4 | What format for `handoff.md`? | YAML front matter (machine-read by scripts) + short markdown body of links. Required keys: `change`, `tool`, `implementation_model`, `base_ref`. | Scripts can parse it without a YAML dependency; humans read the body. |
| G5 | Allowed `tool` values? | `ai-hero` or `superpowers`. | Matches the two toolkits in scope; easy to extend in `config/handoff-review.json`. |
| G6 | How is "reference, don't duplicate" enforced? | Schema instructions + `scripts/check-handoff.mjs`, which fails when `handoff.md` or `execution/**` contains a `### Requirement:` header, a delta-operation header, or a normative (SHALL/MUST) sentence copied from the change's spec deltas, and when `handoff.md` doesn't link `proposal.md` and each spec delta. | OpenSpec itself can't check this; a ~150 line local lint can. |
| G7 | Where do AI Hero / Superpowers write their outputs? | `openspec/changes/<id>/execution/` (AI Hero: `spec.md`, `tickets/NN-slug.md`; Superpowers: `plan.md`, `progress.md`), reviews in `execution/reviews/`. | Single folder per change; archived together with the change. |
| G8 | What about tool scratch that is meant to be ephemeral (Superpowers SDD workspace `.superpowers/sdd/`)? | Leave it where the tool puts it (git-ignored); copy only the final ledger summary to `execution/progress.md`. | Fighting the tool's scripts would make the wrappers fat. |
| G9 | AI Hero `grill-with-docs` writes ADRs/glossary at project level — redirect them? | No. Project-level docs (CONTEXT.md, docs/adr) stay where AI Hero puts them; `handoff.md` links to any created for this change. | They outlive the change; archiving them with the change would hide them. |
| G10 | Wrapper form? | One skill per tool (`skills/openspec-handoff-ai-hero`, `skills/openspec-handoff-superpowers`) plus a `/handoff` command; installed into `.claude/` and `.cursor/` by `install.sh`. | Skills are the format both Claude Code and Cursor load; thin wrappers just set paths and fill handoff.md. |
| G11 | How does `/adversarial-review` run a *different* model locally? | A command markdown that calls `scripts/adversarial-review.mjs`, which spawns a headless agent CLI (`claude -p --model <m>` by default; `cursor-agent`/`codex` templates in config) with the reviewer model. | A slash command can't switch its own model mid-session; a subprocess can. No CI. |
| G12 | Reviewer model selection? | `--reviewer-model` flag > `reviewer_model` in handoff.md > `config.reviewerFor[implementation_model]` > `config.defaultReviewer`. Hard fail if the chosen model equals the implementation model (normalised) or, when `forbidSameFamily` is true (default), shares its family prefix. | "Different model" is the whole point; family check stops `opus` reviewing `opus-4-1`. |
| G13 | Review skill per tool? | `ai-hero → code-review` (mattpocock/skills), `superpowers → requesting-code-review` (obra/superpowers, `code-reviewer.md` template). Configurable. | These are the real review skills in each toolkit. |
| G14 | Script language? | Node ≥ 18, zero runtime dependencies; tests with `node --test`. OpenSpec CLI is a devDependency used only by tests. | OpenSpec is a Node CLI, so Node is already present. |
| G15 | PR-sized thresholds? | Soft/hard: requirements 5/8, tickets-or-plan-tasks 8/12, changed lines vs `base_ref` 400/800, files 15/25. Soft → warning, hard → `check-handoff` fails. Configurable. | Common review-size guidance (~400 LOC) and keeps `/opsx:verify` able to reason over the whole change. |
| G16 | Name differences from the brief? | Real AI Hero names are `to-spec` (not `to-prd`) and `to-tickets` (not `to-issues`); also `implement-spec` exists for multi-ticket runs. OpenSpec 1.14.1 has **no `openspec verify` CLI command** — verify is the `/opsx:verify` agent workflow (opt-in profile); the CLI has `openspec validate [--strict]`. | Found during research (see README "Research notes"). |

## 2. Spec (to-spec, condensed)

Problem: OpenSpec captures *what* to build, AI Hero / Superpowers are good at *executing*; used together,
each writes its own plan/spec files in different places and requirements get copied and drift.
Solution: a schema + thin wrappers + a review command that make the OpenSpec change folder the single
home for everything about a change, with OpenSpec deltas as the only source of requirements.

## 3. Tickets (to-tickets)

1. Schema `handoff-driven` + handoff template + example handoff — blocked by: none
2. Wrapper skills for AI Hero and Superpowers + `/handoff` — blocked by: 1
3. `/adversarial-review` command + script + dry-run + tests — blocked by: 1
4. Small-change guidance + size checks — blocked by: 1
5. Example change end to end, README, assumptions — blocked by: 1–4

## 4. Implement notes

Logged per story in the commit messages; see `git log`.

## 5. Clean handoff (v2, 2026-10-09) - supersedes G3, G6, G7 and the to-spec step (partly superseded by section 6)

User direction: OpenSpec is used ONLY for proposal + delta specs; the execution tool owns design and
implementation; no requirement is duplicated anywhere; `/opsx:verify` checks proposal + specs and passes
cleanly. Decisions taken autonomously on the user's behalf:

| # | Decision | Why / evidence |
|---|----------|----------------|
| C1 | Schema `handoff-driven` v2 = **proposal → specs → handoff → tasks**. No `design` and no `execution` artifact. `design.md` templates removed. | The verify workflow (`/opsx-verify`, OpenSpec 1.14.1) says: "If the schema defines no design artifact (no artifact with id `design`, and none whose `artifactPaths.<id>.outputPath` is or ends in `design.md`), report Design Adherence as **not applicable**", and not-applicable checks are excluded from skipped-check counts. With v1 (conditional design) the same workflow says "mark Design Adherence as not verified", which forbids "All checks passed". The schema's artifact set is therefore the supported lever; no OpenSpec skill is edited. Dropping `execution` too keeps `execution/design.md` from being an artifact path verify would pick up. |
| C2 | Steering text goes through supported config only: schema `instruction`s (handoff, tasks, apply) and `openspec/config.yaml` `context:` written by `install.sh`. | `context` is returned by every `openspec instructions` call (incl. `instructions apply --json`, which verify reads). Verify's own text does not mention `context`, so C1 is the lever that actually changes the verdict; `context` tells apply/archive/verify agents why design is absent. `operations.*.guidance` only exists for apply and archive (`OPERATION_IDS = ['apply','archive']`), so there is no verify-specific lever. |
| C3 | `install.sh` sets `schema: handoff-driven` by default (`--no-set-default` to opt out). | Smooth default. `planningHome.defaultSchema` / the "Creating change ... with schema 'spec-driven'" spinner text is a hard-coded fallback in OpenSpec (`root-selection.js`, `planning-home.js`), not configurable; `config.yaml schema:` wins and `.openspec.yaml` records `handoff-driven`. Documented as cosmetic. |
| C4 | AI Hero path: **no `to-spec`**. `grill-with-docs` (grilling + domain-modeling) runs on proposal + delta; decisions -> `execution/design.md` (grilling record + decisions), glossary -> `GLOSSARY.md`, ADRs -> `docs/adr/` (AI Hero's durable homes, linked). `to-tickets` is fed from the delta; tickets name requirements and scenarios, never re-describe them. | to-spec's template (Problem Statement, User Stories, Solution) is a restatement by construction. v1 flow output proved it (fixtures in `test/fixtures/paraphrase/`). |
| C5 | Superpowers path: brainstorming skipped (the proposal is its output); plan at `execution/plan-<id>.md`. | `sdd-workspace` names the workspace after the plan basename; upstream disambiguates collisions with a marker + parent-dir name, but a unique filename gives every change its own `.superpowers/sdd/plan-<id>/` deterministically. Legacy `execution/plan.md` still counts but warns. |
| C6 | Duplication lint v2 (`check-handoff`): verbatim lines (as before) + forbidden sections (`User Stories`, `Problem Statement`, `Solution`, `Requirements`, `Acceptance Criteria`, `Scenarios`, `Specification`) + `SHALL` in prose + **paraphrase detection**. Paraphrase: each requirement statement and each scenario is a unit; each prose line/sentence (code fences and code-expression spans removed, link targets removed, requirement/scenario NAMES removed so citing by name is legal) is scored by content-token overlap (stopwords dropped, light stemming). Error: ≥4 shared tokens and (Jaccard ≥ 0.40, or containment ≥ 0.60 with Jaccard ≥ 0.25). Warning: ≥4 shared and Jaccard ≥ 0.25. | Tuned on the v1 flows: v1 ticket "What to build" (J 0.25, C 0.62) and v1 plan task title (J 0.50) are errors; v1 to-spec output fails on forbidden sections; clean rewrites score 0 findings. Lexical overlap cannot catch every semantic paraphrase (v1 "Implementation Decisions" lines score J 0.23-0.29 -> warnings), which is why forbidden sections and the wrappers' templates carry part of the load. Reviews and `execution/verify.md` are exempt (they discuss requirements by design). Thresholds are overridable via `paraphrase` in config.json. |
| C7 | Test code inside fenced blocks may carry scenario values. | writing-plans requires test steps "with the spec's exact values"; tests are implementation, not restatement. Prose must cite scenarios by name. |
| C8 | Ownership lint: a root `design.md` or `execution/spec.md` is an error. | Enforces C1/C4 mechanically. |
| C9 | Process: verify runs before archive and its report is saved verbatim to `execution/verify.md`; archive follows `/opsx:archive` as written (agent-driven sync); the CLI `openspec archive --yes` is used only by the scripted e2e test. `/opsx:verify` is a follow-up bullet in tasks.md, not a checkbox. | User direction; v1 flow A archived via CLI and verified only after archive. |
| C10 | `/adversarial-review` inlines the tool's design (`execution/design.md` or the plan) instead of OpenSpec `design.md`. | Design moved. |

## 6. User feedback on v2 (2026-10-09, 23:47 PT) - v2.1

| # | Decision | Why |
|---|----------|-----|
| D1 | Schema without design, `handoff-driven` default: **kept** (approved). | - |
| D2 | AI Hero **runs `to-spec`** -> `execution/spec.md`, after grill-with-docs, before to-tickets. Steering is only through `docs/agents/issue-tracker.md` (installed from `config/issue-tracker-openspec.md`) and the wrapper: Problem Statement / Solution link the proposal, User Stories = the delta's scenarios listed by name + link, Implementation / Testing Decisions / Out of Scope / Further Notes in full. Supersedes C4's "no to-spec" and C8's spec.md error. | User: to-spec's value is mixing user view with implementation decisions; reference instead of restate. The skill itself is unedited. |
| D3 | Superpowers **runs `brainstorming`** -> `execution/design.md` (location override, which the skill allows: "Your human partner's preferences override"), sized as "a project with a written design" so writing-plans follows. Intent / goals link the proposal; constraints and the decided how in full. Builder check done by the implementer when there is no subagent tool (the skill allows this). Supersedes C5's "brainstorming skipped". | User: run the normal steps, ideally referencing. |
| D4 | Duplication lint is **advisory** for the fuzzy parts: paraphrase findings and User-Stories-style sections without a link to the proposal/delta are warnings; config `strictDuplication: true` makes them errors. Exact-copy rules (verbatim normative lines, delta headers, SHALL sentences) stay errors. Sections like `## User Stories` are fine when they link the source of truth. Supersedes C6's error levels and C8. | User: nice-to-have, must not fail flows over to-spec's user stories. The lexical scorer is cheap and its tests pass, so it stays on, as a warning. |
| D5 | **No config `context:` steering for verify.** `install.sh` no longer appends a `context:` block; the example config keeps only project facts. Verify relies only on the schema having no design artifact (C1). Supersedes C2. | User: verify only checks drift against proposal + delta once the execution tool has reviewed its own design. |
