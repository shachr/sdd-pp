import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordCount } from '../src/stats.mjs';

test('Words in a sentence', () => assert.equal(wordCount('Hello, big   world - again'), 4));
test('Whitespace only', () => { assert.equal(wordCount(''), 0); assert.equal(wordCount(' \n\t '), 0); });
test('Review focus: coercion, Unicode, newlines', () => {
  assert.equal(wordCount(42), 1);
  assert.equal(wordCount('café 日本'), 2);
  assert.equal(wordCount('a\nb\tc'), 3);
});

import { sentenceCount } from '../src/stats.mjs';

test('Sentences ending in punctuation', () => assert.equal(sentenceCount('Hi. How are you? Great!'), 3));
test('No terminal punctuation', () => assert.equal(sentenceCount('One. two words'), 2));
test('Review focus: no words', () => { assert.equal(sentenceCount(''), 0); assert.equal(sentenceCount('?!'), 0); });
