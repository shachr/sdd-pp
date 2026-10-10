// Shared helpers for the handoff workflow scripts. Zero dependencies (Node >= 18).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const TOOLS = ['ai-hero', 'superpowers'];
/** The tools' own implement commands (handoff.md apply_mode); /opsx:apply is not used. */
export const APPLY_MODES = { 'ai-hero': ['implement', 'implement-spec'], superpowers: ['executing-plans', 'subagent-driven-development'] };

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

/** The Superpowers plan: execution/plan-<id>.md (preferred) or legacy execution/plan.md. */
export function findPlan(change) {
  const own = `execution/plan-${change.id}.md`;
  if (change.execution.includes(own)) return own;
  return change.execution.find((f) => /^execution\/plan(-[^/]+)?\.md$/.test(f)) || null;
}

export function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export function loadConfig(root, explicit) {
  const toolkitDefault = fileURLToPath(new URL('../../config/handoff-review.json', import.meta.url));
  const candidates = [explicit, path.join(root, '.openspec-handoff', 'config.json'), toolkitDefault]
    .filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return { path: c, ...JSON.parse(fs.readFileSync(c, 'utf8')) };
  }
  throw new UsageError(`no config found (looked in: ${candidates.join(', ')})`);
}

// ---------------------------------------------------------------------------
// Requirement links (/spec-check): every design unit (to-spec user story, ticket, plan task)
// names the delta requirement(s) it covers. Citation forms (any of):
//   "Requirement: <name>"     Requirement "<name>"     Requirement: "<name>"
// Scenarios: "Scenario: <name>" / Scenario "<name>".

/** Requirements of every delta: [{ name, delta, scenarios: [name] }]. */
export function deltaRequirements(change) {
  const out = [];
  for (const d of change.deltas) {
    let req = null;
    for (const line of change.read(d).split(/\r?\n/)) {
      let m;
      if ((m = /^###\s+Requirement:\s*(.*)$/.exec(line))) { req = { name: m[1].trim(), delta: d, scenarios: [] }; out.push(req); continue; }
      if ((m = /^####\s+Scenario:\s*(.*)$/.exec(line)) && req) req.scenarios.push(m[1].trim());
      if (/^##\s/.test(line)) req = null;
    }
  }
  return out;
}

const cite = (kind) => new RegExp(`"${kind}:\\s*([^"\\n]+)"|${kind}:?\\s+"([^"\\n]+)"`, 'g');
/** Requirement and scenario names cited in a piece of markdown. */
export function citations(md) {
  const pick = (re) => [...md.matchAll(re)].map((m) => (m[1] || m[2]).trim());
  return { requirements: pick(cite('Requirement')), scenarios: pick(cite('Scenario')) };
}

/**
 * Design units /spec-check looks at:
 *  - ai-hero: each numbered item under "## User Stories" in execution/spec.md, each ticket file
 *  - superpowers: each "### Task N:" section of the plan
 */
export function designUnits(change) {
  const units = [];
  const lines = (f) => change.read(f).split(/\r?\n/);
  if (change.execution.includes('execution/spec.md')) {
    const ls = lines('execution/spec.md');
    let inStories = false; let cur = null;
    ls.forEach((l, i) => {
      if (/^#{1,6}\s/.test(l)) { inStories = /^#{1,6}\s*user stories\s*$/i.test(l); cur = null; return; }
      if (!inStories) return;
      const m = /^\s{0,3}(\d+)\.\s+(.*)$/.exec(l);
      if (m) { cur = { kind: 'user story', file: 'execution/spec.md', line: i + 1, label: `story ${m[1]}`, text: m[2] }; units.push(cur); }
      else if (cur && l.trim()) cur.text += `\n${l}`;
      else if (!l.trim()) cur = null;
    });
  }
  for (const f of change.execution.filter((x) => /^execution\/tickets\/[^/]+\.md$/.test(x)).sort()) {
    const text = change.read(f);
    const title = (/^#\s+(.*)$/m.exec(text) || [, path.basename(f)])[1];
    units.push({ kind: 'ticket', file: f, line: 1, label: title, text });
  }
  const plan = findPlan(change);
  if (plan) {
    const ls = lines(plan);
    let cur = null;
    ls.forEach((l, i) => {
      const m = /^###\s+Task\s+(\d+)\s*:\s*(.*)$/.exec(l);
      if (m) { cur = { kind: 'plan task', file: plan, line: i + 1, label: `Task ${m[1]}: ${m[2]}`, text: '' }; units.push(cur); return; }
      if (cur && /^#{1,3}\s/.test(l)) { cur = null; return; }
      if (cur) cur.text += `${l}\n`;
    });
  }
  return units;
}

// ---------------------------------------------------------------------------
// Execution tool selection (setup phase) and the design-session file (proposal phase).
//   project default:  .openspec-handoff/project.json  { "defaultTool": "ai-hero" | "superpowers" }
//                     (written by `sdd-pp init --tool` / execution-tool.mjs --default; never overwritten by install)
//   per-change:       front matter `tool:` of the session file, written when the session starts
//                     (OpenSpec warns on unknown keys in .openspec.yaml, so the override does not live there)
//   after handoff:    handoff.md `tool:` (written by /handoff from the above)

/** The design-session file each tool writes during the proposal phase. */
export const SESSION_FILES = { 'ai-hero': 'execution/grill.md', superpowers: 'execution/brainstorm.md' };
export const SESSION_SKILLS = { 'ai-hero': 'grill-with-docs', superpowers: 'brainstorming' };

export function projectToolConfigPath(root) { return path.join(root, '.openspec-handoff', 'project.json'); }

export function projectDefaultTool(root) {
  const f = projectToolConfigPath(root);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')).defaultTool || null; } catch { return null; }
}

/** Session files present in a change, with the tool their front matter records. */
export function sessionFiles(change) {
  return Object.entries(SESSION_FILES)
    .filter(([, f]) => change.execution.includes(f))
    .map(([fileTool, file]) => ({ file, fileTool, tool: parseFrontMatter(change.read(file)).data?.tool || null }));
}

/** Resolve the change's execution tool: handoff.md > session file front matter > project default. */
export function resolveTool(change) {
  const sessions = sessionFiles(change);
  const def = projectDefaultTool(change.root);
  if (change.handoff?.tool) return { tool: change.handoff.tool, source: 'handoff.md', projectDefault: def, sessions };
  const s = sessions.find((x) => x.tool);
  if (s) return { tool: s.tool, source: s.file, projectDefault: def, sessions };
  if (def) return { tool: def, source: '.openspec-handoff/project.json (project default)', projectDefault: def, sessions };
  return { tool: null, source: null, projectDefault: def, sessions };
}
