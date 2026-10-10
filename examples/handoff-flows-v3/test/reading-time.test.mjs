import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingTime } from '../src/reading-time.mjs';

const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

test('Default reading speed', () => {
  assert.equal(readingTime(words(400)), 2);
});

test('Partial minute rounds up', () => {
  assert.equal(readingTime(words(201)), 2);
});

test('Custom reading speed', () => {
  assert.equal(readingTime(words(300), { wordsPerMinute: 100 }), 3);
});

test('Empty text', () => {
  assert.equal(readingTime(''), 0);
  assert.equal(readingTime('  \n\t '), 0);
});

test('Punctuation-only tokens ignored', () => {
  // 3 words -> 1 minute at 200 wpm; at 1 wpm the word count is visible as minutes
  assert.equal(readingTime('wait — what ... ok', { wordsPerMinute: 1 }), 3);
});

test('Mixed whitespace', () => {
  assert.equal(readingTime('café\tnaïve\n\n  über', { wordsPerMinute: 1 }), 3);
});

test('Invalid speed rejected', () => {
  for (const wordsPerMinute of [0, -5, NaN, Infinity]) {
    assert.throws(() => readingTime('some words', { wordsPerMinute }), RangeError, `wordsPerMinute ${wordsPerMinute}`);
    assert.throws(() => readingTime('', { wordsPerMinute }), RangeError, `empty text, wordsPerMinute ${wordsPerMinute}`);
  }
});
