import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, CHANGE, makeFixture, setHandoff, run, initCli } from './helpers.mjs';
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

test('sdd-pp init installs schema, scripts, skills and commands into an openspec project', { skip: !fs.existsSync(OPENSPEC) }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-install-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  let r = spawnSync(OPENSPEC, ['init', '--tools', 'none', '--no-animation', '.'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  r = initCli(dir, '--set-default');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const f of [
    'openspec/schemas/handoff-driven/schema.yaml', '.openspec-handoff/scripts/spec-check.mjs',
    '.openspec-handoff/config.json', '.openspec-handoff/small-changes.md',
    '.claude/skills/openspec-handoff-ai-hero/SKILL.md', '.cursor/skills/openspec-handoff-superpowers/SKILL.md',
    '.claude/commands/handoff.md', '.cursor/commands/handoff.md',
  ]) assert.ok(fs.existsSync(path.join(dir, f)), `missing ${f}`);
  assert.match(fs.readFileSync(path.join(dir, 'openspec/config.yaml'), 'utf8'), /^schema: handoff-driven/m);
  r = spawnSync(OPENSPEC, ['new', 'change', 'demo'], { cwd: dir, encoding: 'utf8' });
  assert.match(r.stdout + r.stderr, /Schema: handoff-driven/);
});

test('superpowers: execution/plan-<id>.md passes /spec-check with two plan tasks', () => {
  const { dir, changeDir } = makeFixture();
  setHandoff(dir, { tool: 'superpowers', apply_mode: 'executing-plans' });
  fs.rmSync(path.join(changeDir, 'execution', 'tickets'), { recursive: true });
  fs.rmSync(path.join(changeDir, 'execution', 'grill.md'));
  fs.rmSync(path.join(changeDir, 'execution', 'spec.md'));
  fs.writeFileSync(path.join(changeDir, 'execution', 'brainstorm.md'), '---\ntool: superpowers\nsession: brainstorming\n---\n\n> Source of truth: [proposal](../proposal.md)\n');
  fs.writeFileSync(path.join(changeDir, 'execution', `plan-${CHANGE}.md`), [
    '# Greeting by name Implementation Plan', '',
    '**Spec:** [proposal](../proposal.md) · [specs/greeting/spec.md](../specs/greeting/spec.md) · [brainstorm](brainstorm.md)', '',
    '### Task 1: greet(name)', '', '**Covers:** "Requirement: Greeting by name", "Requirement: Blank name falls back to default"', '',
    'Tests: Scenario "Name given", Scenario "Name with surrounding spaces", Scenario "Whitespace-only name"', '',
    '### Task 2: CLI wiring', '', '**Covers:** "Requirement: Greeting by name"', '',
  ].join('\n'));
  const r = run('spec-check.mjs', [CHANGE, '--json'], dir);
  assert.equal(r.code, 0, r.out);
  const json = JSON.parse(r.stdout);
  assert.equal(json.units, 2);
  assert.deepEqual([...json.missing, ...json.unknown, ...json.unsourced], []);
});

test('fixtures are real copies: writing a fixture config never touches the toolkit config', () => {
  const { dir } = makeFixture();
  const f = path.join(dir, '.openspec-handoff', 'config.json');
  assert.equal(fs.lstatSync(f).isSymbolicLink(), false);
});

test('wrappers and templates: spec changes after a delta edit, flag requirement belongs to the slices, harness optional, budget ~300', () => {
  const read = (p) => fs.readFileSync(path.join(TOOLKIT, p), 'utf8');
  for (const w of ['openspec-handoff-ai-hero', 'openspec-handoff-superpowers']) {
    const s = read(`skills/${w}/SKILL.md`);
    assert.match(s, /then `\/spec-check <id>` again: its "Spec changes since the last check" section lists/);
    assert.match(s, /`openspec list` \/ `openspec status` do not see/);
  }
  for (const h of ['claude', 'cursor', 'opencode']) assert.match(read(`commands/${h}/split-check.md`), /The flag requirement is never in the original delta: the flagged slice adds it/);
  assert.match(read('schemas/split-plan/schema.yaml') + read('schemas/handoff-driven/schema.yaml'), /A feature flag is not part of the\s+original delta/);
  assert.match(read('schemas/handoff-driven/templates/handoff.md'), /harness: <optional: claude-code \| cursor \| codex \| opencode \| other>/);
  assert.match(read('schemas/handoff-driven/templates/handoff.md'), /<n> expected \(planning not run yet; budget 8\)/);
  assert.match(read('schemas/handoff-driven/templates/proposal.md'), /~300 changed lines of code \+ tests[\s\S]*split gate \(\/split-check/);
  assert.doesNotMatch(read('schemas/handoff-driven/templates/proposal.md'), /400/);
});
