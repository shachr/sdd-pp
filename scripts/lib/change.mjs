// Shared helpers for the handoff workflow scripts. Zero dependencies (Node >= 18).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const TOOLS = ['ai-hero', 'superpowers'];
/** The tools' own implement commands (handoff.md apply_mode); /opsx:apply is not used. */
export const APPLY_MODES = { 'ai-hero': ['implement', 'implement-spec'], superpowers: ['executing-plans', 'subagent-driven-development'] };
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
  const out = git(gitRoot, ['diff', '--numstat', baseRef, '--', ...pathspec, ':(exclude)**/openspec/**', ':(exclude)openspec/**', ...TOOLING_EXCLUDES]);
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

/** Section headings that usually restate behaviour (to-spec style); fine when the section links the source of truth. */
export const FORBIDDEN_SECTIONS = /^#{1,6}\s*(user stories|problem statement|solution|(functional |non-functional |behaviou?ral )?requirements|acceptance criteria|scenarios|specification)\s*:?\s*$/im;

/** Sections matching FORBIDDEN_SECTIONS whose body has no link to proposal.md or a spec delta. */
export function restatingSections(md) {
  const lines = md.split('\n');
  const out = [];
  const head = new RegExp(FORBIDDEN_SECTIONS.source, 'i');
  for (let i = 0; i < lines.length; i++) {
    if (!head.test(lines[i])) continue;
    const level = lines[i].match(/^#+/)[0].length;
    let j = i + 1;
    while (j < lines.length && !(/^#+\s/.test(lines[j]) && lines[j].match(/^#+/)[0].length <= level)) j++;
    const body = lines.slice(i + 1, j).join('\n');
    if (!/\]\([^)]*(proposal\.md|specs\/[^)]*spec\.md)[^)]*\)/.test(body)) out.push({ line: i + 1, heading: lines[i].trim() });
  }
  return out;
}

/** Installed tooling (this toolkit, agent skills/commands) is not a change's implementation. */
export const TOOLING_EXCLUDES = ['.openspec-handoff', '.opencode', '.claude', '.cursor', '.agents', 'docs/agents']
  .map((p) => `:(exclude,glob)${p}/**`);

// ---------------------------------------------------------------------------
// Requirement links: every design unit (to-spec user story, ticket, plan task)
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
 * Design units the requirement-link rule and /spec-check look at:
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

/** Requirement-link findings: units citing no requirement, or unknown requirements/scenarios. */
export function requirementLinkFindings(change) {
  const reqs = deltaRequirements(change);
  const reqNames = new Map(reqs.map((r) => [r.name.toLowerCase(), r]));
  const scenNames = new Set(reqs.flatMap((r) => r.scenarios.map((s) => s.toLowerCase())));
  const findings = [];
  for (const u of designUnits(change)) {
    const c = citations(u.text);
    if (!c.requirements.length) findings.push({ ...u, problem: 'names no delta requirement' });
    for (const r of c.requirements) if (!reqNames.has(r.toLowerCase())) findings.push({ ...u, problem: `names requirement "${r}", which is not in any delta` });
    for (const s of c.scenarios) if (!scenNames.has(s.toLowerCase())) findings.push({ ...u, problem: `names scenario "${s}", which is not in any delta` });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Execution tool selection (setup phase) and the design-session file (proposal phase).
//   project default:  .openspec-handoff/project.json  { "defaultTool": "ai-hero" | "superpowers" }
//                     (written by install.sh --tool / execution-tool.mjs --default; never overwritten by install)
//   per-change:       front matter `tool:` of the session file, written when the session starts
//                     (OpenSpec warns on unknown keys in .openspec.yaml, so the override does not live there)
//   after handoff:    handoff.md `tool:` (must agree with the session file)

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

/** Delta specs for capabilities that have no main spec yet (new capabilities). */
export function newCapabilityDeltas(change) {
  return change.deltas.filter((d) => {
    const cap = d.replace(/^specs\//, '').replace(/\/spec\.md$/, '');
    return !fs.existsSync(path.join(change.root, 'openspec', 'specs', cap, 'spec.md')) || change.archived;
  });
}

/**
 * Cheap heuristic: implementation detail leaking into proposal.md (what/why only).
 * Returns [{ line, hint, text }]. Warning-level only; the design session file is where the how goes.
 */
export function proposalLeaks(md) {
  const rules = [
    [/^\s*(```|~~~)/, 'code block'],
    [/(^|[\s(`])((src|lib|test|tests|bin|app|packages)\/[\w./-]+|[\w-]+\.(mjs|cjs|js|ts|tsx|py|go|rs|java|rb))\b/, 'file path'],
    [/\b(algorithms?|regex(es)?|regular expressions?|(for|while) loops?|data structures?|helper (function|module)s?|internally|refactor(ing)?|module-private|hash ?maps?|recursion|recursive|greedy|lookup table|cache|caching)\b/i, 'implementation term'],
    [/\b(we will implement|implemented (by|with|as|via)|the implementation (uses|will))\b/i, 'implementation plan'],
  ];
  const out = [];
  let fence = false;
  let impact = false; // OpenSpec's own template asks for affected code/APIs under ## Impact - not a leak
  md.split(/\r?\n/).forEach((l, i) => {
    if (!fence && /^##\s/.test(l)) impact = /^##\s+Impact\b/i.test(l);
    if (impact) return;
    if (/^\s*(```|~~~)/.test(l)) { if (!fence) out.push({ line: i + 1, hint: 'code block', text: l.trim() }); fence = !fence; return; }
    if (fence) return;
    for (const [re, hint] of rules.slice(1)) {
      if (re.test(l)) { out.push({ line: i + 1, hint, text: l.trim() }); break; }
    }
  });
  return out;
}
