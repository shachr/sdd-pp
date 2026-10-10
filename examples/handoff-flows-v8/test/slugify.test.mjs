import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/index.mjs';

test('lowercases and joins words with dashes', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('folds accents and drops punctuation', () => {
  assert.equal(slugify('  Café, crème & brûlée!  '), 'cafe-creme-brulee');
});

test('empty input gives an empty slug', () => {
  assert.equal(slugify(''), '');
});

test('rejects non-strings', () => {
  assert.throws(() => slugify(42), TypeError);
});
