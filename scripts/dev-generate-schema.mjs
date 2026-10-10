import fs from 'node:fs';
// Dev-only: regenerates schemas/handoff-driven/schema.yaml from the installed OpenSpec's spec-driven schema.
// Usage: npm install && node scripts/dev-generate-schema.mjs
//
// Clean handoff (docs/decisions.md C1): OpenSpec owns ONLY proposal + delta specs.
// Design and implementation belong to the execution tool and live in execution/.
// Artifacts: proposal -> specs -> handoff (no tasks: progress is the tool's). No design artifact, so
// /opsx:verify reports Design Adherence as "Not applicable" (its own rule for
// schemas without a design artifact) instead of "Not verified".
import { parse, stringify } from 'yaml';
const base = parse(fs.readFileSync(new URL('../node_modules/@fission-ai/openspec/schemas/spec-driven/schema.yaml', import.meta.url), 'utf8'));
const by = Object.fromEntries(base.artifacts.map((a) => [a.id, a]));
const replaceOnce = (text, from, to) => {
  if (!text.includes(from)) throw new Error(`upstream text changed, update dev-generate-schema.mjs: ${from}`);
  return text.replace(from, to);
};

const proposal = { ...by.proposal };
proposal.instruction = `Handoff-driven - DESIGN SESSION FIRST (before writing proposal.md):
1. Resolve the execution tool chosen in the setup phase: \`/tool <change>\`
   (runs \`node .openspec-handoff/scripts/sdd.mjs tool <change>\`; project default in
   .openspec-handoff/project.json; a per-change override is recorded with
   \`/tool <change> --set <ai-hero|superpowers>\`; \`/tool <change>\` starts the session file
   when it is missing, for the default as for --set).
   No tool set: ask the user once, then record it with --set.
2. Run that tool's design session - the "Design session" part of its wrapper skill:
   - ai-hero -> skill \`openspec-handoff-ai-hero\`: grill-with-docs -> execution/grill.md
   - superpowers -> skill \`openspec-handoff-superpowers\`: brainstorming -> execution/brainstorm.md
     (the written design goes there, not docs/superpowers/specs/). STOP brainstorming
     after the written design is approved: do NOT invoke writing-plans - planning is the
     engineer's first next step after /handoff. Control returns here.
3. Then write proposal.md from the session, WHAT and WHY only: no decisions,
   file layouts, algorithms or code - those stay in the session file.
   Behaviours the session surfaced become requirements/scenarios in the delta (next artifact).
Switching tools after the session ran means redoing the session (.openspec-handoff/switching-tools.md).

` + replaceOnce(replaceOnce(by.proposal.instruction,
  'implementation details belong in design.md.',
  'design and implementation details belong to the execution tool\n(its design session file in execution/), not to OpenSpec.'),
  'This is the foundation - specs, design, and tasks all build on this.',
  'This is the foundation - the specs, and everything the execution tool plans, build on this.') + `
Handoff-driven addition - **Size Budget** section (required):
State the expected size of this change so it stays PR-sized: number of
requirements in the deltas, expected tickets/plan tasks, and a rough
changed-lines estimate. Default budget (see .openspec-handoff/small-changes.md):
<= 5 requirements and <= 2 capabilities (checked by /split-check at the end of the
specs stage), ~300 changed lines of code + tests (estimated after planning by
/spec-check; that estimate is the only line check). Do not split by hand here: the
split gate proposes slices for the engineer when the requirements exist.
`;

const specs = { ...by.specs };
specs.instruction = replaceOnce(by.specs.instruction,
  '- Detailed execution plans (those belong in design.md or tasks.md)',
  '- Detailed execution plans and design (the execution tool writes those to execution/)') + `
Handoff-driven addition: a NEW capability's delta starts with \`## Purpose\`
(one or two sentences, 50+ characters) before \`## ADDED Requirements\` - archive
copies it into the new main spec; without it the main spec gets a "TBD" purpose.
Every scenario listed under "Scenarios found" in the design session file
(execution/grill.md or execution/brainstorm.md) becomes a requirement or scenario here;
the decisions stay in the session file.
The delta is the ONLY place behaviour is written down.
After /handoff, execution artifacts cite requirements and scenarios by name and
link (\`../specs/<capability>/spec.md\` - "Requirement: <name>"), so give every
requirement and scenario a short, distinctive name.

SPLIT GATE - run automatically when the deltas are written, before /handoff (rerunnable):
\`/split-check <change>\` (\`node .openspec-handoff/scripts/split-check.mjs <change> --write\`).
It counts requirements and capabilities (no line estimate here - that comes after
planning, in /spec-check, from the tool's tickets / plan; budget ~300 lines).
1. Up to 5 requirements and 2 capabilities it prints one line ("fits") - carry on to /handoff.
2. Above (a warning, never a failure): propose slices in execution/split-proposal.md
   (slice part + order, goal, capabilities, requirements, depends_on, flag if any - the
   /split-check command lists the format), show them to the engineer and STOP until they
   approve or edit (approved_by:). Nothing is split automatically. After approval: commit
   the deltas (that commit is the loss-check baseline), then \`/split-apply <change>\` turns
   this change into the parent (schema split-plan: a control plane with no requirement
   names) and creates one handoff-driven child per slice, named
   \`<change>-<nn>-<slice>\` (nn = two-digit order; the flag cleanup slice uses 99);
   then \`split.mjs loss <parent>\` must pass. A feature flag is not part of the
   original delta: the flagged slice adds its requirement (split note "added:") and the
   cleanup slice removes it (REMOVED Requirements).
   See .openspec-handoff/small-changes.md.
`;

const handoff = {
  id: 'handoff',
  generates: 'handoff.md',
  description: 'Records which execution tool takes over, and where it writes',
  template: 'handoff.md',
  instruction: `LAST STAGE of this schema. Create it with the \`openspec-handoff\` skill
(\`/handoff <change>\`). The execution tool was chosen in
the setup phase (or overridden per change) and its design session already ran in
the proposal phase (execution/grill.md for ai-hero, execution/brainstorm.md for
superpowers); \`/tool <change>\` resolves it (per-change override, else the
project default).

The handoff stage writes handoff.md and ENDS by printing the
next steps for the tool - \`node .openspec-handoff/scripts/next-steps.mjs <change>\`
(reprint: \`/next-steps <change>\`) - WITHOUT running them. Planning (AI Hero to-spec + to-tickets, or Superpowers
writing-plans), /spec-check, implementation, the tool's code review, /opsx:verify
and /opsx:archive are the engineer's next steps, run through the tool's wrapper
skill. The code review is the tool's own review step (CI also reviews the PR). There is no OpenSpec tasks artifact: progress lives in the tool's own
tracking (ticket Status/checkboxes, plan step checkboxes).

handoff.md is the contract between OpenSpec (requirements) and the
execution tool (AI Hero or Superpowers). It is a pointer document, not a spec.

Front matter (YAML, all keys required unless marked optional):
- \`change\`: this change id (folder name).
- \`tool\`: \`ai-hero\` or \`superpowers\` - must match the design session file
  (exactly one session file; \`/tool <change>\` reports the tool to write).
- \`harness\` (optional): the coding agent harness (claude-code, cursor, codex, opencode, or other); may be omitted.
- \`base_ref\`: git commit SHA the implementation starts from
  (\`git rev-parse HEAD\` at handoff). Used for review diffs.
- \`execution_dir\`: always \`execution/\`.
- \`apply_mode\`: the tool's own implement command the engineer runs instead of
  /opsx:apply - ai-hero: \`implement\` | \`implement-spec\`; superpowers:
  \`executing-plans\` | \`subagent-driven-development\`.

Body rules - REFERENCE, DON'T DUPLICATE:
- Link to \`proposal.md\` and every \`specs/<capability>/spec.md\` delta. Do NOT
  restate requirements, scenarios, or SHALL/MUST text; the deltas are the only
  source of behavioral requirements.
- To point at one requirement or scenario, cite it by name with a link:
  \`[specs/<capability>/spec.md](specs/<capability>/spec.md) - "Requirement: <name>"\`.
- Link the design session file and list the execution artifacts the tool will
  write, all under \`execution/\`.
- Record the Size Budget numbers from the proposal and the split decision.

Execution outputs must NOT be written to the tools' default locations
(\`.scratch/\`, \`docs/superpowers/plans/\`, \`docs/superpowers/specs/\`).
After planning, \`/spec-check <change>\` is the plan-vs-spec check.`,
  requires: ['specs'],
};

const schema = {
  name: 'handoff-driven',
  version: 4,
  description: 'OpenSpec owns proposal + delta specs only; the execution tool (AI Hero or Superpowers, chosen at setup) runs its design session in the proposal phase and owns design and implementation via a recorded handoff - proposal → specs → handoff',
  artifacts: [proposal, specs, handoff],
  apply: {
    // Kept (optional in OpenSpec 1.14.1) so /opsx:apply and \`openspec instructions apply\`
    // point engineers at the tool's command. No \`tracks\`: OpenSpec does no task tracking.
    requires: ['handoff'],
    instruction: `This workflow does not implement through /opsx:apply. Run
\`/next-steps <change>\` and follow it: planning,
/spec-check and implementation run with the execution tool's own commands
(handoff.md tool + apply_mode: ai-hero implement | implement-spec; superpowers
executing-plans | subagent-driven-development) through its wrapper skill
(openspec-handoff-ai-hero or openspec-handoff-superpowers). Progress is tracked by the tool
(ticket Status/checkboxes, plan step checkboxes), not by OpenSpec.
Requirements come only from the spec deltas; if the code needs behavior the
deltas don't describe, stop and update the proposal/specs first.`,
  },
};
const header = `# handoff-driven schema for OpenSpec (tested with @fission-ai/openspec 1.14.1)
# Forked from the built-in spec-driven schema: proposal/specs instructions are upstream's
# with design.md references redirected to the execution tool, plus a Size Budget note.
# There is deliberately NO design artifact: design is owned by the execution tool.
# handoff is new; there is no tasks artifact (progress is the execution tool's). Generated by scripts/dev-generate-schema.mjs - do not hand-edit.
# Install: copy or symlink this folder to <project>/openspec/schemas/handoff-driven/
`;
fs.writeFileSync(new URL('../schemas/handoff-driven/schema.yaml', import.meta.url), header + stringify(schema, { lineWidth: 0, blockQuote: 'literal' }));
