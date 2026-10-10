import { test } from 'node:test';
import assert from 'node:assert/strict';
import { truncate } from '../src/truncate.mjs';

test('Shorter than the limit: text comes back unchanged', () => {
  assert.equal(truncate('hello', 10), 'hello');
});

test('Result fits the limit: long text is cut with a single ellipsis inside the budget', () => {
  assert.equal(truncate('abcdefghij', 5), 'abcd…');
});

test('Word boundary available: cut at the last space and drop whitespace before the ellipsis', () => {
  assert.equal(truncate('The quick brown fox', 12), 'The quick…');
});

test('Single long word: hard cut when there is no space', () => {
  assert.equal(truncate('Supercalifragilistic', 8), 'Superca…');
});

test('Exactly the limit: text comes back unchanged', () => {
  assert.equal(truncate('hello', 5), 'hello');
});

test('Limit of one: only the ellipsis remains', () => {
  assert.equal(truncate('abc', 1), '…');
});

test('Zero limit: RangeError', () => {
  assert.throws(() => truncate('abc', 0), RangeError);
});

test('Fractional limit: RangeError', () => {
  assert.throws(() => truncate('abc', 2.5), RangeError);
});

test('Negative limit: RangeError', () => {
  assert.throws(() => truncate('abc', -1), RangeError);
});
