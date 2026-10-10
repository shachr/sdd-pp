import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countWords } from '../src/index.mjs';

test('Counts words', () => {
  assert.equal(countWords('one two\tthree\nfour, five'), 5);
});

test('No words', () => {
  assert.equal(countWords(' \t\n '), 0);
});

test('CRLF separates words', () => {
  assert.equal(countWords('a\r\nb'), 2);
});

test('Edges are not words', () => {
  assert.equal(countWords('  a  '), 1);
});

test('Text is not a string (countWords)', () => {
  assert.throws(() => countWords(null), TypeError);
});
