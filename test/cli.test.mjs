import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cli } from './cli-io.mjs';

test('Slugify argument', () => assert.deepEqual(cli(['slugify', 'Hello World!']), { code: 0, out: 'hello-world\n', err: '' }));
test('Slugify from stdin', () => assert.deepEqual(cli(['slugify'], { stdin: 'Café au lait\n' }), { code: 0, out: 'cafe-au-lait\n', err: '' }));
test('slugify joins several arguments with a space', () => assert.equal(cli(['slugify', 'Hello', 'World']).out, 'hello-world\n'));
test('bin/textkit.mjs runs slugify from a real process (argument and stdin)', () => {
  let r = spawnSync(process.execPath, ['bin/textkit.mjs', 'slugify', 'Hello World!'], { encoding: 'utf8' });
  assert.equal(r.status, 0); assert.equal(r.stdout, 'hello-world\n');
  r = spawnSync(process.execPath, ['bin/textkit.mjs', 'slugify'], { input: 'Café au lait\n', encoding: 'utf8' });
  assert.equal(r.status, 0); assert.equal(r.stdout, 'cafe-au-lait\n');
});

test('Unknown command', () => {
  const r = cli(['frobnicate']);
  assert.equal(r.code, 2);
  assert.match(r.err, /unknown command: frobnicate/);
  assert.match(r.err, /usage: textkit <command> \[text\]/);
  assert.equal(r.out, '');
});
test('Missing argument', () => {
  const r = cli([]);
  assert.equal(r.code, 2);
  assert.match(r.err, /usage: textkit <command> \[text\]/);
});
test('inherited object names are unknown commands', () => assert.equal(cli(['toString']).code, 2));
