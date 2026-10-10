#!/usr/bin/env node
// spec-check: does the execution tool's design output cover the OpenSpec change?
// Reads proposal + delta specs and the tool's planning output
//   ai-hero:     execution/spec.md (to-spec; User Stories) + execution/tickets/*.md
//   superpowers: execution/plan-<change>.md (### Task N:)  [+ execution/design.md for context]
// and reports, per delta requirement and scenario, which story / ticket / plan task covers it:
//   - MISSING:   a requirement no unit names, or a scenario no unit / test name mentions
//   - UNKNOWN:   a unit names a requirement or scenario that is not in the delta
//   - UNSOURCED: a unit (story, ticket, task) names no delta requirement at all
// Missing / invented / contradicted behaviour and restated (instead of cited) requirement text need
// judgement: the /spec-check command has the agent fill "Agent review" and set the Result line
// (the script writes PENDING when the mechanical checks pass). This is the only plan-vs-spec check.
// Spec changes (report-only, never a gap by itself): each run compares the delta requirements and
// scenarios with the content hashes accepted at the last PASS (execution/.spec-check.json) and lists
// what was added, changed, removed or renamed since, with the stories / tickets / plan tasks citing each.
// The baseline moves ONLY on --accept (after the agent wrote PASS), so every run before that keeps
// listing the same changes.
// Usage: node spec-check.mjs <change-id> [--root <dir>] [--json] [--write] [--accept]
//   --write   save the report to openspec/changes/<id>/execution/spec-check.md (never touches the baseline)
//   --accept  the saved report says exactly PASS for the current delta: record the delta's hashes as the
//             new baseline (execution/.spec-check.json; commit it with the planning files). Does not
//             rewrite the report.
// Exit: 0 no gaps, 1 gaps found, 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseArgs } from 'node:util';
import { findProjectRoot, loadChange, loadConfig, UsageError, deltaRequirements, designUnits, citations, findPlan } from './lib/change.mjs';

export const SNAPSHOT = 'execution/.spec-check.json';
const norm = (t) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join('\n');
const hash = (t) => crypto.createHash('sha256').update(norm(t)).digest('hex').slice(0, 12);
/** Local time with its UTC offset, e.g. 2026-10-10T15:06:22-07:00. */
export function localStamp(d = new Date()) {
  const p = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
}
/** Digest of a whole snapshot: ties a saved report to the delta it was computed from. */
export const snapshotDigest = (snap) => hash(JSON.stringify(snap));
const DIGEST_RE = /<!-- spec-check delta: ([0-9a-f]{12}) -->/;

/** Requirement and scenario blocks of every delta, hashed: { "<requirement>": { delta, hash, scenarios: { "<scenario>": hash } } }. */
export function specSnapshot(change) {
  const out = {};
  for (const d of change.deltas) {
    let req = null; let scen = null;
    for (const line of change.read(d).split(/\r?\n/)) {
      let m;
      if ((m = /^###\s+Requirement:\s*(.*)$/.exec(line))) { req = { name: m[1].trim(), delta: d, body: '', scenarios: {} }; out[req.name] = req; scen = null; continue; }
      if ((m = /^####\s+Scenario:\s*(.*)$/.exec(line)) && req) { scen = m[1].trim(); req.scenarios[scen] = ''; continue; }
      if (/^#{1,3}\s/.test(line)) { req = null; scen = null; continue; }
      if (scen !== null && req) req.scenarios[scen] += `${line}\n`; else if (req) req.body += `${line}\n`;
    }
  }
  return Object.fromEntries(Object.values(out).map((q) => [q.name, { delta: q.delta, hash: hash(q.body), scenarios: Object.fromEntries(Object.entries(q.scenarios).map(([n, t]) => [n, hash(t)])) }]));
}

/** What changed between two snapshots: [{ kind: requirement|scenario, change: added|changed|removed|renamed, name, from?, requirement? }]. */
export function specChanges(prev, now) {
  const out = [];
  const gone = Object.keys(prev).filter((n) => !now[n]);
  const fresh = Object.keys(now).filter((n) => !prev[n]);
  const renamedTo = new Map();
  for (const n of fresh) {
    const from = gone.find((g) => !renamedTo.has(g) && prev[g].hash === now[n].hash);
    if (from) renamedTo.set(from, n);
  }
  for (const n of fresh) {
    const from = [...renamedTo].find(([, to]) => to === n)?.[0];
    out.push(from ? { kind: 'requirement', change: 'renamed', name: n, from } : { kind: 'requirement', change: 'added', name: n });
  }
  for (const g of gone) if (!renamedTo.has(g)) out.push({ kind: 'requirement', change: 'removed', name: g });
  for (const n of Object.keys(now)) {
    const fromName = prev[n] ? null : [...renamedTo].find(([, to]) => to === n)?.[0];
    const was = prev[n] || prev[fromName];
    const rq = fromName ? { requirement: n, requirementFrom: fromName } : { requirement: n };
    if (!was) continue;
    if (was.hash !== now[n].hash && prev[n]) out.push({ kind: 'requirement', change: 'changed', name: n });
    const ps = was.scenarios; const ns = now[n].scenarios;
    const sGone = Object.keys(ps).filter((x) => !(x in ns));
    const sFresh = Object.keys(ns).filter((x) => !(x in ps));
    const used = new Set();
    for (const x of sFresh) {
      const from = sGone.find((g) => !used.has(g) && ps[g] === ns[x]);
      if (from) { used.add(from); out.push({ kind: 'scenario', change: 'renamed', name: x, from, ...rq }); } else out.push({ kind: 'scenario', change: 'added', name: x, ...rq });
    }
    for (const g of sGone) if (!used.has(g)) out.push({ kind: 'scenario', change: 'removed', name: g, ...rq });
    for (const x of Object.keys(ns)) if (x in ps && ps[x] !== ns[x]) out.push({ kind: 'scenario', change: 'changed', name: x, ...rq });
  }
  return out;
}

/** A ticket is done when "Status: done"; a plan task when it has step checkboxes and all are ticked. */
const unitDone = (u) => (u.kind === 'ticket' ? /^\s*\**status:?\**\s*done\b/im.test(u.text) : u.kind === 'plan task' ? /- \[x\]/i.test(u.text) && !/- \[ \]/.test(u.text) : false);

export function specCheck(change, { limit = 300, previous = null } = {}) {
  const reqs = deltaRequirements(change);
  const units = designUnits(change).map((u) => ({ ...u, cites: citations(u.text) }));
  const tool = change.handoff?.tool;
  const sources = [];
  if (change.execution.includes('execution/spec.md')) sources.push('execution/spec.md');
  const tickets = change.execution.filter((f) => /^execution\/tickets\/[^/]+\.md$/.test(f)).sort();
  if (tickets.length) sources.push(`execution/tickets/ (${tickets.length})`);
  const plan = findPlan(change);
  if (plan) sources.push(plan);
  const lc = (s) => s.toLowerCase();
  const allText = units.map((u) => lc(u.text)).join('\n');
  const rows = reqs.map((r) => {
    const by = units.filter((u) => u.cites.requirements.some((c) => lc(c) === lc(r.name)));
    const scenarios = r.scenarios.map((s) => ({ name: s, covered: allText.includes(lc(s)) }));
    return { requirement: r.name, delta: r.delta, coveredBy: by.map((u) => u.label), scenarios };
  });
  const known = new Set(reqs.map((r) => lc(r.name)));
  const knownScen = new Set(reqs.flatMap((r) => r.scenarios.map(lc)));
  const missing = [];
  for (const row of rows) {
    if (!row.coveredBy.length) missing.push(`Requirement "${row.requirement}" - no story / ticket / plan task names it`);
    for (const s of row.scenarios) if (!s.covered) missing.push(`Scenario "${s.name}" (of "${row.requirement}") - not mentioned by any story / ticket / plan task`);
  }
  const unknown = [];
  const unsourced = [];
  for (const u of units) {
    for (const c of u.cites.requirements) if (!known.has(lc(c))) unknown.push(`${u.file}:${u.line} ${u.kind} "${u.label}" names requirement "${c}"`);
    for (const c of u.cites.scenarios) if (!knownScen.has(lc(c))) unknown.push(`${u.file}:${u.line} ${u.kind} "${u.label}" names scenario "${c}"`);
    if (!u.cites.requirements.length) unsourced.push(`${u.file}:${u.line} ${u.kind} "${u.label}" names no delta requirement`);
  }
  const problems = [];
  if (!units.length) problems.push(`no design output found for tool "${tool}" (expected ${tool === 'superpowers' ? `execution/plan-${change.id}.md` : 'execution/spec.md and execution/tickets/'})`);
  if (!reqs.length) problems.push('no delta requirements found (specs/**/spec.md)');
  const gaps = missing.length + unknown.length + unsourced.length + problems.length;
  // size re-estimate after planning (warn-only): "Estimate: ~N lines" in each ticket / plan task
  const work = units.filter((u) => u.kind !== 'user story');
  const est = work.map((u) => ({ label: u.label, lines: Number((/estimate:?\**\s*~?\s*(\d+)/i.exec(u.text) || [])[1]) }));
  const size = { units: work.length, estimated: est.filter((e) => Number.isFinite(e.lines)).length, total: est.reduce((n, e) => n + (Number.isFinite(e.lines) ? e.lines : 0), 0), missing: est.filter((e) => !Number.isFinite(e.lines)).map((e) => e.label), limit };
  // spec changes since the last check (report-only)
  const snapshot = specSnapshot(change);
  let specChangeList = null;
  if (previous?.requirements) {
    specChangeList = specChanges(previous.requirements, snapshot).map((c) => {
      const names = [c.name, c.from].filter(Boolean).map(lc);
      const reqNames = c.kind === 'requirement' ? names : [c.requirement, c.requirementFrom].filter(Boolean).map(lc);
      const by = units.filter((u) => u.cites.requirements.some((x) => reqNames.includes(lc(x))) || (c.kind === 'scenario' && names.some((n) => lc(u.text).includes(n))));
      return { ...c, citedBy: by.map((u) => ({ label: u.label, kind: u.kind, done: unitDone(u) })) };
    });
  }
  return { change: change.id, tool, sources, units: units.length, rows, missing, unknown, unsourced, problems, gaps, size, snapshot, previousAt: previous?.accepted_at || previous?.checked_at || null, specChanges: specChangeList };
}

export function formatReport(r) {
  const out = [];
  out.push(`## Spec check: ${r.change}`, '');
  out.push(`- Tool: ${r.tool || '?'}; design output: ${r.sources.join(', ') || '(none)'}; units checked: ${r.units}`);
  out.push(`- Source of truth: proposal.md + ${[...new Set(r.rows.map((x) => x.delta))].join(', ') || '(no deltas)'}`, '');
  out.push('### Coverage', '', '| Requirement | Covered by | Scenarios mentioned |', '|---|---|---|');
  for (const row of r.rows) {
    const sc = row.scenarios.map((s) => `${s.covered ? '✓' : '✗'} ${s.name}`).join('<br>');
    out.push(`| ${row.requirement} | ${row.coveredBy.join('<br>') || '**none**'} | ${sc || '-'} |`);
  }
  const list = (title, items) => { out.push('', `### ${title}`, ''); out.push(...(items.length ? items.map((i) => `- ${i}`) : ['- none'])); };
  if (r.problems.length) list('Problems', r.problems);
  list('Missing (in the delta, not in the design output)', r.missing);
  list('Unknown references (in the design output, not in the delta)', r.unknown);
  list('Added without source (units that name no delta requirement)', r.unsourced);
  if (r.size) {
    const s = r.size;
    out.push('', '### Size (line estimate after planning, warn-only; the ~300-line budget is checked only here)', '');
    out.push(`- ${s.estimated}/${s.units} tickets / plan tasks carry an "Estimate: ~N lines" line; total ~${s.total} lines (code + tests), budget ~${s.limit}.`);
    if (s.missing.length) out.push(`- ! no estimate: ${s.missing.join('; ')}`);
    if (s.total > s.limit) out.push(`- ! over budget: consider re-splitting with /split-check ${r.change} before implementing (a slice is re-split into its existing parent; /split-apply builds the new slice ids).`);
  }
  out.push('', `### Spec changes since the last check (report-only${r.previousAt ? `; baseline accepted ${r.previousAt}` : ''})`, '');
  if (!r.specChanges) out.push(`- none: no accepted baseline yet - on PASS, /spec-check accepts it (\`spec-check.mjs ${r.change} --accept\` records a content hash per requirement and scenario in ${SNAPSHOT}; commit it with the planning files)`);
  else if (!r.specChanges.length) out.push('- none');
  else {
    const q = (s) => `"${s}"`;
    for (const c of r.specChanges) {
      const what = c.kind === 'requirement' ? `Requirement ${q(c.name)}` : `Scenario ${q(c.name)} (of ${q(c.requirement)})`;
      const from = c.from ? ` (was ${q(c.from)})` : '';
      const by = c.citedBy.length ? c.citedBy.map((u) => `${u.label}${u.done ? ' [done]' : ''}`).join('; ') : 'nothing yet';
      out.push(`- ${c.change}: ${what}${from} - cited by: ${by}`);
    }
    const open = [...new Set(r.specChanges.flatMap((c) => c.citedBy.filter((u) => !u.done && u.kind !== 'user story').map((u) => u.label)))];
    const done = [...new Set(r.specChanges.flatMap((c) => c.citedBy.filter((u) => u.done).map((u) => u.label)))];
    const tool = r.tool === 'superpowers' ? 'writing-plans' : 'to-spec + to-tickets';
    out.push('', `Hint: re-plan ONLY ${open.length ? `these open units with the tool's planning (${tool}): ${open.join('; ')}` : `new work for the changes above with the tool's planning (${tool}) - no open unit cites them`}. Done units are never touched${done.length ? ` (${done.join('; ')}): a change that affects done work becomes a new ${r.tool === 'superpowers' ? 'plan task' : 'ticket'}` : ''}. Where a planned decision changed, note "superseded by delta edit: <reason>" in the planning output (the design session file stays as-is; the delta wins). Then /spec-check again until PASS - this list stays until PASS is accepted.`);
  }
  out.push('', '### Agent review', '', '<!-- /spec-check: the agent reads each unit against the requirement(s) it names and replaces this comment with four lists (bullets or "- none"): Missing, Invented, Contradicted, Restated (advisory). -->');
  out.push('', `<!-- spec-check delta: ${snapshotDigest(r.snapshot)} -->`);
  out.push('', '### Result', '', r.gaps
    ? `GAPS: ${r.gaps} mechanical finding(s). Fix the design output (or the delta) before implementation.`
    : 'PENDING: mechanical checks pass. The agent review decides: write PASS if Missing, Invented and Contradicted are all "none", otherwise GAPS: <n> agent finding(s).');
  return out.join('\n') + '\n';
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { root: { type: 'string' }, json: { type: 'boolean' }, write: { type: 'boolean' }, accept: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
  });
  if (values.help || positionals.length !== 1) {
    console.log('usage: spec-check <change-id> [--root <dir>] [--json] [--write] [--accept]');
    return values.help ? 0 : 2;
  }
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  const change = loadChange(root, positionals[0]);
  const config = loadConfig(root);
  const snapFile = path.join(change.dir, SNAPSHOT);
  let previous = null;
  try { previous = JSON.parse(fs.readFileSync(snapFile, 'utf8')); } catch { /* first check */ }
  const r = specCheck(change, { limit: config.split?.limitLines ?? 300, previous });
  const reportFile = path.join(change.dir, 'execution', 'spec-check.md');
  if (values.accept) return accept(change, r, reportFile, snapFile);
  const text = formatReport(r);
  if (values.write) {
    // the report only: the baseline moves on --accept (PASS), so re-runs keep listing unaccepted changes
    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    fs.writeFileSync(reportFile, text);
  }
  console.log(values.json ? JSON.stringify({ ...r, snapshot: undefined }, null, 2) : text);
  return r.gaps ? 1 : 0;
}

/** --accept: record the current delta as the baseline, only for a saved PASS report of this exact delta. */
function accept(change, r, reportFile, snapFile) {
  const fail = (m) => { console.error(`spec-check --accept: ${m}`); return 1; };
  if (r.gaps) return fail(`${r.gaps} mechanical finding(s) - fix them and run /spec-check again; baseline unchanged.`);
  let saved = '';
  try { saved = fs.readFileSync(reportFile, 'utf8'); } catch { return fail(`no saved report (${path.relative(change.dir, reportFile)}) - run /spec-check first.`); }
  const result = (/^### Result\s*\n+([^\n]*)/m.exec(saved) || [])[1]?.trim();
  if (result !== 'PASS') return fail(`the saved report's Result is "${result || '(none)'}", not exactly PASS - baseline unchanged.`);
  const digest = (DIGEST_RE.exec(saved) || [])[1];
  if (digest !== snapshotDigest(r.snapshot)) return fail('the delta changed since the saved report - run /spec-check again; baseline unchanged.');
  const at = localStamp();
  fs.writeFileSync(snapFile, JSON.stringify({ accepted_at: at, requirements: r.snapshot }, null, 2) + '\n');
  console.log(`spec-check ${change.id}: PASS accepted - baseline ${SNAPSHOT} (${at}); commit it with the planning files.`);
  return 0;
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(new URL(import.meta.url).pathname)) {
  main().then((c) => process.exit(c)).catch((e) => {
    console.error(`spec-check: ${e.message}`);
    process.exit(e instanceof UsageError ? 2 : 1);
  });
}
