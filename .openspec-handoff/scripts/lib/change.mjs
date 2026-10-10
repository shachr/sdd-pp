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
export function loadChange(root, id) {
  const dir = path.join(root, 'openspec', 'changes', id);
  if (!fs.existsSync(dir)) throw new UsageError(`change not found: ${path.relative(process.cwd(), dir) || dir}`);
  const read = (rel) => (fs.existsSync(path.join(dir, rel)) ? fs.readFileSync(path.join(dir, rel), 'utf8') : null);
  const handoffText = read('handoff.md');
  const fm = handoffText ? parseFrontMatter(handoffText) : { data: null, body: '' };
  const files = listFiles(dir);
  const deltas = files.filter((f) => /^specs\/.+\.md$/.test(f));
  const execution = files.filter((f) => f.startsWith('execution/'));
  return {
    id, root, dir, files, deltas, execution,
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

/** Count execution work units: ai-hero tickets or superpowers plan tasks. */
export function countWorkUnits(change) {
  const tickets = change.execution.filter((f) => /^execution\/tickets\/[^/]+\.md$/.test(f)).length;
  const plan = change.read('execution/plan.md');
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
