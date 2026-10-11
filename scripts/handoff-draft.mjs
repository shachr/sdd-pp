#!/usr/bin/env node
// handoff-draft: pre-fill openspec/changes/<id>/handoff.md for /sdd-handoff - every field the files already decide
// (change, tool, base_ref, links to proposal / deltas / session, slice + parent, size counts), leaving only the
// judgment fields (apply_mode, harness, notes) as <...> placeholders. Refuses to overwrite an existing handoff.md.
// Usage: node .openspec-handoff/scripts/sdd.mjs handoff-draft <change>  (handoff-draft.mjs <change> [--root <dir>])
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { APPLY_MODES, deltaRequirements, findProjectRoot, git, loadChange, resolveTool, SESSION_FILES, SESSION_SKILLS, UsageError } from './lib/change.mjs';
import { findParentOf } from './lib/split.mjs';
import { isMain } from './lib/main.mjs';

const ROWS = {
  'ai-hero': [
    ['ai-hero `grill-with-docs` (proposal phase, before handoff)', '`execution/grill.md`; glossary terms -> `GLOSSARY.md`, ADRs -> `docs/adr/`'],
    ['ai-hero `to-spec` (reads `execution/grill.md`; user-facing sections link the proposal/delta)', '`execution/spec.md`'],
    ['ai-hero `to-tickets` (cite `Requirement "<name>"` and `Scenario "<name>"` exactly)', '`execution/tickets/NN-<slug>.md`'],
    ['`/sdd-spec-check` (end of planning)', '`execution/spec-check.md`'],
    ['ai-hero `implement` / `implement-spec` (apply_mode) + `tdd`, then `code-review`', 'code + tests; review notes, if any, in `execution/reviews/`'],
  ],
  superpowers: [
    ['superpowers `brainstorming` (proposal phase; stopped before writing-plans)', '`execution/brainstorm.md`'],
    ['superpowers `writing-plans` (reads `execution/brainstorm.md`; cite `Requirement "<name>"` and `Scenario "<name>"` exactly)', '`execution/plan-<change-id>.md`'],
    ['`/sdd-spec-check` (end of planning)', '`execution/spec-check.md`'],
    ['superpowers `executing-plans` / `subagent-driven-development` (apply_mode) ledger', '`execution/progress.md`'],
    ['superpowers `requesting-code-review` (final review)', 'review notes, if any, in `execution/reviews/`'],
  ],
};

export function handoffDraft(root, id) {
  const change = loadChange(root, id);
  if (change.archived) throw new UsageError(`${id} is archived`);
  if (change.files.includes('slices.md')) throw new UsageError(`${id} is a split parent - hand off its slices`);
  if (change.files.includes('handoff.md')) throw new UsageError(`openspec/changes/${id}/handoff.md exists - edit it (nothing overwritten)`);
  const { tool } = resolveTool(change);
  if (!tool) throw new UsageError(`${id}: no execution tool - /sdd-tool ${id} --set <ai-hero|superpowers> (or a project default) first`);
  const session = SESSION_FILES[tool];
  if (!change.files.includes(session)) throw new UsageError(`${id}: no ${session} - run the design session (${SESSION_SKILLS[tool]}) first`);
  let base = '<git rev-parse HEAD at handoff>';
  try { base = git(root, ['rev-parse', 'HEAD']).trim(); } catch { /* not a git checkout */ }
  const p = findParentOf(root, id);
  const parent = p && p.id !== id ? p.id : null;
  const reqs = deltaRequirements(change);
  const text = [
    '---', `change: ${id}`, `tool: ${tool}`, 'harness: <optional: claude-code | cursor | codex | opencode | other - or delete this line>', `base_ref: ${base}`, 'execution_dir: execution/',
    `apply_mode: <${APPLY_MODES[tool].join(' | ')}>`, '---', '',
    '# Handoff', '',
    '## Source of truth', '',
    '<!-- Links only. Never copy or reword requirement text, scenarios or SHALL/MUST sentences. -->',
    '- Proposal: [proposal.md](proposal.md)',
    '- Spec deltas:', ...change.deltas.sort().map((d) => `  - [${d}](${d})`),
    `- Design session (proposal phase): [${session}](${session})`,
    ...(parent ? [`- Slice of split change [${parent}](../${parent}/slices.md); shared design session: [../${parent}/${session}](../${parent}/${session})`] : []),
    '', 'Design and implementation are owned by the execution tool (below); OpenSpec has no design step.',
    'Implementation diff: `git diff <base_ref>...HEAD -- . \':!openspec\'`', '',
    '## Execution artifacts', '',
    '| Tool step | Writes to |', '|-----------|-----------|',
    ...ROWS[tool].map(([a, b]) => `| ${a} | ${b} |`),
    '| `/opsx:verify` report | `execution/verify.md` |', '',
    '## Size check', '',
    `- Requirements in deltas: ${reqs.length} (budget 5)`,
    '- Tickets / plan tasks: <n> expected (planning not run yet; budget 8)',
    `- Split decision: ${parent ? `slice of ${parent}` : 'fits'}`, '',
    '## Notes for the implementer', '',
    '<!-- Constraints that are not requirements: branch name, commands to run, files to avoid. Optional. -->', '',
  ].join('\n');
  fs.writeFileSync(path.join(change.dir, 'handoff.md'), text);
  return { id, tool, parent, base, todo: ['apply_mode', 'harness (optional)', 'Tickets / plan tasks (optional estimate)', 'Notes for the implementer (optional)'] };
}

function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { root: { type: 'string' } } });
  if (positionals.length !== 1) throw new UsageError('usage: handoff-draft <change> [--root <dir>]');
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  if (!root) throw new UsageError('no openspec/ directory found');
  const r = handoffDraft(root, positionals[0]);
  console.log(`handoff-draft ${r.id}: wrote openspec/changes/${r.id}/handoff.md (tool ${r.tool}, base_ref ${r.base.slice(0, 7)}${r.parent ? `, slice of ${r.parent}` : ''}; links, deltas and size filled)`);
  console.log(`Left for you: ${r.todo.join(', ')} - replace each <...>. Then commit it: git add openspec/changes/${r.id}/handoff.md && git commit -m "handoff(${r.id}): ${r.tool}", and print the next steps: /sdd-change-status ${r.id}`);
  return 0;
}

if (isMain(import.meta.url)) {
  try { process.exit(main()); } catch (e) { console.error(`handoff-draft: ${e.message}`); process.exit(e instanceof UsageError ? 2 : 1); }
}
