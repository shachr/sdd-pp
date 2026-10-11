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

`<agent>` is your coding agent as the skills CLI names it, for example `claude-code`, `cursor` or `opencode`. You only need the skills for the tool(s) you use.

## Install (setup phase: pick the tool once)

```bash
cd your-project && git init            # a git repo is required (base_ref, review diffs)
openspec init --tools <agent>          # <agent>: claude, cursor, opencode, ... (e.g. claude)
npx github:shachr/sdd-pp init . --tool ai-hero   # or --tool superpowers; or from a local checkout: npx /path/to/sdd-pp init . ...
openspec schema validate handoff-driven
```

Example with Claude: `openspec init --tools claude`, the skills with `-a claude-code`, then `npx github:shachr/sdd-pp init . --tool ai-hero`.

`sdd-pp init` installs its skills and slash commands for Claude (`.claude/`) and Cursor (`.cursor/`) by default
(`--no-claude` / `--no-cursor` skip one), and for opencode (`.opencode/`) only when that folder already exists (e.g. after
`openspec init --tools opencode`) or with `--opencode`.

`sdd-pp init` is a plain Node CLI (no bash, no symlinks; path handling tested on Linux incl. paths with spaces and written to be Windows-safe, not yet run on Windows). `--tool` writes the project default to
`.openspec-handoff/project.json`. Re-running `init` without `--tool` (to upgrade) keeps it. `npx sdd-pp init` will work once the
package is published to npm (not yet). `sdd-pp --help` lists every option.
With `--tool ai-hero`, `init` also installs `docs/agents/issue-tracker.md` (from `.openspec-handoff/issue-tracker-openspec.md`)
when the project has none. That makes the change folder AI Hero's issue tracker.

Optional per-change override, **before** the design session: `/sdd-tool <id> --set superpowers`

## Commands (and what runs under the hood)

You never type `node .openspec-handoff/scripts/...`: use the agent slash commands, or the same checks from a
shell with `npx github:shachr/sdd-pp <command>` (from anywhere inside the project; it runs the project's
installed scripts). Both go through `.openspec-handoff/scripts/sdd.mjs`, which only runs the scripts below.

| Agent command | CLI (`npx github:shachr/sdd-pp ...`) | Runs |
|---|---|---|
| `/sdd-tool <id> [--set <tool>]` (show writes nothing; `--set` starts the session file - a stub with no session yet can still be replaced) | `tool <id> [--set <tool>]`, `tool --default <tool>` | `execution-tool.mjs` |
| `/sdd-split-check <id>` (agent: proposes slices) | `split-check <id>` (counts only; previews an existing `execution/split-proposal.md` even when the change fits; warns when a new capability's `## Purpose` is missing or under 50 characters - strict validation of the main spec fails after archive) | `split-check.mjs <id> --write` |
| `/sdd-handoff <id>` (agent skill) | `handoff-draft <id>` (pre-fills handoff.md: change, tool, base_ref, links, slice/parent, size; leaves apply_mode / harness / notes) | `handoff-draft.mjs <id>`, the agent fills the judgment fields, then `next-steps.mjs` (via `sdd.mjs change-status`) |
| `/sdd-change-status <id>` | `change-status <id>` | `next-steps.mjs <id>` |
| `/sdd-spec-check <id>` (agent: adds the review for missing / invented / contradicted / restated, sets PASS or GAPS; accepts PASS with `--accept`) | `spec-check <id>` (mechanical report; kept as is when the delta and planning units match the accepted PASS - prints a one-line summary, `--verbose` for the full report), `spec-check <id> --check` (writes nothing) | `spec-check.mjs <id> --write` |
| `/sdd-split-apply <id> [--force]` (`--force`: re-split a slice already in progress; every refusal reason listed at once; a re-split rewires dependents in `slices.md` and their `proposal.md`) | `split apply <id> [--force]` | `split.mjs apply <id>` |
| `/sdd-split-status <parent>` (rewrites `slices.md` only when something changed; says done once the parent is archived) | `split-status <parent>` | `split.mjs next <parent> --write-tickets` |
| `/sdd-slice-start <slice> [--undo]` | `slice-start <slice> [--undo]` | `split.mjs start <slice> [--undo]` |
| `/sdd-slice-finish <slice>` | `slice-finish <slice>` | `split.mjs finish-check <slice>` (in progress? `execution/verify.md`, + `execution/progress.md` for Superpowers; no open ticket, unticked ticket checkbox or plan step, CRITICAL issue in verify.md or `TODO(agent:` placeholder anywhere in the slice folder except the generated reports (`execution/verify.md`, `spec-check.md`, `split-check.md`, `split-proposal.md`, `execution/reviews/`) - refuses listing every problem at once), `openspec archive <slice> -y`, `split.mjs finish-mark <slice>` (status done in the parent's `slices.md`, commit line) |
| `/sdd-split-undo <parent> [--force]` (the whole parent only; no per-slice undo) | `split undo <parent> [--force]` | `split.mjs undo <parent> [--force]` |
| `/sdd-split-finish <parent>` | `split-finish <parent>` | `split.mjs finalize <parent>` (stops with "N slices not archived: ..." unless every slice is archived; marks them `status: done`; final loss check), then `openspec archive <parent> --skip-specs -y` |
| - | `split loss <parent> [--final]` | `split.mjs loss` (the agent runs it during a split) |

`/sdd-split-finish` exists because `/opsx:archive` is agent-driven (it moves the folder itself and cannot pass
`--skip-specs`) and does not run the final loss check.

Every command that writes files prints the exact `git add ... && git commit -m ...` line for what it wrote. `/sdd-change-status` marks
steps whose result is already in the change folder with `[done]` (a file check, not progress tracking: tickets all done / plan
steps all ticked = implementation, a file in `execution/reviews/` or `execution/verify.md` = review) and says `git switch
change/<id>` (no `-c`) once the branch exists. Before the handoff it shows a pending `execution/split-proposal.md` (approve,
commit, `/sdd-split-apply`) instead of `/sdd-handoff`, and for a slice the branch step and the slice's split check.
The review diff is `git diff main...HEAD` (three dots: since the branch point with main, so main merged into the branch
later - another slice's code - is left out). Dates the toolkit writes (`split_at`, `created`) are local, like OpenSpec's.
Retired command names (`next-steps`, `split-next`, `split-start`, `split-archive`, ...) exit 2 and name the current command.

## The flow

| # | Step | AI Hero | Superpowers |
|---|---|---|---|
| 1 | `/opsx:propose <id>` runs the tool's **design session** first | `grill-with-docs` → `execution/grill.md` | `brainstorming` → `execution/brainstorm.md`, **stopped** after the approved design (no writing-plans yet) |
| 2 | Proposal + **specs** | `proposal.md` = what/why only; behaviours from the session become delta scenarios; new capability → `## Purpose` first | same |
| 2a | `/sdd-split-check <id>` (automatic at the end of the specs stage) counts requirements and capabilities. Up to 5 and 2 it says "fits". Above, it proposes slices and **waits for your approval**; commit the deltas, then `/sdd-split-apply <id>` makes a parent + one child change per slice (`<id>-<nn>-<slice>`) (see [Splitting](#splitting-a-big-change)) | | |
| 3 | `/sdd-handoff <id>`: OpenSpec's **last stage**. Writes `handoff.md` (tool - resolved from the per-change override or the project default -, `apply_mode`, `base_ref`), then **prints the next steps and stops** (`/sdd-change-status <id>` reprints them) | | |
| 3a | Planning (you run it) | `/to-spec` (reads grill.md) → `execution/spec.md`, `/to-tickets` → `execution/tickets/` | `writing-plans` (reads brainstorm.md) → `execution/plan-<id>.md` |
| 4 | `/sdd-spec-check <id>` → `execution/spec-check.md` | stops on GAPS: fix, re-run | same |
| 5 | Implement with the tool's own command (`apply_mode`), **not** `/opsx:apply`. Progress lives in the tool's tracking, not a `tasks.md` | `/implement` or `/implement-spec`, with `tdd`; ticket `Status: done` + ticked checkboxes | `executing-plans` or `subagent-driven-development` (branch `change/<id>`); tick plan step checkboxes; copy the ledger to `execution/progress.md` |
| 6 | The tool's own code review (CI also runs a review on the PR) | `code-review` (Standards + Spec sub-agents) | `requesting-code-review` (`code-reviewer.md`) |
| 7 | `/opsx:verify <id>`; save the report verbatim to `execution/verify.md` | | then `finishing-a-development-branch` |
| 8 | `/opsx:archive <id>` on the change branch: syncs the delta into `openspec/specs/`, moves the change to `archive/`; commit it in the change's PR with the code, then merge | | |

The code review is the tool's own review step (AI Hero `code-review`, Superpowers `requesting-code-review`); CI
also runs a code review on the PR. No review file or label is required and nothing checks for one. Completion is
the execution tool's: AI Hero's ticket `Status: done`, Superpowers' ledger and plan steps (there is no separate gate).

Useful checks at any time:
- `/sdd-tool <id>` shows which tool applies and why.
- After editing a delta (any time after planning), one order: edit the delta -> `openspec validate <id> --strict` -> `/sdd-spec-check <id>` (its "Spec changes since the last check" section lists what changed since the last accepted PASS and the tickets / tasks citing it; the list stays on every run until a PASS is accepted) -> re-plan ONLY the open units it names (done units are never touched; a change affecting done work becomes a new ticket / task; the planning output notes `superseded by delta edit: <reason>`, the design session file stays as-is) -> `/sdd-spec-check` until PASS, which it accepts (`--accept`); commit `execution/.spec-check.json` with the planning files. The change list is report-only (never a gap by itself); its baseline (content hashes in `execution/.spec-check.json`, accepted time in local time with offset) moves only on an accepted PASS.
- `/sdd-spec-check <id>` is the only plan-vs-spec check: requirement links (every story / ticket / task names a real delta requirement), coverage, and the agent review (missing / invented / contradicted; restated requirement text is advisory).

## Switching tools

Avoid it. The session file is tool-specific, so a switch means **redoing the design session**, plus the handoff if you already ran it.
Never switch after code exists. `/sdd-tool <id> --set` refuses while the other tool's session exists.
Full steps: [switching-tools.md](switching-tools.md).

## Small changes

Budget per change (all warn-only): ≤ 5 requirements and ≤ 2 capabilities (counted by `/sdd-split-check` after the
specs), ~300 changed lines of code + tests (estimated after planning by `/sdd-spec-check` from `Estimate: ~N lines`
per ticket / plan task; the PR diff itself is not measured), ≤ 8 tickets/plan tasks.
See [small-changes.md](small-changes.md).

## Splitting a big change

1. `/sdd-split-check <id>` warns → the agent writes `execution/split-proposal.md` (slices: the slice part and
   its order, goal, capabilities, requirements, depends_on, flag). **You approve or edit it** (`approved_by:`).
2. Commit the deltas (that commit is the loss-check baseline), then `/sdd-split-apply <id>` → `<id>` becomes the parent (schema `split-plan`, a
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
4. `/sdd-split-status <id>` → READY slices (all dependencies archived on main), parallel-safe
   pairs (no dependency, no shared capability), and `tickets/<slice>.md` for each ready slice.
5. Per slice: `/sdd-slice-start <slice>` (marks it in-progress, prints the next lines; commit the mark on main), a branch from main, a short design
   session reading the parent's session file → `/sdd-handoff <slice>` → the normal flow → `/opsx:verify <slice>` → `/sdd-slice-finish <slice>`
   (checks verify.md / progress.md, `openspec archive <slice> -y`, status done in `slices.md`) committed in the slice's PR with its code → merge → `/sdd-split-status <id>` on main.
6. All slices archived → `/sdd-split-finish <id>` (final loss check, then `openspec archive <id> --skip-specs -y`).

Changed your mind before any slice is archived? `/sdd-split-undo <id>` restores the original change from `split_commit`
(also after re-splits) and removes the slice folders, uncommitted; review `git status`, commit on main. It refuses with an
archived slice or uncommitted changes in `openspec/changes`, and with a slice in progress unless `--force`.

**Parent session vs. slice: the delta wins.** The parent's design session (`execution/grill.md` /
`brainstorm.md`) is frozen at the split commit and uses the original names. Where it and a slice's delta or split
notes differ, the delta wins; the slice's narrowed session lists which parent decisions it overrides in an
`## Overrides` section (`split.mjs loss` warns when a slice with split notes has none). `split.mjs loss` prints an
info line (`i ...`) for an unchanged parent session and a warning only if the session changed since the split
commit; neither fails the check.

Changing the plan later: edit the child delta, add the split note to the child's proposal, rerun
`split.mjs loss`, then the one order: edit the delta -> `openspec validate <id> --strict` -> `/sdd-spec-check <id>` (its "Spec changes since the last check" section lists what changed since the last accepted PASS and the tickets / tasks citing it; the list stays on every run until a PASS is accepted) -> re-plan ONLY the open units it names (done units are never touched; a change affecting done work becomes a new ticket / task; the planning output notes `superseded by delta edit: <reason>`, the design session file stays as-is) -> `/sdd-spec-check` until PASS, which it accepts (`--accept`); commit `execution/.spec-check.json` with the planning files.

## Known limitations

- **Pilot:** proven only on toy changes (two ~50-line utilities in a demo repo, `handoff-flows-v3`). There has been no real-project use yet.
- **Exercised in v9:** `implement-spec` and `subagent-driven-development` ran end to end, but the harness had no real sub-agent tool: the roles ran in-session, labelled (so sub-agents were never truly run). PR-based finishing is not exercised.
- **Review independence:** the tool's own review runs in the implementing agent's environment; the independent review is CI's review on the PR.
- **`/sdd-spec-check`'s review is agent judgement:** the script checks links and coverage mechanically and writes `PENDING`; missing / invented / contradicted behaviour and restated text are the agent's call, and the agent sets PASS or GAPS.
- **Splitting:** tested on demo features (`handoff-flows-v5` to `-v9` and two fresh e2e runs). The loss check matches names; for an unmatched name it lists rename candidates and the agent judges semantic equivalence (`renamed_from`), so that step is agent judgement. "In progress" is set by `/sdd-slice-start <slice>` in the parent's `slices.md` (commit it on main); the next report does not scan branches. Line estimates are the agent's guesses.
- **`openspec status` / `openspec list` don't show implementation progress:** with no tasks stage, `status` says "All planning artifacts complete!" right after `/sdd-handoff`, and `list` shows "No tasks". Real progress is the tool's own tracking (ticket `Status:` / plan step checkboxes). `/opsx:verify` would report Task Completion as not applicable; the handoff-driven instruction overrides that (it checks ticket Status / plan boxes / progress.md), but verify is agent judgement - `/sdd-slice-finish` enforces it for slices (refuses open tickets, unticked plan steps, CRITICAL issues in verify.md). An unsplit change's `/opsx:archive` does not.
- **Undo is whole-parent only:** `/sdd-split-undo <parent>` restores the original change; there is no per-slice undo (re-split a slice with `/sdd-split-check <slice>` + `/sdd-split-apply`, or release a taken slice with `/sdd-slice-start <slice> --undo`).
- **Parallel-safe is by dependency and capability, not by file:** two parallel-safe slices can still edit the same code file. `/sdd-split-status` warns (best effort) when both slices' planning names the same path (e.g. `src/cli.js`), reading a slice's planning from its `change/<slice>` branch when it is not on the current branch; paths not written in the planning, and planning not yet committed on that branch, are not seen.
- **Undocumented OpenSpec key:** the project default lives in a toolkit-owned file (`.openspec-handoff/project.json`), so OpenSpec itself does not know about the tool.
