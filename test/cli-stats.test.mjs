import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cli } from './cli-io.mjs';

const ON = { TEXTKIT_STATS: '1' };

test('Stats summary', () => assert.deepEqual(cli(['stats'], { stdin: 'Hi. How are you?', env: ON }), { code: 0, out: 'words: 4\nsentences: 2\nreading time: 1 min\n', err: '' }));
test('Flag off', () => {
  const r = cli(['stats'], { stdin: 'Hi.' });
  assert.equal(r.code, 2);
  assert.match(r.err, /unknown command: stats/);
  assert.match(r.err, /commands: slugify\n$/);
});
test('Flag on', () => assert.equal(cli(['stats'], { stdin: 'Hi.', env: ON }).code, 0));
test('stats rejects unknown options', () => {
  const r = cli(['stats', '--xml'], { env: ON });
  assert.equal(r.code, 2);
  assert.match(r.err, /stats: unknown option: --xml/);
});
