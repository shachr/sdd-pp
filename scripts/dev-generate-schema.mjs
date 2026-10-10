import fs from 'node:fs';
// Dev-only: regenerates schemas/handoff-driven/schema.yaml from the installed OpenSpec's spec-driven schema.
// Usage: npm install && node scripts/dev-generate-schema.mjs
//
// Clean handoff (docs/decisions.md C1): OpenSpec owns ONLY proposal + delta specs.
// Design and implementation belong to the execution tool and live in execution/.
// Artifacts: proposal -> specs -> handoff -> tasks. No design artifact, so
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
proposal.instruction = replaceOnce(replaceOnce(by.proposal.instruction,
  'implementation details belong in design.md.',
  'design and implementation details belong to the execution tool\n(written to execution/ after /handoff), not to OpenSpec.'),
  'This is the foundation - specs, design, and tasks all build on this.',
  'This is the foundation - the specs, and everything the execution tool plans, build on this.') + `
Handoff-driven addition - **Size Budget** section (required):
State the expected size of this change so it stays PR-sized: number of
requirements in the deltas, expected tickets/plan tasks, and a rough
changed-lines estimate. Default budget (see .openspec-handoff/small-changes.md):
<= 5 requirements, <= 8 tickets/plan tasks, <= 400 changed lines.
If the estimate exceeds the budget, split now: create one change per
independently shippable capability slice (e.g. \`add-x-core\`, \`add-x-cli\`)
and say which change this one is. Do not defer splitting to execution.
`;

const specs = { ...by.specs };
specs.instruction = replaceOnce(by.specs.instruction,
  '- Detailed execution plans (those belong in design.md or tasks.md)',
  '- Detailed execution plans and design (the execution tool writes those to execution/)') + `
Handoff-driven addition: the delta is the ONLY place behaviour is written down.
After /handoff, execution artifacts cite requirements and scenarios by name and
link (\`../specs/<capability>/spec.md\` - "Requirement: <name>"), so give every
requirement and scenario a short, distinctive name.
`;

const handoff = {
  id: 'handoff',
  generates: 'handoff.md',
  description: 'Records which execution tool and implementation model take over, and where they write',
  template: 'handoff.md',
  instruction: `DELEGATED: create this artifact with the \`openspec-handoff\` skill
(\`/handoff <change> <ai-hero|superpowers> <implementation-model>\`). It needs the
user's choice of execution tool and the implementation model - ask once if the
request didn't say. When reached from /opsx:propose, /opsx:ff or /opsx:continue,
invoke that skill now; it writes handoff.md, runs the tool's planning, and stops
before implementation.

There is no OpenSpec design step in this schema: design and implementation are
owned by the execution tool (AI Hero grill-with-docs -> execution/design.md,
to-spec -> execution/spec.md; Superpowers brainstorming -> execution/design.md,
writing-plans -> execution/plan-<change>.md) and reviewed there.

handoff.md is the contract between OpenSpec (requirements) and the
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
- \`apply_mode\`: the tool's own implement command the engineer runs instead of
  /opsx:apply - ai-hero: \`implement\` | \`implement-spec\`; superpowers:
  \`executing-plans\` | \`subagent-driven-development\`.
- \`reviewer_model\` (optional): pin the adversarial reviewer. Must differ
  from implementation_model; otherwise /adversarial-review picks one.

Body rules - REFERENCE, DON'T DUPLICATE:
- Link to \`proposal.md\` and every \`specs/<capability>/spec.md\` delta. Do NOT
  restate requirements, scenarios, or SHALL/MUST text; the deltas are the only
  source of behavioral requirements.
- To point at one requirement or scenario, cite it by name with a link:
  \`[specs/<capability>/spec.md](specs/<capability>/spec.md) - "Requirement: <name>"\`.
- List the execution artifacts the tool will write, all under \`execution/\`.
- Record the Size Budget numbers from the proposal and the split decision.

Execution outputs must NOT be written to the tools' default locations
(\`.scratch/\`, \`docs/superpowers/plans/\`, \`docs/superpowers/specs/\`).
Run \`node .openspec-handoff/scripts/check-handoff.mjs <change>\` after writing; it must pass.`,
  requires: ['specs'],
};

const tasks = {
  id: 'tasks',
  generates: 'tasks.md',
  description: 'Link-only checklist indexing the execution tool\'s breakdown (tickets or plan tasks)',
  template: 'tasks.md',
  instruction: `DELEGATED (second half of the handoff): first run the PLANNING part of the
wrapper skill for the tool in handoff.md - it runs the real tool skills and
writes their output into execution/ in this change folder:
- tool: ai-hero -> skill \`openspec-handoff-ai-hero\`
  (grill-with-docs -> execution/design.md, to-spec -> execution/spec.md,
  to-tickets -> execution/tickets/NN-<slug>.md)
- tool: superpowers -> skill \`openspec-handoff-superpowers\`
  (brainstorming -> execution/design.md, writing-plans -> execution/plan-<change>.md)
Planning only - no code changes. End planning with /spec-check <change>
(node .openspec-handoff/scripts/spec-check.mjs <change> --write + the agent's
contradiction review); stop on GAPS. Implementation is started by the engineer
with the tool's own command (handoff.md apply_mode), not /opsx:apply.

Then write tasks.md as a thin, trackable index of that breakdown. Do not
re-plan and do not copy ticket bodies or requirement text here.

Format (the apply phase parses checkboxes; only \`- [x]\` counts as done):
- \`## 1. Execution\`: one checkbox per ticket (ai-hero) or plan task
  (superpowers), in dependency order, each linking its source:
  \`- [ ] 1.1 Ticket 01 <title> - execution/tickets/01-<slug>.md - verify: <command>\`
  \`- [ ] 1.2 Plan Task 2 <title> - execution/plan-<change>.md#task-2-<slug> - verify: <command>\`
- \`## 2. Review and verification\`:
  \`- [ ] 2.1 Run the tool's code review (ai-hero code-review / superpowers requesting-code-review) and resolve Critical/Important findings - verify: execution/reviews/code-review.md exists\`
  \`- [ ] 2.2 Run openspec validate <change> --strict - verify: exit 0\`
  \`- [ ] 2.3 Run node .openspec-handoff/scripts/check-handoff.mjs <change> - verify: exit 0\`
- \`## Workflow follow-up\` with plain bullets (no checkboxes): /opsx:verify
  (report saved to execution/verify.md) and /opsx:archive. Do NOT make
  /opsx:verify a checkbox: verify reports every unticked box as CRITICAL.

Every execution artifact starts with a "Source of truth" line linking
\`../proposal.md\` and the deltas, cites requirements/scenarios only by name +
link, and never restates them (check-handoff fails on copies and warns on
likely paraphrases). Every to-spec user story, ticket and plan task names the
delta requirement(s) it covers as "Requirement: <name>" (check-handoff fails
on a unit that names none, or names one that is not in the delta).
Keep the breakdown PR-sized: at most 8 tickets / plan tasks (hard cap 12).

When the execution tool completes a ticket / plan task, tick the matching
box here in the same commit.`,
  requires: ['handoff'],
};

const schema = {
  name: 'handoff-driven',
  version: 2,
  description: 'OpenSpec owns proposal + delta specs only; AI Hero or Superpowers own design and implementation via a recorded handoff - proposal → specs → handoff → tasks',
  artifacts: [proposal, specs, handoff, tasks],
  apply: {
    requires: ['tasks'],
    tracks: 'tasks.md',
    instruction: `This workflow does not implement through /opsx:apply. Read handoff.md:
implementation runs with the execution tool's own command recorded as apply_mode
(ai-hero: implement | implement-spec; superpowers: executing-plans |
subagent-driven-development), following the IMPLEMENTATION part of its wrapper
skill (openspec-handoff-ai-hero or openspec-handoff-superpowers), by the
implementation_model it records. Design decisions are the execution
tool's (execution/design.md or the plan) and are reviewed by that tool.
Work the tickets / plan tasks in execution/, tick tasks.md as each one lands,
and keep every execution note inside execution/. Requirements come only from
the spec deltas; if the code needs behavior the deltas don't describe, stop and
update the proposal/specs first. The implementation diff is
\`git diff <base_ref>...HEAD\` (base_ref in handoff.md). Finish with the tool's
own code review (execution/reviews/code-review.md), openspec validate --strict,
check-handoff, then /opsx:verify (save its report to execution/verify.md)
before /opsx:archive.`,
  },
};
const header = `# handoff-driven schema for OpenSpec (tested with @fission-ai/openspec 1.14.1)
# Forked from the built-in spec-driven schema: proposal/specs instructions are upstream's
# with design.md references redirected to the execution tool, plus a Size Budget note.
# There is deliberately NO design artifact: design is owned by the execution tool.
# handoff and tasks are new. Generated by scripts/dev-generate-schema.mjs - do not hand-edit.
# Install: copy or symlink this folder to <project>/openspec/schemas/handoff-driven/
`;
fs.writeFileSync(new URL('../schemas/handoff-driven/schema.yaml', import.meta.url), header + stringify(schema, { lineWidth: 0, blockQuote: 'literal' }));
