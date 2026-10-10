# Keeping changes PR-sized

One OpenSpec change = one handoff = one branch = one PR. The whole workflow assumes it:
`openspec validate --strict`, `/opsx:verify`, and `/adversarial-review` all read the *entire*
change (proposal, deltas, the execution tool's design/plan/tickets, diff) at once. When a change outgrows a
reviewer's context, verification degrades silently: findings get shallower, not louder.

## Budget

| Measure | Budget (warning above) | Hard limit (`check-handoff` fails above) | Where it's measured |
|---|---|---|---|
| Requirements in the spec deltas (`### Requirement:`) | 5 | 8 | `specs/**/spec.md` in the change |
| Tickets (AI Hero) / plan tasks (Superpowers, `### Task N`) | 8 | 12 | `execution/tickets/*.md`, `execution/plan-<id>.md` |
| Changed lines since `base_ref` (added + deleted, code and tests, untracked files included) | 400 | 800 | `git diff --numstat <base_ref>`, limited to `diff_paths`, excluding `openspec/` |
| Changed files since `base_ref` | 15 | 25 | same |

Thresholds live in `.openspec-handoff/config.json` → `sizeThresholds` (`[soft, hard]`). Change them per
project, not per change. Check any time with:

```bash
node .openspec-handoff/scripts/check-handoff.mjs <change-id>          # human output, exit 1 on hard-limit breach
node .openspec-handoff/scripts/check-handoff.mjs <change-id> --json   # metrics for scripts
```

## When to check

1. **Proposal** - the schema's `proposal` instruction requires a *Size Budget* section with estimates
   and a split decision. This is the cheapest moment to split.
2. **Handoff** - the `openspec-handoff` skill refuses to hand off an over-budget proposal.
3. **Execution** - `to-tickets` / `writing-plans` wrappers cap tickets/tasks at 8 (hard 12).
4. **Before review** - `check-handoff` measures the real diff against `base_ref`.

## When to split

Split when any of these is true - even if the numbers are under budget:

- The proposal's *What Changes* has bullets that could ship (and be reverted) independently.
- The deltas touch more than one capability *and* the capabilities don't need each other to be useful.
- A ticket/plan task is "and also refactor X" - prefactors are their own change (often `skip_specs: true`).
- You can't name a single reviewer who could hold the whole diff in their head.
- Execution discovered new behavior: that's a new requirement, so a new (or updated) change - not a ticket.

## How to split

- **By capability slice**: `add-export-core` (data + API) then `add-export-ui`. Each has its own deltas.
- **Expand → migrate → contract** for wide refactors (same pattern AI Hero `to-tickets` uses): expand
  change, N migrate changes sized by blast radius, contract change.
- **By scenario group**: happy path first, error handling / edge scenarios second - only when the first
  slice is still correct and shippable on its own.
- Name slices so order is obvious, and say "slice k of n (ids)" in each proposal's *Split decision*.
- Each slice gets its own handoff; they may use different tools/models.
- Mid-execution overflow: stop, finish the tickets that fit, move the remaining requirements into a new
  change (`/opsx:new`), and remove them from this change's deltas before `/opsx:verify`.

## How this relates to validate and verify

| Command | What it checks | Size sensitivity |
|---|---|---|
| `openspec validate <id> --strict` (CLI) | Structure of the deltas: headers, ≥1 scenario per requirement, Purpose length, ≤500-char requirement descriptions | Low - structural; passes on huge changes too |
| `/opsx:verify <id>` (agent workflow, opt-in via `openspec config profile`; there is **no** `openspec verify` CLI command in 1.14.1) | Completeness (tasks ticked, every requirement implemented), correctness (code matches scenarios), coherence (code patterns; Design Adherence is *Not applicable* because the handoff-driven schema has no design artifact - design is reviewed by the execution tool) | High - an agent must read every artifact plus the code |
| `check-handoff` (this toolkit) | Handoff fields, reference-not-duplicate, outputs inside the change folder, size budget | Enforces the budget |
| `/adversarial-review` (this toolkit) | A different model reviews the diff against the deltas | High - same as verify |

Run order: `check-handoff` → `/adversarial-review` → fix → `openspec validate --strict` → `/opsx:verify` (report saved to `execution/verify.md`) → `/opsx:archive` (agent-driven sync) after merge.

## Small changes that don't need the full ceremony

- **No behavior change** (refactor, tooling, docs): set `skip_specs: true` in the change's
  `.openspec.yaml`; the deltas are empty and `check-handoff` only warns.
- **Design**: OpenSpec has no design step. For a trivial change the execution tool's design can be a short
  a short `execution/grill.md` grilling record + a short `execution/spec.md` (AI Hero) or a short `execution/brainstorm.md` + the plan's Architecture line (Superpowers).
- **One-ticket changes**: `to-tickets` / `writing-plans` with a single ticket/task is fine.

## Project-level reinforcement (optional)

Add rules to `openspec/config.yaml` so every artifact instruction repeats the budget:

```yaml
rules:
  proposal:
    - Include a Size Budget section; split if over 5 requirements / 8 tickets / 400 changed lines
  handoff:
    - Record the Size Budget; at most 8 tickets / plan tasks
```
