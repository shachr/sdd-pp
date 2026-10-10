#!/usr/bin/env node
// next-steps: the exact next steps for a handed-off change, for the tool in handoff.md.
// The handoff stage ends by printing this; it does not run any of the steps.
// Usage: /next-steps <change>  (node .openspec-handoff/scripts/next-steps.mjs <change> [--root <dir>])
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findProjectRoot, loadChange, UsageError, SESSION_FILES, APPLY_MODES } from './lib/change.mjs';
import { findParentOf } from './lib/split.mjs';

export function nextSteps({ id, tool, applyMode, parent = null }) {
  const c = `openspec/changes/${id}`;
  const review = (n, what) => `${n}. ${what} in a FRESH session of your own coding agent (a sub-agent, or a new session that sees only the review prompt) -> ${c}/execution/reviews/code-review.md. Write "fresh session" at the top of the review; if it could not run in a fresh session, write "self-review" instead. Fix Critical/Important findings.`;
  const finish = (n) => [
    `${n}. /check-handoff ${id} (openspec validate --strict + check-handoff --expect-complete)`,
    `${n + 1}. /opsx:verify ${id} - save the report verbatim to ${c}/execution/verify.md`,
    `${n + 2}. /opsx:archive ${id} on the change branch, and commit the archive in this change's PR together with its code (the change is complete when its archived folder is on main).`,
  ];
  if (tool === 'ai-hero') {
    const impl = applyMode === 'implement-spec' ? '/implement-spec (sub-agents)' : '/implement (single session)';
    return [
      `Next steps for ${id} (ai-hero, apply_mode: ${applyMode}). Skill: openspec-handoff-ai-hero - outputs stay in ${c}/execution/.`,
      `1. /to-spec - reads ${c}/${SESSION_FILES['ai-hero']} -> ${c}/execution/spec.md (user stories cite "Requirement: <name>").`,
      `2. /to-tickets -> ${c}/execution/tickets/NN-<slug>.md (each names its requirement(s); scenarios by name only; one "Estimate: ~N lines" line each). Re-running it later: regenerate open tickets only - never overwrite a ticket marked done.`,
      `3. /spec-check ${id} -> ${c}/execution/spec-check.md (coverage + the line estimate after planning, budget ~300). On GAPS: stop, fix, re-run.`,
      `4. ${impl} with tdd, ticket by ticket; set "Status: done" and tick the ticket's checkboxes as each lands.`,
      review(5, '/code-review (Standards + Spec reviewers)'),
      ...finish(6),
      `9. Merge the PR (branch change/${id}) into main.`,
      ...afterArchive(parent, 10),
    ].join('\n');
  }
  const impl = applyMode === 'subagent-driven-development' ? 'subagent-driven-development' : 'executing-plans';
  return [
    `Next steps for ${id} (superpowers, apply_mode: ${applyMode}). Skill: openspec-handoff-superpowers - outputs stay in ${c}/execution/.`,
    `1. writing-plans - reads ${c}/${SESSION_FILES.superpowers} -> ${c}/execution/plan-${id}.md (each task starts with **Covers:** "Requirement: <name>" and has one "**Estimate:** ~N lines" line). Re-running it later: replan open tasks only - never reset a finished task.`,
    `2. /spec-check ${id} -> ${c}/execution/spec-check.md (coverage + the line estimate after planning, budget ~300). On GAPS: stop, fix, re-run.`,
    `3. ${impl} on branch change/${id} (workspace .superpowers/sdd/plan-${id}/); tick the plan's step checkboxes as each task lands; copy the ledger to ${c}/execution/progress.md before deleting the workspace.`,
    review(4, 'requesting-code-review (final whole-branch review, code-reviewer.md)'),
    ...finish(5),
    `8. finishing-a-development-branch (merge / PR into main, with the archive in it)`,
    ...afterArchive(parent, 9),
  ].join('\n');
}

/** A slice of a split change: once its PR (code + archive) is on main, report what became ready. */
function afterArchive(parent, n) {
  return parent ? [`${n}. On main: /split-next ${parent} - this slice shows done (archived folder on main); slices now ready get tickets.`] : [];
}

function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { root: { type: 'string' } } });
  if (positionals.length !== 1) throw new UsageError('usage: next-steps <change> [--root <dir>]');
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  if (!root) throw new UsageError('no openspec/ directory found');
  const change = loadChange(root, positionals[0]);
  if (change.files.includes('slices.md')) {
    console.log(`${change.id} is a split parent: no handoff or implementation. Run: /split-next ${change.id}`);
    return 0;
  }
  const h = change.handoff;
  if (!h?.tool || !APPLY_MODES[h.tool]) throw new Error(`${change.id}: handoff.md has no valid tool - write handoff.md first`);
  const parent = findParentOf(root, change.id);
  console.log(nextSteps({ id: change.id, tool: h.tool, applyMode: h.apply_mode || APPLY_MODES[h.tool][0], parent: parent && parent.id !== change.id ? parent.id : null }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { process.exit(main()); } catch (e) { console.error(`next-steps: ${e.message}`); process.exit(e instanceof UsageError ? 2 : 1); }
}
