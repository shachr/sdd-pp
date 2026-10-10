import fs from 'node:fs';
// Dev-only: regenerates schemas/handoff-driven/schema.yaml from the installed OpenSpec's spec-driven schema.
// Usage: npm install && node scripts/dev-generate-schema.mjs
import { parse, stringify } from 'yaml';
const base = parse(fs.readFileSync(new URL('../node_modules/@fission-ai/openspec/schemas/spec-driven/schema.yaml', import.meta.url),'utf8'));
const by = Object.fromEntries(base.artifacts.map(a=>[a.id,a]));
const proposal = {...by.proposal};
proposal.instruction = by.proposal.instruction + `
Handoff-driven addition - **Size Budget** section (required):
State the expected size of this change so it stays PR-sized: number of
requirements in the deltas, expected tickets/plan tasks, and a rough
changed-lines estimate. Default budget (see docs/small-changes.md):
<= 5 requirements, <= 8 tickets/plan tasks, <= 400 changed lines.
If the estimate exceeds the budget, split now: create one change per
independently shippable capability slice (e.g. \`add-x-core\`, \`add-x-cli\`)
and say which change this one is. Do not defer splitting to execution.
`;
const handoff = {
  id: 'handoff',
  generates: 'handoff.md',
  description: 'Records which execution tool and implementation model take over, and where they write',
  template: 'handoff.md',
  instruction: `Create handoff.md: the contract between OpenSpec (requirements) and the
execution tool (AI Hero or Superpowers). It is a pointer document, not a spec.

Front matter (YAML, all keys required unless marked optional):
- \`change\`: this change id (folder name).
- \`tool\`: \`ai-hero\` or \`superpowers\`.
- \`implementation_model\`: exact model id that will write the code
  (e.g. \`claude-sonnet-4-5\`, \`gpt-5-codex\`). Ask the user if unknown;
  never leave a placeholder.
- \`harness\` (optional): agent harness running the model (claude-code, cursor, codex).
- \`base_ref\`: git commit SHA the implementation starts from
  (\`git rev-parse HEAD\` at handoff). Used for size checks and review diffs.
- \`execution_dir\`: always \`execution/\`.
- \`reviewer_model\` (optional): pin the adversarial reviewer. Must differ
  from implementation_model; otherwise /adversarial-review picks one.

Body rules - REFERENCE, DON'T DUPLICATE:
- Link to \`proposal.md\`, every \`specs/<capability>/spec.md\` delta, and
  \`design.md\`. Do NOT restate requirements, scenarios, or SHALL/MUST text;
  the deltas are the only source of behavioral requirements.
- If you need to point at one requirement, link it by name:
  \`specs/<capability>/spec.md#requirement-<slug>\`.
- List the execution artifacts the tool will write, all under \`execution/\`
  (see the template's table for each tool's paths).
- Record the Size Budget check result (copy numbers, not prose, from the
  proposal's Size Budget) and the split decision.

Execution outputs must NOT be written to the tools' default locations
(\`.scratch/\`, \`docs/superpowers/plans/\`, \`docs/superpowers/specs/\`).
Run \`node .openspec-handoff/scripts/check-handoff.mjs <change>\` after writing; it must pass.`,
  requires: ['specs', 'design'],
};
const execution = {
  id: 'execution',
  generates: 'execution/**/*.md',
  description: 'Execution artifacts written by AI Hero or Superpowers (spec, tickets, plan, progress, reviews)',
  template: 'execution.md',
  instruction: `Run the execution tool named in handoff.md and redirect its outputs into
\`execution/\` inside this change folder. Use the matching wrapper skill:
- tool: ai-hero -> skill \`openspec-handoff-ai-hero\`
  (to-spec -> execution/spec.md, to-tickets -> execution/tickets/NN-<slug>.md)
- tool: superpowers -> skill \`openspec-handoff-superpowers\`
  (writing-plans -> execution/plan.md, ledger summary -> execution/progress.md)

Every execution artifact MUST start with a "Source of truth" line linking
\`../proposal.md\` (or \`../../proposal.md\` from a subfolder) and the spec
deltas it implements, and MUST NOT copy requirement text, scenarios, or
SHALL/MUST sentences from the deltas. Implementation and testing
decisions, file paths, and step lists are fine - that is what execution
artifacts are for.

Keep the breakdown PR-sized: at most 8 tickets / plan tasks (hard cap 12).
If it does not fit, stop and split the change (docs/small-changes.md).`,
  requires: ['handoff'],
};
const tasks = {
  id: 'tasks',
  generates: 'tasks.md',
  description: 'Link-only implementation checklist mirroring the execution breakdown',
  template: 'tasks.md',
  instruction: `Create tasks.md as a thin, trackable index of the execution breakdown.
The breakdown itself already lives in execution/ (tickets or plan tasks) -
do not re-plan and do not copy ticket bodies or requirement text here.

Format (the apply phase parses checkboxes; only \`- [x]\` counts as done):
- \`## 1. Execution\`: one checkbox per ticket (ai-hero) or plan task
  (superpowers), in dependency order, each linking its source:
  \`- [ ] 1.1 Ticket 01 <title> - execution/tickets/01-<slug>.md - verify: <command or check>\`
  \`- [ ] 1.2 Plan Task 2 <title> - execution/plan.md#task-2 - verify: <command>\`
- \`## 2. Review and verification\`:
  \`- [ ] 2.1 Run /adversarial-review <change> and resolve Critical/Important findings - verify: review file in execution/reviews/\`
  \`- [ ] 2.2 Run openspec validate <change> --strict and /opsx:verify <change> - verify: both pass\`
  \`- [ ] 2.3 Run node .openspec-handoff/scripts/check-handoff.mjs <change> - verify: exit 0\`
- Optional \`## Workflow follow-up\` with plain bullets (archive etc.).

When the execution tool completes a ticket / plan task, tick the matching
box here in the same commit.`,
  requires: ['execution'],
};
const schema = {
  name: 'handoff-driven',
  version: 1,
  description: 'OpenSpec owns proposal + delta specs; AI Hero or Superpowers execute via a recorded handoff - proposal → specs → design → handoff → execution → tasks',
  artifacts: [proposal, by.specs, by.design, handoff, execution, tasks],
  apply: {
    requires: ['tasks'],
    tracks: 'tasks.md',
    instruction: `Read handoff.md first. Execute with the tool it names, using its wrapper
skill (openspec-handoff-ai-hero or openspec-handoff-superpowers) and the
implementation_model it records. Work the tickets / plan tasks in
execution/, tick tasks.md as each one lands, and keep every new execution
note inside execution/. Requirements come only from the spec deltas; if
the code needs behavior the deltas don't describe, stop and update the
proposal/specs first. Finish with /adversarial-review, then
openspec validate --strict and /opsx:verify.`,
  },
};
const header = `# handoff-driven schema for OpenSpec (tested with @fission-ai/openspec 1.14.1)
# Forked from the built-in spec-driven schema: proposal/specs/design instructions are
# upstream's verbatim (plus a Size Budget note on proposal). handoff, execution and tasks are new.
# Install: copy or symlink this folder to <project>/openspec/schemas/handoff-driven/
`;
fs.writeFileSync(new URL('../schemas/handoff-driven/schema.yaml', import.meta.url), header + stringify(schema, {lineWidth: 0, blockQuote: 'literal'}));
