import { test } from 'node:test';
import assert from 'node:assert/strict';
import { truncate } from '../src/truncate.mjs';

// Scenarios from openspec/changes/add-truncate/specs/truncation/spec.md
test('Fits already', () => assert.equal(truncate('hello', 10), 'hello'));
test('Exact length', () => assert.equal(truncate('hello', 5), 'hello'));
test('Cut at word boundary', () => assert.equal(truncate('the quick brown fox', 12), 'the quick…'));
test('Long single word', () => assert.equal(truncate('supercalifragilistic', 6), 'super…'));
test('Custom ellipsis', () => assert.equal(truncate('the quick brown fox', 12, { ellipsis: '...' }), 'the quick...'));
test('Invalid limit rejected', () => {
  for (const limit of [0, -1, 2.5, NaN]) assert.throws(() => truncate('hello world', limit), RangeError, String(limit));
  assert.throws(() => truncate('hello world', 2, { ellipsis: '...' }), RangeError);
});
