# openspec-handoff-workflow

> **Examples:** [`examples/`](examples/) holds the test projects used to prove this toolkit, with their history:
> [v1 first runs](examples/handoff-flows/), [v2 clean handoff](examples/handoff-flows-v2/),
> [v3 setup phase](examples/handoff-flows-v3/), [v4 no tasks stage](examples/handoff-flows-v4/),
> [v5 first split](examples/handoff-flows-v5/), [v6 split control plane](examples/handoff-flows-v6/),
> [v7 clean test: parent design session names are harmless](examples/handoff-flows-v7/),
> [v8 first full run of the Node installer](examples/handoff-flows-v8/).
> Third-party skills inside them are MIT-licensed; see [`examples/README.md`](examples/README.md).

OpenSpec decides **what** to build (proposal + delta specs, nothing else); AI Hero or Superpowers decide
**how** (design, plan, tickets, code, review) and build it. This toolkit makes the hand-off explicit, keeps every
artifact for a change inside the OpenSpec change folder, and lints that no requirement is ever restated:

```
openspec/changes/<id>/
  proposal.md          OpenSpec  - why / what, with a Size Budget
  specs/<cap>/spec.md  OpenSpec  - delta specs: the ONLY place behaviour is written down
  handoff.md           handoff   - tool (must match the session), apply_mode, base_ref, links
  execution/           owned by the execution tool; cites requirements/scenarios by name + link only
    grill.md                     (AI Hero grill-with-docs - proposal phase; front matter tool: ai-hero)
    brainstorm.md                (Superpowers brainstorming - proposal phase, stopped before writing-plans)
    spec.md, tickets/            (AI Hero to-spec reading grill.md, to-tickets - after handoff; tickets track progress)
    plan-<id>.md, progress.md    (Superpowers writing-plans reading brainstorm.md - after handoff; plan checkboxes track progress)
    spec-check.md                (/spec-check: planning output vs proposal + delta, end of planning)
    reviews/code-review.md       (the tool's own code review, in a fresh session; "self-review" otherwise)
    verify.md                    (/opsx:verify report, saved before archive)
    split-check.md, split-proposal.md   (/split-check split gate, end of the specs stage; the proposal is removed at apply)

A change too big for one PR (> 5 requirements or > 2 capabilities) is split after the engineer approves:
openspec/changes/<parent>/     schema split-plan (proposal → slices), never handed off or verified
  proposal.md                  the original proposal (why / scope, no requirement names)
  slices.md                    control plane: slices (goal, capabilities, depends_on, flag, ticket, status) +
                               split_commit (loss-check baseline) - no requirement names, no behaviour
  tickets/<slice>.md           Jira-pasteable tickets for READY slices
openspec/changes/<slice>/      one handoff-driven child per slice, live deltas (exact names) + proposal "## Split notes"
                               (dropped / added / renamed_from / split_from)
```

Phases: **setup** (pick the execution tool: `sdd-pp init --tool`, project default in `.openspec-handoff/project.json`)
→ **proposal** (the tool's design session writes `execution/grill.md` or `execution/brainstorm.md`; then OpenSpec writes
proposal.md (what/why) + the delta) → **handoff** (OpenSpec's last stage: handoff.md + printed next steps) → the engineer follows them: planning (to-spec +
to-tickets, or writing-plans) → `/spec-check` → the tool's own implement command → the tool's code review → `/opsx:verify` → `/opsx:archive`.
Schema stages: **proposal → specs → handoff** (no tasks stage: progress is tracked by the tool's tickets / plan checkboxes). There is no OpenSpec design artifact, so
`/opsx:verify` checks proposal + specs and reports Design Adherence as *Not applicable* (see `docs/decisions.md` C1).

**New here? Start with [docs/getting-started.md](docs/getting-started.md).**

## What's here

| Path | What |
|---|---|
| `schemas/handoff-driven/` | Custom OpenSpec schema (`schema.yaml` + templates incl. `handoff.md`) - story 1 |
| `schemas/split-plan/` | Parent of a split change: proposal → slices (no specs; OpenSpec sets `skip_specs: true`; archived last with `--skip-specs`) |
| `scripts/split-check.mjs`, `scripts/split.mjs`, `scripts/lib/split.mjs` + `commands/*/split-check.md` | `/split-check <id>`: split gate at the end of the specs stage (counts requirements and capabilities, warn-only, slices proposed for the engineer); `split.mjs apply` (approved proposal → parent + children, re-split into the same parent; records `split_commit`), `loss` (exactly-once vs the original deltas at `split_commit` via git show, split notes, rename candidates, `--final` against main specs), `next` (ready / in progress / parallel-safe slices, tickets), `mark` (in-progress status) |
| `scripts/spec-check.mjs` + `commands/*/spec-check.md` | `/spec-check <id>`: coverage of every delta requirement/scenario by the tool's stories, tickets or plan tasks; missing, unknown and unsourced units (script) + contradictions (agent); writes `execution/spec-check.md` |
| `scripts/execution-tool.mjs` | Setup phase: `--default <tool>` (project), `<id> --set <tool>` (per-change override; starts the session file), `<id>` (resolve: handoff.md > session front matter > project default). Refuses a switch once a session exists (`docs/switching-tools.md`) |
| `scripts/check-handoff.mjs` | Lint: execution tool set and consistent (handoff.md vs session file; one session file; error), proposal.md implementation-detail heuristic (warning), new capability without `## Purpose` (warning), handoff fields, reference-not-duplicate (errors: verbatim copies, delta headers, SHALL; warnings: token-overlap paraphrases and User-Stories-style sections with no link to the proposal/delta - errors with `strictDuplication`), requirement links (every user story / ticket / plan task names an existing delta requirement: error), `apply_mode`, ownership (no OpenSpec design.md), outputs in change folder, PR size (warn-only: ~300 changed lines of code + tests, lockfiles / generated / tooling excluded) |
| `skills/openspec-handoff*/SKILL.md` | `openspec-handoff` (writes handoff.md, routes), `-ai-hero`, `-superpowers` wrappers - story 2 |
| `commands/{claude,cursor}/handoff.md` | `/handoff` - story 2 |
| `config/handoff-review.json` | review skill per tool, size thresholds, split limits |
| `docs/small-changes.md` | PR-size budget, when/how to split, validate vs verify - story 4 |
| `bin/sdd-pp.mjs` (`package.json` `bin`) | `sdd-pp init`: cross-platform Node installer for all of the above |
| `example/` | minimal test repo with a complete change `add-greeting-name` (AI Hero) |
| `docs/decisions.md`, `docs/assumptions.md` | decision log (grill → spec → tickets) and assumptions |
| `test/` | `node --test` suite incl. real OpenSpec CLI runs and a full e2e flow |

## Install into a project

```bash
npm i -g @fission-ai/openspec@1.14.1          # tested version
cd your-project && openspec init --tools claude,cursor
npx github:shachr/sdd-pp init . --tool ai-hero   # setup phase: default tool; sets schema: handoff-driven
openspec schema validate handoff-driven
```

Also works from a local checkout (`npx /path/to/sdd-pp init . --tool superpowers`, or `node /path/to/sdd-pp/bin/sdd-pp.mjs init ...`)
and, once published to npm (not yet), as `npx sdd-pp init`. It is plain Node (no bash, plain copies, no symlinks), so it runs on
Windows, macOS and Linux. Options:

```text
sdd-pp init [dir] [--tool ai-hero|superpowers] [--claude|--no-claude] [--cursor|--no-cursor]
                  [--opencode|--no-opencode] [--no-set-default] [--force]
```

A re-install without `--tool` keeps the project default in `.openspec-handoff/project.json`; `config.json` is kept unless `--force`.
`sdd-pp init` writes `openspec/schemas/handoff-driven/`, `.openspec-handoff/{scripts,config.json,project.json,small-changes.md}`,
`.claude/{skills,commands}/…`, `.cursor/{skills,commands}/…` (`.opencode/` when present or `--opencode`), adds `.superpowers/` to
`.gitignore` and `slices.md merge=union` to `.gitattributes`.
Install the execution toolkits themselves from [mattpocock/skills](https://github.com/mattpocock/skills) and
[obra/superpowers](https://github.com/obra/superpowers).

## Use

```text
node .openspec-handoff/scripts/execution-tool.mjs add-greeting-name --set superpowers   # optional per-change override
/opsx:propose add-greeting-name          # proposal phase: the tool's design session first
      ai-hero:     grill-with-docs -> execution/grill.md
      superpowers: brainstorming -> execution/brainstorm.md, STOPPED after the written design (no writing-plans)
   -> proposal.md (what/why only; lint warns on implementation detail) + delta (scenarios found in the session)
/split-check add-greeting-name           # split gate, end of the specs stage (automatic): "fits", or > 5 requirements / > 2 capabilities
   -> slices proposed (execution/split-proposal.md) -> engineer approves -> commit deltas -> split.mjs apply -> parent + children
   -> split.mjs loss <parent> PASS -> one planning PR -> split.mjs next <parent> --write-tickets -> per slice:
/handoff add-greeting-name
   -> handoff.md (tool = per-change override or project default, apply_mode, base_ref, links), check-handoff,
   -> prints the next steps (next-steps.mjs) and STOPS. The engineer then runs them:
      ai-hero:     /to-spec (reads grill.md) -> execution/spec.md, /to-tickets -> execution/tickets/
      superpowers: writing-plans (reads brainstorm.md) -> execution/plan-<id>.md
/spec-check add-greeting-name             # stops on GAPS -> execution/spec-check.md
# implementation: the tool's own command recorded as handoff.md apply_mode (NOT /opsx:apply)
/implement  |  /implement-spec  |  executing-plans  |  subagent-driven-development
   -> ticket Status/checkboxes or plan step checkboxes; tool's code review in a fresh session of your own agent ("self-review" if not) -> execution/reviews/code-review.md
openspec validate add-greeting-name --strict && node .openspec-handoff/scripts/check-handoff.mjs add-greeting-name --expect-complete
/opsx:verify add-greeting-name            # save the report to execution/verify.md
/opsx:archive add-greeting-name           # agent-driven sync, then move; handoff + execution archive with the change
```

Scripts directly:

```bash
node .openspec-handoff/scripts/check-handoff.mjs <id> [--json] [--no-git] [--expect-complete]
node .openspec-handoff/scripts/next-steps.mjs <id>
node .openspec-handoff/scripts/split-check.mjs <id> [--write] [--json]       # split gate (warn-only)
node .openspec-handoff/scripts/split.mjs apply <id>                          # approved split-proposal.md -> parent + children (or re-split a slice)
node .openspec-handoff/scripts/split.mjs loss <parent> [--final]            # nothing lost / duplicated / unsourced (baseline: git show split_commit)
node .openspec-handoff/scripts/split.mjs next <parent> [--write-tickets]     # ready / in progress / parallel-safe slices, tickets
node .openspec-handoff/scripts/split.mjs mark <parent> <slice> in-progress|planned   # the engineer's status mark
```

### Code review

The tool's own review (`ai-hero → code-review`, two-axis Standards + Spec; `superpowers → requesting-code-review`,
`code-reviewer.md` template; `config.reviewSkills`) runs in a **fresh session of the engineer's coding agent** (a sub-agent or a
new session). Write "fresh session" at the top of `execution/reviews/code-review.md`, or "self-review" when it ran in the same
session; check-handoff warns when the review says neither. There is no separate reviewer model, runner or local fallback
(`docs/decisions.md` section 13).

## Develop / test

```bash
npm install            # installs @fission-ai/openspec 1.14.1 locally for the tests
npm test               # 70 tests: installer CLI, lint rules incl. paraphrase detection, split gate, git-baseline loss check, split notes, renames, done-work reset, ready report, real OpenSpec CLI, e2e
npm run validate:example
node scripts/dev-generate-schema.mjs   # regenerate schema.yaml from upstream spec-driven + our additions
```

## Research notes (real tool formats vs the brief)

- OpenSpec 1.14.1: no `openspec verify` CLI; verify is `/opsx:verify` (opt-in workflow). `openspec validate
  --strict` is the CLI check. Project schemas live in `openspec/schemas/<name>/schema.yaml` (symlinks work).
  Changes carry `.openspec.yaml` with `schema:`. `openspec/config.yaml` `rules:` get injected into
  `openspec instructions` output.
- AI Hero: `to-spec` and `to-tickets` are the real names (not to-prd / to-issues); local tracker default is
  `.scratch/<feature>/`, redirected to the change folder via `docs/agents/issue-tracker.md`. `to-spec` writes `execution/spec.md`;
  its Problem Statement / Solution / User Stories point at the proposal and the delta's scenarios, its
  Implementation / Testing Decisions are written in full (issue-tracker.md + wrapper instructions, skill unedited).
- Superpowers: plans default to `docs/superpowers/plans/`, brainstorm specs to `docs/superpowers/specs/`; both
  redirected. `check-handoff` fails if a change's outputs are left in either default location.

See `docs/assumptions.md` for everything not validated against a real tool.
