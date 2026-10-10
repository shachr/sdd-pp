#!/usr/bin/env node
// split-check: the split gate at the end of the specs stage (before /handoff). Rerunnable, warn-only.
// It counts the change's delta requirements and capabilities: above split.maxRequirements (5) or
// split.maxCapabilities (2) it warns and asks for a split proposal in execution/split-proposal.md,
// which it lints; the engineer approves it (approved_by:) and /split-apply (split.mjs apply) performs it.
// Nothing is split automatically. Line estimates are NOT made here: the ~300-line budget is
// checked after planning (/spec-check, from the tool's tickets / plan) and at the PR (check-handoff).
// On a slice it is the same check (a re-split joins the same parent); on a parent it lints slices.md.
// Usage: node split-check.mjs <change-id> [--root <dir>] [--write] [--json]
// Exit: 0 (warn-only), 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findProjectRoot, loadConfig, UsageError } from './lib/change.mjs';
import { changeDeltas, changeLocation, dependencyClosure, findParentOf, lintSlices, nameSlices, parseSlices, SPLIT_MAX_CAPABILITIES, SPLIT_MAX_REQUIREMENTS } from './lib/split.mjs';

const lc = (s) => s.trim().toLowerCase();

export function splitCheck(root, id, { maxRequirements = SPLIT_MAX_REQUIREMENTS, maxCapabilities = SPLIT_MAX_CAPABILITIES } = {}) {
  const loc = changeLocation(root, id);
  if (!loc) throw new UsageError(`change not found: ${id}`);
  const r = { change: id, maxRequirements, maxCapabilities, warnings: [] };
  if (fs.existsSync(path.join(loc.dir, 'slices.md'))) {
    const text = fs.readFileSync(path.join(loc.dir, 'slices.md'), 'utf8');
    const plan = parseSlices(text);
    const lint = lintSlices(plan, { text: text.replace(/^---[\s\S]*?---/, ''), parent: true });
    return { ...r, kind: 'parent', slices: plan.slices.length, errors: lint.errors, warnings: lint.warnings };
  }
  const reqs = changeDeltas(loc.dir);
  const parent = findParentOf(root, id);
  if (parent && parent.id !== id) r.parent = parent.id;
  const caps = [...new Set(reqs.map((x) => x.capability))];
  const byCap = caps.map((c) => ({ capability: c, requirements: reqs.filter((x) => x.capability === c).map((x) => x.name) }));
  const over = [];
  if (reqs.length > maxRequirements) over.push(`${reqs.length} requirements (> ${maxRequirements})`);
  if (caps.length > maxCapabilities) over.push(`${caps.length} capabilities (> ${maxCapabilities})`);
  const out = { ...r, kind: 'change', requirements: reqs.length, capabilities: caps.length, byCap, over, status: over.length ? 'over' : 'fits' };
  if (!over.length) return out;
  const pf = path.join(loc.dir, 'execution', 'split-proposal.md');
  if (fs.existsSync(pf)) {
    const ptext = fs.readFileSync(pf, 'utf8');
    const prop = parseSlices(ptext);
    // show the ids split apply will create: <parent>-<nn>-<slice>
    const named = nameSlices(prop.slices, r.parent || id, { existing: r.parent ? parent.plan.slices.map((x) => x.id) : [] });
    prop.slices = named.slices;
    const lint = lintSlices(prop, { text: ptext.replace(/^---[\s\S]*?---/, '') });
    lint.errors.unshift(...named.errors);
    const assigned = new Map();
    for (const s of prop.slices) {
      for (const n of s.requirements) assigned.set(lc(n), [...(assigned.get(lc(n)) || []), s.id]);
      for (const x of s.split) assigned.set(lc(x.from), [...(assigned.get(lc(x.from)) || []), `${s.id} (part)`]);
    }
    const unassigned = reqs.filter((q) => !assigned.has(lc(q.name))).map((q) => q.name);
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
      slices: prop.slices.map((s) => ({ id: s.id, requirements: [...s.requirements, ...s.split.map((x) => `${x.to} (split from ${x.from})`)], depends_on: s.depends_on, flag: s.flag, removes_flag: s.removes_flag || null })),
      errors: [...lint.errors, ...unassigned.map((n) => `Requirement "${n}" is in no slice`), ...unknown.map((n) => `slice names unknown requirement "${n}"`)],
      warnings: lint.warnings,
      ready: prop.slices.filter((s) => !s.depends_on.length).map((s) => s.id),
      parallelSafe: pairs,
    };
  }
  return out;
}

/** names: false for the file written into the change (it becomes the parent, which carries no requirement names). */
export function formatSplitCheck(r, { names = true } = {}) {
  if (r.kind === 'parent') return [`split-check ${r.change}: split parent, ${r.slices} slices`, ...r.errors.map((w) => `  ✗ ${w}`), ...r.warnings.map((w) => `  ! ${w}`), `  (status: /split-next ${r.change})`].join('\n');
  if (r.status === 'fits') return `split-check ${r.change}: fits (${r.requirements} requirements, ${r.capabilities} capabilities)`;
  const out = [`split-check ${r.change}: WARNING - ${r.over.join(', ')} - consider splitting${r.parent ? ` (re-split: the new slices join parent ${r.parent}; no nested parents)` : ''}`, ''];
  for (const c of r.byCap) out.push(names ? `- ${c.capability} (${c.requirements.length}): ${c.requirements.join('; ')}` : `- ${c.capability}: ${c.requirements.length} requirements`);
  if (!r.proposal) {
    out.push('', 'Next: propose slices in execution/split-proposal.md (front matter "approved_by:" left empty), show them to the engineer, and wait for approval or edits. Format:',
      '  ### Slice: <slice>   (the slice part only; split apply names the change <parent>-<nn>-<slice>)', '  - order: <nn>   (two digits, 01 = first; the flag cleanup slice uses 99; omit on a re-split to continue the numbering)', '  - goal: <one line, no requirement names>', '  - capabilities: <cap>, <cap>', '  - requirements: <exact name>; <exact name>',
      '  - split: <original name> -> <new name> [<scenario>; <scenario>]   (only to cut one requirement in two)',
      '  - depends_on: none | <slice>, <slice>   (slice parts, or full ids of existing slices)', '  - flag: none | <flag>   (only when the slice gates user-visible behaviour)', '  - removes_flag: <flag>   (the cleanup slice; always planned when a flag exists)',
      'Line estimates come after planning (/spec-check on each slice, budget ~300 lines of code + tests).');
    return out.join('\n');
  }
  const p = r.proposal;
  out.push('', `Proposed slices (execution/split-proposal.md, ${p.approvedBy ? `approved by ${p.approvedBy}` : 'NOT approved yet'}):`, '');
  if (names) {
    out.push('| Slice | Requirements | Depends on | Flag |', '|---|---|---|---|');
    for (const s of p.slices) out.push(`| ${s.id} | ${s.requirements.join('; ') || '-'} | ${s.depends_on.join(', ') || '-'} | ${s.flag || (s.removes_flag ? `removes ${s.removes_flag}` : '-')} |`);
  } else {
    out.push('| Slice | Requirements | Depends on | Flag |', '|---|---|---|---|');
    for (const s of p.slices) out.push(`| ${s.id} | ${s.requirements.length} | ${s.depends_on.join(', ') || '-'} | ${s.flag || (s.removes_flag ? `removes ${s.removes_flag}` : '-')} |`);
  }
  out.push('', `Ready first: ${p.ready.join(', ') || 'none'}`, `Parallel-safe pairs (no dependency, no shared capability): ${p.parallelSafe.join(', ') || 'none'}`);
  for (const e of p.errors) out.push(`✗ ${e}`);
  for (const w of p.warnings) out.push(`! ${w}`);
  out.push('', p.approvedBy ? `Approved. Apply (after committing the deltas - that commit is the loss-check baseline): /split-apply ${r.change}` : 'Waiting for the engineer: approve or edit the slices, then set "approved_by:" and run /split-apply.');
  return out.join('\n');
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { root: { type: 'string' }, json: { type: 'boolean' }, write: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } } });
  if (values.help || positionals.length !== 1) { console.log('usage: split-check <change-id> [--root <dir>] [--write] [--json]'); return values.help ? 0 : 2; }
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  if (!root) throw new UsageError('no openspec/changes directory found (use --root)');
  const sc = loadConfig(root).split || {};
  const r = splitCheck(root, positionals[0], { maxRequirements: sc.maxRequirements ?? SPLIT_MAX_REQUIREMENTS, maxCapabilities: sc.maxCapabilities ?? SPLIT_MAX_CAPABILITIES });
  if (values.write && r.kind === 'change') {
    const f = path.join(changeLocation(root, positionals[0]).dir, 'execution', 'split-check.md');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, `> Source of truth: [proposal](../proposal.md) · specs: ../specs/\n\n<!-- written by split-check.mjs (counts only; names stay in the deltas) -->\n\n${formatSplitCheck(r, { names: false })}\n`);
  }
  console.log(values.json ? JSON.stringify(r, null, 2) : formatSplitCheck(r));
  return 0;
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(new URL(import.meta.url).pathname)) {
  main().then((c) => process.exit(c)).catch((e) => { console.error(`split-check: ${e.message}`); process.exit(e instanceof UsageError ? 2 : 1); });
}
