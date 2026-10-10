#!/usr/bin/env node
// split: turn an approved split proposal into a parent + child changes, check nothing was lost,
// and report which slices are ready. Nothing is split without an approved proposal.
//   apply <change>               execution/split-proposal.md (approved_by set) -> children + parent
//                                (a change that is already a slice is re-split into the same parent)
//   loss  <parent> [--final]     loss check: the original deltas at the split commit (git baseline)
//                                vs the child deltas + the children's "## Split notes";
//                                --final: also vs the main specs, before the parent is archived
//   next  <parent>               ready / parallel-safe report; --write-tickets writes tickets/<slice>.md
//                                (Jira-pasteable) for READY slices into the parent
//   mark  <parent> <slice> <in-progress|planned>   the engineer's status mark in slices.md
// Options: --root <dir> --json
// Exit: 0 ok, 1 findings (loss) / refused (apply), 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findProjectRoot, git, UsageError } from './lib/change.mjs';
import {
  baselineDeltas, changeDeltas, dependencyClosure, changeLocation, findParentOf, lintSlices, mainSpecRequirements,
  nameLeaks, parentDir, parseSlices, parseSplitNotes, readiness, SLICE_STATUSES,
} from './lib/split.mjs';

const lc = (s) => s.trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const q = (n) => `"${n}"`;

// ------------------------------------------------------------------ loss check
/** Child deltas + split notes of every slice of a parent. */
function children(root, plan, errors) {
  const reqs = []; const removed = []; const notes = []; const archived = {};
  for (const s of plan.slices) {
    const loc = changeLocation(root, s.id);
    if (!loc) { errors.push(`slice "${s.id}": no change folder (openspec/changes/${s.id})`); continue; }
    archived[s.id] = loc.archived;
    for (const r of changeDeltas(loc.dir)) (r.section === 'REMOVED' ? removed : reqs).push({ ...r, slice: s.id });
    const pf = path.join(loc.dir, 'proposal.md');
    const sn = parseSplitNotes(fs.existsSync(pf) ? fs.readFileSync(pf, 'utf8') : '');
    for (const e of sn.errors) errors.push(`${s.id}/${e}`);
    // global, deduplicated (a re-split carries the old slice's notes into every new child) -
    // except split_from confirmations, which each receiving child records for itself
    for (const n of sn.notes) if (!notes.some((x) => x.type === n.type && x.kind === n.kind && lc(x.name) === lc(n.name) && lc(x.to || '') === lc(n.to || '') && (n.type !== 'split' || x.slice === s.id))) notes.push({ ...n, slice: s.id });
  }
  return { reqs, removed, notes, archived };
}

export function lossCheck(root, parentId, { final = false } = {}) {
  const { dir } = parentDir(root, parentId);
  const plan = parseSlices(fs.readFileSync(path.join(dir, 'slices.md'), 'utf8'));
  const errors = []; const warnings = []; const confirm = []; const rows = [];
  const commit = plan.front.split_commit;
  if (!commit) throw new UsageError(`${parentId}/slices.md has no "split_commit:" - the loss-check baseline is the original deltas at that commit`);
  const original = plan.front.original || parentId;
  const base = baselineDeltas(root, commit, original).filter((r) => r.section !== 'REMOVED');
  for (const d of plan.duplicates) warnings.push(`slices.md:${d.line}: slice "${d.slice}" has "${d.field}:" twice (a union merge of two branches?) - keep one; the last one wins`);
  const { reqs: child, removed, notes, archived } = children(root, plan, errors);
  if (final) for (const s of plan.slices) if (archived[s.id] === false) errors.push(`slice "${s.id}" is not archived yet - the parent is archived last`);
  const note = (type, kind, name) => notes.filter((n) => n.type === type && n.kind === kind && lc(n.name) === lc(name));
  const origReq = new Set(base.map((r) => lc(r.name)));
  const origScen = new Set(base.flatMap((r) => r.scenarios.map(lc)));
  const where = (xs) => xs.map((c) => c.slice).join(', ');
  const finalNames = {}; // original requirement -> names it lives under now
  const finalScen = {};
  const unmatched = { Requirement: [], Scenario: [] };

  for (const r of base) {
    const holders = child.filter((c) => lc(c.name) === lc(r.name));
    const splits = child.filter((c) => c.splitFrom && lc(c.splitFrom) === lc(r.name));
    const renames = note('renamed', 'Requirement', r.name).map((n) => ({ n, hosts: child.filter((c) => lc(c.name) === lc(n.to)) }));
    const dropped = note('dropped', 'Requirement', r.name);
    let verdict;
    const homes = [...holders, ...renames.flatMap((x) => x.hosts)];
    for (const x of renames) if (!x.hosts.length) errors.push(`${x.n.slice}: renamed_from ${q(r.name)} -> ${q(x.n.to)}, but no child delta has Requirement ${q(x.n.to)}`);
    if (dropped.length) {
      verdict = `dropped (split note in ${where(dropped)})`;
      if (homes.length || splits.length) errors.push(`Requirement ${q(r.name)}: dropped in ${where(dropped)} but still in ${where([...homes, ...splits])}`);
    } else if (homes.length > 1 || (homes.length === 1 && splits.length)) {
      verdict = 'DUPLICATE'; errors.push(`Requirement ${q(r.name)}: in more than one child (${where([...homes, ...splits])})`);
    } else if (homes.length === 1) {
      const h = homes[0];
      verdict = lc(h.name) === lc(r.name) ? h.slice : `${h.slice} as ${q(h.name)} (renamed_from)`;
      finalNames[r.name] = [h.name];
    } else if (splits.length) {
      verdict = `split into ${splits.map((c) => `${q(c.name)} (${c.slice})`).join(', ')}`;
      const unconfirmed = splits.filter((c) => !note('split', 'Requirement', r.name).some((n) => n.slice === c.slice));
      for (const c of unconfirmed) {
        errors.push(`Requirement ${q(r.name)}: split_from in ${c.slice} (${q(c.name)}) needs confirmation`);
        confirm.push(`${c.slice}/proposal.md "## Split notes": - split_from: Requirement ${q(r.name)} - confirmed`);
      }
      finalNames[r.name] = splits.map((c) => c.name);
    } else {
      verdict = 'MISSING'; unmatched.Requirement.push(r.name);
      errors.push(`Requirement ${q(r.name)}: in no child delta and no split note covers it`);
    }
    const scen = r.scenarios.map((sname) => {
      if (dropped.length) return { name: sname, at: 'dropped with its requirement' };
      const occ = child.filter((c) => c.scenarios.some((x) => lc(x) === lc(sname)));
      const ren = note('renamed', 'Scenario', sname).map((n) => ({ n, hosts: child.filter((c) => c.scenarios.some((x) => lc(x) === lc(n.to))) }));
      for (const x of ren) if (!x.hosts.length) errors.push(`${x.n.slice}: renamed_from Scenario ${q(sname)} -> ${q(x.n.to)}, but no child delta has that scenario`);
      const sDrop = note('dropped', 'Scenario', sname);
      const all = [...occ, ...ren.flatMap((x) => x.hosts)];
      if (sDrop.length) {
        if (all.length) errors.push(`Scenario ${q(sname)}: dropped in ${where(sDrop)} but still in ${where(all)}`);
        return { name: sname, at: `dropped (split note in ${where(sDrop)})` };
      }
      if (!all.length) { unmatched.Scenario.push(sname); errors.push(`Scenario ${q(sname)} (of ${q(r.name)}): in no child delta and no split note covers it`); return { name: sname, at: 'MISSING' }; }
      if (all.length > 1) { errors.push(`Scenario ${q(sname)}: in more than one child (${where(all)})`); return { name: sname, at: 'DUPLICATE' }; }
      const host = all[0];
      const renamedTo = ren.find((x) => x.hosts.length)?.n.to;
      finalScen[sname] = renamedTo || sname;
      if (homes.length === 1 && host !== homes[0] && !(host.splitFrom && lc(host.splitFrom) === lc(r.name))) warnings.push(`Scenario ${q(sname)} moved from ${q(r.name)} to ${q(host.name)} (${host.slice})`);
      return { name: sname, at: renamedTo ? `${host.slice} as ${q(renamedTo)} (renamed_from)` : host.slice };
    });
    rows.push({ requirement: r.name, verdict, scenarios: scen });
  }
  // unsourced: child names that are not originals, splits, renames or added in a split note
  const renamedTo = (kind) => new Set(notes.filter((n) => n.type === 'renamed' && n.kind === kind).map((n) => lc(n.to)));
  const unsourced = { Requirement: [], Scenario: [] };
  for (const c of child) {
    const ok = origReq.has(lc(c.name)) || (c.splitFrom && origReq.has(lc(c.splitFrom))) || renamedTo('Requirement').has(lc(c.name));
    const added = note('added', 'Requirement', c.name).length > 0;
    if (c.splitFrom && !origReq.has(lc(c.splitFrom))) errors.push(`${c.slice}: ${q(c.name)} has split_from ${q(c.splitFrom)}, which is not an original requirement`);
    if (!ok && !added) { unsourced.Requirement.push(`${q(c.name)} (${c.slice})`); errors.push(`${c.slice}: Requirement ${q(c.name)} is unsourced (not an original name, no split_from, no "added:" or "renamed_from:" split note)`); }
    if (added) continue; // an added requirement brings its own scenarios
    for (const sname of c.scenarios) {
      if (origScen.has(lc(sname)) || renamedTo('Scenario').has(lc(sname)) || note('added', 'Scenario', sname).length) continue;
      unsourced.Scenario.push(`${q(sname)} (${c.slice}, ${q(c.name)})`);
      errors.push(`${c.slice}: Scenario ${q(sname)} is unsourced (not an original scenario, no "added:" or "renamed_from:" split note)`);
    }
  }
  for (const n of notes) {
    if ((n.type === 'dropped' || n.type === 'renamed' || n.type === 'split') && !(n.kind === 'Requirement' ? origReq : origScen).has(lc(n.name))) errors.push(`${n.slice}/proposal.md:${n.line}: split note names ${n.kind} ${q(n.name)}, which is not in the original deltas at ${commit.slice(0, 7)}`);
  }
  // Q7: unmatched originals next to unsourced child names - the agent judges equivalence
  const candidates = ['Requirement', 'Scenario'].filter((k) => unmatched[k].length && unsourced[k].length).map((k) => ({ kind: k, originals: unmatched[k], childNames: unsourced[k] }));
  // final: what the children delivered is in the main specs
  let finalChecked = 0;
  if (final) {
    const main = mainSpecRequirements(root);
    const inMain = (n) => main.some((m) => lc(m.name) === lc(n));
    const mainScen = new Set(main.flatMap((m) => m.scenarios.map(lc)));
    for (const [orig, names] of Object.entries(finalNames)) {
      const absent = names.filter((n) => !inMain(n));
      if (absent.length) errors.push(`final: Requirement ${q(orig)} not in the main specs (missing: ${absent.join(', ')})`); else finalChecked++;
    }
    for (const [orig, name] of Object.entries(finalScen)) if (!mainScen.has(lc(name))) errors.push(`final: Scenario ${q(name)}${name !== orig ? ` (renamed from ${q(orig)})` : ''} not in the main specs`);
    for (const n of notes.filter((x) => x.type === 'added' && x.kind === 'Requirement')) {
      const cleaned = removed.some((r) => lc(r.name) === lc(n.name));
      if (cleaned && inMain(n.name)) errors.push(`final: Requirement ${q(n.name)} (added in ${n.slice}) was removed by a cleanup slice but is still in the main specs`);
    }
  }
  return { parent: parentId, commit, final, slices: plan.slices.length, requirements: base.length, scenarios: origScen.size, notes: notes.length, rows, errors, warnings, confirm, candidates, finalChecked };
}

export function formatLoss(r) {
  const out = [`loss-check ${r.parent} (${r.final ? 'final, before archiving the parent' : 'after split'}): ${r.errors.length ? 'FAIL' : 'PASS'}`];
  out.push(`  baseline: original deltas at split commit ${r.commit.slice(0, 7)} (git show) - ${r.requirements} requirements, ${r.scenarios} scenarios; slices: ${r.slices}; split notes: ${r.notes}`);
  for (const row of r.rows) {
    const bad = /MISSING|DUPLICATE/.test(row.verdict) || row.scenarios.some((s) => /MISSING|DUPLICATE/.test(s.at));
    out.push(`  ${bad ? '✗' : '✓'} Requirement "${row.requirement}" -> ${row.verdict}`);
    for (const s of row.scenarios) out.push(`      ${/MISSING|DUPLICATE/.test(s.at) ? '✗' : '·'} Scenario "${s.name}" -> ${s.at}`);
  }
  for (const e of r.errors) out.push(`  ✗ ${e}`);
  for (const w of r.warnings) out.push(`  ! ${w}`);
  if (r.final && !r.errors.length) out.push(`  main specs: all ${r.finalChecked} delivered requirements present; cleanup-removed requirements absent`);
  for (const c of r.candidates) {
    out.push(`  Possible renames (${c.kind}) - judge semantic equivalence:`, `    unmatched originals: ${c.originals.map(q).join(', ')}`, `    child names with no original: ${c.childNames.join(', ')}`,
      `    equivalent -> add to that child's proposal.md "## Split notes": - renamed_from: ${c.kind} "<original>" -> "<new>" - <why equivalent>`,
      '    not equivalent -> the original stays missing until restored in a child or recorded "- dropped:" (and the new name "- added:")');
  }
  if (r.confirm.length) out.push('  To confirm a split, check the child deltas together cover the original requirement, then add:', ...r.confirm.map((c) => `    ${c}`));
  return out.join('\n');
}

/** The parent is a control plane: no original requirement/scenario names in its own files. */
export function parentLeaks(root, parentId) {
  const { dir } = parentDir(root, parentId);
  const plan = parseSlices(fs.readFileSync(path.join(dir, 'slices.md'), 'utf8'));
  if (!plan.front.split_commit) return [];
  const base = baselineDeltas(root, plan.front.split_commit, plan.front.original || parentId);
  const names = base.flatMap((r) => [r.name, ...r.scenarios]);
  const files = ['slices.md', 'proposal.md', ...(fs.existsSync(path.join(dir, 'tickets')) ? fs.readdirSync(path.join(dir, 'tickets')).map((f) => `tickets/${f}`) : [])];
  const out = [];
  for (const f of files) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    for (const l of nameLeaks(fs.readFileSync(p, 'utf8'), names)) out.push(`${parentId}/${f}:${l.line}: names ${q(l.name)} - the parent is a control plane (why/scope + slices); rephrase without requirement or scenario names`);
  }
  return out;
}

/** The shared design session stays in the parent (slices read it); it predates the split and names behaviour. Reported, not failed. */
export function sessionMentions(root, parentId) {
  const { dir } = parentDir(root, parentId);
  const plan = parseSlices(fs.readFileSync(path.join(dir, 'slices.md'), 'utf8'));
  if (!plan.front.split_commit) return [];
  const names = baselineDeltas(root, plan.front.split_commit, plan.front.original || parentId).flatMap((r) => [r.name, ...r.scenarios]);
  const out = [];
  for (const f of ['execution/grill.md', 'execution/brainstorm.md']) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    const n = new Set(nameLeaks(fs.readFileSync(p, 'utf8'), names).map((l) => l.name)).size;
    if (n) out.push(`${parentId}/${f} (shared design session, written before the split) names ${n} original requirements/scenarios - it is the slices' design record, not a control-plane file; never update it after the split`);
  }
  return out;
}

// ------------------------------------------------------------------ next / tickets / mark
export function nextReport(root, parentId) {
  const { dir } = parentDir(root, parentId);
  const plan = parseSlices(fs.readFileSync(path.join(dir, 'slices.md'), 'utf8'));
  let branch = null;
  try { branch = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']).trim(); } catch { /* not a git checkout */ }
  return { parent: parentId, dir, plan, branch, ...readiness(root, plan) };
}

export function formatNext(r) {
  const done = r.rows.filter((x) => x.status === 'done').length;
  const out = [`split next ${r.parent}: ${done}/${r.rows.length} slices done (archived folder present${r.branch ? ` on ${r.branch}` : ''})`];
  if (r.branch && !['main', 'master'].includes(r.branch)) out.push(`  note: completion is read from this checkout - run on main (a slice is done when its archive is merged to main)`);
  out.push('', '| Slice | Status | Depends on | Ready | Flag | Ticket |', '|---|---|---|---|---|---|');
  for (const x of r.rows) out.push(`| ${x.id} | ${x.status} | ${x.depends_on.join(', ') || '-'} | ${x.ready ? 'READY' : x.status === 'done' ? 'done' : x.status === 'in progress' ? '(taken)' : `waits for ${x.waiting.join(', ')}`} | ${x.flag || (x.removes_flag ? `removes ${x.removes_flag}` : '-')} | ${x.ticket || '-'} |`);
  const inProg = r.rows.filter((x) => x.status === 'in progress');
  out.push('', `Ready now: ${r.ready.map((x) => x.id).join(', ') || (done === r.rows.length ? 'none - all slices done; run the final loss check, then archive the parent with --skip-specs' : 'none')}`);
  if (inProg.length) out.push(`In progress (engineer's mark): ${inProg.map((x) => x.id).join(', ')}`);
  const safe = r.pairs.filter((p) => p.bothReady && p.safe);
  const unsafe = r.pairs.filter((p) => p.bothReady && !p.safe);
  out.push(`Parallel-safe now (both ready, no dependency, no shared capability): ${safe.map((p) => `${p.a} ∥ ${p.b}`).join(', ') || 'none'}`);
  if (unsafe.length) out.push(`Ready but NOT parallel-safe: ${unsafe.map((p) => `${p.a} / ${p.b} (${p.shared.length ? `shared capability ${p.shared.join(', ')}` : 'dependency'})`).join(', ')}`);
  const active = r.pairs.filter((p) => p.active && p.safe);
  if (active.length) out.push(`Parallel-safe with work in progress (taken or ready, no dependency, no shared capability): ${active.map((p) => `${p.a} ∥ ${p.b}`).join(', ')}`);
  const activeUnsafe = r.pairs.filter((p) => p.active && !p.safe);
  if (activeUnsafe.length) out.push(`NOT parallel-safe with work in progress: ${activeUnsafe.map((p) => `${p.a} / ${p.b} (${p.independent ? `shared capability ${p.shared.join(', ')}` : 'dependency'})`).join('; ')}`);
  const later = r.pairs.filter((p) => !p.bothReady && !p.active && p.safe);
  if (later.length) out.push(`Parallel-safe later: ${later.map((p) => `${p.a} ∥ ${p.b}`).join(', ')}`);
  return out.join('\n');
}

export function writeTickets(root, r) {
  const written = [];
  for (const s of r.ready) {
    const rel = `tickets/${s.id}.md`;
    const f = path.join(r.dir, rel);
    if (fs.existsSync(f)) continue;
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, [
      `Summary: [${r.parent}] ${s.id} - ${s.goal}`,
      'Issue type: Story',
      `Labels: openspec, split-${r.parent}${s.flag ? `, flag-${s.flag}` : ''}`,
      `Depends on: ${s.depends_on.join(', ') || 'none'}${s.depends_on.length ? ' (all done)' : ''}`,
      '',
      'Description:',
      s.goal,
      '',
      `Behaviour: openspec/changes/${s.id}/specs/ (the slice's delta - the only place behaviour is written).`,
      `Parent plan: openspec/changes/${r.parent}/slices.md`,
      s.flag ? `Feature flag: ${s.flag} (user-visible behaviour stays off until the cleanup slice removes the flag)` : null,
      s.removes_flag ? `Removes feature flag: ${s.removes_flag}` : null,
      '',
      `Start: node .openspec-handoff/scripts/split.mjs mark ${r.parent} ${s.id} in-progress (commit it on main), then git switch -c change/${s.id} main, the slice's design session and /handoff ${s.id}.`,
      `Size: line estimate after planning (/spec-check ${s.id}), budget ~300 lines of code + tests.`,
      `Done when: /opsx:verify ${s.id} passes and /opsx:archive ${s.id} is committed in the slice's own PR with its code, merged to main.`,
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
  if (start < 0) throw new UsageError(`no slice "${id}" in ${f}`);
  let i = start + 1; let set = false;
  for (; i < lines.length && /^-\s+[a-z_]+:/.test(lines[i]); i++) if (lines[i].startsWith(`- ${key}:`)) { lines[i] = `- ${key}: ${value}`; set = true; }
  if (!set) lines.splice(i, 0, `- ${key}: ${value}`);
  fs.writeFileSync(f, lines.join('\n'));
}

export function markSlice(root, parentId, sliceId, status) {
  if (!SLICE_STATUSES.includes(status)) throw new UsageError(`status must be one of ${SLICE_STATUSES.join(', ')} (done = the archived folder on main)`);
  setSliceField(parentDir(root, parentId).dir, sliceId, 'status', status);
}

// ------------------------------------------------------------------ apply
function sliceBlock(s) {
  const out = [`### Slice: ${s.id}`, `- goal: ${s.goal}`, `- capabilities: ${s.capabilities.join(', ') || 'none'}`];
  out.push(`- depends_on: ${s.depends_on.join(', ') || 'none'}`, `- flag: ${s.flag || 'none'}`);
  if (s.removes_flag) out.push(`- removes_flag: ${s.removes_flag}`);
  out.push(`- ticket: ${s.ticket || 'none'}`, `- status: ${s.status && s.status !== 'planned' ? s.status : 'planned'}`);
  return out.join('\n');
}

function blockText(dir, r) {
  return fs.readFileSync(path.join(dir, r.file), 'utf8').split(/\r?\n/).slice(r.start, r.end).join('\n').trimEnd();
}
function purposeOf(dir, file) {
  const m = /^##\s+Purpose\s*\n([\s\S]*?)(?=^##\s)/m.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
  return m ? m[1].trim() : null;
}
function splitNotesOf(dir) {
  const f = path.join(dir, 'proposal.md');
  if (!fs.existsSync(f)) return '';
  const t = fs.readFileSync(f, 'utf8');
  const m = /^##\s+Split notes\s*$/m.exec(t);
  return m ? t.slice(m.index + m[0].length).split(/^##\s/m)[0].trim().replace(/^_None\._$/m, '').trim() : '';
}

export function applySplit(root, id, { proposal = 'execution/split-proposal.md' } = {}) {
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
  const resplit = Boolean(parent && parent.id !== id);
  let splitCommit = null;
  if (!resplit) {
    // the loss-check baseline: the original deltas, committed and unchanged
    const rel = path.relative(root, path.join(src, 'specs'));
    let dirty; let tracked;
    try {
      dirty = git(root, ['status', '--porcelain', '--', rel]).trim();
      tracked = git(root, ['ls-tree', '-r', '--name-only', 'HEAD', '--', rel]).trim();
      splitCommit = git(root, ['rev-parse', 'HEAD']).trim();
    } catch (e) { throw new UsageError(`split apply needs git: the original deltas at a commit are the loss-check baseline (${String(e.message).split('\n')[0]})`); }
    if (!tracked || dirty) throw new UsageError(`commit ${rel} first (clean, committed) - that commit is the loss-check baseline${dirty ? `\n  uncommitted: ${dirty.split('\n').join(', ')}` : ''}`);
  }
  const combined = resplit
    ? { ...prop, slices: [...parent.plan.slices.filter((s) => s.id !== id).map((s) => ({ ...s, depends_on: s.depends_on.flatMap((d) => (d === id ? prop.slices.map((x) => x.id) : [d])) })), ...prop.slices] }
    : prop;
  const lint = lintSlices(combined, { text: ptext.replace(/^---[\s\S]*?---/, '') });
  if (lint.errors.length) throw new UsageError(`${proposal}:\n  ${lint.errors.join('\n  ')}`);
  if (resplit && prop.slices.some((s) => s.id === id)) throw new UsageError(`re-split: the new slices must have new ids (not "${id}")`);
  const originals = changeDeltas(src);
  const keep = originals.filter((r) => r.section !== 'REMOVED');
  const byName = new Map(keep.map((r) => [lc(r.name), r]));
  const errs = [];
  const used = new Set();
  for (const s of prop.slices) {
    for (const n of s.requirements) { if (!byName.has(lc(n))) errs.push(`slice "${s.id}": requirement "${n}" is not in ${id}'s deltas`); if (used.has(lc(n))) errs.push(`requirement "${n}" is in two slices`); used.add(lc(n)); }
    for (const x of s.split) {
      const o = byName.get(lc(x.from));
      if (!o) errs.push(`slice "${s.id}": split source "${x.from}" is not in ${id}'s deltas`);
      else for (const sc of x.scenarios) if (!o.scenarios.map(lc).includes(lc(sc))) errs.push(`slice "${s.id}": scenario "${sc}" is not a scenario of "${x.from}"`);
      used.add(lc(x.from));
    }
  }
  for (const r of keep) if (!used.has(lc(r.name))) errs.push(`requirement "${r.name}" is in no slice (to drop it, put it in a slice and record "- dropped:" in that child's split notes after the split)`);
  if (originals.some((r) => r.section === 'REMOVED')) errs.push('REMOVED requirements in the original change are not supported by split apply - move them to a slice by hand first');
  if (errs.length) throw new UsageError(`${proposal}:\n  ${errs.join('\n  ')}`);

  const mainCaps = new Set(mainSpecRequirements(root).map((m) => m.capability));
  const depClosure = dependencyClosure(prop.slices);
  const changesDir = path.join(root, 'openspec', 'changes');
  for (const s of prop.slices) if (fs.existsSync(path.join(changesDir, s.id))) throw new UsageError(`openspec/changes/${s.id} already exists`);
  const parentId = resplit ? parent.id : id;
  const carried = resplit ? splitNotesOf(src) : '';
  const created = [];
  for (const s of prop.slices) {
    const cdir = path.join(changesDir, s.id);
    fs.mkdirSync(cdir, { recursive: true });
    fs.writeFileSync(path.join(cdir, '.openspec.yaml'), `schema: handoff-driven\ncreated: ${today()}\n`);
    const caps = new Map();
    for (const r of s.requirements.map((n) => byName.get(lc(n)))) { if (!caps.has(r.capability)) caps.set(r.capability, []); caps.get(r.capability).push({ section: r.section, text: blockText(src, r), file: r.file }); }
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
    // a capability an earlier slice (in depends_on, transitively) creates is "modified" here: it exists by the time this slice runs
    const earlier = new Set([...(depClosure[s.id] || [])].flatMap((d) => prop.slices.find((x) => x.id === d)?.capabilities || []));
    const isNew = (c) => !mainCaps.has(c) && !earlier.has(c);
    fs.writeFileSync(path.join(cdir, 'proposal.md'), [
      '# Proposal', '',
      `> Slice of split change [${parentId}](../${parentId}/slices.md) - shared design session: [../${parentId}/execution/](../${parentId}/execution/).`, '',
      '## Why', '', `${s.goal}. Part of [${parentId}](../${parentId}/proposal.md), split so each PR stays reviewable.`, '',
      '## What Changes', '', `- ${s.goal}`, ...(s.flag ? [`- Behind the feature flag \`${s.flag}\` (off by default); removed later by a cleanup slice.`] : []), ...(s.removes_flag ? [`- Removes the feature flag \`${s.removes_flag}\`.`] : []), '',
      '## Capabilities', '',
      '### New Capabilities', '', ...(capsAll.filter(isNew).map((c) => `- \`${c}\``).concat(capsAll.some(isNew) ? [] : ['_None._'])), '',
      '### Modified Capabilities', '', ...(capsAll.filter((c) => !isNew(c)).map((c) => `- \`${c}\``).concat(capsAll.some((c) => !isNew(c)) ? [] : ['_None._'])), '',
      '## Impact', '', `See the parent plan [slices.md](../${parentId}/slices.md); depends on: ${s.depends_on.join(', ') || 'none'}.`, '',
      '## Split notes', '',
      '<!-- Deliberate differences from the original change, recorded by this slice (split.mjs loss reads them):', '     - dropped: Requirement|Scenario "<original name>" - <why>', '     - added: Requirement|Scenario "<new name>" - <why>', '     - renamed_from: Requirement|Scenario "<original name>" -> "<new name>" - <why equivalent>', '     - split_from: Requirement "<original name>" - confirmed -->', '',
      carried || '_None._', '',
    ].join('\n'));
    created.push(s.id);
  }

  let pdir;
  const warnings = [];
  if (!resplit) {
    // convert the original change into the parent (schema split-plan): a control plane, no names, no behaviour
    pdir = src;
    fs.writeFileSync(path.join(src, 'slices.md'), [
      '---', `parent: ${id}`, `approved_by: ${prop.front.approved_by}`, `split_at: ${today()}`, `split_commit: ${splitCommit}`, '---', '',
      `# Slices: ${id}`, '',
      'Control plane of a split change (schema split-plan): why/scope is in proposal.md, the slices are below. No requirement or scenario names and no behaviour here - they live in the child deltas; deliberate differences are "## Split notes" in the child proposals.',
      `Loss-check baseline: the original deltas at split_commit (\`git show ${splitCommit.slice(0, 7)}:openspec/changes/${id}/specs/...\`).`,
      `Status: mark a slice "in-progress" when you take it (\`split.mjs mark ${id} <slice> in-progress\`); it is done when its archived folder is on main.`,
      `Archive this parent last: \`split.mjs loss ${id} --final\`, then \`openspec archive ${id} --skip-specs --yes\`. Never run /opsx:verify on it.`, '',
      '## Slices', '', prop.slices.map(sliceBlock).join('\n\n'), '',
    ].join('\n'));
    let y = fs.readFileSync(path.join(src, '.openspec.yaml'), 'utf8').replace(/^schema:.*$/m, 'schema: split-plan');
    if (!/^skip_specs:/m.test(y)) y = y.trimEnd() + '\nskip_specs: true\n';
    fs.writeFileSync(path.join(src, '.openspec.yaml'), y);
    fs.rmSync(path.join(src, 'specs'), { recursive: true, force: true });
    for (const f of [proposal, 'execution/size-estimate.md' /* legacy v5 file */]) fs.rmSync(path.join(src, f), { force: true });
  } else {
    // re-split: replace the slice in the same parent (no nested parents); its split notes go to every new child
    pdir = parent.dir;
    const f = path.join(pdir, 'slices.md');
    let text = fs.readFileSync(f, 'utf8');
    const re = new RegExp(`### Slice: ${id}\\n(?:- [a-z_]+:.*\\n?)*`);
    text = text.replace(re, prop.slices.map(sliceBlock).join('\n\n') + '\n');
    const newIds = prop.slices.map((s) => s.id);
    text = text.replace(/^(- depends_on:\s*)(.*)$/gm, (m, a, v) => a + v.split(',').map((x) => x.trim()).flatMap((x) => (x === id ? newIds : [x])).filter(Boolean).join(', '));
    fs.writeFileSync(f, text);
    fs.rmSync(src, { recursive: true, force: true });
  }
  return { parent: parentId, parentDir: pdir, created, resplit, splitCommit, warnings };
}

// ------------------------------------------------------------------ CLI
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { root: { type: 'string' }, json: { type: 'boolean' }, final: { type: 'boolean' }, 'write-tickets': { type: 'boolean' }, proposal: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
  });
  const [cmd, id, a3, a4] = positionals;
  if (values.help || !['apply', 'loss', 'next', 'mark'].includes(cmd) || !id || (cmd === 'mark' && !a4)) {
    console.log('usage: split apply <change> [--proposal <file>] | split loss <parent> [--final] | split next <parent> [--write-tickets] | split mark <parent> <slice> <in-progress|planned>  [--root <dir>] [--json]');
    return values.help ? 0 : 2;
  }
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  if (!root) throw new UsageError('no openspec/changes directory found (use --root)');
  if (cmd === 'apply') {
    const r = applySplit(root, id, values.proposal ? { proposal: values.proposal } : {});
    console.log(`split apply ${id}: ${r.resplit ? `re-split into parent ${r.parent}` : `parent ${r.parent} (schema split-plan, split_commit ${r.splitCommit.slice(0, 7)})`}; children: ${r.created.join(', ')}`);
    console.log('  Child deltas hold the original requirement blocks verbatim; narrow any split requirement by hand (keep its <!-- split_from --> line).');
    const loss = lossCheck(root, r.parent);
    console.log(formatLoss(loss));
    const leaks = parentLeaks(root, r.parent);
    for (const l of leaks) console.log(`  ✗ ${l}`);
    const t = writeTickets(root, nextReport(root, r.parent));
    console.log(`  tickets written for READY slices: ${t.join(', ') || 'none'}`);
    return loss.errors.length || leaks.length ? 1 : 0;
  }
  if (cmd === 'mark') {
    markSlice(root, id, a3, a4);
    console.log(`split mark ${id}: ${a3} -> ${a4} (commit slices.md on main so others see it)`);
    return 0;
  }
  if (cmd === 'loss') {
    const r = lossCheck(root, id, { final: values.final });
    const leaks = parentLeaks(root, id);
    r.errors.push(...leaks);
    r.warnings.push(...sessionMentions(root, id));
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
