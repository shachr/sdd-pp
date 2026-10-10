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
| Optional: local reviewer | [Ollama](https://ollama.com) + `ollama pull qwen3:4b-instruct` (gives a fresh review context without an API key) |

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
| 2a | `/split-check <id>` (automatic at the end of the specs stage): the agent estimates each requirement → `execution/size-estimate.md`. Under ~300 lines it says "fits". Over it, it proposes slices and **waits for your approval**; then `split.mjs apply` makes a parent + one child change per slice (see [Splitting](#splitting-a-big-change)) | | |
| 3 | `/handoff <id> <model>`: OpenSpec's **last stage**. Writes `handoff.md` (tool, model, `apply_mode`, `base_ref`), then **prints the next steps and stops** (`next-steps.mjs <id>` reprints them) | | |
| 3a | Planning (you run it) | `/to-spec` (reads grill.md) → `execution/spec.md`, `/to-tickets` → `execution/tickets/` | `writing-plans` (reads brainstorm.md) → `execution/plan-<id>.md` |
| 4 | `/spec-check <id>` → `execution/spec-check.md` | stops on GAPS: fix, re-run | same |
| 5 | Implement with the tool's own command (`apply_mode`), **not** `/opsx:apply`. Progress lives in the tool's tracking, not a `tasks.md` | `/implement` or `/implement-spec`, with `tdd`; ticket `Status: done` + ticked checkboxes | `executing-plans` or `subagent-driven-development` (branch `change/<id>`); tick plan step checkboxes; copy the ledger to `execution/progress.md` |
| 6 | Tool's code review in a **fresh context** → `execution/reviews/code-review.md` | `code-review` (Standards + Spec sub-agents) | `requesting-code-review` (`code-reviewer.md`) |
| 7 | `openspec validate <id> --strict` and `node .openspec-handoff/scripts/check-handoff.mjs <id> --expect-complete` (fails while a ticket / plan step is open) | | |
| 8 | `/opsx:verify <id>`; save the report verbatim to `execution/verify.md` | | then `finishing-a-development-branch` |
| 9 | `/opsx:archive <id>`: syncs the delta into `openspec/specs/`, then moves the change to `archive/` | | |

"Fresh context" means a sub-agent. Without one, use a new session or the local model:
`node .openspec-handoff/scripts/runners/ollama.mjs qwen3:4b-instruct < prompt.md`.
Fill the prompt with the tool's own review brief. If neither is possible, write "self-review" at the top of the review file.
`/adversarial-review` (a different-model review) is optional.

Useful checks at any time:
- `node .openspec-handoff/scripts/execution-tool.mjs <id>` shows which tool applies and why.
- `check-handoff <id>` errors on missing/inconsistent tool settings, copied requirement text and unlinked units. It warns on paraphrases, implementation detail in proposal.md and a missing `## Purpose`.

## Switching tools

Avoid it. The session file is tool-specific, so a switch means **redoing the design session**, plus the handoff if you already ran it.
Never switch after code exists. `execution-tool.mjs --set` refuses while the other tool's session exists.
Full steps: [switching-tools.md](switching-tools.md).

## Small changes

Budget per change (all warn-only): ~300 changed lines of code + tests, ≤ 5 requirements, ≤ 8 tickets/plan tasks.
Checked three times: the `/split-check` gate after the specs, the re-estimate in `/spec-check` (`Estimate: ~N lines`
per ticket / plan task), and the real diff in `check-handoff`. See [small-changes.md](small-changes.md).

## Splitting a big change

1. `/split-check <id>` over budget → the agent writes `execution/split-proposal.md` (slices: goal, capabilities,
   requirements, depends_on, flag, estimate). **You approve or edit it** (`approved_by:`).
2. `node .openspec-handoff/scripts/split.mjs apply <id>` → `<id>` becomes the parent (schema `split-plan`:
   `proposal.md` + `slices.md` with the slices, a checklist of the original requirement/scenario **names** and
   amendments) and each slice becomes a normal change with live deltas.
3. `split.mjs loss <id>` must PASS (nothing lost, nothing duplicated, nothing unsourced). Commit the parent and
   all children together as one planning PR.
4. `split.mjs next <id> --write-tickets` → READY slices (all dependencies archived), parallel-safe pairs (no
   dependency, no shared capability), and `tickets/<slice>.md` for each ready slice.
5. Per slice, on a branch from main: short design session reading the parent's session file → `/handoff <slice>` →
   the normal flow → `/opsx:archive <slice>` → `split.mjs next <id> --write-tickets`.
6. All slices archived → `split.mjs loss <id> --final --write` → `openspec archive <id> --skip-specs --yes`.

Changing the plan later: edit the child delta, add an amendment line to `slices.md`
(`Requirement "X" dropped` / `changed, see change Y` / `added in <slice>`), rerun `split.mjs loss`, then rerun the
tool's planning command and `/spec-check` (the tools rewrite their files; they have no update mode).

## Known limitations

- **Pilot:** proven only on toy changes (two ~50-line utilities in a demo repo, `handoff-flows-v3`). There has been no real-project use yet.
- **Not exercised:** `implement-spec` and `subagent-driven-development` (the test harness had no sub-agent tool), and PR-based finishing.
- **Weak local reviewer:** qwen3:4b-instruct gives shallow reviews and can be confidently wrong (it raised one false Critical). Triage every finding; use a stronger model if you can.
- **Heuristic lints:** the paraphrase lint and the proposal implementation-detail lint are token/keyword heuristics, warnings only. Expect false positives and misses. Session records written before the delta naturally trigger paraphrase warnings.
- **`/spec-check` contradictions are agent judgement:** the script checks coverage mechanically and exits 0 if it cannot see a contradiction. Whether it stops depends on the agent's review.
- **Splitting is new (v5):** tested on one demo feature (`handoff-flows-v5`). Size estimates are the agent's guesses; the loss check matches names, not meaning.
- **`openspec status` / `openspec list` don't show implementation progress:** with no tasks stage, `status` says "All planning artifacts complete!" right after `/handoff`, and `list` shows "No tasks". Real progress is `check-handoff` → `progress=` (tickets / plan checkboxes, ticked by hand). `/opsx:verify` reports Task Completion as not applicable.
- **Undocumented OpenSpec key:** the project default lives in a toolkit-owned file (`.openspec-handoff/project.json`), so OpenSpec itself does not know about the tool.
