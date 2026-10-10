// v3 setup phase: execution tool chosen up front (project default / per-change override),
// design session file in the proposal phase, consistency checks at handoff.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, CHANGE, makeFixture, setHandoff, run } from './helpers.mjs';
import { proposalLeaks } from '../scripts/lib/change.mjs';

const ex = (dir) => path.join(dir, 'openspec', 'changes', CHANGE, 'execution');
const errs = (dir) => JSON.parse(run('check-handoff.mjs', [CHANGE, '--json'], dir).stdout);

test('execution-tool: project default, per-change override, refusal to switch after the session', () => {
  const { dir, changeDir } = makeFixture();
  fs.rmSync(path.join(dir, '.openspec-handoff', 'project.json'));
  fs.rmSync(path.join(changeDir, 'handoff.md'));
  fs.rmSync(path.join(ex(dir), 'grill.md'));
  let r = run('execution-tool.mjs', [CHANGE], dir);
  assert.equal(r.code, 1); assert.match(r.out, /no execution tool set/);
  r = run('execution-tool.mjs', ['--default', 'ai-hero'], dir);
  assert.equal(r.code, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.openspec-handoff/project.json'), 'utf8')).defaultTool, 'ai-hero');
  r = run('execution-tool.mjs', [CHANGE, '--json'], dir);
  assert.deepEqual({ ...JSON.parse(r.stdout) }, { change: CHANGE, tool: 'ai-hero', source: '.openspec-handoff/project.json (project default)', projectDefault: 'ai-hero', override: false, sessionFile: 'execution/grill.md', sessionSkill: 'grill-with-docs' });
  // per-change override: starts execution/brainstorm.md with front matter
  r = run('execution-tool.mjs', [CHANGE, '--set', 'superpowers'], dir);
  assert.equal(r.code, 0, r.out); assert.match(r.out, /superpowers .*overrides project default ai-hero/);
  assert.match(fs.readFileSync(path.join(ex(dir), 'brainstorm.md'), 'utf8'), /^---\ntool: superpowers\nsession: brainstorming\n---/);
  // switching back after the session started is refused (redo the session)
  r = run('execution-tool.mjs', [CHANGE, '--set', 'ai-hero'], dir);
  assert.equal(r.code, 1); assert.match(r.out, /switching tools means redoing the session/i);
  assert.equal(run('execution-tool.mjs', [CHANGE, '--set', 'nope'], dir).code, 2);
});

test('check-handoff: handoff tool must match the design session file', () => {
  const { dir } = makeFixture();
  setHandoff(dir, { tool: 'superpowers', apply_mode: 'executing-plans' });
  const j = errs(dir);
  assert.match(j.errors.join('\n'), /handoff\.md tool "superpowers" but the design session ran with ai-hero \(execution\/grill\.md\)/);
  assert.match(j.errors.join('\n'), /execution\/brainstorm\.md is missing/);
});

test('check-handoff: both session files, wrong front matter, missing session file', () => {
  const { dir } = makeFixture();
  fs.writeFileSync(path.join(ex(dir), 'brainstorm.md'), '---\ntool: ai-hero\n---\n> Source of truth: [proposal](../proposal.md)\n');
  let j = errs(dir);
  assert.match(j.errors.join('\n'), /both execution\/grill\.md and execution\/brainstorm\.md exist/);
  assert.match(j.errors.join('\n'), /brainstorm\.md: front matter tool "ai-hero" does not match/);
  fs.rmSync(path.join(ex(dir), 'brainstorm.md'));
  fs.rmSync(path.join(ex(dir), 'grill.md'));
  j = errs(dir);
  assert.match(j.errors.join('\n'), /execution\/grill\.md is missing: the ai-hero design session runs in the proposal phase/);
});

test('check-handoff: example passes with tool metrics; no reviewer_model needed', () => {
  const { dir } = makeFixture();
  setHandoff(dir, { reviewer_model: null });
  const j = errs(dir);
  assert.deepEqual(j.errors, []);
  assert.equal(j.metrics.tool, 'ai-hero');
});

test('proposal lint: implementation detail in proposal.md is a warning; Impact section is exempt', () => {
  assert.deepEqual(proposalLeaks('## Why\nUsers need it.\n\n## Impact\n`src/a.mjs` and tests.\n'), []);
  const leaks = proposalLeaks('## Why\nWe need it.\n\n## What Changes\n- Uses a regex internally.\n- Add `src/util.mjs`.\n```js\nx()\n```\n');
  assert.deepEqual(leaks.map((l) => l.hint), ['implementation term', 'file path', 'code block']);
  const { dir, changeDir } = makeFixture();
  fs.appendFileSync(path.join(changeDir, 'proposal.md'), '\n## Notes\n- Implemented with a greedy algorithm.\n');
  const j = errs(dir);
  assert.deepEqual(j.errors, []);
  assert.match(j.warnings.join('\n'), /proposal\.md:\d+: possible implementation detail \(implementation term\)/);
});

test('new capability delta without ## Purpose warns (archive would write TBD)', () => {
  const { dir, changeDir } = makeFixture();
  const cap = path.join(changeDir, 'specs', 'farewell', 'spec.md');
  fs.mkdirSync(path.dirname(cap), { recursive: true });
  const body = '## ADDED Requirements\n\n### Requirement: Farewell\nThe system SHALL say goodbye.\n\n#### Scenario: Bye\n- **WHEN** run\n- **THEN** bye\n';
  fs.writeFileSync(cap, body);
  assert.match(errs(dir).warnings.join('\n'), /specs\/farewell\/spec\.md: new capability without "## Purpose"/);
  fs.writeFileSync(cap, '## Purpose\n\nSay goodbye to the user when the command line tool exits normally.\n\n' + body);
  assert.doesNotMatch(errs(dir).warnings.join('\n'), /Purpose/);
  // modified capability (main spec exists): no Purpose needed
  assert.doesNotMatch(errs(dir).warnings.join('\n'), /specs\/greeting\/spec\.md: new capability/);
});

test('install.sh --tool writes the project default; a later install keeps it', { skip: !fs.existsSync(OPENSPEC) }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-tool-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  spawnSync(OPENSPEC, ['init', '--tools', 'none', '--no-animation', '.'], { cwd: dir });
  let r = spawnSync('bash', [path.join(TOOLKIT, 'install.sh'), dir, '--no-claude', '--no-cursor'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /WARNING: no default execution tool/);
  r = spawnSync('bash', [path.join(TOOLKIT, 'install.sh'), dir, '--tool', 'superpowers', '--no-claude', '--no-cursor'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const pj = path.join(dir, '.openspec-handoff', 'project.json');
  assert.equal(JSON.parse(fs.readFileSync(pj, 'utf8')).defaultTool, 'superpowers');
  r = spawnSync('bash', [path.join(TOOLKIT, 'install.sh'), dir, '--force', '--no-claude', '--no-cursor'], { encoding: 'utf8' });
  assert.match(r.stdout, /project\.json \(kept: "defaultTool": "superpowers"\)/);
  assert.equal(spawnSync('bash', [path.join(TOOLKIT, 'install.sh'), dir, '--tool=bogus'], { encoding: 'utf8' }).status, 2);
});
