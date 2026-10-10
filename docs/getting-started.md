# Getting started

OpenSpec writes **what** (proposal + delta specs). One execution tool, AI Hero or Superpowers, writes **how** and builds it.
Everything for a change stays in `openspec/changes/<id>/`. **Pilot status:** see [Known limitations](#known-limitations).

## Prerequisites (all free / open source)

| What | How |
|---|---|
| Node.js 22 (npx skills needs it; scripts run on Node 18+) | https://nodejs.org |
| OpenSpec CLI 1.14.1 (tested version) | `npm i -g @fission-ai/openspec@1.14.1` |
| AI Hero skills | `npx -y skills@latest add mattpocock/skills --skill '*' -a <agent> -y` |
| Superpowers skills | `npx -y skills@latest add obra/superpowers --skill '*' -a <agent> -y` |

`<agent>` is your harness, for example `opencode`, `claude-code` or `cursor`. You only need the skills for the tool(s) you use.

## Install (setup phase: pick the tool once)

```bash
cd your-project && git init            # a git repo is required (base_ref, review diffs)
openspec init --tools opencode         # or claude,cursor
npx github:shachr/sdd-pp init . --tool ai-hero   # or a local checkout: npx /path/to/sdd-pp init . ...; --tool superpowers; --opencode / --no-claude / --no-cursor
openspec schema validate handoff-driven
```

`sdd-pp init` is a plain Node CLI (no bash, no symlinks; works on Windows, macOS and Linux). `--tool` writes the project default to
`.openspec-handoff/project.json`. Re-running `init` without `--tool` (to upgrade) keeps it. `npx sdd-pp init` will work once the
package is published to npm (not yet). `sdd-pp --help` lists every option.
With `--tool ai-hero`, `init` also installs `docs/agents/issue-tracker.md` (from `.openspec-handoff/issue-tracker-openspec.md`)
when the project has none. That makes the change folder AI Hero's issue tracker.

Optional per-change override, **before** the design session: `/tool <id> --set superpowers`

## Commands (and what runs under the hood)

You never type `node .openspec-handoff/scripts/...`: use the agent slash commands, or the same checks from a
shell with `npx github:shachr/sdd-pp <command>` (from anywhere inside the project; it runs the project's
installed scripts). Both go through `.openspec-handoff/scripts/sdd.mjs`, which only runs the scripts below.

| Agent command | CLI (`npx github:shachr/sdd-pp ...`) | Runs |
|---|---|---|
| `/tool <id> [--set <tool>]` | `tool <id> [--set <tool>]`, `tool --default <tool>` | `execution-tool.mjs` |
| `/split-check <id>` (agent: proposes slices) | `split-check <id>` (counts only) | `split-check.mjs <id> --write` |
| `/handoff <id>` (agent skill) | - | writes handoff.md, then `next-steps.mjs` |
| `/next-steps <id>` | `next <id>` | `next-steps.mjs <id>` |
| `/spec-check <id>` (agent: adds the review for missing / invented / contradicted / restated, sets PASS or GAPS) | `spec-check <id>` (mechanical report) | `spec-check.mjs <id> --write` |
| `/split-apply <id>` | `split apply <id>` | `split.mjs apply <id>` |
| `/split-next <parent>` | `split next <parent>` | `split.mjs next <parent> --write-tickets` |
| `/split-mark <parent> <slice> <in-progress\|planned>` | `split mark ...` | `split.mjs mark ...` |
| `/split-archive <parent>` | `split archive <parent>` | `split.mjs loss <parent> --final`, then `openspec archive <parent> --skip-specs -y` |
| - | `split loss <parent> [--final]` | `split.mjs loss` (the agent runs it during a split) |

`/split-archive` exists because `/opsx:archive` is agent-driven (it moves the folder itself and cannot pass
`--skip-specs`) and does not run the final loss check.

## The flow

| # | Step | AI Hero | Superpowers |
|---|---|---|---|
| 1 | `/opsx:propose <id>` runs the tool's **design session** first | `grill-with-docs` → `execution/grill.md` | `brainstorming` → `execution/brainstorm.md`, **stopped** after the approved design (no writing-plans yet) |
| 2 | Proposal + **specs** | `proposal.md` = what/why only; behaviours from the session become delta scenarios; new capability → `## Purpose` first | same |
| 2a | `/split-check <id>` (automatic at the end of the specs stage) counts requirements and capabilities. Up to 5 and 2 it says "fits". Above, it proposes slices and **waits for your approval**; commit the deltas, then `/split-apply <id>` makes a parent + one child change per slice (`<id>-<nn>-<slice>`) (see [Splitting](#splitting-a-big-change)) | | |
| 3 | `/handoff <id>`: OpenSpec's **last stage**. Writes `handoff.md` (tool - resolved from the per-change override or the project default -, `apply_mode`, `base_ref`), then **prints the next steps and stops** (`/next-steps <id>` reprints them) | | |
| 3a | Planning (you run it) | `/to-spec` (reads grill.md) → `execution/spec.md`, `/to-tickets` → `execution/tickets/` | `writing-plans` (reads brainstorm.md) → `execution/plan-<id>.md` |
| 4 | `/spec-check <id>` → `execution/spec-check.md` | stops on GAPS: fix, re-run | same |
| 5 | Implement with the tool's own command (`apply_mode`), **not** `/opsx:apply`. Progress lives in the tool's tracking, not a `tasks.md` | `/implement` or `/implement-spec`, with `tdd`; ticket `Status: done` + ticked checkboxes | `executing-plans` or `subagent-driven-development` (branch `change/<id>`); tick plan step checkboxes; copy the ledger to `execution/progress.md` |
| 6 | The tool's own code review (CI also runs a review on the PR) | `code-review` (Standards + Spec sub-agents) | `requesting-code-review` (`code-reviewer.md`) |
| 7 | `/opsx:verify <id>`; save the report verbatim to `execution/verify.md` | | then `finishing-a-development-branch` |
| 8 | `/opsx:archive <id>` on the change branch: syncs the delta into `openspec/specs/`, moves the change to `archive/`; commit it in the change's PR with the code, then merge | | |

The code review is the tool's own review step (AI Hero `code-review`, Superpowers `requesting-code-review`); CI
also runs a code review on the PR. No review file or label is required and nothing checks for one. Completion is
the execution tool's: AI Hero's ticket `Status: done`, Superpowers' ledger and plan steps (there is no separate gate).

Useful checks at any time:
- `/tool <id>` shows which tool applies and why.
- After editing a delta (any time after planning), run `/spec-check <id>`: it lists the requirements / scenarios added, changed, removed or renamed since the last check (content hashes in `execution/.spec-check.json`) and the tickets / plan tasks citing each - re-plan the open ones; done ones are protected. Report-only.
- `/spec-check <id>` is the only plan-vs-spec check: requirement links (every story / ticket / task names a real delta requirement), coverage, and the agent review (missing / invented / contradicted; restated requirement text is advisory).

## Switching tools

Avoid it. The session file is tool-specific, so a switch means **redoing the design session**, plus the handoff if you already ran it.
Never switch after code exists. `/tool <id> --set` refuses while the other tool's session exists.
Full steps: [switching-tools.md](switching-tools.md).

## Small changes

Budget per change (all warn-only): ≤ 5 requirements and ≤ 2 capabilities (counted by `/split-check` after the
specs), ~300 changed lines of code + tests (estimated after planning by `/spec-check` from `Estimate: ~N lines`
per ticket / plan task; the PR diff itself is not measured), ≤ 8 tickets/plan tasks.
See [small-changes.md](small-changes.md).

## Splitting a big change

1. `/split-check <id>` warns → the agent writes `execution/split-proposal.md` (slices: the slice part and
   its order, goal, capabilities, requirements, depends_on, flag). **You approve or edit it** (`approved_by:`).
2. Commit the deltas (that commit is the loss-check baseline), then `/split-apply <id>` → `<id>` becomes the parent (schema `split-plan`, a
   control plane: `proposal.md` + `slices.md` with goal, capabilities, depends_on, flag, ticket, status and the
   `split_commit` - **no requirement names**), and each slice becomes a normal change with live deltas, named
   `<id>-<nn>-<slice>`: `add-text-stats-01-core`, `add-text-stats-02-cli`, `add-text-stats-99-remove-flag`
   (nn = two-digit order from the proposal's `- order:`; the flag cleanup slice is always `99`). A full id in
   the proposal that does not follow the convention is refused with the expected name; a re-split continues
   the numbering (`-03-`, `-04-`, ...). Names get long, and the archive adds a date prefix
   (`archive/2026-10-10-add-text-stats-01-core/`), so keep the parent id and the slice part short.
3. `split.mjs loss <id>` must PASS (nothing lost, duplicated or unsourced vs the deltas at `split_commit`).
   Deliberate differences go into the child's proposal `## Split notes` (`dropped:`, `added:`,
   `renamed_from:`, `split_from:`). Commit the parent and all children together as one planning PR.
4. `/split-next <id>` → READY slices (all dependencies archived on main), parallel-safe
   pairs (no dependency, no shared capability), and `tickets/<slice>.md` for each ready slice.
5. Per slice: `/split-mark <id> <slice> in-progress` (commit on main), a branch from main, a short design
   session reading the parent's session file → `/handoff <slice>` → the normal flow → `/opsx:archive <slice>`
   committed in the slice's PR with its code → merge → `/split-next <id>` on main.
6. All slices archived → `/split-archive <id>` (final loss check, then `openspec archive <id> --skip-specs -y`).

**Parent session vs. slice: the delta wins.** The parent's design session (`execution/grill.md` /
`brainstorm.md`) is frozen at the split commit and uses the original names. Where it and a slice's delta or split
notes differ, the delta wins; the slice's narrowed session lists which parent decisions it overrides in an
`## Overrides` section (`split.mjs loss` warns when a slice with split notes has none). `split.mjs loss` prints an
info line (`i ...`) for an unchanged parent session and a warning only if the session changed since the split
commit; neither fails the check.

Changing the plan later: edit the child delta, add the split note to the child's proposal, rerun
`split.mjs loss`, then rerun `/spec-check`: its "Spec changes since the last check" section lists what
changed and which tickets / tasks cite it; regenerate those **open** tickets / tasks only (never a done one).

## Known limitations

- **Pilot:** proven only on toy changes (two ~50-line utilities in a demo repo, `handoff-flows-v3`). There has been no real-project use yet.
- **Not exercised:** `implement-spec` and `subagent-driven-development` (the test harness had no sub-agent tool), and PR-based finishing.
- **Review independence:** the tool's own review runs in the implementing agent's environment; the independent review is CI's review on the PR.
- **`/spec-check`'s review is agent judgement:** the script checks links and coverage mechanically and writes `PENDING`; missing / invented / contradicted behaviour and restated text are the agent's call, and the agent sets PASS or GAPS.
- **Splitting:** tested on demo features (`handoff-flows-v5`, `-v6`). The loss check matches names; for an unmatched name it lists rename candidates and the agent judges semantic equivalence (`renamed_from`), so that step is agent judgement. "In progress" is a manual mark in the parent's `slices.md`; the next report does not scan branches. Line estimates are the agent's guesses.
- **`openspec status` / `openspec list` don't show implementation progress:** with no tasks stage, `status` says "All planning artifacts complete!" right after `/handoff`, and `list` shows "No tasks". Real progress is the tool's own tracking (ticket `Status:` / plan step checkboxes). `/opsx:verify` reports Task Completion as not applicable.
- **Undocumented OpenSpec key:** the project default lives in a toolkit-owned file (`.openspec-handoff/project.json`), so OpenSpec itself does not know about the tool.
