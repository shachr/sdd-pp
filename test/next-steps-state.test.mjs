// /sdd-change-status marks steps whose result is already in the change folder with [done] (cheap file checks)
// and uses `git switch` without -c when the change branch exists. Driven through the sdd-pp CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeFixture, CLI } from './helpers.mjs';

const ID = 'add-greeting-name';
const steps = (dir) => {
  const r = spawnSync(process.execPath, [CLI, 'change-status', ID], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};
const isDone = (out, n) => new RegExp(`^\\[done\\] ${n}\\. `, 'm').test(out);

test('next-steps: [done] follows the files in the change folder; the switch line drops -c once change/<id> exists', () => {
  const { dir, changeDir } = makeFixture();
  const ex = (...p) => path.join(changeDir, 'execution', ...p);
  let out = steps(dir);
  // the example has spec.md, tickets (all "Status: done") but no verify.md and no branch
  assert.ok(isDone(out, 1) && isDone(out, 2) && isDone(out, 4), out);
  assert.ok(!isDone(out, 6) && !isDone(out, 7), out);
  assert.match(out, /git switch -c change\/add-greeting-name, then commit/);
  assert.match(out, /^\(\[done\] = its result is already in openspec\/changes\/add-greeting-name\/; a file check, not progress tracking\)$/m);

  spawnSync('git', ['branch', 'change/add-greeting-name'], { cwd: dir });
  fs.writeFileSync(ex('verify.md'), '# Verify\n\nNo issues.\n');
  out = steps(dir);
  assert.match(out, /git switch change\/add-greeting-name - the branch exists, then commit/);
  assert.doesNotMatch(out, /switch -c/);
  assert.ok(isDone(out, 6), 'verify.md present -> [done] 6.');

  // an open ticket: implementation is no longer done; no tickets at all: step 2 is open too
  const tickets = fs.readdirSync(ex('tickets'));
  const t = ex('tickets', tickets[0]);
  fs.writeFileSync(t, fs.readFileSync(t, 'utf8').replace('**Status:** done', '**Status:** ready-for-agent'));
  out = steps(dir);
  assert.ok(!isDone(out, 4), out);
  for (const f of tickets) fs.rmSync(ex('tickets', f));
  fs.rmSync(ex('spec.md'));
  out = steps(dir);
  assert.ok(!isDone(out, 1) && !isDone(out, 2), out);
});

test('next-steps before /sdd-handoff (no handoff.md): exit 0 with the steps so far ([done] from the files), not an error', () => {
  const { dir, changeDir } = makeFixture();
  fs.rmSync(path.join(changeDir, 'handoff.md'));
  const out = steps(dir);
  assert.match(out, /^add-greeting-name: no handoff\.md yet - the change is not handed off, so the implementation steps are not known\. Steps up to the handoff:$/m);
  assert.match(out, /^\[done\] 1\. Design session: grill-with-docs -> openspec\/changes\/add-greeting-name\/execution\/grill\.md \(tool ai-hero/m);
  assert.match(out, /^\[done\] 2\. openspec\/changes\/add-greeting-name\/proposal\.md/m);
  assert.match(out, /^\[done\] 3\. Delta specs/m);
  assert.match(out, /^4\. \/sdd-split-check add-greeting-name - split gate/m);
  assert.match(out, /^5\. \/sdd-handoff add-greeting-name -> openspec\/changes\/add-greeting-name\/handoff\.md[^\n]*\/sdd-change-status add-greeting-name reprints them/m);
  assert.doesNotMatch(out, /\/to-spec|\/opsx:verify/);
});

test('next-steps (superpowers): the sdd-workspace path uses the installed skills folder when found, else says what <skills dir> is', () => {
  const { dir, changeDir } = makeFixture();
  fs.writeFileSync(path.join(changeDir, 'handoff.md'), fs.readFileSync(path.join(changeDir, 'handoff.md'), 'utf8').replace(/^tool: .*$/m, 'tool: superpowers').replace(/^apply_mode: .*$/m, 'apply_mode: executing-plans'));
  let out = steps(dir);
  assert.match(out, /<skills dir>\/subagent-driven-development\/scripts\/sdd-workspace [^\n]*\(<skills dir> = where the Superpowers skills are installed, e\.g\. \.claude\/skills or \.agents\/skills\)/);
  fs.mkdirSync(path.join(dir, '.claude/skills/subagent-driven-development'), { recursive: true });
  out = steps(dir);
  assert.match(out, / \.claude\/skills\/subagent-driven-development\/scripts\/sdd-workspace openspec\/changes\/add-greeting-name\/execution\/plan-add-greeting-name\.md\./);
  assert.doesNotMatch(out, /<skills dir>/);
});

test('change-status marks implementation and review [done] from the files: ai-hero tickets done + execution/reviews/; superpowers plan all ticked (a "- [ ]" quoted in prose does not count) + progress.md + reviews/', async () => {
  const { setHandoff } = await import('./helpers.mjs');
  const { dir, changeDir } = makeFixture();
  const ex = (...p) => path.join(changeDir, 'execution', ...p);
  let out = steps(dir);
  assert.ok(isDone(out, 4), 'ai-hero: every ticket Status done -> implementation [done]');
  assert.ok(!isDone(out, 5), 'no review notes yet');
  fs.mkdirSync(ex('reviews'), { recursive: true });
  fs.writeFileSync(ex('reviews', 'code-review.md'), '# Review\n\nNo findings.\n');
  out = steps(dir);
  assert.ok(isDone(out, 5), 'review notes in execution/reviews/ -> review [done]');
  assert.ok(!isDone(out, 6), 'verify still open');

  setHandoff(dir, { tool: 'superpowers', apply_mode: 'executing-plans' });
  fs.renameSync(ex('grill.md'), ex('brainstorm.md'));
  fs.writeFileSync(ex(`plan-${ID}.md`), '# Plan\n\nTick each - [ ] box as the step lands.\n\n### Task 1: greet\n- [x] **Step 1:** test\n- [x] **Step 2:** code\n');
  fs.writeFileSync(ex('progress.md'), '# Ledger\n');
  out = steps(dir);
  assert.ok(isDone(out, 3), 'superpowers: every plan step ticked -> implementation [done]');
  assert.match(out, /^   \[done\] Before the final review deletes the workspace: copy the ledger/m);
  assert.ok(isDone(out, 4), 'review notes -> requesting-code-review [done]');
  fs.writeFileSync(ex(`plan-${ID}.md`), '# Plan\n\n### Task 1: greet\n- [x] **Step 1:** test\n- [ ] **Step 2:** code\n');
  assert.ok(!isDone(steps(dir), 3), 'an unticked step keeps implementation open');
});
