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
| Optional: fallback reviewer | [Ollama](https://ollama.com) + `ollama pull qwen3:4b-instruct` (a weak fallback when your coding agent cannot open a fresh session) |

`<agent>` is your harness, for example `opencode`, `claude-code` or `cursor`. You only need the skills for the tool(s) you use.

## Install (setup phase: pick the tool once)

```bash
cd your-project && git init            # a git repo is required (base_ref, review diffs)
openspec init --tools opencode         # or claude,cursor
/path/to/openspec-handoff-workflow/install.sh . --tool ai-hero   # or --tool superpowers; add --opencode / --no-claude / --no-cursor as needed
openspec schema validate handoff-driven
```

`--tool` writes the project default to `.openspec-handoff/project.json`. Re-running `install.sh` (to upgrade) keeps it.
For AI Hero, also copy `.openspec-handoff/issue-tracker-openspec.md` to `docs/agents/issue-tracker.md` (or run `/setup-matt-pocock-skills` → "Other").
That makes the change folder the issue tracker.

Optional per-change override, **before** the design session:
`node .openspec-handoff/scripts/execution-tool.mjs <id> --set superpowers`

## The flow

| # | Step | AI Hero | Superpowers |
|---|---|---|---|
| 1 | `/opsx:propose <id>` runs the tool's **design session** first | `grill-with-docs` → `execution/grill.md` | `brainstorming` → `execution/brainstorm.md`, **stopped** after the approved design (no writing-plans yet) |
| 2 | Proposal + **specs** | `proposal.md` = what/why only; behaviours from the session become delta scenarios; new capability → `## Purpose` first | same |
| 2a | `/split-check <id>` (automatic at the end of the specs stage) counts requirements and capabilities. Up to 5 and 2 it says "fits". Above, it proposes slices and **waits for your approval**; commit the deltas, then `split.mjs apply` makes a parent + one child change per slice (see [Splitting](#splitting-a-big-change)) | | |
| 3 | `/handoff <id> <model>`: OpenSpec's **last stage**. Writes `handoff.md` (tool, model, `apply_mode`, `base_ref`), then **prints the next steps and stops** (`next-steps.mjs <id>` reprints them) | | |
| 3a | Planning (you run it) | `/to-spec` (reads grill.md) → `execution/spec.md`, `/to-tickets` → `execution/tickets/` | `writing-plans` (reads brainstorm.md) → `execution/plan-<id>.md` |
| 4 | `/spec-check <id>` → `execution/spec-check.md` | stops on GAPS: fix, re-run | same |
| 5 | Implement with the tool's own command (`apply_mode`), **not** `/opsx:apply`. Progress lives in the tool's tracking, not a `tasks.md` | `/implement` or `/implement-spec`, with `tdd`; ticket `Status: done` + ticked checkboxes | `executing-plans` or `subagent-driven-development` (branch `change/<id>`); tick plan step checkboxes; copy the ledger to `execution/progress.md` |
| 6 | Tool's code review in a **fresh session of your own coding agent** → `execution/reviews/code-review.md` | `code-review` (Standards + Spec sub-agents) | `requesting-code-review` (`code-reviewer.md`) |
| 7 | `openspec validate <id> --strict` and `node .openspec-handoff/scripts/check-handoff.mjs <id> --expect-complete` (fails while a ticket / plan step is open) | | |
| 8 | `/opsx:verify <id>`; save the report verbatim to `execution/verify.md` | | then `finishing-a-development-branch` |
| 9 | `/opsx:archive <id>` on the change branch: syncs the delta into `openspec/specs/`, moves the change to `archive/`; commit it in the change's PR with the code, then merge | | |

The default reviewer is a **fresh session of your own coding agent** (a sub-agent, or a new session that sees
only the filled review brief). Fallback when that is impossible: a local model,
`node .openspec-handoff/scripts/runners/ollama.mjs qwen3:4b-instruct < prompt.md`, labelled
`weak fallback reviewer: <model>` at the top of the review file (check-handoff warns without the label).
If neither is possible, write "self-review" at the top of the review file.
`/adversarial-review` (a different-model review) is optional.

Useful checks at any time:
- `node .openspec-handoff/scripts/execution-tool.mjs <id>` shows which tool applies and why.
- `check-handoff <id>` errors on missing/inconsistent tool settings, copied requirement text and unlinked units. It warns on paraphrases, implementation detail in proposal.md and a missing `## Purpose`.

## Switching tools

Avoid it. The session file is tool-specific, so a switch means **redoing the design session**, plus the handoff if you already ran it.
Never switch after code exists. `execution-tool.mjs --set` refuses while the other tool's session exists.
Full steps: [switching-tools.md](switching-tools.md).

## Small changes

Budget per change (all warn-only): ≤ 5 requirements and ≤ 2 capabilities (counted by `/split-check` after the
specs), ~300 changed lines of code + tests (estimated after planning by `/spec-check` from `Estimate: ~N lines`
per ticket / plan task; measured at the PR by `check-handoff`), ≤ 8 tickets/plan tasks.
See [small-changes.md](small-changes.md).

## Splitting a big change

1. `/split-check <id>` warns → the agent writes `execution/split-proposal.md` (slices: goal, capabilities,
   requirements, depends_on, flag). **You approve or edit it** (`approved_by:`).
2. Commit the deltas (that commit is the loss-check baseline), then
   `node .openspec-handoff/scripts/split.mjs apply <id>` → `<id>` becomes the parent (schema `split-plan`, a
   control plane: `proposal.md` + `slices.md` with goal, capabilities, depends_on, flag, ticket, status and the
   `split_commit` - **no requirement names**), and each slice becomes a normal change with live deltas.
3. `split.mjs loss <id>` must PASS (nothing lost, duplicated or unsourced vs the deltas at `split_commit`).
   Deliberate differences go into the child's proposal `## Split notes` (`dropped:`, `added:`,
   `renamed_from:`, `split_from:`). Commit the parent and all children together as one planning PR.
4. `split.mjs next <id> --write-tickets` → READY slices (all dependencies archived on main), parallel-safe
   pairs (no dependency, no shared capability), and `tickets/<slice>.md` for each ready slice.
5. Per slice: `split.mjs mark <id> <slice> in-progress` (commit on main), a branch from main, a short design
   session reading the parent's session file → `/handoff <slice>` → the normal flow → `/opsx:archive <slice>`
   committed in the slice's PR with its code → merge → `split.mjs next <id> --write-tickets` on main.
6. All slices archived → `split.mjs loss <id> --final` → `openspec archive <id> --skip-specs --yes`.

Changing the plan later: edit the child delta, add the split note to the child's proposal, rerun
`split.mjs loss`, then regenerate the tool's **open** tickets / tasks only (never a done one) and rerun
`check-handoff` and `/spec-check`.

## Known limitations

- **Pilot:** proven only on toy changes (two ~50-line utilities in a demo repo, `handoff-flows-v3`). There has been no real-project use yet.
- **Not exercised:** `implement-spec` and `subagent-driven-development` (the test harness had no sub-agent tool), and PR-based finishing.
- **Weak fallback reviewer:** the local qwen3:4b-instruct is only a fallback; it gives shallow reviews and can be confidently wrong (false Criticals in v3 and v5). Triage every finding; prefer a fresh session of your own coding agent.
- **Heuristic lints:** the paraphrase lint and the proposal implementation-detail lint are token/keyword heuristics, warnings only. Expect false positives and misses. Session records written before the delta naturally trigger paraphrase warnings.
- **`/spec-check` contradictions are agent judgement:** the script checks coverage mechanically and exits 0 if it cannot see a contradiction. Whether it stops depends on the agent's review.
- **Splitting:** tested on demo features (`handoff-flows-v5`, `-v6`). The loss check matches names; for an unmatched name it lists rename candidates and the agent judges semantic equivalence (`renamed_from`), so that step is agent judgement. "In progress" is a manual mark in the parent's `slices.md`; the next report does not scan branches. Line estimates are the agent's guesses.
- **`openspec status` / `openspec list` don't show implementation progress:** with no tasks stage, `status` says "All planning artifacts complete!" right after `/handoff`, and `list` shows "No tasks". Real progress is `check-handoff` → `progress=` (tickets / plan checkboxes, ticked by hand). `/opsx:verify` reports Task Completion as not applicable.
- **Undocumented OpenSpec key:** the project default lives in a toolkit-owned file (`.openspec-handoff/project.json`), so OpenSpec itself does not know about the tool.
