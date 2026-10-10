# openspec-handoff-workflow

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
    reviews/                     (optional: whatever the tool's own review writes)
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
| `scripts/split-check.mjs`, `scripts/split.mjs`, `scripts/lib/split.mjs` + `commands/*/split-check.md` | `/split-check <id>`: split gate at the end of the specs stage (counts requirements and capabilities, warn-only, slices proposed for the engineer); `split.mjs apply` (approved proposal → parent + children named `<parent>-<nn>-<slice>`, cleanup slice `99`, re-split into the same parent continues the numbering; records `split_commit`), `loss` (exactly-once vs the original deltas at `split_commit` via git show, split notes, rename candidates, `--final` against main specs), `next` (ready / in progress / parallel-safe slices, tickets), `mark` (in-progress status) |
| `scripts/spec-check.mjs` + `commands/*/spec-check.md` | `/spec-check <id>`: coverage of every delta requirement/scenario by the tool's stories, tickets or plan tasks; missing, unknown and unsourced units (script) + agent review for missing / invented / contradicted behaviour and restated text (advisory); the agent sets PASS / GAPS. Also reports spec changes since the last accepted PASS (hash per requirement / scenario in `execution/.spec-check.json`, moved only by `--accept` after PASS) with the units citing each - report-only. The only plan-vs-spec check; writes `execution/spec-check.md` |
| `scripts/sdd.mjs` + `commands/*/{next-steps,tool,split-apply,split-next,split-start,split-undo,split-archive}.md` + `sdd-pp <command>` | One entry point that only runs the scripts: `next`, `tool`, `spec-check`, `split-check`, `split apply\|next\|start\|undo\|loss\|archive` (start = take a READY slice: finds the parent, marks it in-progress, prints the next lines; undo = original change back from split_commit, slices removed; archive = final loss check + `openspec archive --skip-specs -y`). The agent slash commands and the `sdd-pp` CLI subcommands both call it |
| `scripts/execution-tool.mjs` | Setup phase: `--default <tool>` (project), `<id> --set <tool>` (per-change override; starts the session file), `<id>` (resolve: handoff.md > session front matter > project default). Refuses a switch once a session exists (`docs/switching-tools.md`) |
| `skills/openspec-handoff*/SKILL.md` | `openspec-handoff` (writes handoff.md, routes), `-ai-hero`, `-superpowers` wrappers - story 2 |
| `commands/{claude,cursor}/handoff.md` | `/handoff` - story 2 |
| `config/handoff-review.json` | review skill per tool, split limits |
| `docs/small-changes.md` | PR-size budget, when/how to split, validate vs verify - story 4 |
| `bin/sdd-pp.mjs` (`package.json` `bin`) | `sdd-pp init`: cross-platform Node installer for all of the above |
| `example/` | minimal test repo with a complete change `add-greeting-name` (AI Hero) |
| `docs/decisions.md`, `docs/assumptions.md` | decision log (grill → spec → tickets) and assumptions |
| `test/` | `node --test` suite incl. real OpenSpec CLI runs and a full e2e flow |

## Install into a project

```bash
npm i -g @fission-ai/openspec@1.14.1          # tested version
cd your-project && openspec init --tools <agent>                        # <agent>: claude, cursor, opencode, ...
npx -y skills@latest add mattpocock/skills --skill '*' -a <agent> -y    # AI Hero skills (skills agent ids: claude-code, cursor, opencode, ...)
npx -y skills@latest add obra/superpowers --skill '*' -a <agent> -y     # Superpowers skills
npx github:shachr/sdd-pp init . --tool ai-hero   # setup phase: default tool; sets schema: handoff-driven
openspec schema validate handoff-driven
```

Example with Claude: `openspec init --tools claude`, then `npx -y skills@latest add mattpocock/skills --skill '*' -a claude-code -y`
(and/or `obra/superpowers`), then `npx github:shachr/sdd-pp init . --tool ai-hero`.

`sdd-pp init` installs its skills and slash commands for Claude (`.claude/`) and Cursor (`.cursor/`) by default
(`--no-claude` / `--no-cursor` skip one), and for opencode (`.opencode/`) only when that folder already exists (e.g. after
`openspec init --tools opencode`) or with `--opencode`.

With `--tool ai-hero` it also installs `docs/agents/issue-tracker.md` (OpenSpec change folders as AI Hero's issue tracker)
when the project has none.

Also works from a local checkout (`npx /path/to/sdd-pp init . --tool superpowers`, or `node /path/to/sdd-pp/bin/sdd-pp.mjs init ...`)
and, once published to npm (not yet), as `npx sdd-pp init`. It is plain Node (no bash, plain copies, no symlinks). Path handling is
tested on Linux, including project paths with spaces, and written to be Windows-safe (drive letters, backslashes, CRLF `slices.md`),
but it has not yet been run on Windows. Options:

```text
sdd-pp init [dir] [--tool ai-hero|superpowers] [--claude|--no-claude] [--cursor|--no-cursor]
                  [--opencode|--no-opencode] [--no-set-default] [--force]
```

A re-install without `--tool` keeps the project default in `.openspec-handoff/project.json`; `config.json` is kept unless `--force`.
`sdd-pp init` writes `openspec/schemas/handoff-driven/`, `.openspec-handoff/{scripts,config.json,project.json,small-changes.md}`,
`.claude/{skills,commands}/…` and `.cursor/{skills,commands}/…` by default (`.opencode/…` only when `.opencode/` exists or with `--opencode`), adds `.superpowers/` to
`.gitignore` and `slices.md merge=union` to `.gitattributes`.
Install the execution toolkits themselves from [mattpocock/skills](https://github.com/mattpocock/skills) and
[obra/superpowers](https://github.com/obra/superpowers).

## Use

```text
/tool add-greeting-name --set superpowers   # optional per-change override
/opsx:propose add-greeting-name          # proposal phase: the tool's design session first
      ai-hero:     grill-with-docs -> execution/grill.md
      superpowers: brainstorming -> execution/brainstorm.md, STOPPED after the written design (no writing-plans)
   -> proposal.md (what/why only) + delta (scenarios found in the session)
/split-check add-greeting-name           # split gate, end of the specs stage (automatic): "fits", or > 5 requirements / > 2 capabilities
   -> slices proposed (execution/split-proposal.md) -> engineer approves -> commit deltas -> /split-apply -> parent + children <parent>-<nn>-<slice>
   -> loss check PASS -> one planning PR -> /split-next <parent> -> per slice: /split-start <slice> (commit the mark), branch, design session, /handoff <slice>
   -> all slices archived -> /split-archive <parent>
/handoff add-greeting-name
   -> handoff.md (tool = per-change override or project default, apply_mode, base_ref, links),
   -> prints the next steps (/next-steps reprints them) and STOPS. The engineer then runs them:
      ai-hero:     /to-spec (reads grill.md) -> execution/spec.md, /to-tickets -> execution/tickets/
      superpowers: writing-plans (reads brainstorm.md) -> execution/plan-<id>.md
/spec-check add-greeting-name             # the only plan-vs-spec check; stops on GAPS -> execution/spec-check.md; PASS is accepted (--accept)
# after a later delta edit: openspec validate -> /spec-check (changes + citing units) -> re-plan only those -> /spec-check until PASS
# implementation: the tool's own command recorded as handoff.md apply_mode (NOT /opsx:apply).
# Ignore OpenSpec's apply prompts ("run /opsx-apply", "Next: openspec instructions apply"): use /next-steps <id>.
/implement  |  /implement-spec  |  executing-plans  |  subagent-driven-development
   -> ticket Status/checkboxes or plan step checkboxes; the tool's own code review (CI also reviews the PR)
/opsx:verify add-greeting-name            # save the report to execution/verify.md
/opsx:archive add-greeting-name           # agent-driven sync, then move; handoff + execution archive with the change
```

The same checks from a shell, from anywhere inside the project (runs the project's installed scripts):

```bash
npx github:shachr/sdd-pp next <id>                   # = /next-steps <id>
npx github:shachr/sdd-pp tool <id> [--set <tool>]    # = /tool <id>
npx github:shachr/sdd-pp spec-check <id>             # mechanical part of /spec-check
npx github:shachr/sdd-pp split-check <id>            # counts part of /split-check
npx github:shachr/sdd-pp split apply|next|loss|archive ...   # = /split-apply, /split-next, /split-archive
npx github:shachr/sdd-pp split start <slice> [--undo]     # = /split-start <slice>
npx github:shachr/sdd-pp split undo <parent> [--force]    # = /split-undo <parent>
```

Under the hood (agent commands and CLI both run `.openspec-handoff/scripts/sdd.mjs`):
`next` = `next-steps.mjs`;
`tool` = `execution-tool.mjs`; `spec-check` / `split-check` = `spec-check.mjs` / `split-check.mjs` with `--write`;
`split apply|start|undo|loss` = `split.mjs apply|start|undo|loss`; `split next` = `split.mjs next --write-tickets`;
`split archive` = `split.mjs loss <parent> --final` + `openspec archive <parent> --skip-specs -y`.
The scripts still take `--root` / `--json` when run directly. See `docs/getting-started.md` (Commands).

### Code review

The tool's own review (`ai-hero → code-review`, two-axis Standards + Spec; `superpowers → requesting-code-review`,
`code-reviewer.md` template; `config.reviewSkills`) is the code review step; CI also runs a code review on the PR. No review file or label is required and nothing checks for one
(any file the tool writes goes in `execution/reviews/`). There is no separate reviewer model, runner or local fallback
(`docs/decisions.md` sections 13 and 15).

## Develop / test

```bash
npm install            # required: installs @fission-ai/openspec 1.14.1 locally; 13 tests run the real OpenSpec CLI
npm test               # installer CLI, commands, paths with spaces, /spec-check, split gate, slice naming, git-baseline loss check, split notes, renames, ready report, real OpenSpec CLI, e2e
                       # without npm install the run FAILS (openspec-required test); SDD_SKIP_OPENSPEC=1 npm test skips those 13 on purpose
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
  redirected via the wrapper skills.

See `docs/assumptions.md` for everything not validated against a real tool.
