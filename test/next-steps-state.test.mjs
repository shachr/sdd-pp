// /sdd-next-steps marks steps whose result is already in the change folder with [done] (cheap file checks)
// and uses `git switch` without -c when the change branch exists. Driven through the sdd-pp CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeFixture, CLI } from './helpers.mjs';

const ID = 'add-greeting-name';
const steps = (dir) => {
  const r = spawnSync(process.execPath, [CLI, 'next-steps', ID], { cwd: dir, encoding: 'utf8' });
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
