import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initials } from '../src/initials.mjs';

test('Two-part name', () => assert.equal(initials('Ada Lovelace'), 'AL'));
test('Hyphenated name', () => assert.equal(initials('Jean-Luc Picard'), 'JLP'));
test('Lowercase input', () => assert.equal(initials('grace  hopper'), 'GH'));
test('Accented initial', () => assert.equal(initials('émile zola'), 'ÉZ'));
test('Leading punctuation', () => assert.equal(initials("Mary (Bob) 'Smith"), 'MBS'));
test('Part without letters', () => assert.equal(initials('Louis 14 Bourbon'), 'LB'));
test('Blank name', () => {
  for (const name of ['', '   ', '-- 42']) assert.equal(initials(name), '');
});
// Review Focus 2-4
// NFC normalisation: a decomposed "e" + combining acute must give the same initial as precomposed "é".
test('decomposed accent stays accented', () => assert.equal(initials('e\u0301mile'), 'É'));
test('uppercasing may lengthen', () => assert.equal(initials('ßtraße'), 'SS'));
test('non-Latin part', () => assert.equal(initials('李 小龍'), '李小'));
