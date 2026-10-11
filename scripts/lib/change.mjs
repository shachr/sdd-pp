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

/**
 * Open work in a change's planning output: tickets not "Status: done" (AI Hero) and unticked plan step boxes
 * (Superpowers). Returns one line per open item.
 */
export function openWork(change) {
  const open = [];
  for (const f of change.files.filter((x) => /^execution\/tickets\/[^/]+\.md$/.test(x)).sort()) {
    const t = change.read(f);
    if (!/^\s*\**status:?\**\s*done\b/im.test(t)) {
      const st = (/^\s*\**status:?\**\s*([^\n]*)$/im.exec(t) || [])[1]?.trim();
      open.push(`${f}: Status ${st ? `"${st}"` : 'missing'}, not done`);
    }
    // a done ticket = Status done AND every checkbox ticked
    t.split(/\r?\n/).forEach((l, i) => { if (/^\s*[-*]\s*\[ \]/.test(l)) open.push(`${f}:${i + 1}: unticked checkbox: ${l.trim().replace(/^[-*]\s*\[ \]\s*/, '')}`); });
  }
  const plan = findPlan(change);
  if (plan) {
    let task = null;
    change.read(plan).split(/\r?\n/).forEach((l, i) => {
      const h = /^#{2,4}\s+(Task\s+\d+[^\n]*)$/i.exec(l);
      if (h) task = h[1].trim();
      if (/^\s*[-*]\s*\[ \]/.test(l)) open.push(`${plan}:${i + 1}: unticked step${task ? ` in ${task}` : ''}: ${l.trim().replace(/^[-*]\s*\[ \]\s*/, '')}`);
    });
  }
  return open;
}

/**
 * CRITICAL issues recorded in an /opsx:verify report: a "CRITICAL" line (or heading) whose text, or whose list
 * items below it, are anything but "none" / "0". "No critical issues" (lower case) and "CRITICAL: none" are clean.
 * OpenSpec verify's own summary wording counts too: "2 critical issue(s) found" (N > 0). A list item under a
 * CRITICAL heading that itself starts with CRITICAL is one issue, not two.
 */
export function verifyCriticals(text) {
  const lines = text.split(/\r?\n/);
  const issues = [];
  const clean = (x) => /^(none|0|n\/a|-)?\.?$/i.test(x.trim()) || /^(none|0)\b/i.test(x.trim());
  const listed = new Set(); // line indexes already taken as list items of a CRITICAL heading
  for (let i = 0; i < lines.length; i++) {
    if (listed.has(i)) continue;
    const n = /\b(\d+)\s+critical\s+issue(?:\(s\)|s)?\b/i.exec(lines[i]);
    if (n) { if (Number(n[1]) > 0) issues.push(lines[i].trim()); continue; }
    const m = /\bCRITICAL\b(.*)$/.exec(lines[i]);
    if (!m) continue;
    const rest = m[1].replace(/\*\*/g, '').replace(/\([^)]*\)/g, '').replace(/^[\s:=-]+/, '').trim();
    if (rest) { if (!clean(rest)) issues.push(lines[i].trim()); continue; }
    // a heading / label: the list items right below it
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (!l.trim()) { if (j > i + 1) break; continue; }
      const item = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(l);
      if (!item || /^#/.test(l.trim())) break;
      if (/^\s*\d+\.\s/.test(l) && !/^\s/.test(l)) break; // the next numbered priority ("2. **WARNING**")
      listed.add(j);
      if (!clean(item[1].replace(/\*\*/g, ''))) issues.push(item[1].trim());
    }
  }
  return [...new Set(issues)];
}

/** A session file that holds only what /sdd-tool --set writes (no design session in it yet). */
export function isStub(text) {
  if (text == null) return true;
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  return body.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^> (Links|Parent session):/.test(l) && !/^# \S+ session: /.test(l) && l !== '## Overrides' && l !== 'None' && !/^- split note: .* - TODO: which parent decision this overrides/.test(l)).length === 0;
}

export function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** The branch changes merge into: origin's HEAD branch, else main, else master (best effort; "main" without git). */
export function mainBranch(root) {
  try { return git(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).trim().replace(/^origin\//, ''); } catch { /* no remote HEAD */ }
  for (const b of ['main', 'master']) {
    try { git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${b}`]); return b; } catch { /* next */ }
  }
  return 'main';
}

/** The review diff: three dots = since the branch point with the main branch, so main merged into the branch later is left out. */
export const reviewDiff = (main) => `git diff ${main}...HEAD -- . ':!openspec'`;

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
// Requirement links (/sdd-spec-check): every design unit (to-spec user story, ticket, plan task)
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
  // scenarios: only explicit, quoted citations - "Scenario: X", Scenario "X", scenarios "X", "Y" and "Z" (any case)
  const scenarios = [...md.matchAll(/"scenario:\s*([^"\n]+)"/gi)].map((m) => m[1].trim());
  for (const m of md.matchAll(/\bscenarios?:?\s+((?:"[^"\n]+"(?:\s*(?:,|;|&|\band\b|\bor\b)\s*)?)+)/gi)) {
    for (const q of m[1].matchAll(/"([^"\n]+)"/g)) scenarios.push(q[1].trim());
  }
  return { requirements: pick(cite('Requirement')), scenarios: [...new Set(scenarios)] };
}

/**
 * Design units /sdd-spec-check looks at:
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
//   after handoff:    handoff.md `tool:` (written by /sdd-handoff from the above)

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

/** Project-level docs AI Hero's grill-with-docs writes next to the change (the documented exception), when present. */
/** "1 problem" / "2 problems" (irregular plural as the third argument). */
export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export const PROJECT_DOCS = ['GLOSSARY.md', 'docs/adr'];

/**
 * The `git add` arguments for a commit line about a change: the whole change folder (-A: deltas, proposal split
 * notes, execution/, deleted stubs) plus GLOSSARY.md / docs/adr when they exist. `relDir` is relative to the root.
 */
export function addArgs(root, relDir) {
  return ['-A', relDir, ...PROJECT_DOCS.filter((p) => fs.existsSync(path.join(root, p)))].join(' ');
}
