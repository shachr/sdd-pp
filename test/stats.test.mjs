import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countWords, readingTime } from '../src/index.mjs';

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

const words = (n) => Array(n).fill('w').join(' ');

test('Rounds up to whole minutes', () => {
  assert.equal(readingTime(words(201)), 2);
});

test('Empty text reads in zero minutes', () => {
  assert.equal(readingTime(''), 0);
});

test('Custom reading speed', () => {
  assert.equal(readingTime(words(300), 300), 1);
});

test('Text is not a string (readingTime)', () => {
  assert.throws(() => readingTime(42), TypeError);
});

test('Reading speed is not positive', () => {
  assert.throws(() => readingTime('a b', 0), RangeError);
  assert.throws(() => readingTime('a b', -5), RangeError);
});

test('Fractional speed allowed', () => {
  assert.equal(readingTime(words(400), 250.5), 2);
});

test('NaN, Infinity and string speeds rejected', () => {
  for (const speed of [NaN, Infinity, '200']) assert.throws(() => readingTime('a b', speed), RangeError);
});
