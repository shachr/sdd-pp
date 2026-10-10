#!/usr/bin/env node
// next-steps: the exact next steps for a handed-off change, for the tool in handoff.md.
// The handoff stage ends by printing this; it does not run any of the steps.
// Usage: /sdd-next-steps <change>  (node .openspec-handoff/scripts/next-steps.mjs <change> [--root <dir>])
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findProjectRoot, loadChange, UsageError, SESSION_FILES, APPLY_MODES, findPlan, git } from './lib/change.mjs';
import { SNAPSHOT, snapshotDigest, specSnapshot } from './spec-check.mjs';
import { findParentOf } from './lib/split.mjs';
import { isMain } from './lib/main.mjs';

export function nextSteps({ id, tool, applyMode, parent = null, state = {} }) {
  const c = `openspec/changes/${id}`;
  const done = state.done || new Set();
  // "[done] " in front of a step whose result is already in the change folder (cheap file checks, not progress tracking)
  const d = (key, line) => (done.has(key) ? `[done] ${line}` : line);
  const sw = state.branchExists ? `git switch change/${id} - the branch exists` : `git switch -c change/${id}`;
  const review = (n, what) => `${n}. ${what} - the tool's own review step; fix what it finds. Review the diff since base_ref in ${c}/handoff.md (git diff <base_ref>...HEAD); the spec is the change folder ${c}/ (proposal.md, specs/**/spec.md, the planning files). CI also runs a code review on the PR.`;
  const unit = tool === 'superpowers' ? 'plan task' : 'ticket';
  const specCheck = (n) => [
    d('specCheck', `${n}. /sdd-spec-check ${id} -> ${c}/execution/spec-check.md (coverage + the line estimate after planning, budget ~300). On GAPS: stop, fix, re-run. On PASS, /sdd-spec-check accepts it (--accept): the spec-change baseline ${c}/execution/.spec-check.json, committed with the planning files.`),
    `   After any later delta edit, one order: openspec validate ${id} --strict -> /sdd-spec-check ${id} (lists the requirements / scenarios added, changed, removed or renamed since the last accepted PASS and the units citing them; the list stays until a PASS is accepted) -> re-plan ONLY the open units it names (done units are never touched; a change affecting done work becomes a new ${unit}; note "superseded by delta edit: <reason>" in the planning output, the design session file stays as-is) -> /sdd-spec-check until PASS.`,
  ];
  const finish = (n) => [
    d('verify', `${n}. /opsx:verify ${id} - save the report verbatim to ${c}/execution/verify.md (it checks every ticket "Status: done" / plan step box)`),
    d('archive', parent
      ? `${n + 1}. /sdd-slice-finish ${id} on the change branch (instead of /opsx:archive): it checks execution/verify.md${tool === 'superpowers' ? ' and execution/progress.md' : ''}, runs openspec archive ${id} -y, marks the slice done in openspec/changes/${parent}/slices.md and prints the commit line - commit it in this slice's PR together with its code.`
      : `${n + 1}. /opsx:archive ${id} on the change branch, and commit the archive in this change's PR together with its code (the change is complete when its archived folder is on main).`),
  ];
  if (tool === 'ai-hero') {
    const impl = applyMode === 'implement-spec' ? '/implement-spec (sub-agents)' : '/implement (single session)';
    return [
      `Next steps for ${id} (ai-hero, apply_mode: ${applyMode}). Skill: openspec-handoff-ai-hero - outputs stay in ${c}/execution/.`,
      d('spec', `1. /to-spec - reads ${c}/${SESSION_FILES['ai-hero']} -> ${c}/execution/spec.md (user stories cite "Requirement: <name>").`),
      d('tickets', `2. /to-tickets -> ${c}/execution/tickets/NN-<slug>.md (each names its requirement(s); scenarios by name only; one "Estimate: ~N lines" line each). Re-running it later (after a delta edit): only the open tickets /sdd-spec-check names - never overwrite a ticket marked done.`),
      ...specCheck(3),
      `   Commit the planning files with the change: ${sw}, then commit ${c}/execution/ including .spec-check.json (git add ${c}/execution && git commit -m "plan(${id})"; branch before implementation; everything for this change - planning, code, archive - goes in its PR).`,
      d('impl', applyMode === 'implement-spec'
        ? `4. ${impl} with tdd: its integration branch is change/${id}; each ticket gets its own branch / worktree, and its "Status: done" + ticked checkboxes go in that ticket-branch commit with its code, before the branch is merged into change/${id}. No sub-agent tool in the harness: use /implement instead, or run each role in-session and label it.`
        : `4. ${impl} with tdd, ticket by ticket on branch change/${id}; set "Status: done" and tick the ticket's checkboxes as each lands (commit each ticket with its code).`),
      review(5, '/code-review (Standards + Spec reviewers)'),
      ...finish(6),
      `8. Merge the PR (branch change/${id}) into main.`,
      ...afterArchive(parent, 9),
    ].join('\n');
  }
  const impl = applyMode === 'subagent-driven-development' ? 'subagent-driven-development' : 'executing-plans';
  return [
    `Next steps for ${id} (superpowers, apply_mode: ${applyMode}). Skill: openspec-handoff-superpowers - outputs stay in ${c}/execution/.`,
    d('plan', `1. writing-plans - reads ${c}/${SESSION_FILES.superpowers} -> ${c}/execution/plan-${id}.md (each task starts with **Covers:** "Requirement: <name>" and has one "**Estimate:** ~N lines" line). Re-running it later (after a delta edit): only the open tasks /sdd-spec-check names - never reset a finished task.`),
    ...specCheck(2),
    `   Before implementation, work on branch change/${id} (${sw}) - a plain branch or a worktree (using-git-worktrees; Superpowers recommends the worktree), either works - and commit the plan and .spec-check.json there: git add ${c}/execution && git commit -m "plan(${id})" (everything for this change - plan, code, archive - goes in its PR).`,
    d('impl', `3. ${impl} on branch change/${id}. Its workspace (.superpowers/sdd/plan-${id}/, git-ignored) and ledger are shared by executing-plans and subagent-driven-development; the script that prints the workspace lives in the subagent-driven-development skill folder for both: <skills dir>/subagent-driven-development/scripts/sdd-workspace ${c}/execution/plan-${id}.md (skills dir e.g. .agents/skills). Tick the plan's step checkboxes as each task lands.${applyMode === 'subagent-driven-development' ? ' No sub-agent tool in the harness: use executing-plans instead, or run each role in-session and label it.' : ''}`),
    d('progress', `   Before the final review deletes the workspace: copy the ledger <workspace>/progress.md to ${c}/execution/progress.md and commit it (git add ${c}/execution/progress.md) - /opsx:verify checks it and the archive keeps it.`),
    review(4, 'requesting-code-review (final whole-branch review, code-reviewer.md)'),
    ...finish(5),
    `7. finishing-a-development-branch (merge / PR into main, with the archive in it). Archive comes first because finishing merges or opens the PR: the archive must already be in it, so the change is complete when it lands on main.`,
    ...afterArchive(parent, 8),
  ].join('\n');
}

/** A slice of a split change: once its PR (code + archive) is on main, report what became ready. */
function afterArchive(parent, n) {
  return parent ? [`${n}. On main: /sdd-split-next ${parent} - this slice shows done (archived folder on main); slices now ready get tickets.`] : [];
}

/** Steps whose result is already in the change folder (cheap file checks) + whether the branch exists. */
export function detectState(root, change, tool) {
  const done = new Set();
  const has = (f) => change.files.includes(f);
  const tickets = change.files.filter((f) => /^execution\/tickets\/[^/]+\.md$/.test(f));
  if (has('execution/spec.md')) done.add('spec');
  if (tickets.length) done.add('tickets');
  const plan = findPlan(change);
  if (plan) done.add('plan');
  try {
    const base = JSON.parse(change.read(SNAPSHOT) || 'null');
    if (base?.requirements && snapshotDigest(base.requirements) === snapshotDigest(specSnapshot(change))) done.add('specCheck');
  } catch { /* no baseline */ }
  if (tool === 'ai-hero' && tickets.length && tickets.every((f) => /^\s*\**status:?\**\s*done\b/im.test(change.read(f)))) done.add('impl');
  if (tool === 'superpowers' && plan && /- \[x\]/i.test(change.read(plan)) && !/- \[ \]/.test(change.read(plan))) done.add('impl');
  if (has('execution/progress.md')) done.add('progress');
  if (has('execution/verify.md')) done.add('verify');
  if (change.archived) { done.add('archive'); done.add('verify'); }
  let branchExists = false;
  try { git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/change/${change.id}`]); branchExists = true; } catch { /* no branch / no git */ }
  return { done, branchExists };
}

function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { root: { type: 'string' } } });
  if (positionals.length !== 1) throw new UsageError('usage: next-steps <change> [--root <dir>]');
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  if (!root) throw new UsageError('no openspec/ directory found');
  const change = loadChange(root, positionals[0]);
  if (change.files.includes('slices.md')) {
    console.log(`${change.id} is a split parent: no handoff or implementation. Run: /sdd-split-next ${change.id}`);
    return 0;
  }
  const h = change.handoff;
  if (!h?.tool || !APPLY_MODES[h.tool]) throw new Error(`${change.id}: handoff.md has no valid tool - write handoff.md first`);
  const parent = findParentOf(root, change.id);
  const state = detectState(root, change, h.tool);
  console.log(nextSteps({ id: change.id, tool: h.tool, applyMode: h.apply_mode || APPLY_MODES[h.tool][0], parent: parent && parent.id !== change.id ? parent.id : null, state }));
  if (state.done.size) console.log(`([done] = its result is already in ${'openspec/changes/' + change.id}/; a file check, not progress tracking)`);
  return 0;
}

if (isMain(import.meta.url)) {
  try { process.exit(main()); } catch (e) { console.error(`next-steps: ${e.message}`); process.exit(e instanceof UsageError ? 2 : 1); }
}
