import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, CHANGE, makeFixture, setHandoff, run } from './helpers.mjs';
import { parseFrontMatter } from '../scripts/lib/change.mjs';

test('every skill has front matter whose name matches its folder', () => {
  for (const name of fs.readdirSync(path.join(TOOLKIT, 'skills'))) {
    const { data, body } = parseFrontMatter(fs.readFileSync(path.join(TOOLKIT, 'skills', name, 'SKILL.md'), 'utf8'));
    assert.equal(data.name, name);
    assert.ok(data.description.length > 40, `${name} needs a description`);
    assert.ok(body.includes('execution/') || name === 'openspec-handoff', `${name} must point outputs at execution/`);
  }
});

test('wrappers name the real upstream skills', () => {
  const ai = fs.readFileSync(path.join(TOOLKIT, 'skills/openspec-handoff-ai-hero/SKILL.md'), 'utf8');
  for (const s of ['grill-with-docs', 'to-spec', 'to-tickets', 'implement', 'tdd', 'code-review']) assert.match(ai, new RegExp('`' + s + '`'));
  const sp = fs.readFileSync(path.join(TOOLKIT, 'skills/openspec-handoff-superpowers/SKILL.md'), 'utf8');
  for (const s of ['brainstorming', 'writing-plans', 'subagent-driven-development', 'executing-plans', 'requesting-code-review']) assert.match(sp, new RegExp('`' + s + '`'));
});

test('install.sh installs schema, scripts, skills and commands into an openspec project', { skip: !fs.existsSync(OPENSPEC) }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-install-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  let r = spawnSync(OPENSPEC, ['init', '--tools', 'none', '--no-animation', '.'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  r = spawnSync('bash', [path.join(TOOLKIT, 'install.sh'), dir, '--set-default'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const f of [
    'openspec/schemas/handoff-driven/schema.yaml', '.openspec-handoff/scripts/check-handoff.mjs',
    '.openspec-handoff/scripts/adversarial-review.mjs', '.openspec-handoff/config.json', '.openspec-handoff/small-changes.md',
    '.claude/skills/openspec-handoff-ai-hero/SKILL.md', '.cursor/skills/openspec-handoff-superpowers/SKILL.md',
    '.claude/commands/handoff.md', '.cursor/commands/handoff.md', '.claude/commands/adversarial-review.md', '.cursor/commands/adversarial-review.md',
  ]) assert.ok(fs.existsSync(path.join(dir, f)), `missing ${f}`);
  assert.match(fs.readFileSync(path.join(dir, 'openspec/config.yaml'), 'utf8'), /^schema: handoff-driven/m);
  r = spawnSync(OPENSPEC, ['new', 'change', 'demo'], { cwd: dir, encoding: 'utf8' });
  assert.match(r.stdout + r.stderr, /Schema: handoff-driven/);
});

test('superpowers handoff with execution/plan-<id>.md passes and counts plan tasks', () => {
  const { dir, changeDir } = makeFixture();
  setHandoff(dir, { tool: 'superpowers', implementation_model: 'gpt-5-codex', apply_mode: 'executing-plans' });
  fs.rmSync(path.join(changeDir, 'execution', 'tickets'), { recursive: true });
  fs.rmSync(path.join(changeDir, 'execution', 'grill.md'));
  fs.rmSync(path.join(changeDir, 'execution', 'spec.md'));
  fs.writeFileSync(path.join(changeDir, 'execution', 'brainstorm.md'), '---\ntool: superpowers\nsession: brainstorming\n---\n\n> Source of truth: [proposal](../proposal.md)\n');
  fs.writeFileSync(path.join(changeDir, 'execution', `plan-${CHANGE}.md`), [
    '# Greeting by name Implementation Plan', '',
    '**Spec:** [proposal](../proposal.md) · [specs/greeting/spec.md](../specs/greeting/spec.md) · [brainstorm](brainstorm.md)', '',
    '### Task 1: greet(name)', '', '**Covers:** "Requirement: Greeting by name", "Requirement: Blank name falls back to default"', '',
    '### Task 2: CLI wiring', '', '**Covers:** "Requirement: Greeting by name"', '',
  ].join('\n'));
  const r = run('check-handoff.mjs', [CHANGE, '--json'], dir);
  assert.equal(r.code, 0, r.out);
  const json = JSON.parse(r.stdout);
  assert.equal(json.metrics.planTasks, 2);
  assert.deepEqual(json.warnings, []);
  // a shared name (plan.md) still works but warns: SDD workspaces are named after the plan file
  fs.renameSync(path.join(changeDir, 'execution', `plan-${CHANGE}.md`), path.join(changeDir, 'execution', 'plan.md'));
  const r2 = JSON.parse(run('check-handoff.mjs', [CHANGE, '--json'], dir).stdout);
  assert.equal(r2.metrics.planTasks, 2);
  assert.match(r2.warnings.join('\n'), /name the plan execution\/plan-add-greeting-name\.md/);
});

test('too many tickets is a size warning, not a failure', () => {
  const { dir, changeDir } = makeFixture();
  for (let i = 3; i <= 13; i += 1) {
    fs.writeFileSync(path.join(changeDir, 'execution', 'tickets', `${String(i).padStart(2, '0')}-x.md`), '> Source of truth: [proposal](../../proposal.md)\n');
  }
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.match(r.out, /! size: tickets\/plan tasks 13 > 12 \(well over the budget 8\)/);
  assert.doesNotMatch(r.out, /✗ size/);
});

test('fixtures are real copies: writing a fixture config never touches the toolkit config', () => {
  const { dir } = makeFixture();
  const f = path.join(dir, '.openspec-handoff', 'config.json');
  assert.equal(fs.lstatSync(f).isSymbolicLink(), false);
});
