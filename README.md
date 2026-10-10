# openspec-handoff-workflow

OpenSpec decides **what** to build (proposal + delta specs, nothing else); AI Hero or Superpowers decide
**how** (design, plan, tickets, code, review) and build it. This toolkit makes the hand-off explicit, keeps every
artifact for a change inside the OpenSpec change folder, and lints that no requirement is ever restated:

```
openspec/changes/<id>/
  proposal.md          OpenSpec  - why / what, with a Size Budget
  specs/<cap>/spec.md  OpenSpec  - delta specs: the ONLY place behaviour is written down
  handoff.md           handoff   - tool (ai-hero | superpowers), implementation_model, base_ref, links
  execution/           owned by the execution tool; cites requirements/scenarios by name + link only
    design.md, spec.md, tickets/ (AI Hero grill-with-docs, to-spec, to-tickets)
    design.md, plan-<id>.md,     (Superpowers brainstorming, writing-plans,
      progress.md                 executing-plans/SDD ledger summary)
    reviews/<ts>-<model>.md      (/adversarial-review + triage)
    verify.md                    (/opsx:verify report, saved before archive)
  tasks.md             link-only checklist (one box per ticket / plan task) for apply + verify
```

Schema order: **proposal → specs → handoff → tasks**, then apply. There is no OpenSpec design artifact, so
`/opsx:verify` checks proposal + specs and reports Design Adherence as *Not applicable* (see `docs/decisions.md` C1).

## What's here

| Path | What |
|---|---|
| `schemas/handoff-driven/` | Custom OpenSpec schema (`schema.yaml` + templates incl. `handoff.md`) - story 1 |
| `scripts/check-handoff.mjs` | Lint: handoff fields, reference-not-duplicate (errors: verbatim copies, delta headers, SHALL; warnings: token-overlap paraphrases and User-Stories-style sections with no link to the proposal/delta - errors with `strictDuplication`), ownership (no OpenSpec design.md), outputs in change folder, PR size |
| `skills/openspec-handoff*/SKILL.md` | `openspec-handoff` (writes handoff.md, routes), `-ai-hero`, `-superpowers` wrappers - story 2 |
| `commands/{claude,cursor}/handoff.md` | `/handoff` - story 2 |
| `commands/{claude,cursor}/adversarial-review.md`, `scripts/adversarial-review.mjs` | `/adversarial-review` - story 3 |
| `config/handoff-review.json` | review skill per tool, reviewer-model mapping, runners, size thresholds |
| `docs/small-changes.md` | PR-size budget, when/how to split, validate vs verify - story 4 |
| `install.sh` | installs all of the above into a project |
| `example/` | minimal test repo with a complete change `add-greeting-name` (AI Hero, claude-sonnet-4-5) |
| `docs/decisions.md`, `docs/assumptions.md` | decision log (grill → spec → tickets) and assumptions |
| `test/` | `node --test` suite incl. real OpenSpec CLI runs and a full e2e flow |

## Install into a project

```bash
npm i -g @fission-ai/openspec@1.14.1          # tested version
cd your-project && openspec init --tools claude,cursor
/path/to/openspec-handoff-workflow/install.sh .   # sets schema: handoff-driven + project context; --link to symlink
openspec schema validate handoff-driven
```

`install.sh` writes `openspec/schemas/handoff-driven/`, `.openspec-handoff/{scripts,config.json,small-changes.md}`,
`.claude/{skills,commands}/…`, `.cursor/{skills,commands}/…`, and adds `.superpowers/` to `.gitignore`.
Install the execution toolkits themselves from [mattpocock/skills](https://github.com/mattpocock/skills) and
[obra/superpowers](https://github.com/obra/superpowers).

## Use

```text
/opsx:propose add-greeting-name          # proposal + delta specs only (handoff-driven is the project default)
/handoff add-greeting-name ai-hero claude-sonnet-4-5
   -> handoff.md (tool, model, base_ref, links), check-handoff, then the tool's planning:
      openspec-handoff-ai-hero:     grill-with-docs -> execution/design.md, to-spec -> execution/spec.md,
                                    to-tickets -> execution/tickets/
      openspec-handoff-superpowers: brainstorming -> execution/design.md, writing-plans -> execution/plan-<id>.md
      (to-spec's / brainstorming's user-facing parts link the proposal + delta; their decisions are written in full)
   -> tasks.md (one link per ticket / plan task)
/opsx:apply add-greeting-name            # implement+tdd+code-review  |  executing-plans / subagent-driven-development
/adversarial-review add-greeting-name     # different model, headless, -> execution/reviews/ (+ triage.md)
openspec validate add-greeting-name --strict && node .openspec-handoff/scripts/check-handoff.mjs add-greeting-name
/opsx:verify add-greeting-name            # save the report to execution/verify.md
/opsx:archive add-greeting-name           # agent-driven sync, then move; handoff + execution archive with the change
```

Scripts directly:

```bash
node .openspec-handoff/scripts/check-handoff.mjs <id> [--json] [--no-git]
node .openspec-handoff/scripts/adversarial-review.mjs <id> [--dry-run] [--emit-prompt] [--json]
     [--reviewer-model <id>] [--runner claude|codex|cursor-agent] [--allow-same-family]
```

### How `/adversarial-review` picks things

- **Skill**: `ai-hero → code-review` (two-axis Standards + Spec), `superpowers → requesting-code-review`
  (`code-reviewer.md` template). `config.reviewSkills`.
- **Reviewer model**: `--reviewer-model` > `reviewer_model` in handoff.md > `config.reviewerFor[implementation_model]`
  > `config.defaultReviewer`. Exit 1 if it equals the implementation model (after normalising provider
  prefixes and date suffixes) or shares its family while `forbidSameFamily` is on.
- **Runner**: first `config.runners` entry whose `match` is the reviewer's family (`claude` → `claude -p`,
  `gpt` → `codex exec`), else `*` (`cursor-agent -p`). No runner installed? `--emit-prompt` writes the prompt
  to `execution/reviews/` to paste into a session using the reviewer model.

### Free local reviewer (no account, no API key)

Run an open-weight model on your machine with [Ollama](https://ollama.com) (open source):

```bash
ollama serve &                       # or the desktop app
ollama pull qwen2.5-coder:7b         # 3b if RAM is tight; any non-Claude family for a Claude implementer
node .openspec-handoff/scripts/adversarial-review.mjs <id> --reviewer-model qwen2.5-coder:7b
```

`qwen*` models route to the `ollama` runner (`scripts/runners/ollama.mjs`, local HTTP API, `OLLAMA_HOST`,
`OLLAMA_NUM_CTX`). Because a plain model can't open files, that runner sets `inlineContext: true` and the change's
proposal, deltas, the tool's design/plan, tasks and full diff are pasted into the prompt. Add other local families (`llama`,
`deepseek` are pre-declared) by adding a runner with the matching `match`. The same-model / same-family guard
applies (a qwen implementer can't be reviewed by qwen). Each review file records runner, timing and a parsed
`verdict` (`APPROVE`, `REQUEST_CHANGES`, or `unparsed`). Small CPU models produce shaky reviews - triage findings
before acting on them (the example's `execution/reviews/triage.md` shows a 3B model's false positives).

## Develop / test

```bash
npm install            # installs @fission-ai/openspec 1.14.1 locally for the tests
npm test               # 49 tests: lint rules incl. paraphrase detection, review selection, fake-runner review, real CLI, e2e
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
