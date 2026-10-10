// Change splitting (docs/decisions.md section 10). Zero dependencies.
// A change that is too big for one PR becomes a PARENT (schema split-plan: proposal.md +
// slices.md, no behaviour) and CHILD changes (schema handoff-driven, one per slice, live deltas).
import fs from 'node:fs';
import path from 'node:path';
import { git, listFiles, UsageError } from './change.mjs';

export const SPLIT_LIMIT_DEFAULT = 300; // estimated changed lines (code + tests) per PR, checked after planning (/spec-check)
export const SPLIT_MAX_REQUIREMENTS = 5; // /split-check warns above this many delta requirements
export const SPLIT_MAX_CAPABILITIES = 2; // ... or above this many capabilities
const lc = (s) => s.trim().toLowerCase();
const datePrefix = /^\d{4}-\d{2}-\d{2}-/;

// ---------------------------------------------------------------- deltas
/**
 * Parse delta specs: [{ name, section: ADDED|MODIFIED|REMOVED|RENAMED, capability, file,
 * splitFrom, scenarios: [name], start, end }] (start/end: line range of the block in the file).
 */
export function parseDelta(text, capability = '', file = '') {
  const out = [];
  let section = null; let req = null;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    let m;
    if ((m = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements/i.exec(line))) { section = m[1].toUpperCase(); if (req) req.end = i; req = null; return; }
    if (/^##\s/.test(line)) { section = null; if (req) req.end = i; req = null; return; }
    if ((m = /^###\s+Requirement:\s*(.*)$/.exec(line)) && section) {
      if (req) req.end = i;
      req = { name: m[1].trim(), section, capability, file, splitFrom: null, scenarios: [], start: i, end: lines.length };
      out.push(req); return;
    }
    if (!req) return;
    if ((m = /<!--\s*split_from:\s*(.+?)\s*-->/.exec(line))) req.splitFrom = m[1].trim();
    if ((m = /^####\s+Scenario:\s*(.*)$/.exec(line))) req.scenarios.push(m[1].trim());
  });
  return out;
}

/** All delta requirements of a change folder (specs/<capability>/spec.md). */
export function changeDeltas(dir) {
  const out = [];
  for (const f of listFiles(path.join(dir, 'specs')).filter((x) => x.endsWith('.md'))) {
    const capability = path.posix.dirname(f);
    out.push(...parseDelta(fs.readFileSync(path.join(dir, 'specs', f), 'utf8'), capability, `specs/${f}`));
  }
  return out;
}

/** Requirement names (+ scenarios) of the main specs: openspec/specs/<cap>/spec.md. */
export function mainSpecRequirements(root) {
  const base = path.join(root, 'openspec', 'specs');
  const out = [];
  for (const f of listFiles(base).filter((x) => x.endsWith('spec.md'))) {
    const text = fs.readFileSync(path.join(base, f), 'utf8').replace(/^##\s+Requirements\s*$/m, '## ADDED Requirements');
    out.push(...parseDelta(text, path.posix.dirname(f), `openspec/specs/${f}`));
  }
  return out;
}

// ---------------------------------------------------------------- change folders
export function changeLocation(root, id) {
  const changes = path.join(root, 'openspec', 'changes');
  if (fs.existsSync(path.join(changes, id))) return { dir: path.join(changes, id), archived: false };
  const arch = path.join(changes, 'archive');
  if (fs.existsSync(arch)) {
    const hit = fs.readdirSync(arch).filter((d) => d.replace(datePrefix, '') === id).sort().at(-1);
    if (hit) return { dir: path.join(arch, hit), archived: true };
  }
  return null;
}

export function changeSchema(dir) {
  const f = path.join(dir, '.openspec.yaml');
  if (!fs.existsSync(f)) return null;
  const m = /^schema:\s*(\S+)/m.exec(fs.readFileSync(f, 'utf8'));
  return m ? m[1] : null;
}

/** The split-plan parent whose slices.md lists `id`, if any. */
export function findParentOf(root, id) {
  const changes = path.join(root, 'openspec', 'changes');
  const dirs = [];
  if (fs.existsSync(changes)) {
    for (const d of fs.readdirSync(changes)) if (d !== 'archive') dirs.push(path.join(changes, d));
    if (fs.existsSync(path.join(changes, 'archive'))) for (const d of fs.readdirSync(path.join(changes, 'archive'))) dirs.push(path.join(changes, 'archive', d));
  }
  for (const dir of dirs) {
    const f = path.join(dir, 'slices.md');
    if (!fs.existsSync(f)) continue;
    const plan = parseSlices(fs.readFileSync(f, 'utf8'));
    if (plan.slices.some((s) => s.id === id)) return { id: path.basename(dir).replace(datePrefix, ''), dir, plan };
  }
  return null;
}

// ---------------------------------------------------------------- git baseline
/** Delta requirements of `changeId` as committed at `commit` (the loss-check baseline). */
export function baselineDeltas(root, commit, changeId) {
  const base = `openspec/changes/${changeId}/specs`;
  let files;
  try {
    files = git(root, ['ls-tree', '-r', '--name-only', commit, '--', base]).split('\n').filter((f) => f.endsWith('.md'));
  } catch (e) {
    throw new UsageError(`cannot read the split baseline ${commit}:${base} (${String(e.stderr || e.message).trim().split('\n')[0]})`);
  }
  if (!files.length) throw new UsageError(`split baseline ${commit} has no ${base}/**/spec.md`);
  const out = [];
  for (const f of files) {
    const rel = f.slice(base.length + 1);
    out.push(...parseDelta(git(root, ['show', `${commit}:${f}`]), path.posix.dirname(rel), `specs/${rel}`));
  }
  return out;
}

// ---------------------------------------------------------------- slices.md / split-proposal.md
const LIST_FIELDS = new Set(['capabilities', 'depends_on', 'requirements', 'split']);
export const SLICE_STATUSES = ['planned', 'in-progress'];
/**
 * Slice blocks:  ### Slice: <id>  followed by "- key: value" lines.
 *   goal, capabilities (a, b), depends_on (a, b | none), flag (name | none), removes_flag (name),
 *   ticket (path | none), status (planned | in-progress; "done" = archived folder on main)
 *   split-proposal.md only (never the parent): requirements (Name; Name), split (Original -> New [Scen; Scen])
 */
export function parseSlices(text) {
  const slices = []; const front = {}; const duplicates = []; const seen = new Map();
  let cur = null;
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (fm) for (const l of fm[1].split(/\r?\n/)) { const m = /^(\w+):\s*(.*)$/.exec(l); if (m) front[m[1]] = m[2].trim(); }
  text.split(/\r?\n/).forEach((line, i) => {
    let m;
    if (/^##\s+/.test(line)) { cur = null; return; }
    if ((m = /^###\s+Slice:\s*(\S+)/.exec(line))) { cur = { id: m[1], line: i + 1, depends_on: [], capabilities: [], requirements: [], split: [], flag: null, status: 'planned' }; slices.push(cur); return; }
    if (cur && (m = /^-\s+([a-z_]+):\s*(.*)$/.exec(line))) {
      const [, k, v] = m;
      if (k !== 'split') { const ks = seen.get(cur) || new Set(); if (ks.has(k)) duplicates.push({ slice: cur.id, field: k, line: i + 1 }); ks.add(k); seen.set(cur, ks); }
      if (k === 'split') cur.split.push(...parseSplitField(v));
      else if (LIST_FIELDS.has(k)) cur[k] = /^(none|-)?$/i.test(v.trim()) ? [] : v.split(k === 'requirements' ? ';' : ',').map((x) => x.trim()).filter(Boolean);
      else if (k === 'status') cur.status = lc(v).replace(/\s+/g, '-') || 'planned';
      else cur[k] = /^(none|-)$/i.test(v.trim()) ? null : v.trim();
    }
  });
  return { front, slices, duplicates };
}

/** "Original -> New A [Scen 1; Scen 2]; Original -> New B [Scen 3]" */
export function parseSplitField(v) {
  return [...v.matchAll(/([^;>\[\]]+?)\s*->\s*([^\[\];]+?)\s*\[([^\]]*)\]/g)].map((m) => ({
    from: m[1].trim(), to: m[2].trim(), scenarios: m[3].split(';').map((s) => s.trim()).filter(Boolean),
  }));
}

/**
 * "## Split notes" of a child's proposal.md - deliberate differences from the original change,
 * recorded by the child that made them:
 *   - dropped: Requirement|Scenario "<original name>" - <why>
 *   - added: Requirement|Scenario "<new name>" - <why>            (e.g. a feature flag)
 *   - renamed_from: Requirement|Scenario "<original name>" -> "<new name>" - <why the agent judged them equivalent>
 *   - split_from: Requirement "<original name>" - confirmed        (this child holds part of a cut requirement)
 */
export function parseSplitNotes(text) {
  const notes = []; const errors = [];
  const m = /^##\s+Split notes\s*$/m.exec(text);
  if (!m) return { notes, errors, present: false };
  const body = text.slice(m.index + m[0].length).split(/^##\s/m)[0];
  const offset = text.slice(0, m.index).split('\n').length;
  body.split(/\r?\n/).forEach((line, i) => {
    if (!/^-\s+\S/.test(line) || /^-\s+_?none/i.test(line)) return;
    let a;
    if ((a = /^-\s+(dropped|added):\s*(Requirement|Scenario)\s+"([^"]+)"/.exec(line))) notes.push({ type: a[1], kind: a[2], name: a[3], line: offset + i });
    else if ((a = /^-\s+renamed_from:\s*(Requirement|Scenario)\s+"([^"]+)"\s*->\s*"([^"]+)"/.exec(line))) notes.push({ type: 'renamed', kind: a[1], name: a[2], to: a[3], line: offset + i });
    else if ((a = /^-\s+split_from:\s*Requirement\s+"([^"]+)"\s*-\s*confirmed/i.exec(line))) notes.push({ type: 'split', kind: 'Requirement', name: a[1], line: offset + i });
    else errors.push(`proposal.md:${offset + i}: split note not understood: ${line.trim()}`);
  });
  return { notes, errors, present: true };
}

/** Behaviour text must not appear in a parent. */
export function behaviourLeaks(text) {
  const out = [];
  text.split(/\r?\n/).forEach((l, i) => {
    if (/\b(SHALL|MUST)\b/.test(l) || /\*\*(WHEN|THEN|GIVEN|AND)\*\*/.test(l) || /^#{2,4}\s+(ADDED|MODIFIED|REMOVED)\s+Requirements/.test(l)) out.push({ line: i + 1, text: l.trim().slice(0, 80) });
  });
  return out;
}

/** Requirement / scenario names that appear in a parent file (the parent is a pure control plane). */
export function nameLeaks(text, names) {
  const out = [];
  const lines = text.split(/\r?\n/);
  for (const n of new Set(names)) {
    if (n.length < 4) continue;
    const re = new RegExp(`(^|[^\\w])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\w])`);
    lines.forEach((l, i) => { if (re.test(l)) out.push({ line: i + 1, name: n }); });
  }
  return out;
}

// ---------------------------------------------------------------- slice graph
export function dependencyClosure(slices) {
  const by = Object.fromEntries(slices.map((s) => [s.id, s]));
  const memo = {};
  const deps = (id, seen = new Set()) => {
    if (memo[id]) return memo[id];
    if (seen.has(id)) throw new UsageError(`dependency cycle through slice "${id}"`);
    seen.add(id);
    const out = new Set();
    for (const d of by[id]?.depends_on || []) { out.add(d); for (const x of deps(d, seen)) out.add(x); }
    seen.delete(id);
    return (memo[id] = out);
  };
  for (const s of slices) deps(s.id);
  return memo;
}

/** Lint a slice plan (proposal or parent): fields, dependencies, flags, statuses, no behaviour. */
export function lintSlices(plan, { text = '', parent = false } = {}) {
  const errors = []; const warnings = [];
  const ids = new Set();
  for (const s of plan.slices) {
    if (ids.has(s.id)) errors.push(`slice "${s.id}" is listed twice`);
    ids.add(s.id);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(s.id)) errors.push(`slice "${s.id}": id must be a kebab-case change name`);
    if (!s.goal) errors.push(`slice "${s.id}": no goal`);
    if (!s.capabilities.length) warnings.push(`slice "${s.id}": no capabilities listed`);
    if (!SLICE_STATUSES.includes(s.status)) warnings.push(`slice "${s.id}": status "${s.status}" - use planned or in-progress (done = its archived folder on main)`);
    if (parent && (s.requirements.length || s.split.length)) errors.push(`slice "${s.id}": requirement names in the parent - the parent is a control plane; behaviour and names live in the child delta`);
  }
  for (const s of plan.slices) for (const d of s.depends_on) if (!ids.has(d)) errors.push(`slice "${s.id}": depends_on "${d}" is not a slice`);
  try { dependencyClosure(plan.slices.filter((s) => s.depends_on.every((d) => ids.has(d)))); } catch (e) { errors.push(e.message); }
  const flags = plan.slices.filter((s) => s.flag).map((s) => s.flag);
  for (const f of new Set(flags)) {
    const cleanup = plan.slices.filter((s) => s.removes_flag === f);
    if (!cleanup.length) errors.push(`flag "${f}": no cleanup slice (a slice with "removes_flag: ${f}") - always plan the cleanup`);
    for (const c of cleanup) for (const s of plan.slices.filter((x) => x.flag === f)) {
      if (!c.depends_on.includes(s.id)) warnings.push(`cleanup slice "${c.id}" should depend on flagged slice "${s.id}"`);
    }
  }
  for (const d of plan.duplicates || []) warnings.push(`slices.md:${d.line}: slice "${d.slice}" has "${d.field}:" twice (a union merge of two branches?) - keep one; the last one wins`);
  for (const l of behaviourLeaks(text)) errors.push(`line ${l.line}: behaviour text in a split plan (behaviour lives in the child deltas): "${l.text}"`);
  return { errors, warnings };
}

// ---------------------------------------------------------------- status / readiness
/** done = the child's archived folder is present (run on main); otherwise the engineer's mark in slices.md. */
export function sliceStatus(root, slice) {
  const loc = changeLocation(root, slice.id);
  if (loc?.archived) return 'done';
  if (!loc) return 'missing';
  return slice.status === 'in-progress' ? 'in progress' : 'planned';
}

export function readiness(root, plan) {
  const closure = dependencyClosure(plan.slices);
  const status = Object.fromEntries(plan.slices.map((s) => [s.id, sliceStatus(root, s)]));
  const rows = plan.slices.map((s) => {
    const waiting = s.depends_on.filter((d) => status[d] !== 'done');
    return { ...s, mark: s.status, status: status[s.id], waiting, ready: status[s.id] === 'planned' && !waiting.length };
  });
  const ready = rows.filter((r) => r.ready);
  const independent = (a, b) => !closure[a.id].has(b.id) && !closure[b.id].has(a.id);
  const shared = (a, b) => a.capabilities.filter((c) => b.capabilities.map(lc).includes(lc(c)));
  const pairs = [];
  const open = rows.filter((r) => r.status !== 'done');
  for (let i = 0; i < open.length; i++) for (let j = i + 1; j < open.length; j++) {
    const a = open[i]; const b = open[j];
    const sh = shared(a, b);
    pairs.push({ a: a.id, b: b.id, independent: independent(a, b), shared: sh, safe: independent(a, b) && !sh.length, bothReady: a.ready && b.ready, active: (a.ready || a.status === 'in progress') && (b.ready || b.status === 'in progress') && !(a.ready && b.ready) });
  }
  return { rows, ready, pairs };
}

export function parentDir(root, id) {
  const loc = changeLocation(root, id);
  if (!loc) throw new UsageError(`change not found: ${id}`);
  if (!fs.existsSync(path.join(loc.dir, 'slices.md'))) throw new UsageError(`${id} is not a split parent (no slices.md)`);
  return loc;
}
