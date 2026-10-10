# Keeping changes PR-sized

One OpenSpec change = one handoff = one branch = one PR. The whole workflow assumes it:
`openspec validate --strict`, `/opsx:verify`, and `/adversarial-review` all read the *entire*
change (proposal, deltas, the execution tool's design/plan/tickets, diff) at once. When a change outgrows a
reviewer's context, verification degrades silently: findings get shallower, not louder.

## Budget (warn-only)

Size never fails a change. It is checked at three points and only warns:

| Point | What is measured | Budget | Tool |
|---|---|---|---|
| 1. **Gate** - end of the specs stage, before handoff (automatic, rerunnable) | The agent's estimate per delta requirement (changed lines of code + tests, from its scenarios and the code it touches) | ~300 lines | `/split-check <id>` → `execution/size-estimate.md`, `execution/split-check.md` |
| 2. **Re-estimate after planning** | `Estimate: ~N lines` per AI Hero ticket / Superpowers plan task, summed | ~300 lines | `/spec-check <id>` ("Size" section) |
| 3. **Real PR diff** | Changed lines/files since `base_ref`: code + tests; lockfiles, generated output (`dist/`, `build/`, `*.min.js`, `*.generated.*`, snapshots...), `openspec/` and installed tooling excluded | lines 300 (louder above 600), files 15 (25) | `check-handoff <id>` |
| (also) | Requirements in the deltas / tickets or plan tasks | 5 (8) / 8 (12) | `check-handoff <id>` |

Thresholds: `.openspec-handoff/config.json` → `split.limitLines` (gate and re-estimate) and `sizeThresholds`
(`[budget, well-over]`, both warnings).

## Splitting a change (the gate)

Over ~300 estimated lines, `/split-check` asks the agent to **propose slices**; the engineer approves or edits
them. Nothing is split automatically.

1. **Proposal** - `execution/split-proposal.md` (`approved_by:` empty until approval), one block per slice:

   ```markdown
   ### Slice: add-digest-core
   - goal: Weekly digest content
   - capabilities: digest
   - requirements: Digest content; Digest schedule
   - depends_on: none
   - flag: none
   - estimate: 160
   ```

   `split: <original> -> <new name> [<scenario>; ...]` cuts one requirement in two. `flag:` only when the
   slice gates user-visible behaviour; then a cleanup slice (`removes_flag: <flag>`, depending on the
   flagged slice) is always planned. Optional `## Amendments`.
2. **Approval** - the engineer sets `approved_by:` (or edits the slices). `/split-check` shows the slices,
   which are ready first and which pairs can run in parallel.
3. **Apply** - `node .openspec-handoff/scripts/split.mjs apply <id>`:
   - the original change becomes the **parent** (schema `split-plan`, artifacts proposal → slices):
     `proposal.md` (unchanged) and `slices.md` = slices (id, goal, capabilities, requirements,
     depends_on, flag, estimate, ticket), a **checklist of the original requirement and scenario names**
     (no behaviour text), and amendments. Its `specs/` is removed; OpenSpec sets `skip_specs: true`.
   - one **child** change per slice (schema `handoff-driven`) with the original requirement blocks copied
     verbatim into live deltas (exact names; `## Purpose` for new capabilities). A requirement cut in two
     carries `<!-- split_from: <original name> -->` under its header.
4. **Loss check** - `split.mjs loss <parent>`: every original requirement and scenario is in **exactly one**
   child or covered by an amendment; fails on missing, duplicate and unsourced (a child requirement that is
   not an original name, a confirmed split, or an `added in <slice>` amendment). A `split_from` needs the
   agent to confirm the children together cover the original, recorded as
   `- Requirement "<name>" split into "<A>", "<B>" - confirmed`.
5. **One planning PR** - parent + all children (proposal + specs only, no handoff) committed together.
   `split.mjs next <parent> --write-tickets` writes `tickets/<slice>.md` (Jira-pasteable) for READY slices.
6. **Slices** - a slice is READY when all its `depends_on` are archived. Two slices are **parallel-safe**
   only when neither depends on the other (transitively) and they share no capability. Each engineer branches
   from main per slice, runs a short design session narrowed to the slice (reading the parent's
   `execution/grill.md` / `brainstorm.md`), `/handoff <slice>`, and the usual flow to `/opsx:archive`. Then
   `split.mjs next <parent> --write-tickets` again.
7. **Parent last** - when every slice is archived: `split.mjs loss <parent> --final --write` (original names vs
   the main specs and the archived children; ticks the checklist), then
   `openspec archive <parent> --skip-specs --yes` (must not sync specs). Never run `/opsx:verify` on a parent.

**Amendments** are the only way the plan changes after the split; behaviour is never edited in the parent:

```markdown
- Requirement "<name>" dropped: <why>
- Requirement "<name>" changed, see change <id>
- Requirement "<name>" added in <slice>: <why>        (e.g. the feature-flag requirement)
- Scenario "<name>" dropped: <why> | added in <slice>: <why>
```

Edit the child delta, add the amendment, rerun `split.mjs loss <parent>`, then update the tool files
(rerun the planning command, then `/spec-check`).

**Re-split**: run `/split-check <slice>` on a slice that turns out too big; `split.mjs apply <slice>` replaces it
in the **same** parent (no nested parents) and rewires `depends_on`.

## When to split

Even under budget, split when:

- The proposal's *What Changes* has bullets that could ship (and be reverted) independently.
- The deltas touch more than one capability *and* the capabilities don't need each other to be useful.
- A ticket/plan task is "and also refactor X" - prefactors are their own change (often `skip_specs: true`).
- Execution discovered new behavior: that's a new requirement, so a new (or updated) change - not a ticket.

Slice shapes: by capability (`-core` then `-ui`), expand → migrate → contract for wide refactors, or happy
path first and edge scenarios second (only if the first slice is correct and shippable alone).

## How this relates to validate and verify

| Command | What it checks | Size sensitivity |
|---|---|---|
| `openspec validate <id> --strict` (CLI) | Structure of the deltas: headers, ≥1 scenario per requirement, Purpose length, ≤500-char requirement descriptions | Low - structural; passes on huge changes too |
| `/opsx:verify <id>` (agent workflow, opt-in via `openspec config profile`; there is **no** `openspec verify` CLI command in 1.14.1) | Completeness (task tracking: *Not applicable* with this schema; every requirement implemented), correctness (code matches scenarios), coherence (code patterns; Design Adherence is *Not applicable* because the handoff-driven schema has no design artifact - design is reviewed by the execution tool) | High - an agent must read every artifact plus the code |
| `check-handoff` (this toolkit) | Handoff fields, reference-not-duplicate, outputs inside the change folder, size budget | Warns on the budget (never fails on size) |
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
    - Include a Size Budget section (~300 changed lines of code + tests); /split-check gates it after the specs
  handoff:
    - Record the Size Budget; at most 8 tickets / plan tasks
```
