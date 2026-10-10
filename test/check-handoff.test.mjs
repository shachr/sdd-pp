import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeFixture, setHandoff, run, CHANGE } from './helpers.mjs';

test('example change passes check-handoff', () => {
  const { dir } = makeFixture();
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /0 error\(s\)/);
});

test('missing implementation_model fails', () => {
  const { dir } = makeFixture();
  setHandoff(dir, { implementation_model: null });
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /implementation_model" is missing/);
});

test('unknown tool fails', () => {
  const { dir } = makeFixture();
  setHandoff(dir, { tool: 'cursor-composer' });
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /must be one of ai-hero, superpowers/);
});

test('copied requirement text in handoff.md fails (reference, not duplicate)', () => {
  const { changeDir, dir } = makeFixture();
  const f = path.join(changeDir, 'handoff.md');
  fs.appendFileSync(f, '\nWhen the name argument is empty or only whitespace the `greet` command SHALL print the default greeting `Hello, World!`.\n');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /duplicates requirement text from specs\/greeting\/spec\.md/);
});

test('spec-delta headers in an execution artifact fail', () => {
  const { changeDir, dir } = makeFixture();
  fs.mkdirSync(path.join(changeDir, 'execution'), { recursive: true });
  fs.writeFileSync(path.join(changeDir, 'execution', 'notes.md'), '> Source of truth: [proposal](../proposal.md)\n\n### Requirement: Greeting by name\n');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /execution\/notes\.md: contains spec-delta headers/);
});

test('handoff.md must link every spec delta', () => {
  const { changeDir, dir } = makeFixture();
  const f = path.join(changeDir, 'handoff.md');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('[specs/greeting/spec.md](specs/greeting/spec.md)', 'the greeting delta'));
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /must link spec delta specs\/greeting\/spec\.md/);
});

test('outputs left in tool default locations fail', () => {
  const { dir } = makeFixture();
  fs.mkdirSync(path.join(dir, '.scratch', CHANGE), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs', 'superpowers', 'plans'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs', 'superpowers', 'plans', `2026-10-09-${CHANGE}.md`), '# plan');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /outside the change folder: \.scratch\/add-greeting-name/);
  assert.match(r.out, /outside the change folder: docs\/superpowers\/plans\/2026-10-09-add-greeting-name\.md/);
});

test('bad base_ref fails', () => {
  const { dir } = makeFixture();
  setHandoff(dir, { base_ref: 'deadbeef' });
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /base_ref "deadbeef" is not a commit/);
});

test('changed lines over budget warn, over hard limit fail', () => {
  const { dir } = makeFixture();
  const big = (n) => Array.from({ length: n }, (_, i) => `export const x${i} = ${i};`).join('\n');
  fs.writeFileSync(path.join(dir, 'src', 'big.mjs'), big(500));
  let r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /! size: changed lines since base_ref 500 > budget 400/);
  fs.writeFileSync(path.join(dir, 'src', 'big.mjs'), big(900));
  r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ size: changed lines since base_ref 900 > hard limit 800/);
});

test('openspec/ planning files and paths outside diff_paths do not count toward size', () => {
  const { dir, changeDir } = makeFixture();
  fs.writeFileSync(path.join(changeDir, 'execution', 'notes.md'), '> Source of truth: [proposal](../proposal.md)\n' + 'x\n'.repeat(2000));
  fs.writeFileSync(path.join(dir, 'README.md'), 'y\n'.repeat(2000));
  const r = run('check-handoff.mjs', [CHANGE, '--json'], dir);
  assert.equal(JSON.parse(r.stdout).metrics.lines, 0, r.out);
});

test('archived change: found under changes/archive by name or dated name; size not measured', () => {
  const { dir, changeDir } = makeFixture();
  fs.mkdirSync(path.join(dir, 'openspec', 'changes', 'archive'), { recursive: true });
  fs.renameSync(changeDir, path.join(dir, 'openspec', 'changes', 'archive', `2026-10-09-${CHANGE}`));
  for (const id of [CHANGE, `2026-10-09-${CHANGE}`]) {
    const r = run('check-handoff.mjs', [id], dir);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /archived change: diff size not measured/);
  }
});
