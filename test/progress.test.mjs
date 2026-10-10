// No OpenSpec tasks.md: progress comes from the tool's own tracking; handoff ends with next steps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CHANGE, makeFixture, setHandoff, run } from './helpers.mjs';
import { nextSteps } from '../scripts/next-steps.mjs';

const ex = (dir) => path.join(dir, 'openspec', 'changes', CHANGE, 'execution');
const check = (dir, ...a) => run('check-handoff.mjs', [CHANGE, '--json', ...a], dir);

test('ai-hero progress: tickets with Status done and ticked boxes; --expect-complete fails on an open ticket', () => {
  const { dir } = makeFixture();
  let r = check(dir, '--expect-complete');
  assert.equal(r.code, 0, r.out);
  assert.match(JSON.parse(r.stdout).metrics.progress, /^2\/2 tickets done/);
  const t = path.join(ex(dir), 'tickets', '02-cli-passes-the-name.md');
  fs.writeFileSync(t, fs.readFileSync(t, 'utf8').replace(/\*\*Status:\*\* done/, '**Status:** ready-for-agent'));
  r = check(dir);
  assert.equal(r.code, 0, 'open tickets are normal before --expect-complete');
  assert.match(JSON.parse(r.stdout).metrics.progress, /^1\/2 tickets done/);
  r = check(dir, '--expect-complete');
  assert.equal(r.code, 1);
  assert.match(JSON.parse(r.stdout).errors.join('\n'), /1 tickets not done: 02-cli-passes-the-name\.md/);
});

test('not planned yet is normal after handoff, an error with --expect-complete', () => {
  const { dir } = makeFixture();
  fs.rmSync(path.join(ex(dir), 'tickets'), { recursive: true });
  fs.rmSync(path.join(ex(dir), 'spec.md'));
  let r = check(dir);
  assert.equal(JSON.parse(r.stdout).metrics.progress, 'not planned yet');
  assert.deepEqual(JSON.parse(r.stdout).warnings, []);
  r = check(dir, '--expect-complete');
  assert.match(JSON.parse(r.stdout).errors.join('\n'), /no tickets in execution\/tickets\/ - planning has not run/);
});

test('superpowers progress: plan step checkboxes per task', () => {
  const { dir } = makeFixture();
  setHandoff(dir, { tool: 'superpowers', apply_mode: 'executing-plans' });
  fs.rmSync(path.join(ex(dir), 'tickets'), { recursive: true });
  fs.rmSync(path.join(ex(dir), 'grill.md')); fs.rmSync(path.join(ex(dir), 'spec.md'));
  fs.writeFileSync(path.join(ex(dir), 'brainstorm.md'), '---\ntool: superpowers\n---\n> Source of truth: [proposal](../proposal.md)\n');
  const plan = (t2) => ['# Plan', '', '**Spec:** [proposal](../proposal.md)', '',
    '### Task 1: greet(name)', '**Covers:** "Requirement: Greeting by name"', '- [x] **Step 1: test**', '- [x] **Step 2: code**', '',
    '### Task 2: blank', '**Covers:** "Requirement: Blank name falls back to default"', `- [${t2}] **Step 1: test**`, '', '## Self-Review', '- [ ] not a task step'].join('\n');
  fs.writeFileSync(path.join(ex(dir), `plan-${CHANGE}.md`), plan(' '));
  let r = check(dir, '--expect-complete');
  assert.equal(r.code, 1);
  assert.match(JSON.parse(r.stdout).metrics.progress, /^1\/2 plan tasks done \(2\/3 checkboxes\)/);
  assert.match(JSON.parse(r.stdout).errors.join('\n'), /Task 2: blank/);
  fs.writeFileSync(path.join(ex(dir), `plan-${CHANGE}.md`), plan('x'));
  r = check(dir, '--expect-complete');
  assert.equal(r.code, 0, r.out);
});

test('next-steps prints the tool sequence without running anything', () => {
  const ai = nextSteps({ id: 'x', tool: 'ai-hero', applyMode: 'implement-spec' });
  const order = ['/to-spec', 'grill.md', '/to-tickets', '/spec-check x', '/implement-spec', '/code-review', 'FRESH context', '--expect-complete', '/opsx:verify x', 'execution/verify.md', '/opsx:archive x'];
  let at = -1; for (const s of order) { const i = ai.indexOf(s, at + 1); assert.ok(i > at, `ai-hero: ${s} out of order`); at = i; }
  const sp = nextSteps({ id: 'x', tool: 'superpowers', applyMode: 'subagent-driven-development' });
  const order2 = ['writing-plans', 'brainstorm.md', 'plan-x.md', '/spec-check x', 'subagent-driven-development', 'requesting-code-review', '/opsx:verify x', 'finishing-a-development-branch', '/opsx:archive x'];
  at = -1; for (const s of order2) { const i = sp.indexOf(s, at + 1); assert.ok(i > at, `superpowers: ${s} out of order`); at = i; }
  const { dir } = makeFixture();
  const r = run('next-steps.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.stdout, /^Next steps for add-greeting-name \(ai-hero, apply_mode: implement\)/);
});
