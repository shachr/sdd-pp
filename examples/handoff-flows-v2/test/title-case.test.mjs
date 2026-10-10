import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTitleCase } from '../src/title-case.mjs';

test('Lowercase words', () => assert.equal(toTitleCase('hello world'), 'Hello World'));
test('Shouting is calmed', () => assert.equal(toTitleCase('hELLO WORLD'), 'Hello World'));
test('Space runs are kept', () => assert.equal(toTitleCase('  big   deal '), '  Big   Deal '));
test('Empty text', () => assert.equal(toTitleCase(''), ''));
test('A tab is not a word boundary', () => assert.equal(toTitleCase('ab\tcd ef'), 'Ab\tcd Ef'));
test('Minor words inside the title', () => assert.equal(toTitleCase('the LORD of the rings'), 'The Lord of the Rings'));
test('Minor word at the end', () => assert.equal(toTitleCase('what are you looking at'), 'What Are You Looking At'));
test('A lone minor word is capitalised', () => assert.equal(toTitleCase('the'), 'The'));
test('Leading spaces do not hide the first word', () => assert.equal(toTitleCase('  the end'), '  The End'));
test('A shouted minor word in the middle is lowered', () => assert.equal(toTitleCase('war OF worlds'), 'War of Worlds'));
test('Number input', () => assert.throws(() => toTitleCase(42), { name: 'TypeError', message: /number/ }));
test('null and undefined are rejected', () => {
  assert.throws(() => toTitleCase(null), { name: 'TypeError', message: /string/ });
  assert.throws(() => toTitleCase(undefined), { name: 'TypeError', message: /string/ });
});
