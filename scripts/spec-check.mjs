#!/usr/bin/env node
// spec-check: does the execution tool's design output cover the OpenSpec change?
// Reads proposal + delta specs and the tool's planning output
//   ai-hero:     execution/spec.md (to-spec; User Stories) + execution/tickets/*.md
//   superpowers: execution/plan-<change>.md (### Task N:)  [+ execution/design.md for context]
// and reports, per delta requirement and scenario, which story / ticket / plan task covers it:
//   - MISSING:   a requirement no unit names, or a scenario no unit / test name mentions
//   - UNKNOWN:   a unit names a requirement or scenario that is not in the delta
//   - UNSOURCED: a unit (story, ticket, task) names no delta requirement at all
// Contradictions (a unit that names a requirement but plans different behaviour) need judgement:
// the /spec-check command has the agent read the units and append that section.
// Usage: node spec-check.mjs <change-id> [--root <dir>] [--json] [--write]
//   --write  save the report to openspec/changes/<id>/execution/spec-check.md
// Exit: 0 no gaps, 1 gaps found, 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findProjectRoot, loadChange, UsageError, deltaRequirements, designUnits, citations, findPlan } from './lib/change.mjs';

export function specCheck(change) {
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
  return { change: change.id, tool, sources, units: units.length, rows, missing, unknown, unsourced, problems, gaps };
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
  out.push('', '### Contradictions (agent review)', '', '<!-- /spec-check: the agent reads each unit against the requirement it names and lists contradictions here, or "- none". -->');
  out.push('', '### Result', '', r.gaps ? `GAPS: ${r.gaps} mechanical finding(s). Fix the design output (or the delta) before implementation.` : 'PASS (mechanical checks). Contradictions: see agent review above.');
  return out.join('\n') + '\n';
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { root: { type: 'string' }, json: { type: 'boolean' }, write: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
  });
  if (values.help || positionals.length !== 1) {
    console.log('usage: spec-check <change-id> [--root <dir>] [--json] [--write]');
    return values.help ? 0 : 2;
  }
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  const change = loadChange(root, positionals[0]);
  const r = specCheck(change);
  const text = formatReport(r);
  if (values.write) {
    const f = path.join(change.dir, 'execution', 'spec-check.md');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, text);
  }
  console.log(values.json ? JSON.stringify(r, null, 2) : text);
  return r.gaps ? 1 : 0;
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(new URL(import.meta.url).pathname)) {
  main().then((c) => process.exit(c)).catch((e) => {
    console.error(`spec-check: ${e.message}`);
    process.exit(e instanceof UsageError ? 2 : 1);
  });
}
