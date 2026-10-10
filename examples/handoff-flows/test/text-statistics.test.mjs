import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countWords } from '../src/text-statistics.mjs';

test('Single spaces', () => assert.equal(countWords('the quick brown fox'), 4));
test('Mixed whitespace', () => assert.equal(countWords('  one\ttwo\n\nthree  '), 3));
test('Empty or blank text', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords(' \n '), 0);
});
test('Stray punctuation', () => assert.equal(countWords('wait - what ... ok'), 3));
test('Hyphens and apostrophes stay inside a word', () => assert.equal(countWords("don't over-think it"), 3));
test('Non-Latin letters', () => assert.equal(countWords('héllo wörld 123'), 3));
test('Review focus: non-breaking space separates words', () => assert.equal(countWords('two\u00a0words'), 2));
test('Review focus: emoji-only token is not a word', () => assert.equal(countWords('ship it 👍'), 2));
test('Review focus: combining mark stays inside its word', () => assert.equal(countWords('cafe\u0301 au lait'), 3));
test('Number input', () => assert.throws(() => countWords(42), TypeError));
test('Missing input', () => assert.throws(() => countWords(), TypeError));
test('Review focus: null input', () => assert.throws(() => countWords(null), TypeError));
test('Review focus: String object is rejected, not coerced', () => assert.throws(() => countWords(new String('a b')), TypeError));
