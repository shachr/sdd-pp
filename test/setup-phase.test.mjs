// v3 setup phase: execution tool chosen up front (project default / per-change override),
// design session file in the proposal phase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, CHANGE, makeFixture, setHandoff, run, initCli } from './helpers.mjs';

const ex = (dir) => path.join(dir, 'openspec', 'changes', CHANGE, 'execution');
const warns = (dir) => JSON.parse(run('split-check.mjs', [CHANGE, '--json'], dir).stdout).warnings.join('\n');

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

test('/tool <id> starts the session file for the project-default tool when missing (same format as --set; not with --json, not after handoff)', () => {
  const { dir, changeDir } = makeFixture();
  fs.rmSync(path.join(changeDir, 'handoff.md'));
  fs.rmSync(path.join(ex(dir), 'grill.md'));
  let r = run('execution-tool.mjs', [CHANGE, '--json'], dir);
  assert.equal(r.code, 0); assert.equal(fs.existsSync(path.join(ex(dir), 'grill.md')), false, '--json (the handoff check) never creates it');
  r = run('execution-tool.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /ai-hero \(from \.openspec-handoff\/project\.json \(project default\)\) -> design session: grill-with-docs -> execution\/grill\.md \(created\)/);
  assert.equal(fs.readFileSync(path.join(ex(dir), 'grill.md'), 'utf8'), `---\ntool: ai-hero\nsession: grill-with-docs\n---\n\n> Links: [proposal](../proposal.md) · specs: ../specs/<capability>/spec.md\n\n# grill-with-docs session: ${CHANGE}\n`);
  fs.appendFileSync(path.join(ex(dir), 'grill.md'), 'notes\n');
  r = run('execution-tool.mjs', [CHANGE], dir);
  assert.doesNotMatch(r.out, /created/); assert.match(fs.readFileSync(path.join(ex(dir), 'grill.md'), 'utf8'), /notes\n$/);
});

test('split-check: new capability delta without ## Purpose warns (archive would write TBD)', () => {
  const { dir, changeDir } = makeFixture();
  const cap = path.join(changeDir, 'specs', 'farewell', 'spec.md');
  fs.mkdirSync(path.dirname(cap), { recursive: true });
  const body = '## ADDED Requirements\n\n### Requirement: Farewell\nThe system SHALL say goodbye.\n\n#### Scenario: Bye\n- **WHEN** run\n- **THEN** bye\n';
  fs.writeFileSync(cap, body);
  assert.match(warns(dir), /specs\/farewell\/spec\.md: new capability without "## Purpose"/);
  fs.writeFileSync(cap, '## Purpose\n\nSay goodbye to the user when the command line tool exits normally.\n\n' + body);
  assert.doesNotMatch(warns(dir), /Purpose/);
  // modified capability (main spec exists): no Purpose needed
  assert.doesNotMatch(warns(dir), /specs\/greeting\/spec\.md: new capability/);
});

test('sdd-pp init --tool writes the project default; a later install keeps it', { skip: !fs.existsSync(OPENSPEC) }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-tool-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  spawnSync(OPENSPEC, ['init', '--tools', 'none', '--no-animation', '.'], { cwd: dir });
  let r = initCli(dir, '--no-claude', '--no-cursor');
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /WARNING: no default execution tool/);
  r = initCli(dir, '--tool', 'superpowers', '--no-claude', '--no-cursor');
  assert.equal(r.status, 0, r.stderr);
  const pj = path.join(dir, '.openspec-handoff', 'project.json');
  assert.equal(JSON.parse(fs.readFileSync(pj, 'utf8')).defaultTool, 'superpowers');
  r = initCli(dir, '--force', '--no-claude', '--no-cursor');
  assert.match(r.stdout, /project\.json \(kept: "defaultTool": "superpowers"\)/);
  assert.equal(initCli(dir, '--tool=bogus').status, 2);
});
