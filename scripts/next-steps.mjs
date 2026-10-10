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
  const review = (n, what) => `${n}. ${what} - the tool's own review step; fix what it finds. Review the diff since base_ref in ${c}/handoff.md (git diff <base_ref>...HEAD); the spec is the change folder ${c}/ (proposal.md, specs/**/spec.md, the planning files). CI also runs a code review on the PR.`;
  const unit = tool === 'superpowers' ? 'plan task' : 'ticket';
  const specCheck = (n) => [
    `${n}. /spec-check ${id} -> ${c}/execution/spec-check.md (coverage + the line estimate after planning, budget ~300). On GAPS: stop, fix, re-run. On PASS, /spec-check accepts it (--accept): the spec-change baseline ${c}/execution/.spec-check.json, committed with the planning files.`,
    `   After any later delta edit, one order: openspec validate ${id} --strict -> /spec-check ${id} (lists the requirements / scenarios added, changed, removed or renamed since the last accepted PASS and the units citing them; the list stays until a PASS is accepted) -> re-plan ONLY the open units it names (done units are never touched; a change affecting done work becomes a new ${unit}; note "superseded by delta edit: <reason>" in the planning output, the design session file stays as-is) -> /spec-check until PASS.`,
  ];
  const finish = (n) => [
    `${n}. /opsx:verify ${id} - save the report verbatim to ${c}/execution/verify.md`,
    `${n + 1}. /opsx:archive ${id} on the change branch, and commit the archive in this change's PR together with its code (the change is complete when its archived folder is on main).`,
  ];
  if (tool === 'ai-hero') {
    const impl = applyMode === 'implement-spec' ? '/implement-spec (sub-agents)' : '/implement (single session)';
    return [
      `Next steps for ${id} (ai-hero, apply_mode: ${applyMode}). Skill: openspec-handoff-ai-hero - outputs stay in ${c}/execution/.`,
      `1. /to-spec - reads ${c}/${SESSION_FILES['ai-hero']} -> ${c}/execution/spec.md (user stories cite "Requirement: <name>").`,
      `2. /to-tickets -> ${c}/execution/tickets/NN-<slug>.md (each names its requirement(s); scenarios by name only; one "Estimate: ~N lines" line each). Re-running it later (after a delta edit): only the open tickets /spec-check names - never overwrite a ticket marked done.`,
      ...specCheck(3),
      `   Commit the planning files with the change: git switch -c change/${id}, then commit ${c}/execution/ including .spec-check.json (branch before implementation; everything for this change - planning, code, archive - goes in its PR).`,
      applyMode === 'implement-spec'
        ? `4. ${impl} with tdd: its integration branch is change/${id}; each ticket gets its own branch / worktree, and its "Status: done" + ticked checkboxes go in that ticket-branch commit with its code, before the branch is merged into change/${id}. No sub-agent tool in the harness: use /implement instead, or run each role in-session and label it.`
        : `4. ${impl} with tdd, ticket by ticket on branch change/${id}; set "Status: done" and tick the ticket's checkboxes as each lands (commit each ticket with its code).`,
      review(5, '/code-review (Standards + Spec reviewers)'),
      ...finish(6),
      `8. Merge the PR (branch change/${id}) into main.`,
      ...afterArchive(parent, 9),
    ].join('\n');
  }
  const impl = applyMode === 'subagent-driven-development' ? 'subagent-driven-development' : 'executing-plans';
  return [
    `Next steps for ${id} (superpowers, apply_mode: ${applyMode}). Skill: openspec-handoff-superpowers - outputs stay in ${c}/execution/.`,
    `1. writing-plans - reads ${c}/${SESSION_FILES.superpowers} -> ${c}/execution/plan-${id}.md (each task starts with **Covers:** "Requirement: <name>" and has one "**Estimate:** ~N lines" line). Re-running it later (after a delta edit): only the open tasks /spec-check names - never reset a finished task.`,
    ...specCheck(2),
    `   Before implementation, work on branch change/${id} - a plain branch or a worktree (using-git-worktrees; Superpowers recommends the worktree), either works - and commit the plan and .spec-check.json there with the change (everything for this change - plan, code, archive - goes in its PR).`,
    `3. ${impl} on branch change/${id}. Its workspace (.superpowers/sdd/plan-${id}/, git-ignored) is what Superpowers' sdd-workspace script prints: <skills dir>/subagent-driven-development/scripts/sdd-workspace ${c}/execution/plan-${id}.md (skills dir e.g. .agents/skills); tick the plan's step checkboxes as each task lands;${applyMode === 'subagent-driven-development' ? ' no sub-agent tool in the harness: use executing-plans instead, or run each role in-session and label it;' : ''} copy the ledger (<workspace>/progress.md) to ${c}/execution/progress.md before deleting the workspace.`,
    review(4, 'requesting-code-review (final whole-branch review, code-reviewer.md)'),
    ...finish(5),
    `7. finishing-a-development-branch (merge / PR into main, with the archive in it). Archive comes first because finishing merges or opens the PR: the archive must already be in it, so the change is complete when it lands on main.`,
    ...afterArchive(parent, 8),
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
