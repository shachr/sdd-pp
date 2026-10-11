#!/usr/bin/env node
// next-steps: the exact next steps for a handed-off change, for the tool in handoff.md.
// The handoff stage ends by printing this; it does not run any of the steps.
// Usage: /sdd-change-status <change>  (node .openspec-handoff/scripts/next-steps.mjs <change> [--root <dir>])
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findProjectRoot, loadChange, UsageError, SESSION_FILES, SESSION_SKILLS, APPLY_MODES, findPlan, git, resolveTool, isStub } from './lib/change.mjs';
import { SNAPSHOT, snapshotDigest, specSnapshot } from './spec-check.mjs';
import { changeLocation, findParentOf } from './lib/split.mjs';
import { nextReport, placeholders } from './split.mjs';
import { isMain } from './lib/main.mjs';

export function nextSteps({ id, tool, applyMode, parent = null, state = {} }) {
  const c = `openspec/changes/${id}`;
  const done = state.done || new Set();
  // "[done] " in front of a step whose result is already in the change folder (cheap file checks, not progress tracking)
  const d = (key, line) => (done.has(key) ? line.replace(/^(\s*)/, '$1[done] ') : line);
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
      `   Commit the planning files with the change: ${sw}, then commit the change folder including .spec-check.json (git add -A ${c} && git commit -m "plan(${id})"; branch before implementation; everything for this change - planning, code, archive - goes in its PR).`,
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
    `   Before implementation, work on branch change/${id} (${sw}) - a plain branch or a worktree (using-git-worktrees; Superpowers recommends the worktree), either works - and commit the plan and .spec-check.json there: git add -A ${c} && git commit -m "plan(${id})" (everything for this change - plan, code, archive - goes in its PR).`,
    d('impl', `3. ${impl} on branch change/${id}. Its workspace (.superpowers/sdd/plan-${id}/, git-ignored) and ledger are shared by executing-plans and subagent-driven-development; the script that prints the workspace lives in the subagent-driven-development skill folder for both: ${state.skillsDir || '<skills dir>'}/subagent-driven-development/scripts/sdd-workspace ${c}/execution/plan-${id}.md${state.skillsDir ? '' : ' (<skills dir> = where the Superpowers skills are installed, e.g. .claude/skills or .agents/skills)'}. Tick the plan's step checkboxes as each task lands.${applyMode === 'subagent-driven-development' ? ' No sub-agent tool in the harness: use executing-plans instead, or run each role in-session and label it.' : ''}`),
    d('progress', `   Before the final review deletes the workspace: copy the ledger <workspace>/progress.md to ${c}/execution/progress.md and commit it (git add ${c}/execution/progress.md) - /opsx:verify checks it and the archive keeps it.`),
    review(4, 'requesting-code-review (final whole-branch review, code-reviewer.md)'),
    ...finish(5),
    `7. finishing-a-development-branch (merge / PR into main, with the archive in it). Archive comes first because finishing merges or opens the PR: the archive must already be in it, so the change is complete when it lands on main.`,
    ...afterArchive(parent, 8),
  ].join('\n');
}

/** A slice of a split change: once its PR (code + archive) is on main, report what became ready. */
function afterArchive(parent, n) {
  return parent ? [`${n}. On main: /sdd-split-status ${parent} - this slice shows done (archived folder on main); slices now ready get tickets.`] : [];
}

/** Where the Superpowers skills are installed in this project (the folder holding subagent-driven-development), or null. */
export function skillsDir(root) {
  const dirs = ['.claude/skills', '.agents/skills', '.cursor/skills', '.opencode/skills'];
  return dirs.find((d) => fs.existsSync(path.join(root, d, 'subagent-driven-development'))) || null;
}

/** Before /sdd-handoff: the steps up to the handoff, [done] where the result is in the change folder. */
export function beforeHandoff(root, change, parent = null) {
  const id = change.id;
  const c = `openspec/changes/${id}`;
  const r = resolveTool(change);
  const has = (re) => change.files.some((f) => re.test(f));
  const d = (ok, line) => (ok ? `[done] ${line}` : line);
  const out = [`${id}: no handoff.md yet - the change is not handed off, so the implementation steps are not known. Steps up to the handoff:`];
  let n = 1;
  if (parent) {
    const mark = findParentOf(root, id)?.plan.slices.find((s) => s.id === id)?.status;
    out.push(d(mark === 'in-progress' || mark === 'done', `${n++}. /sdd-slice-start ${id} - takes the slice (status: in-progress in openspec/changes/${parent}/slices.md); commit the mark on main.`));
  }
  const session = r.tool ? SESSION_FILES[r.tool] : null;
  const started = session && !isStub(change.read(session));
  out.push(d(started, r.tool
    ? `${n++}. Design session: ${SESSION_SKILLS[r.tool]} -> ${c}/${session} (tool ${r.tool}, from ${r.source}${started ? '' : `; /sdd-tool ${id} shows it, /sdd-tool ${id} --set <tool> changes it before the session starts`}).${parent ? ` A slice's session builds on the parent's: record only what this slice decides, and under "## Overrides" each split note / parent decision it changes (else None).` : ''}`
    : `${n++}. Pick the tool: /sdd-tool ${id} --set ai-hero|superpowers (or a project default: sdd-pp tool --default <tool>), then the design session it names.`));
  out.push(d(change.files.includes('proposal.md'), `${n++}. ${c}/proposal.md (/opsx:propose ${id} or /opsx:continue ${id}).`));
  const todos = parent ? placeholders(root, change.dir) : [];
  out.push(d(has(/^specs\/.+\/spec\.md$/) && !todos.length, `${n++}. Delta specs ${c}/specs/<capability>/spec.md, then openspec validate ${id} --strict.${todos.length ? ` Fill the TODO(agent: ...) placeholders first: ${todos.join(', ')}.` : ''}`));
  if (!parent) out.push(d(change.files.includes('execution/split-check.md'), `${n++}. /sdd-split-check ${id} - split gate (warn-only; a split proposal goes to the engineer).`));
  out.push(`${n++}. /sdd-handoff ${id} -> ${c}/handoff.md (tool, apply_mode, base_ref); it then prints the implementation steps (/sdd-change-status ${id} reprints them).`);
  out.push(`([done] = its result is already in ${c}/; a file check, not progress tracking)`);
  return out.join('\n');
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
  const rel = path.relative(root, change.dir).split(path.sep).join('/');
  if (change.archived) {
    // archived = done: no live paths, no steps left
    const p = change.files.includes('slices.md') ? null : findParentOf(root, change.id);
    const parent = p && p.id !== change.id ? p.id : null;
    let next = '';
    if (change.files.includes('slices.md')) next = ' The split is finished (parent archived last).';
    else if (parent) {
      let all = false;
      try { const r = nextReport(root, parent); all = r.rows.every((x) => x.status === 'done'); } catch { /* unreadable parent */ }
      next = changeLocation(root, parent)?.archived ? ` Slice of ${parent}, which is archived too: the split is finished.`
        : all ? ` Slice of ${parent}: every slice is archived - finish the parent: /sdd-split-finish ${parent}.`
          : ` Slice of ${parent}: once its PR is on main, /sdd-split-status ${parent} shows what is ready next.`;
    }
    console.log(`${change.id} is done: archived in ${rel}/ - every step is [done].${next}`);
    return 0;
  }
  if (change.files.includes('slices.md')) {
    let all = false;
    try { const r = nextReport(root, change.id); all = r.rows.length > 0 && r.rows.every((x) => x.status === 'done'); } catch { /* archived parent */ }
    console.log(all
      ? `${change.id} is a split parent and every slice is done (archived). Run: /sdd-split-finish ${change.id} (final loss check + openspec archive --skip-specs)`
      : `${change.id} is a split parent: no handoff or implementation. Run: /sdd-split-status ${change.id}`);
    return 0;
  }
  const p = findParentOf(root, change.id);
  const parent = p && p.id !== change.id ? p.id : null;
  if (!change.files.includes('handoff.md')) { console.log(beforeHandoff(root, change, parent)); return 0; }
  const h = change.handoff;
  if (!h?.tool || !APPLY_MODES[h.tool]) throw new Error(`${change.id}: handoff.md has no valid tool - write handoff.md first (/sdd-handoff ${change.id})`);
  const state = { ...detectState(root, change, h.tool), skillsDir: skillsDir(root) };
  console.log(nextSteps({ id: change.id, tool: h.tool, applyMode: h.apply_mode || APPLY_MODES[h.tool][0], parent, state }));
  if (state.done.size) console.log(`([done] = its result is already in ${'openspec/changes/' + change.id}/; a file check, not progress tracking)`);
  return 0;
}

if (isMain(import.meta.url)) {
  try { process.exit(main()); } catch (e) { console.error(`next-steps: ${e.message}`); process.exit(e instanceof UsageError ? 2 : 1); }
}
