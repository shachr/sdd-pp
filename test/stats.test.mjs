import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordCount, sentenceCount } from '../src/stats.mjs';

test('Words in a sentence', () => assert.equal(wordCount('Hello, big   world - again'), 4));
test('Whitespace only', () => { assert.equal(wordCount(''), 0); assert.equal(wordCount(' \n\t '), 0); });
test('Sentences ending in punctuation', () => assert.equal(sentenceCount('Hi. How are you? Great!'), 3));
test('No terminal punctuation', () => assert.equal(sentenceCount('One. two words'), 2));
