#!/usr/bin/env node
// adversarial-review: review an OpenSpec change with a model different from the
// one that implemented it. Reads openspec/changes/<id>/handoff.md, picks the
// review skill for the recorded tool, picks the reviewer model, builds a review
// prompt pointing at the change folder, and runs a local headless agent CLI.
//
// Usage: node adversarial-review.mjs <change-id> [options]
//   --dry-run                 print the plan and the prompt; write and run nothing
//   --emit-prompt             write the prompt to execution/reviews/ and stop (paste it into any tool)
//   --reviewer-model <id>     override reviewer model (must differ from implementation_model)
//   --runner <name>           runner from config.runners (default: first matching the reviewer family)
//   --allow-same-family       permit e.g. claude-opus reviewing claude-sonnet (different model, same vendor)
//   --root <dir> --config <file> --json
// Exit: 0 ok, 1 review/runner failure or model conflict, 2 usage/config error.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import {
  findProjectRoot, loadChange, loadConfig, normalizeModel, modelFamily, git, UsageError,
} from './lib/change.mjs';
import { checkChange } from './check-handoff.mjs';

export class ModelConflictError extends Error {}

/** Choose the reviewer model; throw ModelConflictError if it is not different enough. */
export function selectReviewer({ handoff, config, override, allowSameFamily = false }) {
  const impl = handoff.implementation_model;
  let reviewer; let source;
  if (override) { reviewer = override; source = '--reviewer-model'; }
  else if (handoff.reviewer_model) { reviewer = handoff.reviewer_model; source = 'handoff.md reviewer_model'; }
  else {
    const key = Object.keys(config.reviewerFor || {}).find((k) => normalizeModel(k) === normalizeModel(impl));
    if (key) { reviewer = config.reviewerFor[key]; source = `config.reviewerFor["${key}"]`; }
    else { reviewer = config.defaultReviewer; source = 'config.defaultReviewer'; }
  }
  if (!reviewer) throw new UsageError('no reviewer model: set reviewerFor/defaultReviewer in config or pass --reviewer-model');
  if (normalizeModel(reviewer) === normalizeModel(impl)) {
    throw new ModelConflictError(`reviewer model "${reviewer}" (from ${source}) is the implementation model "${impl}" - an adversarial review needs a different model`);
  }
  const fam = [modelFamily(impl, config.families), modelFamily(reviewer, config.families)];
  if (config.forbidSameFamily && !allowSameFamily && fam[0] === fam[1]) {
    throw new ModelConflictError(`reviewer "${reviewer}" and implementer "${impl}" are both "${fam[0]}" models (forbidSameFamily) - pick another reviewer or pass --allow-same-family`);
  }
  return { model: reviewer, source, family: fam[1] };
}

export function selectRunner(config, reviewer, name) {
  const runners = config.runners || {};
  if (name) {
    if (!runners[name]) throw new UsageError(`unknown runner "${name}" (have: ${Object.keys(runners).join(', ')})`);
    return { name, ...runners[name] };
  }
  const hit = Object.entries(runners).find(([, r]) => r.match === reviewer.family)
    || Object.entries(runners).find(([, r]) => r.match === '*');
  if (!hit) throw new UsageError(`no runner matches reviewer family "${reviewer.family}"`);
  return { name: hit[0], ...hit[1] };
}

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function buildPlan(change, config, opts = {}) {
  const h = change.handoff;
  if (!change.handoffText || !h) throw new UsageError(`openspec/changes/${change.id}/handoff.md is missing or has no front matter - run /handoff first`);
  for (const k of ['tool', 'implementation_model', 'base_ref']) {
    if (!h[k] || /^<.*>$/.test(h[k])) throw new UsageError(`handoff.md: "${k}" is missing - run /handoff first`);
  }
  const skill = config.reviewSkills?.[h.tool];
  if (!skill) throw new UsageError(`no review skill configured for tool "${h.tool}"`);
  const reviewer = selectReviewer({ handoff: h, config, override: opts.reviewerModel, allowSameFamily: opts.allowSameFamily });
  const runner = selectRunner(config, reviewer, opts.runner);
  const argv = runner.command.map((a) => a.replaceAll('{model}', reviewer.model));
  const slug = normalizeModel(reviewer.model).replace(/[^a-z0-9.-]+/g, '-');
  const ts = opts.timestamp || stamp();
  const reviewRel = `execution/reviews/${ts}-${slug}.md`;
  const changeRel = path.relative(change.root, change.dir).split(path.sep).join('/');
  const lint = checkChange(change, config);
  let head = 'HEAD'; let stat = '(git unavailable)'; let commits = '';
  const diffPaths = Array.isArray(h.diff_paths) ? h.diff_paths : [];
  try {
    head = git(change.root, ['rev-parse', 'HEAD']).trim();
    stat = git(change.root, ['diff', '--stat', h.base_ref, '--', ...(diffPaths.length ? diffPaths : ['.'])]).trimEnd() || '(no changes since base_ref)';
    commits = git(change.root, ['log', '--oneline', `${h.base_ref}..HEAD`, '--', ...(diffPaths.length ? diffPaths : ['.'])]).trim();
  } catch { /* reported in prompt */ }
  const prompt = buildPrompt({ change, changeRel, h, skill, reviewer, head, stat, commits, diffPaths, lint, reviewRel });
  return {
    change: change.id, tool: h.tool, implementationModel: h.implementation_model,
    reviewerModel: reviewer.model, reviewerSource: reviewer.source, skill: skill.skill,
    runner: runner.name, argv, promptVia: runner.promptVia || 'stdin',
    baseRef: h.base_ref, head, reviewFile: `${changeRel}/${reviewRel}`, reviewPath: path.join(change.dir, reviewRel),
    promptPath: path.join(change.dir, reviewRel.replace(/\.md$/, '.prompt.md')),
    lint: { errors: lint.errors.length, warnings: lint.warnings.length }, prompt,
  };
}

function buildPrompt({ change, changeRel, h, skill, reviewer, head, stat, commits, diffPaths, lint, reviewRel }) {
  const files = (list) => list.map((f) => `- ${changeRel}/${f}`).join('\n') || '- (none)';
  const scope = diffPaths.length ? ` -- ${diffPaths.join(' ')}` : '';
  const howTo = skill.howTo.replaceAll('{base_ref}', h.base_ref);
  return `# Adversarial review: ${change.id}

You are **${reviewer.model}**, reviewing work implemented by a different model (**${h.implementation_model}**, via ${h.tool}${h.harness ? ` on ${h.harness}` : ''}).
Be adversarial: assume the implementation is wrong or incomplete until the code and tests prove otherwise. You are reviewing, not fixing - do not edit files.

## Review skill

Use the **${skill.skill}** skill (${skill.source}). If it is not installed, follow its intent directly.
${howTo}

## Source of truth (read these first, in this order)

The OpenSpec change folder \`${changeRel}/\` is the only source of requirements.
- ${changeRel}/proposal.md - why and scope
${files(change.deltas)}  <- spec deltas: THE requirements (### Requirement / #### Scenario)
- ${changeRel}/design.md - agreed approach
- ${changeRel}/handoff.md - who implemented it and where outputs live

Execution artifacts (implementation context only - they must not add or change requirements):
${files(change.execution.filter((f) => !f.startsWith('execution/reviews/')))}

## What changed

- Diff: \`git diff ${h.base_ref}...${head.slice(0, 12)}${scope}\` (base_ref from handoff.md; include uncommitted work with \`git diff ${h.base_ref}${scope}\`)
- Commits:
${commits ? commits.split('\n').map((l) => `  - ${l}`).join('\n') : '  - (none since base_ref - review the working tree)'}
- Stat:
\`\`\`
${stat}
\`\`\`

## Handoff lint (check-handoff)

${lint.errors.length || lint.warnings.length ? [...lint.errors.map((e) => `- ERROR ${e}`), ...lint.warnings.map((w) => `- WARN ${w}`)].join('\n') : '- clean'}

## Check specifically

1. Every requirement and scenario in the deltas is implemented AND covered by a test that would fail without it.
2. Behavior in the diff that no requirement asks for (scope creep), or requirements smuggled into execution/ instead of the deltas.
3. Edge cases the scenarios imply but tests skip.
4. Whether the change is still PR-sized and coherent enough for \`/opsx:verify\`.

## Output format (markdown, nothing else)

\`\`\`
## Verdict
APPROVE | REQUEST_CHANGES - one sentence

## Requirement coverage
| Requirement (name) | Implemented | Tested | Notes |

## Findings
### Critical
- [file:line] finding - which requirement/scenario (by name) it breaks - suggested fix
### Important
### Minor
\`\`\`
The output will be saved to ${changeRel}/${reviewRel}.
`;
}

function which(bin) {
  if (bin.includes('/')) return fs.existsSync(bin);
  return (process.env.PATH || '').split(path.delimiter).some((d) => d && fs.existsSync(path.join(d, bin)));
}

export function runReview(plan, change) {
  const [bin, ...args] = plan.argv;
  if (!which(bin)) {
    throw new UsageError(`runner "${plan.runner}" needs "${bin}" on PATH. Install it, pick another with --runner, or use --emit-prompt and paste the prompt into a ${plan.reviewerModel} session`);
  }
  const r = spawnSync(bin, plan.promptVia === 'arg' ? [...args, plan.prompt] : args, {
    cwd: change.root, input: plan.promptVia === 'arg' ? undefined : plan.prompt, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const ok = r.status === 0 && r.stdout.trim().length > 0;
  const header = `# Adversarial review - ${plan.change}

> Source of truth: [proposal](../../proposal.md) · [handoff](../../handoff.md)

| | |
|---|---|
| implementation_model | ${plan.implementationModel} (${plan.tool}) |
| reviewer_model | ${plan.reviewerModel} (${plan.reviewerSource}) |
| review skill | ${plan.skill} |
| runner | ${plan.runner}: \`${plan.argv.join(' ')}\` |
| range | ${plan.baseRef.slice(0, 12)}..${plan.head.slice(0, 12)} |
| status | ${ok ? 'completed' : `FAILED (exit ${r.status})`} |

`;
  fs.mkdirSync(path.dirname(plan.reviewPath), { recursive: true });
  fs.writeFileSync(plan.reviewPath, header + (r.stdout || '') + (ok ? '' : `\n\n## Runner stderr\n\n\`\`\`\n${r.stderr || r.error?.message || ''}\n\`\`\`\n`));
  if (ok) recordInHandoff(change, plan);
  return { ok, status: r.status };
}

function recordInHandoff(change, plan) {
  const file = path.join(change.dir, 'handoff.md');
  let text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(change.dir, plan.reviewPath).split(path.sep).join('/');
  const line = `- ${plan.reviewerModel} via ${plan.skill}: [${rel}](${rel})`;
  text = text.replace(/\s*$/, '\n');
  if (!/^## Reviews$/m.test(text)) text += '\n## Reviews\n\n';
  fs.writeFileSync(file, `${text}${line}\n`);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'dry-run': { type: 'boolean' }, 'emit-prompt': { type: 'boolean' }, 'reviewer-model': { type: 'string' },
      runner: { type: 'string' }, 'allow-same-family': { type: 'boolean' }, root: { type: 'string' },
      config: { type: 'string' }, json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help || positionals.length !== 1) {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 16).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return values.help ? 0 : 2;
  }
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  if (!root) throw new UsageError('no openspec/changes directory found above the current directory (use --root)');
  const config = loadConfig(root, values.config);
  const change = loadChange(root, positionals[0]);
  const plan = buildPlan(change, config, {
    reviewerModel: values['reviewer-model'], runner: values.runner, allowSameFamily: values['allow-same-family'],
  });
  const summary = [
    `adversarial-review ${plan.change}${values['dry-run'] ? ' (dry run - nothing written, nothing run)' : ''}`,
    `  tool:            ${plan.tool} -> review skill: ${plan.skill}`,
    `  implementation:  ${plan.implementationModel}`,
    `  reviewer:        ${plan.reviewerModel}  [${plan.reviewerSource}]`,
    `  runner:          ${plan.runner}: ${plan.argv.join(' ')}  (prompt via ${plan.promptVia})`,
    `  range:           ${plan.baseRef.slice(0, 12)}..${plan.head.slice(0, 12)}`,
    `  handoff lint:    ${plan.lint.errors} error(s), ${plan.lint.warnings} warning(s)`,
    `  output:          ${plan.reviewFile}`,
  ].join('\n');
  if (values['dry-run']) {
    if (values.json) console.log(JSON.stringify({ dryRun: true, ...plan, reviewPath: undefined, promptPath: undefined }, null, 2));
    else console.log(`${summary}\n\n----- prompt -----\n${plan.prompt}`);
    return 0;
  }
  if (values['emit-prompt']) {
    fs.mkdirSync(path.dirname(plan.promptPath), { recursive: true });
    fs.writeFileSync(plan.promptPath, plan.prompt);
    console.log(`${summary}\n  prompt written:  ${path.relative(process.cwd(), plan.promptPath)}\nRun it in a ${plan.reviewerModel} session and save the answer as ${plan.reviewFile}.`);
    return 0;
  }
  console.log(summary);
  const res = runReview(plan, change);
  console.log(res.ok ? `  review written:  ${plan.reviewFile}` : `  runner failed (exit ${res.status}); details in ${plan.reviewFile}`);
  return res.ok ? 0 : 1;
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(new URL(import.meta.url).pathname)) {
  main().then((c) => process.exit(c)).catch((e) => {
    console.error(`adversarial-review: ${e.message}`);
    process.exit(e instanceof ModelConflictError ? 1 : e instanceof UsageError ? 2 : 1);
  });
}
