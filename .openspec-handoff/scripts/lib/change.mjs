// Shared helpers for the handoff workflow scripts. Zero dependencies (Node >= 18).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const TOOLS = ['ai-hero', 'superpowers'];
export const REQUIRED_KEYS = ['change', 'tool', 'implementation_model', 'base_ref', 'execution_dir'];

/** Walk up from `start` to the first directory containing openspec/. */
export function findProjectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'openspec', 'changes'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Minimal YAML front matter parser: `key: value` scalars, `key:` followed by
 * `  - item` lists, `#` comments. Enough for handoff.md; not a YAML parser.
 */
export function parseFrontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: null, body: text };
  const data = {};
  let listKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) { data[listKey].push(unquote(item[1].trim())); continue; }
    const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    if (kv[2] === '') { listKey = kv[1]; data[kv[1]] = []; }
    else { listKey = null; data[kv[1]] = unquote(kv[2].trim()); }
  }
  return { data, body: text.slice(m[0].length) };
}
const unquote = (s) => s.replace(/^(['"])(.*)\1$/, '$2');

/** Recursively list files under dir (relative paths, posix separators). */
export function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, base));
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out.sort();
}

/** Load everything the scripts need about one change. */
/**
 * Resolve a change folder: an active change (openspec/changes/<id>) or an archived one
 * (openspec/changes/archive/<id> or archive/YYYY-MM-DD-<id>). For an archived change the
 * returned id is the original change name (date prefix stripped), so it still matches
 * handoff.md's `change:`.
 */
export function resolveChangeDir(root, id) {
  const changes = path.join(root, 'openspec', 'changes');
  const active = path.join(changes, id);
  if (id !== 'archive' && fs.existsSync(active)) return { dir: active, id, archived: false };
  const archiveDir = path.join(changes, 'archive');
  if (fs.existsSync(archiveDir)) {
    const name = id.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    const hits = fs.readdirSync(archiveDir).filter((d) => d === id || d.replace(/^\d{4}-\d{2}-\d{2}-/, '') === name).sort();
    if (hits.length) return { dir: path.join(archiveDir, hits.at(-1)), id: name, archived: true };
  }
  throw new UsageError(`change not found: ${path.relative(process.cwd(), active) || active} (also looked in openspec/changes/archive/)`);
}

export function loadChange(root, requested) {
  const { dir, id, archived } = resolveChangeDir(root, requested);
  const read = (rel) => (fs.existsSync(path.join(dir, rel)) ? fs.readFileSync(path.join(dir, rel), 'utf8') : null);
  const handoffText = read('handoff.md');
  const fm = handoffText ? parseFrontMatter(handoffText) : { data: null, body: '' };
  const files = listFiles(dir);
  const deltas = files.filter((f) => /^specs\/.+\.md$/.test(f));
  const execution = files.filter((f) => f.startsWith('execution/'));
  return {
    id, root, dir, archived, files, deltas, execution,
    handoffText, handoff: fm.data, handoffBody: fm.body,
    read,
  };
}

export class UsageError extends Error {}

/** Normalise markdown text for duplicate detection. */
export function normalize(s) {
  return s
    .replace(/[*_`>#]/g, ' ')
    .replace(/^\s*[-+]\s+/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Requirement text worth protecting from duplication: requirement description
 * lines and scenario WHEN/THEN/AND lines from a delta spec.
 */
export function normativeLines(deltaText) {
  const lines = [];
  let inReq = false;
  for (const line of deltaText.split(/\r?\n/)) {
    if (/^###\s+Requirement:/.test(line)) { inReq = true; continue; }
    if (/^##\s/.test(line)) { inReq = false; continue; }
    if (!inReq || /^####\s/.test(line) || !line.trim()) continue;
    const n = normalize(line.replace(/\*\*(WHEN|THEN|AND|GIVEN)\*\*/g, '$1'));
    if (n.length >= 25) lines.push(n);
  }
  return lines;
}

export function countRequirements(deltaText) {
  return (deltaText.match(/^###\s+Requirement:/gm) || []).length;
}

/** The Superpowers plan: execution/plan-<id>.md (preferred) or legacy execution/plan.md. */
export function findPlan(change) {
  const own = `execution/plan-${change.id}.md`;
  if (change.execution.includes(own)) return own;
  return change.execution.find((f) => /^execution\/plan(-[^/]+)?\.md$/.test(f)) || null;
}

/** Count execution work units: ai-hero tickets or superpowers plan tasks. */
export function countWorkUnits(change) {
  const tickets = change.execution.filter((f) => /^execution\/tickets\/[^/]+\.md$/.test(f)).length;
  const planFile = findPlan(change);
  const plan = planFile ? change.read(planFile) : null;
  const planTasks = plan ? (plan.match(/^###\s+Task\s+\d+/gm) || []).length : 0;
  return { tickets, planTasks, units: Math.max(tickets, planTasks) };
}

export function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/**
 * Changed lines/files between base_ref and the working tree, limited to
 * diff_paths when given, and excluding openspec/ (planning docs are not code).
 */
export function diffSize(root, baseRef, diffPaths = []) {
  const gitRoot = git(root, ['rev-parse', '--show-toplevel']).trim();
  const pathspec = diffPaths.length ? diffPaths.map((p) => path.relative(gitRoot, path.resolve(root, p)) || '.') : ['.'];
  const out = git(gitRoot, ['diff', '--numstat', baseRef, '--', ...pathspec, ':(exclude)**/openspec/**', ':(exclude)openspec/**']);
  let lines = 0; let files = 0;
  for (const row of out.split('\n').filter(Boolean)) {
    const [a, d] = row.split('\t');
    files += 1;
    lines += (a === '-' ? 0 : Number(a)) + (d === '-' ? 0 : Number(d));
  }
  // untracked files count too (new code not yet committed)
  const untracked = git(gitRoot, ['ls-files', '--others', '--exclude-standard', '--', ...pathspec, ':(exclude)**/openspec/**', ':(exclude)openspec/**'])
    .split('\n').filter(Boolean);
  for (const f of untracked) {
    files += 1;
    lines += fs.readFileSync(path.join(gitRoot, f), 'utf8').split('\n').length;
  }
  return { lines, files };
}

export function loadConfig(root, explicit) {
  const toolkitDefault = new URL('../../config/handoff-review.json', import.meta.url).pathname;
  const candidates = [explicit, path.join(root, '.openspec-handoff', 'config.json'), toolkitDefault]
    .filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return { path: c, ...JSON.parse(fs.readFileSync(c, 'utf8')) };
  }
  throw new UsageError(`no config found (looked in: ${candidates.join(', ')})`);
}

/** Lowercase, strip provider prefix and date/latest suffixes. */
export function normalizeModel(m) {
  return String(m || '').trim().toLowerCase()
    .replace(/^[a-z0-9-]+\//, '')
    .replace(/[-@](\d{8}|latest)$/, '');
}

/** Family = first match of config.families patterns, else the first two dash segments. */
export function modelFamily(m, families = {}) {
  const n = normalizeModel(m);
  for (const [family, prefixes] of Object.entries(families)) {
    if (prefixes.some((p) => n.startsWith(p))) return family;
  }
  return n.split('-').slice(0, 2).join('-');
}

// ---------------------------------------------------------------------------
// Paraphrase detection (reference, don't duplicate - beyond verbatim copies).
// Each requirement statement and each scenario (WHEN/THEN text) of a delta is a
// "unit". Every prose line/sentence of an execution artifact (code fences and
// inline code removed, link targets and requirement/scenario NAMES removed, so
// citing by name stays legal) is compared to every unit with content-token
// overlap. Thresholds were tuned on real flow output (docs/decisions.md C6).
// ---------------------------------------------------------------------------
const STOP = new Set(('a an the and or of to in on for is are be it its this that with as at by from when then ' +
  'shall must should will which any than not no if only into per each was were has have do does can').split(' '));

export function contentTokens(s) {
  return (s.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) || [])
    .filter((t) => !STOP.has(t) && (t.length > 1 || /\d/.test(t)))
    .map((t) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, '') : t));
}

/** Requirement statements and scenarios of one delta, with their names. */
export function deltaUnits(deltaText) {
  const units = []; const names = [];
  let req = null; let scen = null;
  const flush = () => {
    if (scen && scen.text.trim()) units.push(scen);
    scen = null;
  };
  const flushReq = () => { if (req && req.text.trim()) units.push(req); };
  for (const line of deltaText.split(/\r?\n/)) {
    let m;
    if ((m = /^###\s+Requirement:\s*(.*)$/.exec(line))) {
      flush(); flushReq();
      req = { kind: 'requirement', name: m[1].trim(), text: '' }; names.push(req.name); continue;
    }
    if ((m = /^####\s+Scenario:\s*(.*)$/.exec(line))) {
      flush(); flushReq(); if (req) req = { ...req, text: '' };
      scen = { kind: 'scenario', name: m[1].trim(), requirement: req?.name, text: '' }; names.push(scen.name); continue;
    }
    if (/^##\s/.test(line)) { flush(); flushReq(); req = null; continue; }
    const clean = line.replace(/\*\*(WHEN|THEN|AND|GIVEN)\*\*/g, ' ');
    if (scen) scen.text += ' ' + clean; else if (req) req.text += ' ' + clean;
  }
  flush(); flushReq();
  return { units: units.map((u) => ({ ...u, tokens: new Set(contentTokens(u.text)) })), names };
}

function proseCandidates(md, names) {
  const out = []; let fence = false; let n = 0;
  const sorted = [...names].sort((a, b) => b.length - a.length);
  for (const raw of md.split(/\r?\n/)) {
    n += 1;
    if (/^\s*(```|~~~)/.test(raw)) { fence = !fence; continue; }
    if (fence || !raw.trim() || /^>\s*Source of truth/i.test(raw)) continue;
    // keep single-word inline code (`truncate`), drop code expressions (`if (x) throw ...`)
    let line = raw.replace(/`([^`]*)`/g, (_, c) => (/^[\w.-]+$/.test(c) ? c : ' ')).replace(/\]\([^)]*\)/g, ']').replace(/https?:\S+/g, ' ');
    for (const nm of sorted) line = line.split(nm).join(' ');
    for (const part of new Set([line, ...line.split(/(?<=[.;:])\s+|\s+[-—]\s+/)])) {
      const tokens = new Set(contentTokens(part));
      if (tokens.size >= 3) out.push({ line: n, raw: raw.trim(), tokens });
    }
  }
  return out;
}

export const PARAPHRASE = { minShared: 4, error: { jaccard: 0.4, containment: 0.6, jaccardWithContainment: 0.25 }, warn: { jaccard: 0.25 } };

/** Lines of `md` that restate a delta unit in other words. Returns [{line, raw, unit, level, shared, jaccard, containment}]. */
export function paraphraseFindings(md, deltaText, t = PARAPHRASE) {
  const { units, names } = deltaUnits(deltaText);
  const best = new Map();
  for (const c of proseCandidates(md, names)) {
    for (const u of units) {
      let shared = 0;
      for (const tok of u.tokens) if (c.tokens.has(tok)) shared += 1;
      if (shared < t.minShared) continue;
      const jaccard = shared / (u.tokens.size + c.tokens.size - shared);
      const containment = shared / u.tokens.size;
      const level = jaccard >= t.error.jaccard || (containment >= t.error.containment && jaccard >= t.error.jaccardWithContainment)
        ? 'error' : jaccard >= t.warn.jaccard ? 'warning' : null;
      if (!level) continue;
      const key = `${c.line}`;
      const prev = best.get(key);
      if (!prev || (prev.level === 'warning' && level === 'error') || (prev.level === level && prev.jaccard < jaccard)) {
        best.set(key, { line: c.line, raw: c.raw, unit: `${u.kind} "${u.name}"`, level, shared, jaccard, containment });
      }
    }
  }
  return [...best.values()].sort((a, b) => a.line - b.line);
}

/** Section headings that restate behaviour instead of linking it (to-spec style). */
export const FORBIDDEN_SECTIONS = /^#{1,6}\s*(user stories|problem statement|solution|(functional |non-functional |behaviou?ral )?requirements|acceptance criteria|scenarios|specification)\s*:?\s*$/im;
