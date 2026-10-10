import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapText } from '../src/text-wrapping.mjs';

test('Already fits', () => assert.deepEqual(wrapText('hello', 10), ['hello']));
test('Two lines', () => assert.deepEqual(wrapText('the quick brown fox', 10), ['the quick', 'brown fox']));
test('Space runs collapse', () => assert.deepEqual(wrapText('a   b', 10), ['a b']));
test('Blank line between paragraphs', () => assert.deepEqual(wrapText('one\n\ntwo', 10), ['one', '', 'two']));
test('Empty text', () => assert.deepEqual(wrapText('', 5), ['']));
test('Word wider than the column', () => assert.deepEqual(wrapText('abcdefghij', 4), ['abcd', 'efgh', 'ij']));
test('Overlong word after a short one', () => assert.deepEqual(wrapText('go abcdefgh', 4), ['go', 'abcd', 'efgh']));
test('Remainder shares its line', () => assert.deepEqual(wrapText('abcdefghij x', 4), ['abcd', 'efgh', 'ij x']));
