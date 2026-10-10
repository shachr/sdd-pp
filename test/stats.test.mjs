import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordCount, sentenceCount } from '../src/stats.mjs';

test('Words in a sentence', () => assert.equal(wordCount('Hello, big   world - again'), 4));
test('Whitespace only', () => { assert.equal(wordCount(''), 0); assert.equal(wordCount(' \n\t '), 0); });
test('Sentences ending in punctuation', () => assert.equal(sentenceCount('Hi. How are you? Great!'), 3));
test('No terminal punctuation', () => assert.equal(sentenceCount('One. two words'), 2));

import { readingMinutes, textStats } from '../src/stats.mjs';

const words = (n) => Array.from({ length: n }, () => 'w').join(' ');
test('Short text reads in one minute', () => { assert.equal(readingMinutes('one'), 1); assert.equal(readingMinutes(words(200)), 1); });
test('textStats bundles the three measurements', () => assert.deepEqual(textStats('Hi. How are you?'), { words: 4, sentences: 2, readingMinutes: 1 }));
