import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../src/greet.mjs';

test('greets the world', () => {
  assert.equal(greet(), 'Hello, World!');
});

test('greets a name', () => {
  assert.equal(greet('Ada'), 'Hello, Ada!');
});

test('trims surrounding whitespace from the name', () => {
  assert.equal(greet('  Ada  '), 'Hello, Ada!');
});

test('blank name falls back to the default greeting', () => {
  assert.equal(greet('   '), 'Hello, World!');
  assert.equal(greet(''), 'Hello, World!');
});
