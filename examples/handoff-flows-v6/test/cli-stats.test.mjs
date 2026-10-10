import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cli } from './cli-io.mjs';

test('Stats summary', () => assert.deepEqual(cli(['stats'], { stdin: 'Hi. How are you?' }), { code: 0, out: 'words: 4\nsentences: 2\nreading time: 1 min\n', err: '' }));
test('JSON flag', () => assert.deepEqual(cli(['stats', '--json'], { stdin: 'Hi. How are you?' }), { code: 0, out: '{"words":4,"sentences":2,"readingMinutes":1}\n', err: '' }));
test('stats is released: the usage lists it', () => assert.match(cli([]).err, /commands: slugify, stats\n$/));
test('stats rejects unknown options', () => {
  const r = cli(['stats', '--xml']);
  assert.equal(r.code, 2);
  assert.match(r.err, /stats: unknown option: --xml/);
});
