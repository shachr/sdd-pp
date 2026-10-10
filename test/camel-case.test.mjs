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
test('Nothing to convert', () => {
  assert.equal(camelCase('  --  '), '');
  assert.equal(camelCase('🙂 !!'), '');
});
test('Review fix: combining marks alone are not a word', () => {
  assert.equal(camelCase(' \u0301 - \u0308 '), '');
});
test('Verify fix: first letter outside the BMP is upper-cased', () => {
  assert.equal(camelCase('a \u{10428}b'), 'a\u{10400}b');
});
