import { test } from 'node:test';
import assert from 'node:assert/strict';
import { camelCase } from '../src/camel-case.mjs';

// Scenarios from openspec/changes/add-camel-case/specs/casing/spec.md
test('Mixed separators', () => assert.equal(camelCase('hello-world_foo  bar!'), 'helloWorldFooBar'));
test('Shouting input', () => assert.equal(camelCase('HELLO WORLD'), 'helloWorld'));
test('Unicode letters', () => assert.equal(camelCase('élan vital'), 'élanVital'));
test('Decomposed accents', () => assert.equal(camelCase('élan vital'.normalize('NFD')), 'élanVital'.normalize('NFD')));
test('Review focus: coercion, edges, digits, ß', () => {
  assert.equal(camelCase(42), '42');
  assert.equal(camelCase('--hello--'), 'hello');
  assert.equal(camelCase('version 2 beta'), 'version2Beta');
  assert.equal(camelCase('a ßtraße'), 'aSStraße');
});
