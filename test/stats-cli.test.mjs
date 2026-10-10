import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/stats-cli.mjs';

const io = (files = {}, stdin = '') => {
  const out = { stdout: '', stderr: '' };
  return { out, io: { stdout: { write: (s) => { out.stdout += s; } }, stderr: { write: (s) => { out.stderr += s; } }, readStdin: () => stdin,
    readFile: (f) => { if (!(f in files)) throw new Error('ENOENT'); return files[f]; } } };
};
const SUMMARY = 'words: 4\nsentences: 2\nreading time: 1 min\n';

test('Stats summary', () => { const t = io({}, 'Hi. How are you?'); assert.equal(run([], t.io), 0); assert.equal(t.out.stdout, SUMMARY); });
test('Stats from a file', () => { const t = io({ 'notes.txt': 'Hi. How are you?' }); assert.equal(run(['notes.txt'], t.io), 0); assert.equal(t.out.stdout, SUMMARY); });
test('JSON flag', () => { const t = io({}, 'Hi. How are you?'); assert.equal(run(['--json'], t.io), 0); assert.equal(t.out.stdout, '{"words":4,"sentences":2,"readingMinutes":1}\n'); });
test('Unknown option', () => { const t = io(); assert.equal(run(['--xml'], t.io), 2); assert.match(t.out.stderr, /usage: textkit-stats/); assert.equal(t.out.stdout, ''); });
test('Unreadable file', () => { const t = io(); assert.equal(run(['missing.txt'], t.io), 2); assert.match(t.out.stderr, /missing\.txt/); assert.match(t.out.stderr, /usage: textkit-stats/); });
