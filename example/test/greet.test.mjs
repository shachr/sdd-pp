import { test } from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../src/greet.mjs';

test('greets the world', () => {
  assert.equal(greet(), 'Hello, World!');
});
