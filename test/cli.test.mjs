import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { run } from '../src/cli.mjs';

// Runs the CLI core with fake streams; returns { code, out, err }.
function cli(...argv) {
  const out = []; const err = [];
  const io = { stdout: { write: (s) => out.push(s) }, stderr: { write: (s) => err.push(s) }, env: {} };
  const code = run(argv, io);
  return { code, out: out.join(''), err: err.join('') };
}

test('Slugify argument', () => {
  const r = cli('slugify', 'Hello World!');
  assert.deepEqual([r.out, r.code, r.err], ['hello-world\n', 0, '']);
});

test('slugify joins several words like echo', () => {
  assert.equal(cli('slugify', 'Hello', 'World').out, 'hello-world\n');
});

test('bin/textkit.mjs runs the CLI from a real process', () => {
  const bin = fileURLToPath(new URL('../bin/textkit.mjs', import.meta.url));
  assert.equal(execFileSync(process.execPath, [bin, 'slugify', 'Café au lait'], { encoding: 'utf8' }), 'cafe-au-lait\n');
});
