import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { run } from '../src/cli.mjs';

const FLAG_ON = { TEXTKIT_STATS_CLI: '1' };

// Runs the CLI core with fake streams and the given stdin text and environment.
function cli(argv, { input = '', env = FLAG_ON } = {}) {
  const out = []; const err = [];
  const io = { stdout: { write: (s) => out.push(s) }, stderr: { write: (s) => err.push(s) }, readStdin: () => input, env };
  const code = run(argv, io);
  return { code, out: out.join(''), err: err.join('') };
}

test('Stats summary', () => {
  const r = cli(['stats'], { input: 'Hi. How are you?' });
  assert.deepEqual([r.out, r.code, r.err], ['words: 4\nsentences: 2\n', 0, '']);
});

test('Unknown stats option', () => {
  for (const arg of ['--xml', 'extra']) {
    const r = cli(['stats', arg], { input: 'Hi.' });
    assert.equal(r.code, 2);
    assert.equal(r.out, '');
    assert.match(r.err, new RegExp(`stats: unknown option: ${arg}`));
    assert.match(r.err, /usage: textkit <command> \[text\]/);
  }
});

test('Flag off', () => {
  for (const env of [{}, { TEXTKIT_STATS_CLI: '0' }, { TEXTKIT_STATS_CLI: 'true' }]) {
    const r = cli(['stats'], { input: 'Hi.', env });
    assert.equal(r.code, 2);
    assert.match(r.err, /unknown command: stats/);
    assert.doesNotMatch(r.err, /commands: .*stats/);
  }
});

test('Flag on', () => {
  const r = cli(['stats'], { input: 'Hi.' });
  assert.equal(r.out, 'words: 1\nsentences: 1\n');
  assert.match(cli([], {}).err, /commands: slugify, stats/);
});

test('bin/textkit.mjs pipes standard input into stats', () => {
  const bin = fileURLToPath(new URL('../bin/textkit.mjs', import.meta.url));
  const out = execFileSync(process.execPath, [bin, 'stats'], { input: 'One. Two three!', encoding: 'utf8', env: { ...process.env, ...FLAG_ON } });
  assert.equal(out, 'words: 3\nsentences: 2\n');
});

test('JSON flag', () => {
  const r = cli(['stats', '--json'], { input: 'Hi. How are you?' });
  assert.deepEqual([r.out, r.code], ['{"words":4,"sentences":2}\n', 0]);
  assert.deepEqual(JSON.parse(r.out), { words: 4, sentences: 2 });
});
