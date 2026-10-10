import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../src/slugify.mjs';

test('slugify lowercases and joins words with dashes', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('slugify strips accents and punctuation', () => {
  assert.equal(slugify('Crème brûlée!'), 'creme-brulee');
});
