#!/usr/bin/env node
// check-handoff: lint one OpenSpec change that uses the handoff-driven schema.
//   - handoff.md front matter is complete (tool, implementation_model, base_ref ...)
//   - reference-not-duplicate: handoff.md and execution/** link the proposal/deltas and
//     do not copy (verbatim lines, delta headers, SHALL: errors); restating sections and token-overlap
//     paraphrases are advisory warnings (errors with config.strictDuplication)
//   - requirement links: every user story / ticket / plan task names an existing delta requirement
//   - handoff.md apply_mode names the tool's own implement command
//   - ownership: no OpenSpec design.md; design lives in execution/ (to-spec output: execution/spec.md)
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
  paraphraseFindings, PARAPHRASE, restatingSections, findPlan, requirementLinkFindings, APPLY_MODES,
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
  // apply_mode: the execution tool's own implement command (this workflow does not use /opsx:apply)
  if (h.tool && APPLY_MODES[h.tool]) {
    if (!h.apply_mode) errors.push(`handoff.md: front matter "apply_mode" is missing (one of ${APPLY_MODES[h.tool].join(', ')})`);
    else if (!APPLY_MODES[h.tool].includes(h.apply_mode)) errors.push(`handoff.md: apply_mode "${h.apply_mode}" is not a ${h.tool} implement command (one of ${APPLY_MODES[h.tool].join(', ')})`);
  }
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

  // 3. reference, don't duplicate: copied, restated or paraphrased requirement text.
  //    Review outputs (execution/reviews/**, execution/verify.md, *.prompt.md) discuss the
  //    requirements by design and are exempt.
  const exempt = (f) => f.startsWith('execution/reviews/') || f === 'execution/verify.md' || f.endsWith('.prompt.md');
  const protectedLines = new Map();
  for (const d of change.deltas) for (const l of normativeLines(change.read(d))) protectedLines.set(l, d);
  const targets = [['handoff.md', change.handoffText], ...change.execution.filter((f) => f.endsWith('.md') && !exempt(f)).map((f) => [f, change.read(f)])];
  const paraphrase = config.paraphrase ? { ...PARAPHRASE, ...config.paraphrase } : PARAPHRASE;
  for (const [file, text] of targets) {
    if (/^###\s+Requirement:|^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements|^####\s+Scenario:/m.test(text)) {
      errors.push(`${file}: contains spec-delta headers (Requirement/Scenario/ADDED...) - link the delta instead`);
    }
    // Advisory (warnings unless config.strictDuplication): to-spec's Problem Statement / Solution /
    // User Stories sections are allowed when they point at the proposal / delta instead of restating it.
    const advisory = config.strictDuplication ? errors : warnings;
    for (const s of restatingSections(text)) {
      advisory.push(`${file}:${s.line}: section "${s.heading}" has no link to the proposal or delta - reference them instead of restating behaviour`);
    }
    const prose = text.replace(/^\s*(```|~~~)[\s\S]*?^\s*\1/gm, '');
    const shall = /^.*\bSHALL\b.*$/m.exec(prose);
    if (shall) errors.push(`${file}: normative SHALL sentence ("${shall[0].trim().slice(0, 60)}") - requirements live only in the delta`);
    const norm = normalize(text);
    for (const [line, src] of protectedLines) {
      if (norm.includes(line)) {
        errors.push(`${file}: duplicates requirement text from ${src}: "${line.slice(0, 70)}..." - link it instead`);
      }
    }
    for (const d of change.deltas) {
      for (const p of paraphraseFindings(text, change.read(d), paraphrase)) {
        const msg = `${file}:${p.line}: ${p.level === 'error' ? 'likely paraphrases' : 'may paraphrase'} ${p.unit} of ${d} (overlap ${p.jaccard.toFixed(2)}): "${p.raw.slice(0, 70)}" - cite it by name instead`;
        (p.level === 'error' ? advisory : warnings).push(msg);
      }
    }
  }

  // 3b. requirement links: every to-spec user story, ticket and plan task names the delta
  //     requirement(s) it covers, and only requirements/scenarios that exist.
  for (const f of requirementLinkFindings(change)) {
    errors.push(`${f.file}:${f.line}: ${f.kind} "${f.label.slice(0, 60)}" ${f.problem} - cite it as "Requirement: <name>" (see /spec-check)`);
  }

  // 4. execution artifacts link back to the source of truth
  //    (execution/verify.md is the /opsx:verify report saved verbatim - its format is OpenSpec's)
  for (const f of change.execution.filter((x) => x.endsWith('.md') && !x.endsWith('.prompt.md') && x !== 'execution/verify.md')) {
    if (!/proposal\.md/.test(change.read(f))) errors.push(`${f}: must start with a "Source of truth" line linking proposal.md`);
  }

  // 5. ownership and locations: OpenSpec = proposal + deltas; design/plan/tickets = execution tool, in execution/
  if (change.files.includes('design.md')) errors.push('design.md in the change folder: design is owned by the execution tool - move decisions to execution/design.md (ai-hero) or the plan (superpowers)');
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
  if (h.tool === 'superpowers' && change.execution.length) {
    const plan = findPlan(change);
    if (!plan) warnings.push(`tool is superpowers but execution/plan-${change.id}.md is missing (writing-plans output expected there)`);
    else if (plan !== `execution/plan-${change.id}.md`) warnings.push(`${plan}: name the plan execution/plan-${change.id}.md so its SDD workspace (.superpowers/sdd/<plan-basename>/) is unique to this change`);
  }

  // 6. PR-sized
  const t = config.sizeThresholds;
  metrics.requirements = change.deltas.reduce((n, d) => n + countRequirements(change.read(d)), 0);
  Object.assign(metrics, countWorkUnits(change));
  // An archived change's diff can't be measured against HEAD (later work lands on top), so skip it.
  if (change.archived) warnings.push('archived change: diff size not measured (base_ref..HEAD includes later work)');
  if (useGit && !change.archived && h.base_ref && !/^<.*>$/.test(h.base_ref)) {
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

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(new URL(import.meta.url).pathname)) {
  main().then((c) => process.exit(c)).catch((e) => {
    console.error(`check-handoff: ${e.message}`);
    process.exit(e instanceof UsageError ? 2 : 1);
  });
}
