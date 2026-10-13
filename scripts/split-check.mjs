#!/usr/bin/env node
// split-check: the split gate at the end of the specs stage (before /sdd-handoff). Rerunnable, warn-only.
// It counts the change's delta requirements and capabilities: above split.maxRequirements (5) or
// split.maxCapabilities (2) it warns and asks for a split proposal in execution/split-proposal.md,
// which it lints; the engineer approves it (approved_by:) and /sdd-split-apply (split.mjs apply) performs it.
// Nothing is split automatically. Line estimates are NOT made here: the ~300-line budget is
// checked after planning (/sdd-spec-check, from the tool's tickets / plan).
// On a slice it is the same check (a re-split joins the same parent); on a parent it lints slices.md.
// Usage: node split-check.mjs <change-id> [--root <dir>] [--write] [--json]
// Exit: 0 (warn-only), 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { addArgs, findProjectRoot, plural, loadConfig, UsageError } from './lib/change.mjs';
import { changeDeltas, changeLocation, dependencyClosure, findParentOf, lintSlices, nameSlices, parseSlices, SPLIT_MAX_CAPABILITIES, SPLIT_MAX_REQUIREMENTS } from './lib/split.mjs';
import { isMain } from './lib/main.mjs';

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
  if (reqs.length > maxRequirements) over.push(`${reqs.length} requirement${reqs.length === 1 ? '' : 's'} (> ${maxRequirements})`);
  if (caps.length > maxCapabilities) over.push(`${caps.length} ${caps.length === 1 ? 'capability' : 'capabilities'} (> ${maxCapabilities})`);
  const out = { ...r, kind: 'change', requirements: reqs.length, capabilities: caps.length, byCap, over, status: over.length ? 'over' : 'fits' };
  // a new capability's delta needs "## Purpose", or archive writes a TBD placeholder into the main spec (warn-only)
  const specsDir = path.join(loc.dir, 'specs');
  if (!loc.archived && fs.existsSync(specsDir)) {
    for (const cap of fs.readdirSync(specsDir)) {
      const f = path.join(specsDir, cap, 'spec.md');
      if (!fs.existsSync(f) || fs.existsSync(path.join(root, 'openspec', 'specs', cap, 'spec.md'))) continue;
      const text = fs.readFileSync(f, 'utf8');
      const purpose = /^##\s+Purpose\s*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m.exec(text);
      if (!purpose) out.warnings.push(`specs/${cap}/spec.md: new capability without "## Purpose" - archive would write a TBD placeholder into the main spec`);
      else {
        // OpenSpec's strict spec validation wants a Purpose of 50+ characters; the change validates, the archived main spec would not
        const len = purpose[1].replace(/<!--[\s\S]*?-->/g, '').trim().length;
        if (len < 50) out.warnings.push(`specs/${cap}/spec.md: "## Purpose" is ${len} characters (< 50) - openspec validate --strict passes on the change but fails on the main spec after archive; write a full sentence`);
      }
    }
  }
  const pf = path.join(loc.dir, 'execution', 'split-proposal.md');
  // a change that fits gets the preview too when a split proposal exists (a deliberate split / re-split)
  if (!over.length && !fs.existsSync(pf)) return out;
  if (fs.existsSync(pf)) {
    const ptext = fs.readFileSync(pf, 'utf8');
    const prop = parseSlices(ptext);
    // show the ids split apply will create: <parent>-<nn>-<slice>
    const named = nameSlices(prop.slices, r.parent || id, { existing: r.parent ? parent.plan.slices.map((x) => x.id) : [] });
    prop.slices = named.slices;
    // a re-split is linted with the parent's other slices (e.g. its existing cleanup slice 99 removes the flag), as apply does
    const combined = r.parent
      ? { ...prop, slices: [...parent.plan.slices.filter((x) => x.id !== id).map((x) => ({ ...x, depends_on: x.depends_on.flatMap((d) => (d === id ? prop.slices.map((y) => y.id) : [d])) })), ...prop.slices] }
      : prop;
    const lint = lintSlices(combined, { text: ptext.replace(/^---[\s\S]*?---/, '') });
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
  if (r.kind === 'parent') return [`split-check ${r.change}: split parent, ${plural(r.slices, 'slice')}`, ...r.errors.map((w) => `  ✗ ${w}`), ...r.warnings.map((w) => `  ! ${w}`), `  (status: /sdd-split-status ${r.change})`].join('\n');
  const warn = (r.warnings || []).map((w) => `  ! ${w}`);
  const reqs = plural(r.requirements, 'requirement');
  const caps = plural(r.capabilities, 'capability', 'capabilities');
  if (r.status === 'fits' && !r.proposal) return [`split-check ${r.change}: fits (${reqs}, ${caps})`, ...warn].join('\n');
  const out = r.status === 'fits' ? [`split-check ${r.change}: fits (${reqs}, ${caps}) - but execution/split-proposal.md exists (a deliberate split${r.parent ? `; a re-split adds new slices to parent ${r.parent}` : ''}): preview below`, ''] : [`split-check ${r.change}: WARNING - ${r.over.join(', ')} - consider splitting${r.parent ? ` (this is a slice: a re-split adds new slices to parent ${r.parent} - /sdd-split-apply builds their ids, continuing its numbering; no nested parents)` : ''}`, ''];
  out.push(...warn);
  for (const c of r.byCap) out.push(names ? `- ${c.capability} (${c.requirements.length}): ${c.requirements.join('; ')}` : `- ${c.capability}: ${plural(c.requirements.length, 'requirement')}`);
  if (!r.proposal) {
    out.push('', 'Next: propose slices in execution/split-proposal.md (front matter "approved_by:" left empty), show them to the engineer, and wait for approval or edits. Format:',
      '  ### Slice: <slice>   (the slice part only; split apply names the change <parent>-<nn>-<slice>)', '  - order: <nn>   (two digits, 01 = first; the flag cleanup slice uses 99; omit on a re-split to continue the numbering)', '  - goal: <one line, no requirement names>', '  - capabilities: <cap>, <cap>', '  - requirements: <exact name>; <exact name>',
      '  - split: <original name> -> <new name> [<scenario>; <scenario>]   (only to cut one requirement in two)',
      '  - depends_on: none | <slice>, <slice>   (slice parts, or full ids of existing slices)', '  - flag: none | <flag>   (only when the slice gates user-visible behaviour; its requirement is not in the original delta - this slice adds it, split note "added:")', '  - removes_flag: <flag>   (the cleanup slice, order 99; always planned when a flag exists; its delta REMOVES the flag requirement)',
      'Line estimates come after planning (/sdd-spec-check on each slice, budget ~300 lines of code + tests).');
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
  out.push('', p.approvedBy ? `Approved. Apply (after committing the deltas - that commit is the loss-check baseline): /sdd-split-apply ${r.change}` : 'Waiting for the engineer: approve or edit the slices, then set "approved_by:" and run /sdd-split-apply.');
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
    fs.writeFileSync(f, `<!-- written by split-check.mjs (counts only; names stay in the deltas) -->\n\n${formatSplitCheck(r, { names: false })}\n`);
  }
  console.log(values.json ? JSON.stringify(r, null, 2) : formatSplitCheck(r));
  if (values.write && r.kind === 'change' && !values.json) {
    // the whole change (proposal, deltas, design session, split files): /sdd-split-apply needs it committed as its baseline
    const add = addArgs(root, path.relative(root, changeLocation(root, positionals[0]).dir).split(path.sep).join('/'));
    if (r.status === 'fits' && !r.proposal) console.log(`Commit with the change: git add ${add} && git commit -m "split-check(${positionals[0]}): fits"`);
    else console.log(`Commit the change with its deltas (/sdd-split-apply needs them committed - that commit is the loss-check baseline): git add ${add} && git commit -m "split-check(${positionals[0]})"`);
  }
  return 0;
}

if (isMain(import.meta.url)) {
  main().then((c) => process.exit(c)).catch((e) => { console.error(`split-check: ${e.message}`); process.exit(e instanceof UsageError ? 2 : 1); });
}
