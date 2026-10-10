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
  const { dir, git } = makeFixture();
  let r = check(dir, '--expect-complete');
  assert.equal(r.code, 0, r.out);
  assert.match(JSON.parse(r.stdout).metrics.progress, /^2\/2 tickets done/);
  const t = path.join(ex(dir), 'tickets', '02-cli-passes-the-name.md');
  fs.writeFileSync(t, fs.readFileSync(t, 'utf8').replace(/\*\*Status:\*\* done/, '**Status:** ready-for-agent'));
  r = check(dir);
  assert.equal(r.code, 1, 'a ticket done at HEAD and reset in the working tree is an error');
  assert.match(JSON.parse(r.stdout).errors.join('\n'), /done work reset: execution\/tickets\/02-cli-passes-the-name\.md: was done at HEAD/);
  git('commit', '-qam', 'reopen ticket deliberately');
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
  const order = ['/to-spec', 'grill.md', '/to-tickets', '/spec-check x', '/implement-spec', '/code-review', "the tool's own review step", 'CI also runs a code review on the PR', '/opsx:verify x', 'execution/verify.md', '/opsx:archive x', 'together with its code', 'Merge the PR'];
  let at = -1; for (const s of order) { const i = ai.indexOf(s, at + 1); assert.ok(i > at, `ai-hero: ${s} out of order`); at = i; }
  const sp = nextSteps({ id: 'x', tool: 'superpowers', applyMode: 'subagent-driven-development' });
  const order2 = ['writing-plans', 'brainstorm.md', 'plan-x.md', '/spec-check x', 'subagent-driven-development', 'requesting-code-review', 'CI also runs a code review on the PR', '/opsx:verify x', '/opsx:archive x', 'together with its code', 'finishing-a-development-branch'];
  at = -1; for (const s of order2) { const i = sp.indexOf(s, at + 1); assert.ok(i > at, `superpowers: ${s} out of order`); at = i; }
  for (const t of [ai, sp]) assert.doesNotMatch(t, /fresh session|self-review|code-review\.md|check-handoff|expect-complete/i);
  const { dir } = makeFixture();
  const r = run('next-steps.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.stdout, /^Next steps for add-greeting-name \(ai-hero, apply_mode: implement\)/);
});

test('superpowers: a finished plan task reset after a planning re-run is an error (compared with git HEAD)', () => {
  const { dir, git } = makeFixture();
  setHandoff(dir, { tool: 'superpowers', apply_mode: 'executing-plans' });
  fs.rmSync(path.join(ex(dir), 'tickets'), { recursive: true });
  fs.rmSync(path.join(ex(dir), 'grill.md')); fs.rmSync(path.join(ex(dir), 'spec.md'));
  fs.writeFileSync(path.join(ex(dir), 'brainstorm.md'), '---\ntool: superpowers\n---\n> Source of truth: [proposal](../proposal.md)\n');
  const plan = (t1) => ['# Plan', '', '**Spec:** [proposal](../proposal.md)', '',
    '### Task 1: greet(name)', '**Covers:** "Requirement: Greeting by name"', `- [${t1}] **Step 1: test**`, `- [${t1}] **Step 2: code**`, '',
    '### Task 2: blank', '**Covers:** "Requirement: Blank name falls back to default"', '- [ ] **Step 1: test**'].join('\n');
  fs.writeFileSync(path.join(ex(dir), `plan-${CHANGE}.md`), plan('x'));
  git('add', '-A'); git('commit', '-qm', 'plan with task 1 done');
  assert.deepEqual(JSON.parse(check(dir).stdout).errors, []);
  fs.writeFileSync(path.join(ex(dir), `plan-${CHANGE}.md`), plan(' '));
  const r = check(dir);
  assert.equal(r.code, 1);
  assert.match(JSON.parse(r.stdout).errors.join('\n'), /done work reset: .*"Task 1: greet\(name\)" was finished at HEAD and has unticked steps now/);
});

test('code review: no file, label or Source-of-truth line is required (decisions section 15)', () => {
  const { dir } = makeFixture();
  const none = JSON.parse(check(dir, '--no-git').stdout);
  assert.doesNotMatch([...none.errors, ...none.warnings].join('\n'), /review/i);
  fs.mkdirSync(path.join(ex(dir), 'reviews'), { recursive: true });
  fs.writeFileSync(path.join(ex(dir), 'reviews', 'code-review.md'), '# Code review\n\nNo findings.\n');
  const r = JSON.parse(check(dir, '--no-git').stdout);
  assert.doesNotMatch([...r.errors, ...r.warnings].join('\n'), /code-review\.md/);
});
