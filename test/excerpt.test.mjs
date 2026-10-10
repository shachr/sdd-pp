import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excerpt } from '../src/index.mjs';

// One test per scenario of openspec/changes/add-excerpt/specs/text-excerpt/spec.md, named after it.

test('Text that fits', () => {
  assert.equal(excerpt('Hello world', 20), 'Hello world');
});

test('Cut at a word boundary', () => {
  assert.equal(excerpt('The quick brown fox', 12), 'The quick…');
});

test('First word too long', () => {
  assert.equal(excerpt('Supercalifragilistic word', 8), 'Superca…');
});

test('Trailing punctuation dropped', () => {
  assert.equal(excerpt('Hello, world and more', 8), 'Hello…');
});

test('Default ellipsis', () => {
  assert.equal(excerpt('one two three', 9), 'one two…');
});

test('Whitespace collapsed', () => {
  assert.equal(excerpt('  Hello \n\t world  ', 20), 'Hello world');
});

test('Emoji count as one character', () => {
  assert.equal(excerpt('🙂🙂🙂 smile more', 5), '🙂🙂🙂…');
});
