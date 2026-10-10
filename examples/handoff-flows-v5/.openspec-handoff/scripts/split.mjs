#!/usr/bin/env node
// split: turn an approved split proposal into a parent + child changes, check nothing was lost,
// and report which slices are ready. Nothing is split without an approved proposal.
//   apply <change>             execution/split-proposal.md (approved_by set) -> children + parent
//                              (a change that is already a slice is re-split into the same parent)
//   loss  <parent> [--final]   loss check: original names vs child deltas (exactly once, or amended);
//                              --final: also vs main specs + archived children, before the parent is archived
//   next  <parent>             ready / parallel-safe report; --write-tickets writes tickets/<slice>.md
//                              (Jira-pasteable) for READY slices into the parent
// Options: --root <dir> --json --write (loss --final: tick the parent checklist)
// Exit: 0 ok, 1 findings (loss) / refused (apply), 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findProjectRoot, UsageError } from './lib/change.mjs';
import {
  changeDeltas, changeLocation, changeSchema, findParentOf, lintSlices, mainSpecRequirements,
  parentDir, parseSlices, readiness, SPLIT_LIMIT_DEFAULT,
} from './lib/split.mjs';

const lc = (s) => s.trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

// ------------------------------------------------------------------ loss check
export function lossCheck(root, parentId, { final = false } = {}) {
  const { dir } = parentDir(root, parentId);
  const plan = parseSlices(fs.readFileSync(path.join(dir, 'slices.md'), 'utf8'));
  const errors = []; const warnings = []; const confirm = []; const rows = [];
  const am = (kind, name) => plan.amendments.filter((a) => a.kind === kind && lc(a.name) === lc(name));
  for (const d of plan.duplicates) warnings.push(`slices.md:${d.line}: slice "${d.slice}" has "${d.field}:" twice (a union merge of two branches?) - keep one; the last one wins`);
  // child requirements (ADDED / MODIFIED provide behaviour; REMOVED do not)
  const child = [];
  const removed = [];
  for (const s of plan.slices) {
    const loc = changeLocation(root, s.id);
    if (!loc) { errors.push(`slice "${s.id}": no change folder (openspec/changes/${s.id})`); continue; }
    if (final && !loc.archived) errors.push(`slice "${s.id}" is not archived yet - the parent is archived last`);
    for (const r of changeDeltas(loc.dir)) (r.section === 'REMOVED' ? removed : child).push({ ...r, slice: s.id });
  }
  const origReqs = plan.checklist;
  const origReqNames = new Set(origReqs.map((r) => lc(r.name)));
  const origScen = new Map(); // scenario -> requirement
  for (const r of origReqs) for (const s of r.scenarios) origScen.set(lc(s.name), r.name);
  if (!origReqs.length) errors.push('slices.md has no checklist of original requirement names');

  for (const r of origReqs) {
    const holders = child.filter((c) => lc(c.name) === lc(r.name));
    const splits = child.filter((c) => c.splitFrom && lc(c.splitFrom) === lc(r.name));
    const amends = am('Requirement', r.name);
    let gone = amends.find((a) => a.type === 'dropped' || a.type === 'changed');
    // "changed, see change <slice>" pointing at the slice that holds it = behaviour edited in that slice's live delta
    const inPlace = gone && gone.type === 'changed' && holders.length === 1 && !splits.length && holders[0].slice === gone.change;
    if (inPlace) gone = null;
    const where = (xs) => xs.map((c) => `${c.slice}`).join(', ');
    let verdict;
    if (gone) {
      verdict = gone.type === 'dropped' ? 'dropped (amendment)' : `changed, see change ${gone.change} (amendment)`;
      if (holders.length || splits.length) errors.push(`Requirement "${r.name}": amended as ${gone.type} but still in ${where([...holders, ...splits])}`);
      if (gone.type === 'changed' && !changeLocation(root, gone.change)) warnings.push(`Requirement "${r.name}": amendment points at change "${gone.change}", which does not exist`);
    } else if (holders.length > 1) {
      verdict = 'DUPLICATE'; errors.push(`Requirement "${r.name}": in more than one child (${where(holders)})`);
    } else if (holders.length === 1 && splits.length) {
      verdict = 'DUPLICATE'; errors.push(`Requirement "${r.name}": kept whole in ${holders[0].slice} and also split (${splits.map((c) => `"${c.name}" in ${c.slice}`).join(', ')})`);
    } else if (holders.length === 1) {
      verdict = inPlace ? `${holders[0].slice} (edited there, amendment)` : holders[0].slice;
    } else if (splits.length) {
      const ok = amends.find((a) => a.type === 'split' && a.confirmed);
      const names = splits.map((c) => c.name);
      verdict = `split into ${splits.map((c) => `"${c.name}" (${c.slice})`).join(', ')}`;
      if (!ok) {
        errors.push(`Requirement "${r.name}": split_from in ${splits.map((c) => `"${c.name}" (${c.slice})`).join(', ')} needs confirmation`);
        confirm.push(`- Requirement "${r.name}" split into ${names.map((n) => `"${n}"`).join(', ')} - confirmed`);
      } else {
        const missing = names.filter((n) => !ok.into.map(lc).includes(lc(n)));
        const extra = ok.into.filter((n) => !names.map(lc).includes(lc(n)));
        if (missing.length || extra.length) errors.push(`Requirement "${r.name}": confirmed split names (${ok.into.join(', ')}) do not match the children (${names.join(', ')})`);
      }
    } else {
      verdict = 'MISSING'; errors.push(`Requirement "${r.name}": in no child delta and no amendment covers it`);
    }
    // scenarios
    const scen = r.scenarios.map((s) => {
      const occ = child.filter((c) => c.scenarios.some((x) => lc(x) === lc(s.name)));
      const sAm = am('Scenario', s.name).find((a) => a.type === 'dropped' || a.type === 'changed');
      if (sAm || gone) {
        if (occ.length) errors.push(`Scenario "${s.name}": amended (${(sAm || gone).type}) but still in ${occ.map((c) => c.slice).join(', ')}`);
        return { name: s.name, at: (sAm || gone).type };
      }
      if (!occ.length) { errors.push(`Scenario "${s.name}" (of "${r.name}"): in no child delta and no amendment covers it`); return { name: s.name, at: 'MISSING' }; }
      if (occ.length > 1) { errors.push(`Scenario "${s.name}": in more than one child (${occ.map((c) => `${c.slice} "${c.name}"`).join(', ')})`); return { name: s.name, at: 'DUPLICATE' }; }
      const host = occ[0];
      if (lc(host.name) !== lc(r.name) && !(host.splitFrom && lc(host.splitFrom) === lc(r.name))) warnings.push(`Scenario "${s.name}" moved from "${r.name}" to "${host.name}" (${host.slice})`);
      return { name: s.name, at: host.slice };
    });
    rows.push({ requirement: r.name, verdict, scenarios: scen });
  }
  // unsourced: child requirements / scenarios that are not originals, splits or amended additions
  for (const c of child) {
    const original = origReqNames.has(lc(c.name));
    const split = c.splitFrom && origReqNames.has(lc(c.splitFrom));
    const added = am('Requirement', c.name).find((a) => a.type === 'added' && a.slice === c.slice);
    if (c.splitFrom && !split) errors.push(`${c.slice}: "${c.name}" has split_from "${c.splitFrom}", which is not an original requirement`);
    if (!original && !c.splitFrom && !added) errors.push(`${c.slice}: Requirement "${c.name}" is unsourced (not an original name, no split_from, no "added in ${c.slice}" amendment)`);
    if (added) continue; // an added requirement brings its own scenarios
    for (const s of c.scenarios) {
      if (origScen.has(lc(s))) continue;
      if (am('Scenario', s).find((a) => a.type === 'added' && a.slice === c.slice)) continue;
      errors.push(`${c.slice}: Scenario "${s}" is unsourced (not an original scenario, no "added in ${c.slice}" amendment)`);
    }
  }
  for (const a of plan.amendments.filter((x) => x.type === 'unknown')) errors.push(`slices.md:${a.line}: amendment not understood: ${a.kind} "${a.name}" ${a.text}`);
  for (const a of plan.amendments.filter((x) => x.type === 'added')) {
    if (!plan.slices.some((s) => s.id === a.slice)) errors.push(`slices.md:${a.line}: amendment adds ${a.kind} "${a.name}" in "${a.slice}", which is not a slice`);
    else if (a.kind === 'Requirement' && !child.some((c) => c.slice === a.slice && lc(c.name) === lc(a.name)) && !final) warnings.push(`amendment adds Requirement "${a.name}" in ${a.slice}, but its delta does not have it`);
  }
  // final: the main specs hold what the children delivered
  let ticks = [];
  if (final) {
    const main = mainSpecRequirements(root);
    const inMain = (n) => main.find((m) => lc(m.name) === lc(n));
    const mainScen = new Set(main.flatMap((m) => m.scenarios.map(lc)));
    for (const row of rows) {
      const orig = origReqs.find((r) => r.name === row.requirement);
      if (/dropped|changed/.test(row.verdict)) { ticks.push(orig.name); continue; }
      const targets = child.filter((c) => lc(c.name) === lc(orig.name) || (c.splitFrom && lc(c.splitFrom) === lc(orig.name))).map((c) => c.name);
      const absent = targets.filter((t) => !inMain(t));
      if (!targets.length || absent.length) errors.push(`final: Requirement "${orig.name}" not in the main specs${absent.length ? ` (missing: ${absent.join(', ')})` : ''}`);
      else ticks.push(orig.name);
      for (const s of orig.scenarios) {
        if (/dropped|changed/.test(row.scenarios.find((x) => x.name === s.name)?.at || '')) { ticks.push(s.name); continue; }
        if (!mainScen.has(lc(s.name))) errors.push(`final: Scenario "${s.name}" not in the main specs`);
        else ticks.push(s.name);
      }
    }
    for (const a of plan.amendments.filter((x) => x.type === 'added' && x.kind === 'Requirement')) {
      const cleaned = removed.some((r) => lc(r.name) === lc(a.name));
      if (cleaned && inMain(a.name)) errors.push(`final: flag Requirement "${a.name}" was removed by a cleanup slice but is still in the main specs`);
    }
    for (const a of plan.amendments.filter((x) => x.type === 'changed')) {
      const loc = changeLocation(root, a.change);
      if (loc && !loc.archived) warnings.push(`final: "${a.name}" changed in ${a.change}, which is not archived yet`);
    }
  }
  return { parent: parentId, final, slices: plan.slices.length, requirements: origReqs.length, scenarios: origScen.size, rows, errors, warnings, confirm, ticks };
}

export function formatLoss(r) {
  const out = [`loss-check ${r.parent} (${r.final ? 'final, before archiving the parent' : 'after split'}): ${r.errors.length ? 'FAIL' : 'PASS'}`];
  out.push(`  originals: ${r.requirements} requirements, ${r.scenarios} scenarios; slices: ${r.slices}`);
  for (const row of r.rows) {
    const bad = /MISSING|DUPLICATE/.test(row.verdict) || row.scenarios.some((s) => /MISSING|DUPLICATE/.test(s.at));
    out.push(`  ${bad ? '✗' : '✓'} Requirement "${row.requirement}" -> ${row.verdict}`);
    for (const s of row.scenarios) out.push(`      ${/MISSING|DUPLICATE/.test(s.at) ? '✗' : '·'} Scenario "${s.name}" -> ${s.at}`);
  }
  for (const e of r.errors) out.push(`  ✗ ${e}`);
  for (const w of r.warnings) out.push(`  ! ${w}`);
  if (r.confirm.length) out.push('  To confirm a split, the agent checks the child deltas together cover the original requirement, then adds to slices.md "## Amendments":', ...r.confirm.map((c) => `    ${c}`));
  return out.join('\n');
}

function tickChecklist(dir, names) {
  const f = path.join(dir, 'slices.md');
  const set = new Set(names.map(lc));
  const text = fs.readFileSync(f, 'utf8').replace(/^(\s*-\s+)\[ \](\s+(?:Requirement|Scenario):\s*)(.+?)\s*$/gm, (m, a, b, n) => (set.has(lc(n)) ? `${a}[x]${b}${n}` : m));
  fs.writeFileSync(f, text);
}

// ------------------------------------------------------------------ next / tickets
export function nextReport(root, parentId) {
  const { dir } = parentDir(root, parentId);
  const plan = parseSlices(fs.readFileSync(path.join(dir, 'slices.md'), 'utf8'));
  return { parent: parentId, dir, plan, ...readiness(root, plan) };
}

export function formatNext(r) {
  const done = r.rows.filter((x) => x.status === 'archived').length;
  const out = [`split next ${r.parent}: ${done}/${r.rows.length} slices archived`, '', '| Slice | Status | Depends on | Ready | Flag | Estimate | Ticket |', '|---|---|---|---|---|---|---|'];
  for (const x of r.rows) out.push(`| ${x.id} | ${x.status} | ${x.depends_on.join(', ') || '-'} | ${x.ready ? 'READY' : x.status === 'archived' ? 'done' : `waits for ${x.waiting.join(', ')}`} | ${x.flag || (x.removes_flag ? `removes ${x.removes_flag}` : '-')} | ${Number.isFinite(x.estimate) ? x.estimate : '?'} | ${x.ticket || '-'} |`);
  out.push('', `Ready now: ${r.ready.map((x) => x.id).join(', ') || (done === r.rows.length ? 'none - all slices archived; run the final loss check, then archive the parent with --skip-specs' : 'none')}`);
  const safe = r.pairs.filter((p) => p.bothReady && p.safe);
  const unsafe = r.pairs.filter((p) => p.bothReady && !p.safe);
  out.push(`Parallel-safe now (both ready, no dependency, no shared capability): ${safe.map((p) => `${p.a} ∥ ${p.b}`).join(', ') || 'none'}`);
  if (unsafe.length) out.push(`Ready but NOT parallel-safe: ${unsafe.map((p) => `${p.a} / ${p.b} (${p.shared.length ? `shared capability ${p.shared.join(', ')}` : 'dependency'})`).join(', ')}`);
  const later = r.pairs.filter((p) => !p.bothReady && p.safe);
  if (later.length) out.push(`Parallel-safe later (once ready): ${later.map((p) => `${p.a} ∥ ${p.b}`).join(', ')}`);
  return out.join('\n');
}

export function writeTickets(root, r) {
  const written = [];
  for (const s of r.ready) {
    const rel = `tickets/${s.id}.md`;
    const f = path.join(r.dir, rel);
    if (fs.existsSync(f)) continue;
    const reqs = changeLocation(root, s.id) ? changeDeltas(changeLocation(root, s.id).dir).map((x) => `${x.section === 'REMOVED' ? 'Remove' : 'Requirement'}: ${x.name}`) : [];
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, [
      `Summary: [${r.parent}] ${s.id} - ${s.goal}`,
      'Issue type: Story',
      `Labels: openspec, split-${r.parent}${s.flag ? `, flag-${s.flag}` : ''}`,
      `Depends on: ${s.depends_on.join(', ') || 'none'} (all archived)`,
      `Estimate: ~${Number.isFinite(s.estimate) ? s.estimate : '?'} lines (code + tests)`,
      '',
      'Description:',
      s.goal,
      '',
      `OpenSpec change: openspec/changes/${s.id}/ (proposal.md, specs/) - the delta is the only place behaviour is written.`,
      `Parent plan: openspec/changes/${r.parent}/slices.md`,
      s.flag ? `Feature flag: ${s.flag} (user-visible behaviour stays off until the flag is turned on; cleanup slice removes it)` : null,
      s.removes_flag ? `Removes feature flag: ${s.removes_flag}` : null,
      '',
      'Requirements (names only):',
      ...reqs.map((x) => `- ${x}`),
      '',
      `Done when: /opsx:verify ${s.id} passes and the change is archived (/opsx:archive ${s.id}).`,
      `Start: git switch -c change/${s.id} main, then the slice's design session and /handoff ${s.id}.`,
      '',
    ].filter((x) => x !== null).join('\n'));
    setSliceField(r.dir, s.id, 'ticket', rel);
    written.push(rel);
  }
  return written;
}

function setSliceField(dir, id, key, value) {
  const f = path.join(dir, 'slices.md');
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const start = lines.findIndex((l) => new RegExp(`^###\\s+Slice:\\s*${id}\\s*$`).test(l));
  if (start < 0) return;
  let i = start + 1; let set = false;
  for (; i < lines.length && /^-\s+[a-z_]+:/.test(lines[i]); i++) if (lines[i].startsWith(`- ${key}:`)) { lines[i] = `- ${key}: ${value}`; set = true; }
  if (!set) lines.splice(i, 0, `- ${key}: ${value}`);
  fs.writeFileSync(f, lines.join('\n'));
}

// ------------------------------------------------------------------ apply
function sliceBlock(s) {
  const out = [`### Slice: ${s.id}`, `- goal: ${s.goal}`, `- capabilities: ${s.capabilities.join(', ') || 'none'}`];
  if (s.requirements.length) out.push(`- requirements: ${s.requirements.join('; ')}`);
  if (s.split.length) out.push(`- split: ${s.split.map((x) => `${x.from} -> ${x.to} [${x.scenarios.join('; ')}]`).join('; ')}`);
  out.push(`- depends_on: ${s.depends_on.join(', ') || 'none'}`, `- flag: ${s.flag || 'none'}`);
  if (s.removes_flag) out.push(`- removes_flag: ${s.removes_flag}`);
  out.push(`- estimate: ${Number.isFinite(s.estimate) ? s.estimate : '?'}`, `- ticket: ${s.ticket || 'none'}`);
  return out.join('\n');
}

function blockText(dir, r) {
  return fs.readFileSync(path.join(dir, r.file), 'utf8').split(/\r?\n/).slice(r.start, r.end).join('\n').trimEnd();
}
function purposeOf(dir, file) {
  const m = /^##\s+Purpose\s*\n([\s\S]*?)(?=^##\s)/m.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  return m ? m[1].trim() : null;
}

export function applySplit(root, id, { proposal = 'execution/split-proposal.md', limit = SPLIT_LIMIT_DEFAULT } = {}) {
  const loc = changeLocation(root, id);
  if (!loc || loc.archived) throw new UsageError(`active change not found: ${id}`);
  const src = loc.dir;
  if (fs.existsSync(path.join(src, 'slices.md'))) throw new UsageError(`${id} is already a split parent - re-split one of its slices instead`);
  if (fs.existsSync(path.join(src, 'handoff.md'))) throw new UsageError(`${id} already has handoff.md - split before handoff (or delete it on purpose first)`);
  const pf = path.join(src, proposal);
  if (!fs.existsSync(pf)) throw new UsageError(`no ${proposal} - run /split-check ${id} and have the engineer approve the proposed slices`);
  const ptext = fs.readFileSync(pf, 'utf8');
  const prop = parseSlices(ptext);
  if (!prop.front.approved_by) throw new UsageError(`${proposal}: front matter "approved_by:" is empty - the engineer approves (or edits) the slices first; nothing is split automatically`);
  const parent = findParentOf(root, id);
  // re-split: lint the parent's plan as it will be (old slice replaced by the new ones)
  const combined = parent && parent.id !== id
    ? { ...prop, slices: [...parent.plan.slices.filter((s) => s.id !== id).map((s) => ({ ...s, depends_on: s.depends_on.flatMap((d) => (d === id ? prop.slices.map((x) => x.id) : [d])) })), ...prop.slices] }
    : prop;
  const lint = lintSlices(combined, { limit, text: ptext.replace(/^---[\s\S]*?---/, '') });
  if (lint.errors.length) throw new UsageError(`${proposal}:\n  ${lint.errors.join('\n  ')}`);
  if (parent && fs.existsSync(path.join(parent.dir, 'slices.md')) && parent.id !== id) {
    if (prop.slices.some((s) => s.id === id)) throw new UsageError(`re-split: the new slices must have new ids (not "${id}")`);
  }
  const originals = changeDeltas(src);
  const keep = originals.filter((r) => r.section !== 'REMOVED');
  const byName = new Map(keep.map((r) => [lc(r.name), r]));
  const errs = [];
  const used = new Map();
  for (const s of prop.slices) {
    for (const n of s.requirements) { if (!byName.has(lc(n))) errs.push(`slice "${s.id}": requirement "${n}" is not in ${id}'s deltas`); used.set(lc(n), (used.get(lc(n)) || 0) + 1); }
    for (const x of s.split) {
      const o = byName.get(lc(x.from));
      if (!o) errs.push(`slice "${s.id}": split source "${x.from}" is not in ${id}'s deltas`);
      else for (const sc of x.scenarios) if (!o.scenarios.map(lc).includes(lc(sc))) errs.push(`slice "${s.id}": scenario "${sc}" is not a scenario of "${x.from}"`);
      used.set(lc(x.from), (used.get(lc(x.from)) || 0) + 0.5);
    }
  }
  const amended = new Set(prop.amendments.filter((a) => a.kind === 'Requirement').map((a) => lc(a.name)));
  for (const r of keep) if (!used.has(lc(r.name)) && !amended.has(lc(r.name))) errs.push(`requirement "${r.name}" is in no slice and has no amendment`);
  if (originals.some((r) => r.section === 'REMOVED')) errs.push('REMOVED requirements in the original change are not supported by split apply - move them to a slice by hand first');
  if (errs.length) throw new UsageError(`${proposal}:\n  ${errs.join('\n  ')}`);

  const mainCaps = new Set(mainSpecRequirements(root).map((m) => m.capability));
  const changesDir = path.join(root, 'openspec', 'changes');
  const created = [];
  for (const s of prop.slices) {
    const cdir = path.join(changesDir, s.id);
    if (fs.existsSync(cdir)) throw new UsageError(`openspec/changes/${s.id} already exists`);
  }
  const parentId = parent && parent.id !== id ? parent.id : id;
  for (const s of prop.slices) {
    const cdir = path.join(changesDir, s.id);
    fs.mkdirSync(cdir, { recursive: true });
    fs.writeFileSync(path.join(cdir, '.openspec.yaml'), `schema: handoff-driven\ncreated: ${today()}\n`);
    const reqs = s.requirements.map((n) => byName.get(lc(n)));
    const caps = new Map();
    for (const r of reqs) { if (!caps.has(r.capability)) caps.set(r.capability, []); caps.get(r.capability).push({ section: r.section, text: blockText(src, r), file: r.file }); }
    for (const x of s.split) {
      const o = byName.get(lc(x.from));
      const body = fs.readFileSync(path.join(src, o.file), 'utf8').split(/\r?\n/).slice(o.start + 1, o.end);
      const firstScen = body.findIndex((l) => /^####\s+Scenario:/.test(l));
      const head = (firstScen < 0 ? body : body.slice(0, firstScen)).filter((l) => !/<!--\s*split_from/.test(l)).join('\n').trim();
      const scen = x.scenarios.map((sc) => {
        const i = body.findIndex((l) => new RegExp(`^####\\s+Scenario:\\s*${sc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i').test(l));
        let j = i + 1; while (j < body.length && !/^####\s+Scenario:/.test(body[j])) j++;
        return body.slice(i, j).join('\n').trimEnd();
      });
      if (!caps.has(o.capability)) caps.set(o.capability, []);
      caps.get(o.capability).push({ section: o.section, file: o.file, text: [`### Requirement: ${x.to}`, `<!-- split_from: ${o.name} -->`, head, '', ...scen].join('\n') });
    }
    for (const [cap, blocks] of caps) {
      const purpose = purposeOf(src, blocks[0].file);
      const parts = [];
      if (!mainCaps.has(cap) && purpose) parts.push('## Purpose', '', purpose, '');
      for (const sec of ['ADDED', 'MODIFIED']) {
        const bs = blocks.filter((b) => b.section === sec);
        if (bs.length) parts.push(`## ${sec} Requirements`, '', bs.map((b) => b.text).join('\n\n'), '');
      }
      fs.mkdirSync(path.join(cdir, 'specs', cap), { recursive: true });
      fs.writeFileSync(path.join(cdir, 'specs', cap, 'spec.md'), parts.join('\n'));
    }
    const capsAll = [...new Set([...s.capabilities, ...caps.keys()])];
    fs.writeFileSync(path.join(cdir, 'proposal.md'), [
      '# Proposal', '',
      `> Slice of split change [${parentId}](../${parentId}/slices.md) - shared design session: [../${parentId}/execution/](../${parentId}/execution/).`, '',
      '## Why', '', `${s.goal}. Part of [${parentId}](../${parentId}/proposal.md), split so each PR stays reviewable.`, '',
      '## What Changes', '', `- ${s.goal}`, ...(s.flag ? [`- Behind the feature flag \`${s.flag}\` (off by default); removed later by a cleanup slice.`] : []), ...(s.removes_flag ? [`- Removes the feature flag \`${s.removes_flag}\`.`] : []), '',
      '## Capabilities', '',
      '### New Capabilities', '', ...(capsAll.filter((c) => !mainCaps.has(c)).map((c) => `- \`${c}\``).concat(capsAll.some((c) => !mainCaps.has(c)) ? [] : ['_None._'])), '',
      '### Modified Capabilities', '', ...(capsAll.filter((c) => mainCaps.has(c)).map((c) => `- \`${c}\``).concat(capsAll.some((c) => mainCaps.has(c)) ? [] : ['_None._'])), '',
      '## Impact', '', `See the parent plan [slices.md](../${parentId}/slices.md); depends on: ${s.depends_on.join(', ') || 'none'}.`, '',
      '## Size Budget', '', `- Requirements in deltas: ${reqs.length + s.split.length}`, `- Estimated changed lines: ${Number.isFinite(s.estimate) ? s.estimate : '?'}`, '- Split decision: slice of a split', '',
    ].join('\n'));
    created.push(s.id);
  }

  let pdir;
  if (parentId === id) {
    // convert the original change into the parent (schema split-plan): names only, no behaviour
    pdir = src;
    const checklist = keep.map((r) => [`- [ ] Requirement: ${r.name}`, ...r.scenarios.map((sc) => `  - [ ] Scenario: ${sc}`)].join('\n')).join('\n');
    const amend = ptext.includes('## Amendments') ? ptext.slice(ptext.indexOf('## Amendments') + '## Amendments'.length).split(/^##\s/m)[0].trim() : '';
    fs.writeFileSync(path.join(src, 'slices.md'), [
      '---', `parent: ${id}`, `approved_by: ${prop.front.approved_by}`, `split_at: ${today()}`, '---', '',
      `# Slices: ${id}`, '',
      'Parent of a split change (schema split-plan). Names only - behaviour lives in the child deltas. Never edit behaviour here; record changes as amendments.',
      `Archive this parent last: \`openspec archive ${id} --skip-specs --yes\` after \`split.mjs loss ${id} --final\` passes. Never run /opsx:verify on it.`, '',
      '## Slices', '', prop.slices.map(sliceBlock).join('\n\n'), '',
      '## Checklist (original requirement and scenario names)', '', checklist, '',
      '## Amendments', '', amend || '_None._', '',
    ].join('\n'));
    let y = fs.readFileSync(path.join(src, '.openspec.yaml'), 'utf8').replace(/^schema:.*$/m, 'schema: split-plan');
    if (!/^skip_specs:/m.test(y)) y = y.trimEnd() + '\nskip_specs: true\n';
    fs.writeFileSync(path.join(src, '.openspec.yaml'), y);
    fs.rmSync(path.join(src, 'specs'), { recursive: true, force: true });
  } else {
    // re-split: replace the slice in the same parent (no nested parents)
    pdir = parent.dir;
    const f = path.join(pdir, 'slices.md');
    let text = fs.readFileSync(f, 'utf8');
    const old = parent.plan.slices.find((s) => s.id === id);
    const re = new RegExp(`### Slice: ${id}\\n(?:- [a-z_]+:.*\\n?)*`);
    text = text.replace(re, prop.slices.map(sliceBlock).join('\n\n') + '\n');
    const newIds = prop.slices.map((s) => s.id);
    text = text.replace(/^(- depends_on:\s*)(.*)$/gm, (m, a, v) => a + v.split(',').map((x) => x.trim()).flatMap((x) => (x === id ? newIds : [x])).filter(Boolean).join(', '));
    text = text.replace(/(## Amendments\s*\n\s*\n)/, `$1- Slice "${id}" re-split into ${newIds.join(', ')} (${today()}, approved by ${prop.front.approved_by})\n`);
    fs.writeFileSync(f, text);
    if (old) fs.rmSync(src, { recursive: true, force: true });
  }
  return { parent: parentId, parentDir: pdir, created, resplit: parentId !== id };
}

// ------------------------------------------------------------------ CLI
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { root: { type: 'string' }, json: { type: 'boolean' }, final: { type: 'boolean' }, write: { type: 'boolean' }, 'write-tickets': { type: 'boolean' }, proposal: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
  });
  const [cmd, id] = positionals;
  if (values.help || !['apply', 'loss', 'next'].includes(cmd) || !id) {
    console.log('usage: split apply <change> [--proposal <file>] | split loss <parent> [--final] [--write] | split next <parent> [--write-tickets]  [--root <dir>] [--json]');
    return values.help ? 0 : 2;
  }
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  if (!root) throw new UsageError('no openspec/changes directory found (use --root)');
  if (cmd === 'apply') {
    const r = applySplit(root, id, values.proposal ? { proposal: values.proposal } : {});
    console.log(`split apply ${id}: ${r.resplit ? `re-split into parent ${r.parent}` : `parent ${r.parent} (schema split-plan)`}; children: ${r.created.join(', ')}`);
    console.log('  Child deltas hold the original requirement blocks verbatim; narrow any split requirement by hand (keep its <!-- split_from --> line).');
    const loss = lossCheck(root, r.parent);
    console.log(formatLoss(loss));
    const nx = nextReport(root, r.parent);
    const t = writeTickets(root, nx);
    console.log(`  tickets written for READY slices: ${t.join(', ') || 'none'}`);
    return loss.errors.length ? 1 : 0;
  }
  if (cmd === 'loss') {
    const r = lossCheck(root, id, { final: values.final });
    if (values.write && values.final && !r.errors.length) tickChecklist(parentDir(root, id).dir, r.ticks);
    console.log(values.json ? JSON.stringify(r, null, 2) : formatLoss(r));
    return r.errors.length ? 1 : 0;
  }
  const r = nextReport(root, id);
  const t = values['write-tickets'] ? writeTickets(root, r) : [];
  const r2 = t.length ? nextReport(root, id) : r;
  console.log(values.json ? JSON.stringify({ ...r2, dir: undefined, plan: undefined, written: t }, null, 2) : formatNext(r2) + (values['write-tickets'] ? `\nTickets written: ${t.join(', ') || 'none new'}` : ''));
  return 0;
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(new URL(import.meta.url).pathname)) {
  main().then((c) => process.exit(c)).catch((e) => {
    console.error(`split: ${e.message}`);
    process.exit(e instanceof UsageError ? 2 : 1);
  });
}
