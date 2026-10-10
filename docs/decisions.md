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
