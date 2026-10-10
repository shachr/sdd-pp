import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordWrap } from '../src/index.mjs';

test('Short text unchanged', () => {
  assert.equal(wordWrap('hello world', 20), 'hello world');
});

test('Wraps at the width', () => {
  assert.equal(wordWrap('the quick brown fox', 10), 'the quick\nbrown fox');
});

test('Default width', () => {
  const lines = wordWrap(Array(100).fill('a').join(' ')).split('\n');
  assert.ok(lines.every((l) => l.length <= 80));
  assert.equal(lines[0].length, 79);
});

test('Spaces collapsed', () => {
  assert.equal(wordWrap('  a \t  b  ', 10), 'a b');
});

test('Paragraphs wrapped separately', () => {
  assert.equal(wordWrap('aa bb\n\ncc dd', 5), 'aa bb\n\ncc dd');
});

test('Empty text', () => {
  assert.equal(wordWrap('', 10), '');
});

test('Word longer than the width', () => {
  assert.equal(wordWrap('abcdefghij xy', 4), 'abc-\ndef-\nghij\nxy');
});

test('Text is not a string', () => {
  assert.throws(() => wordWrap(42, 10), TypeError);
});

test('Width is not a positive integer', () => {
  assert.throws(() => wordWrap('a b', 0), RangeError);
  assert.throws(() => wordWrap('a b', 2.5), RangeError);
});
