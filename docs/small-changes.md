# Keeping changes PR-sized

One OpenSpec change = one handoff = one branch = one PR. The whole workflow assumes it:
`openspec validate --strict`, `/opsx:verify`, and the tool's code review all read the *entire*
change (proposal, deltas, the execution tool's design/plan/tickets, diff) at once. When a change outgrows a
reviewer's context, verification degrades silently: findings get shallower, not louder.

## Budget (warn-only)

Size never fails a change. It is checked at two points and only warns:

| Point | What is measured | Budget | Tool |
|---|---|---|---|
| 1. **Split gate** - end of the specs stage, before handoff (automatic, rerunnable) | Requirements and capabilities in the deltas (counted, no estimate) | ≤ 5 requirements, ≤ 2 capabilities | `/sdd-split-check <id>` → `execution/split-check.md` |
| 2. **Line estimate after planning** | `Estimate: ~N lines` per AI Hero ticket / Superpowers plan task, summed | ~300 lines of code + tests | `/sdd-spec-check <id>` ("Size" section) |

Thresholds: `.openspec-handoff/config.json` → `split.maxRequirements`, `split.maxCapabilities` (gate),
`split.limitLines` (estimate after planning). The real PR diff is not measured by this toolkit (decisions section 16).
Over budget after planning: re-split the change with `/sdd-split-check <id>`; a slice is re-split into its existing parent and `/sdd-split-apply` builds the new slice ids (continuing the numbering).

## Splitting a change (the gate)

Over 5 requirements or 2 capabilities, `/sdd-split-check` asks the agent to **propose slices**; the engineer
approves or edits them. Nothing is split automatically.

1. **Proposal** - `execution/split-proposal.md` (`approved_by:` empty until approval), one block per slice:

   ```markdown
   ### Slice: core
   - order: 01
   - goal: Weekly digest content
   - capabilities: digest
   - requirements: Digest content; Digest schedule
   - depends_on: none
   - flag: none
   ```

   The proposal lists only the slice part (`core`) and its two-digit `order`; `/sdd-split-apply` names the
   child `<parent>-<nn>-<slice>` (`add-digest-01-core`; the flag cleanup slice always gets `99`, e.g.
   `add-digest-99-remove-flag`). A full id that does not follow the convention is refused with the expected
   name; `depends_on` may use slice parts. Names get long and the archive adds a date prefix
   (`archive/2026-10-10-add-digest-01-core/`): keep the parent id and the slice part short.
   `split: <original> -> <new name> [<scenario>; ...]` cuts one requirement in two. `flag:` only when the
   slice gates user-visible behaviour; then a cleanup slice (`removes_flag: <flag>`, depending on the
   flagged slice) is always planned. The flag requirement is not in the original delta: the flagged slice
   adds it (split note `added:`), the cleanup slice removes it (`## REMOVED Requirements`). `/sdd-split-apply` scaffolds
   both: the flagged slice gets `Requirement: Feature flag <flag>` (with `TODO(agent: ...)` placeholders the agent fills) and
   its `added:` note; the `-99-` slice gets the REMOVED block. The 99 slice needs no split note (its removal is the plan, not
   a difference from the original).
2. **Approval** - the engineer sets `approved_by:` (or edits the slices). `/sdd-split-check` shows the slices,
   which are ready first and which pairs can run in parallel.
3. **Commit the deltas, then apply** - the commit holding the original deltas is the loss-check baseline.
   `/sdd-split-apply <id>` refuses while the deltas are uncommitted, then:
   - the original change becomes the **parent** (schema `split-plan`, artifacts proposal → slices), a
     **control plane**: `proposal.md` (why and scope) and `slices.md` with front matter
     `parent / approved_by / split_at / split_commit` and one block per slice: id, goal, capabilities,
     depends_on, flag (or removes_flag), ticket, status. **No requirement or scenario names** and no behaviour
     (the loss check fails on any original name in the parent's proposal.md, slices.md or tickets/). The shared design session (`execution/grill.md` / `brainstorm.md`) stays in the parent because the slices read it; it was written before the split and names behaviour, so the loss check only reports it (warning) - never update it after the split. Its
     `specs/` and `execution/split-proposal.md` are removed; OpenSpec sets `skip_specs: true`.
   - one **child** change per slice (schema `handoff-driven`) with the original requirement blocks copied
     verbatim into live deltas (exact names; `## Purpose` for new capabilities) and an empty
     `## Split notes` section in its proposal.md. A requirement cut in two carries
     `<!-- split_from: <original name> -->` under its header. Each slice proposal gets a `## Size Budget`
     (requirements, capabilities, expected tickets, estimated lines, `Split decision: slice of <parent>`), and the
     parent proposal's `Split decision:` line is updated to `split into N slices (ids) - see slices.md`.
4. **Split notes** - every deliberate difference from the original lives in the proposal of the child that
   made it, never in the parent. A note is needed only for **renames, drops, adds and splits** of a requirement or
   scenario - rewording text under an unchanged name needs none (the loss check matches names):

   ```markdown
   ## Split notes
   - dropped: Scenario "Empty input" - covered by the CLI usage error
   - added: Requirement "Stats flag" - gates the command until the cleanup slice
   - renamed_from: Requirement "Word count" -> "Word counting" - same behaviour, clearer name
   - split_from: Requirement "Digest content" - confirmed
   ```

5. **Loss check** - `split.mjs loss <parent>`. Baseline = the original change's deltas at `split_commit`
   (`git show`, so nothing has to be copied). Every original requirement and scenario is in **exactly one**
   child or covered by a split note; it fails on missing, duplicate and unsourced (a child requirement or
   scenario that is not an original name, a confirmed `split_from`, a `renamed_from` target or `added`).
   **Renames:** when an original name has no match, the report lists the unmatched originals next to the
   child names that have no original ("Possible renames"). The agent judges semantic equivalence: an
   equivalent pair is recorded as `renamed_from` and passes; otherwise the original is missing until it is
   restored or recorded as `dropped`.
6. **One planning PR** - parent + all children (proposal + specs only, no handoff) committed together.
   `/sdd-split-next <parent>` writes `tickets/<slice>.md` (Jira-pasteable, no requirement
   names) for READY slices.
7. **Slices** - a slice is READY when all its `depends_on` are done; **done = the child's archived folder is
   on main**. Two slices are **parallel-safe** only when neither depends on the other (transitively) and
   they share no capability (not files: `/sdd-split-next` warns, best effort, when both slices' planning names the same
   code path; such slices merge with conflicts - consider doing them one after the other). To take a slice: `/sdd-slice-start <slice>` (finds the parent, refuses unless READY;
   `--undo` releases it), committed on main - **in progress is a manual mark**; the next report trusts it and does not scan branches. Then a
   branch from main, a short design session narrowed to the slice (reading the parent's
   `execution/grill.md` / `brainstorm.md`), `/sdd-handoff <slice>`, and the usual flow. After `/opsx:verify <slice>` (report in `execution/verify.md`;
   Superpowers also `execution/progress.md`), `/sdd-slice-finish <slice>` (instead of `/opsx:archive`) runs on the slice
   branch: it refuses a non-slice, a slice not in progress, a missing verify / progress file, or open work (a ticket not
   `Status: done`, an unticked plan step, CRITICAL issues in verify.md, a leftover `TODO(agent:` placeholder in its deltas), runs `openspec archive
   <slice> -y`, writes `status: done` in the parent's `slices.md` and prints the commit line. The archive is **committed in
   the slice's own PR with its code**; after the merge, `/sdd-split-next <parent>` on main.
8. **Parent last** - when every slice is done: `/sdd-split-finish <parent>` runs `split.mjs finalize <parent>` (stops unless every slice is archived, marks them done, `loss --final`)
   (also checks the final names against the main specs), then `openspec archive <parent> --skip-specs -y`
   (must not sync specs; `/opsx:archive` cannot pass `--skip-specs`).
   Never run `/opsx:verify` on a parent.
9. **Undo** (the whole parent only; no per-slice undo) - `/sdd-split-undo <parent>` puts the original change back exactly as it was at `split_commit` (the first
   split, so re-splits are undone too) and removes `slices.md`, `tickets/` and every slice folder listed in `slices.md`.
   Nothing is committed: review `git status`, commit on main, then `/sdd-split-check <id>` again or continue unsplit.
   Refused when a slice is archived, the parent is archived, `split_commit` is unknown, or `openspec/changes` has
   uncommitted changes; a slice in progress needs `--force` (someone may be working on it). Files added to the parent
   after `split_commit` are listed (still in git history).

Changing the plan later: edit the child delta, add the split note to that child's proposal, rerun
`split.mjs loss <parent>`, then the one order: edit the delta -> `openspec validate <id> --strict` -> `/sdd-spec-check <id>` (its "Spec changes since the last check" section lists what changed since the last accepted PASS and the tickets / tasks citing it; the list stays on every run until a PASS is accepted) -> re-plan ONLY the open units it names (done units are never touched; a change affecting done work becomes a new ticket / task; the planning output notes `superseded by delta edit: <reason>`, the design session file stays as-is) -> `/sdd-spec-check` until PASS, which it accepts (`--accept`); commit `execution/.spec-check.json` with the planning files. (`git diff HEAD` shows a done ticket that was overwritten.)

`sdd-pp init` adds `openspec/changes/**/slices.md merge=union` to `.gitattributes` (two parallel `/sdd-slice-start`
commits); `split.mjs loss` warns if a union merge left a slice field twice.

**Re-split**: run `/sdd-split-check <slice>` on a slice that turns out too big (more requirements, or over the
line estimate after planning); `/sdd-split-apply <slice>` replaces it in the **same** parent (no nested
parents), numbers the new slices after the parent's highest (`-03-`, `-04-`, ...), rewires `depends_on`, and carries the old slice's split notes into the new children.

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
| `/sdd-spec-check <id>` (this toolkit; the only plan-vs-spec check) | Requirement links (every story / ticket / task names a real requirement), coverage, and an agent review for missing / invented / contradicted behaviour and restated requirement text (advisory) | Line estimate after planning (warn-only) |
| The tool's own code review (plus CI's review on the PR) | `code-review` / `requesting-code-review` reviews the diff against the deltas | High - same as verify |

Run order: the tool's own completion (ticket Status / ledger) → the tool's own code review (CI also reviews the PR) → fix → `/opsx:verify` (report saved to `execution/verify.md`) → `/opsx:archive` (agent-driven sync).

## Small changes that don't need the full ceremony

- **No behavior change** (refactor, tooling, docs): set `skip_specs: true` in the change's
  `.openspec.yaml`; the deltas are empty.
- **Design**: OpenSpec has no design step. For a trivial change the execution tool's design can be a short
  a short `execution/grill.md` grilling record + a short `execution/spec.md` (AI Hero) or a short `execution/brainstorm.md` + the plan's Architecture line (Superpowers).
- **One-ticket changes**: `to-tickets` / `writing-plans` with a single ticket/task is fine.

## Project-level reinforcement (optional)

Add rules to `openspec/config.yaml` so every artifact instruction repeats the budget:

```yaml
rules:
  proposal:
    - Include a Size Budget section (<= 5 requirements, <= 2 capabilities, ~300 changed lines of code + tests); /sdd-split-check counts after the specs, /sdd-spec-check estimates lines after planning
  handoff:
    - Record the Size Budget; at most 8 tickets / plan tasks
```
