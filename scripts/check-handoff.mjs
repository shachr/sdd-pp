#!/usr/bin/env node
// check-handoff: lint one OpenSpec change that uses the handoff-driven schema.
//   - handoff.md front matter is complete (tool, implementation_model, base_ref ...)
//   - reference-not-duplicate: handoff.md and execution/** link the proposal/deltas
//     and do not copy requirement text
//   - execution outputs live in the change folder, not the tools' default locations
//   - the change is PR-sized (.openspec-handoff/small-changes.md)
// Usage: node check-handoff.mjs <change-id> [--root <dir>] [--config <file>] [--json] [--no-git]
// Exit: 0 ok (warnings allowed), 1 errors found, 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  findProjectRoot, loadChange, loadConfig, normativeLines, normalize, countRequirements,
  countWorkUnits, diffSize, git, TOOLS, REQUIRED_KEYS, UsageError,
} from './lib/change.mjs';

export function checkChange(change, config, { useGit = true } = {}) {
  const errors = [];
  const warnings = [];
  const metrics = {};
  const h = change.handoff;

  // 1. handoff.md presence and front matter
  if (!change.handoffText) {
    errors.push('handoff.md is missing (create it with: openspec instructions handoff --change ' + change.id + ')');
    return { errors, warnings, metrics };
  }
  if (!h) {
    errors.push('handoff.md has no YAML front matter (--- ... ---)');
    return { errors, warnings, metrics };
  }
  for (const k of REQUIRED_KEYS) {
    if (!h[k] || /^<.*>$/.test(String(h[k]))) errors.push(`handoff.md: front matter "${k}" is missing or still a placeholder`);
  }
  if (h.change && h.change !== change.id) errors.push(`handoff.md: change "${h.change}" does not match folder "${change.id}"`);
  if (h.tool && !TOOLS.includes(h.tool)) errors.push(`handoff.md: tool "${h.tool}" must be one of ${TOOLS.join(', ')}`);
  if (h.execution_dir && h.execution_dir.replace(/\/?$/, '/') !== 'execution/') errors.push('handoff.md: execution_dir must be "execution/"');
  if (h.reviewer_model && h.implementation_model && h.reviewer_model === h.implementation_model) {
    errors.push('handoff.md: reviewer_model must differ from implementation_model');
  }

  // 2. reference, don't duplicate: links
  const links = [...change.handoffBody.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)].map((m) => path.posix.normalize(m[1]));
  if (!links.includes('proposal.md')) errors.push('handoff.md: must link [proposal](proposal.md)');
  for (const d of change.deltas) {
    if (!links.includes(d)) errors.push(`handoff.md: must link spec delta ${d}`);
  }
  if (change.deltas.length === 0) warnings.push('change has no spec deltas (fine only with skip_specs: true)');

  // 3. reference, don't duplicate: copied requirement text
  const protectedLines = new Map();
  for (const d of change.deltas) for (const l of normativeLines(change.read(d))) protectedLines.set(l, d);
  const targets = [['handoff.md', change.handoffText], ...change.execution.filter((f) => f.endsWith('.md')).map((f) => [f, change.read(f)])];
  for (const [file, text] of targets) {
    if (/^###\s+Requirement:|^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements|^####\s+Scenario:/m.test(text)) {
      errors.push(`${file}: contains spec-delta headers (Requirement/Scenario/ADDED...) - link the delta instead`);
    }
    const norm = normalize(text);
    for (const [line, src] of protectedLines) {
      if (norm.includes(line)) {
        errors.push(`${file}: duplicates requirement text from ${src}: "${line.slice(0, 70)}..." - link it instead`);
      }
    }
  }

  // 4. execution artifacts link back to the source of truth
  for (const f of change.execution.filter((x) => x.endsWith('.md'))) {
    if (!/proposal\.md/.test(change.read(f))) errors.push(`${f}: must start with a "Source of truth" line linking proposal.md`);
  }

  // 5. outputs redirected into the change folder
  const strays = [
    path.join(change.root, '.scratch', change.id),
    ...['docs/superpowers/plans', 'docs/superpowers/specs'].flatMap((d) => {
      const dir = path.join(change.root, d);
      return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.includes(change.id)).map((f) => path.join(dir, f)) : [];
    }),
  ].filter((p) => fs.existsSync(p));
  for (const s of strays) errors.push(`execution output outside the change folder: ${path.relative(change.root, s)} - move it under openspec/changes/${change.id}/execution/`);
  if (h.tool === 'ai-hero' && !change.execution.some((f) => f.startsWith('execution/tickets/')) && change.execution.length) {
    warnings.push('tool is ai-hero but execution/tickets/ is empty (to-tickets output expected there)');
  }
  if (h.tool === 'superpowers' && change.execution.length && !change.execution.includes('execution/plan.md')) {
    warnings.push('tool is superpowers but execution/plan.md is missing (writing-plans output expected there)');
  }

  // 6. PR-sized
  const t = config.sizeThresholds;
  metrics.requirements = change.deltas.reduce((n, d) => n + countRequirements(change.read(d)), 0);
  Object.assign(metrics, countWorkUnits(change));
  if (useGit && h.base_ref && !/^<.*>$/.test(h.base_ref)) {
    try {
      git(change.root, ['rev-parse', '--verify', '--quiet', `${h.base_ref}^{commit}`]);
      Object.assign(metrics, diffSize(change.root, h.base_ref, Array.isArray(h.diff_paths) ? h.diff_paths : []));
    } catch {
      errors.push(`handoff.md: base_ref "${h.base_ref}" is not a commit in this repository`);
    }
  }
  const sizeRule = (key, label) => {
    if (metrics[key] === undefined) return;
    const [soft, hard] = t[key];
    if (metrics[key] > hard) errors.push(`size: ${label} ${metrics[key]} > hard limit ${hard} - split the change (.openspec-handoff/small-changes.md)`);
    else if (metrics[key] > soft) warnings.push(`size: ${label} ${metrics[key]} > budget ${soft} - consider splitting`);
  };
  sizeRule('requirements', 'requirements in deltas');
  sizeRule('units', 'tickets/plan tasks');
  sizeRule('lines', 'changed lines since base_ref');
  sizeRule('files', 'changed files since base_ref');
  return { errors, warnings, metrics };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { root: { type: 'string' }, config: { type: 'string' }, json: { type: 'boolean' }, 'no-git': { type: 'boolean' }, help: { type: 'boolean', short: 'h' } },
  });
  if (values.help || positionals.length !== 1) {
    console.log('usage: check-handoff <change-id> [--root <dir>] [--config <file>] [--json] [--no-git]');
    return values.help ? 0 : 2;
  }
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  if (!root) throw new UsageError('no openspec/changes directory found above the current directory (use --root)');
  const config = loadConfig(root, values.config);
  const change = loadChange(root, positionals[0]);
  const result = checkChange(change, config, { useGit: !values['no-git'] });
  if (values.json) console.log(JSON.stringify({ change: change.id, ...result }, null, 2));
  else {
    console.log(`check-handoff ${change.id}: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
    console.log('  metrics: ' + Object.entries(result.metrics).map(([k, v]) => `${k}=${v}`).join(' '));
    for (const e of result.errors) console.log('  ✗ ' + e);
    for (const w of result.warnings) console.log('  ! ' + w);
  }
  return result.errors.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-handoff.mjs')) {
  main().then((c) => process.exit(c)).catch((e) => {
    console.error(`check-handoff: ${e.message}`);
    process.exit(e instanceof UsageError ? 2 : 1);
  });
}
