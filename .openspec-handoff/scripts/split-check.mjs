#!/usr/bin/env node
// split-check: the size gate at the end of the specs stage (before /handoff). Rerunnable.
// The agent estimates, per delta requirement, the changed lines of code + tests (from its
// scenarios and the code it touches) in execution/size-estimate.md:
//   | Requirement | Scenarios | Code touched | Estimate |
//   |---|---|---|---|
//   | <exact requirement name> | 3 | src/x.mjs (new), test/x.test.mjs | 90 |
// This script records the estimates and the total. Under the limit (~300 lines, config
// split.limitLines) it prints one line. Over it, it warns (never fails) and asks for a split
// proposal in execution/split-proposal.md, which it lints; the engineer approves it
// (approved_by:) and `split.mjs apply` performs it. Nothing is split automatically.
// Usage: node split-check.mjs <change-id> [--root <dir>] [--write] [--json]
// Exit: 0 (warn-only), 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findProjectRoot, loadConfig, UsageError } from './lib/change.mjs';
import { changeDeltas, changeLocation, dependencyClosure, findParentOf, lintSlices, parseSlices, SPLIT_LIMIT_DEFAULT } from './lib/split.mjs';

const lc = (s) => s.trim().toLowerCase();

export function readEstimates(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 4 || /^-+$/.test(cells[0].replace(/:/g, '')) || /^requirement$/i.test(cells[0])) continue;
    const est = Number((/\d+/.exec(cells.at(-1)) || [NaN])[0]);
    rows.push({ requirement: cells[0].replace(/^"|"$/g, '').replace(/^Requirement:\s*/i, ''), scenarios: cells[1], code: cells[2], estimate: est });
  }
  return rows;
}

export function splitCheck(root, id, { limit = SPLIT_LIMIT_DEFAULT } = {}) {
  const loc = changeLocation(root, id);
  if (!loc) throw new UsageError(`change not found: ${id}`);
  const r = { change: id, limit, warnings: [], notes: [] };
  if (fs.existsSync(path.join(loc.dir, 'slices.md'))) {
    const text = fs.readFileSync(path.join(loc.dir, 'slices.md'), 'utf8');
    const plan = parseSlices(text);
    const lint = lintSlices(plan, { limit, text: text.replace(/^---[\s\S]*?---/, '') });
    return { ...r, kind: 'parent', slices: plan.slices.length, warnings: [...lint.errors, ...lint.warnings], total: plan.slices.reduce((n, s) => n + (s.estimate || 0), 0) };
  }
  const reqs = changeDeltas(loc.dir);
  const parent = findParentOf(root, id);
  if (parent && parent.id !== id) r.parent = parent.id;
  const ef = path.join(loc.dir, 'execution', 'size-estimate.md');
  if (!fs.existsSync(ef)) {
    return { ...r, kind: 'change', status: 'no-estimate', requirements: reqs.map((x) => x.name), total: null };
  }
  const est = readEstimates(fs.readFileSync(ef, 'utf8'));
  const rows = reqs.map((q) => {
    const e = est.find((x) => lc(x.requirement) === lc(q.name));
    if (!e) r.warnings.push(`no estimate for Requirement "${q.name}"`);
    else if (!Number.isFinite(e.estimate)) r.warnings.push(`estimate for "${q.name}" is not a number`);
    return { requirement: q.name, section: q.section, scenarios: q.scenarios.length, code: e?.code || '?', estimate: e?.estimate ?? NaN };
  });
  for (const e of est) if (!reqs.some((q) => lc(q.name) === lc(e.requirement))) r.warnings.push(`estimate row "${e.requirement}" is not a delta requirement`);
  const total = rows.reduce((n, x) => n + (Number.isFinite(x.estimate) ? x.estimate : 0), 0);
  const over = total > limit;
  const out = { ...r, kind: 'change', rows, total, over, status: over ? 'over' : 'fits' };
  if (!over) return out;
  out.warnings.unshift(`estimated ${total} lines > ~${limit}-line PR budget - propose a split${r.parent ? ` (re-split: the new slices join parent ${r.parent}; no nested parents)` : ''}`);
  const pf = path.join(loc.dir, 'execution', 'split-proposal.md');
  if (fs.existsSync(pf)) {
    const ptext = fs.readFileSync(pf, 'utf8');
    const prop = parseSlices(ptext);
    const lint = lintSlices(prop, { limit, text: ptext.replace(/^---[\s\S]*?---/, '') });
    const assigned = new Map();
    for (const s of prop.slices) {
      for (const n of s.requirements) assigned.set(lc(n), [...(assigned.get(lc(n)) || []), s.id]);
      for (const x of s.split) assigned.set(lc(x.from), [...(assigned.get(lc(x.from)) || []), `${s.id} (part)`]);
    }
    const amended = new Set(prop.amendments.map((a) => lc(a.name)));
    const unassigned = reqs.filter((q) => !assigned.has(lc(q.name)) && !amended.has(lc(q.name))).map((q) => q.name);
    const unknown = [...assigned.keys()].filter((n) => !reqs.some((q) => lc(q.name) === n));
    let closure = {};
    try { closure = dependencyClosure(prop.slices); } catch { /* reported by lint */ }
    const pairs = [];
    for (let i = 0; i < prop.slices.length; i++) for (let j = i + 1; j < prop.slices.length; j++) {
      const a = prop.slices[i]; const b = prop.slices[j];
      const dep = closure[a.id]?.has(b.id) || closure[b.id]?.has(a.id);
      const shared = a.capabilities.some((c) => b.capabilities.map(lc).includes(lc(c)));
      if (!dep && !shared) pairs.push(`${a.id} ∥ ${b.id}`);
    }
    out.proposal = {
      approvedBy: prop.front.approved_by || null,
      slices: prop.slices.map((s) => ({ id: s.id, goal: s.goal, requirements: [...s.requirements, ...s.split.map((x) => `${x.to} (split from ${x.from})`)], depends_on: s.depends_on, flag: s.flag, removes_flag: s.removes_flag || null, estimate: s.estimate, capabilities: s.capabilities })),
      errors: [...lint.errors, ...unassigned.map((n) => `Requirement "${n}" is in no slice and has no amendment`), ...unknown.map((n) => `slice names unknown requirement "${n}"`)],
      warnings: lint.warnings,
      ready: prop.slices.filter((s) => !s.depends_on.length).map((s) => s.id),
      parallelSafe: pairs,
      total: prop.slices.reduce((n, s) => n + (s.estimate || 0), 0),
    };
  }
  return out;
}

export function formatSplitCheck(r) {
  if (r.kind === 'parent') return [`split-check ${r.change}: split parent, ${r.slices} slices, ~${r.total} lines estimated in total`, ...r.warnings.map((w) => `  ! ${w}`), `  (status: node .openspec-handoff/scripts/split.mjs next ${r.change})`].join('\n');
  if (r.status === 'no-estimate') return [`split-check ${r.change}: no execution/size-estimate.md yet - estimate each requirement (code + tests lines) first:`, '  | Requirement | Scenarios | Code touched | Estimate |', '  |---|---|---|---|', ...r.requirements.map((n) => `  | ${n} | | | |`)].join('\n');
  if (r.status === 'fits') return `split-check ${r.change}: fits (~${r.total} of ~${r.limit} lines estimated, ${r.rows.length} requirements)${r.warnings.length ? '\n' + r.warnings.map((w) => `  ! ${w}`).join('\n') : ''}`;
  const out = [`split-check ${r.change}: OVER BUDGET (warning) - ~${r.total} lines estimated, budget ~${r.limit}`, '', '| Requirement | Scenarios | Code touched | Estimate |', '|---|---|---|---|'];
  for (const x of r.rows) out.push(`| ${x.requirement} | ${x.scenarios} | ${x.code} | ${Number.isFinite(x.estimate) ? x.estimate : '?'} |`);
  out.push(`| **Total** | | | **${r.total}** |`, '');
  for (const w of r.warnings) out.push(`! ${w}`);
  if (!r.proposal) {
    out.push('', 'Next: propose slices in execution/split-proposal.md (front matter "approved_by:" left empty), show them to the engineer, and wait for approval or edits. Format:',
      '  ### Slice: <change-id>', '  - goal: <one line>', '  - capabilities: <cap>, <cap>', '  - requirements: <exact name>; <exact name>',
      '  - split: <original name> -> <new name> [<scenario>; <scenario>]   (only to cut one requirement in two)',
      '  - depends_on: none | <slice>, <slice>', '  - flag: none | <flag>   (only when the slice gates user-visible behaviour)', '  - removes_flag: <flag>   (the cleanup slice; always planned when a flag exists)', '  - estimate: <lines>',
      '  Optional "## Amendments": - Requirement "<name>" dropped: <why> | changed, see change <id> | added in <slice>: <why>');
    return out.join('\n');
  }
  const p = r.proposal;
  out.push('', `Proposed slices (execution/split-proposal.md, ${p.approvedBy ? `approved by ${p.approvedBy}` : 'NOT approved yet'}), ~${p.total} lines in total:`, '', '| Slice | Requirements | Depends on | Flag | Estimate |', '|---|---|---|---|---|');
  for (const s of p.slices) out.push(`| ${s.id} | ${s.requirements.join('; ') || '-'} | ${s.depends_on.join(', ') || '-'} | ${s.flag || (s.removes_flag ? `removes ${s.removes_flag}` : '-')} | ${Number.isFinite(s.estimate) ? s.estimate : '?'} |`);
  out.push('', `Ready first: ${p.ready.join(', ') || 'none'}`, `Parallel-safe pairs (no dependency, no shared capability): ${p.parallelSafe.join(', ') || 'none'}`);
  for (const e of p.errors) out.push(`✗ ${e}`);
  for (const w of p.warnings) out.push(`! ${w}`);
  out.push('', p.approvedBy ? `Approved. Apply: node .openspec-handoff/scripts/split.mjs apply ${r.change}` : 'Waiting for the engineer: approve or edit the slices, then set "approved_by:" and run split.mjs apply.');
  return out.join('\n');
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { root: { type: 'string' }, json: { type: 'boolean' }, write: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } } });
  if (values.help || positionals.length !== 1) { console.log('usage: split-check <change-id> [--root <dir>] [--write] [--json]'); return values.help ? 0 : 2; }
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  if (!root) throw new UsageError('no openspec/changes directory found (use --root)');
  const config = loadConfig(root);
  const limit = config.split?.limitLines ?? config.sizeThresholds?.lines?.[0] ?? SPLIT_LIMIT_DEFAULT;
  const r = splitCheck(root, positionals[0], { limit });
  const text = formatSplitCheck(r);
  if (values.write && r.kind === 'change' && r.status !== 'no-estimate') {
    const f = path.join(changeLocation(root, positionals[0]).dir, 'execution', 'split-check.md');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, `> Source of truth: [proposal](../proposal.md) · specs: ../specs/\n\n<!-- written by split-check.mjs; estimates from execution/size-estimate.md -->\n\n${text}\n`);
  }
  console.log(values.json ? JSON.stringify(r, null, 2) : text);
  return 0;
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(new URL(import.meta.url).pathname)) {
  main().then((c) => process.exit(c)).catch((e) => { console.error(`split-check: ${e.message}`); process.exit(e instanceof UsageError ? 2 : 1); });
}
