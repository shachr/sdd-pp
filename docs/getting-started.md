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
| 3 | `/handoff <id> <model>` writes `handoff.md` (tool, model, `apply_mode`, `base_ref`) and plans | `to-spec` (reads grill.md) → `execution/spec.md`, `to-tickets` → `execution/tickets/` | `writing-plans` (reads brainstorm.md) → `execution/plan-<id>.md` |
| 4 | `/spec-check <id>` (automatic at the end of /handoff) → `execution/spec-check.md` | stops on GAPS: fix, re-run | same |
| 5 | Implement with the tool's own command (`apply_mode`), **not** `/opsx:apply`; tick `tasks.md` | `/implement` or `/implement-spec`, with `tdd` | `executing-plans` or `subagent-driven-development` (branch `change/<id>`; copy the ledger to `execution/progress.md`) |
| 6 | Tool's code review in a **fresh context** → `execution/reviews/code-review.md` | `code-review` (Standards + Spec sub-agents) | `requesting-code-review` (`code-reviewer.md`) |
| 7 | `openspec validate <id> --strict` and `node .openspec-handoff/scripts/check-handoff.mjs <id>` | | |
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

Budget per change: ≤ 5 requirements, ≤ 8 tickets/plan tasks, ≤ 400 changed lines (hard cap 12 units). Record it in the proposal's *Size Budget*.
If you are over budget, split into several changes before handoff. See [small-changes.md](small-changes.md).

## Known limitations

- **Pilot:** proven only on toy changes (two ~50-line utilities in a demo repo, `handoff-flows-v3`). There has been no real-project use yet.
- **Not exercised:** `implement-spec` and `subagent-driven-development` (the test harness had no sub-agent tool), and PR-based finishing.
- **Weak local reviewer:** qwen3:4b-instruct gives shallow reviews and can be confidently wrong (it raised one false Critical). Triage every finding; use a stronger model if you can.
- **Heuristic lints:** the paraphrase lint and the proposal implementation-detail lint are token/keyword heuristics, warnings only. Expect false positives and misses. Session records written before the delta naturally trigger paraphrase warnings.
- **`/spec-check` contradictions are agent judgement:** the script checks coverage mechanically and exits 0 if it cannot see a contradiction. Whether it stops depends on the agent's review.
- **`openspec status` / task progress may be inaccurate:** it only counts `tasks.md` checkboxes, which the wrappers tick by hand. It does not know about tickets, plan steps or the execution tool's own state.
- **Undocumented OpenSpec key:** the project default lives in a toolkit-owned file (`.openspec-handoff/project.json`), so OpenSpec itself does not know about the tool.
