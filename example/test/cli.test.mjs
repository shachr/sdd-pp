import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const cli = new URL('../src/cli.mjs', import.meta.url).pathname;
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

test('cli greets the given name', () => {
  const r = run('Ada');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, 'Hello, Ada!\n');
});

test('cli without arguments keeps the default greeting', () => {
  const r = run();
  assert.equal(r.status, 0);
  assert.equal(r.stdout, 'Hello, World!\n');
});
