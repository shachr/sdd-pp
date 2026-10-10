import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initials } from '../src/initials.mjs';

test('Two-part name', () => assert.equal(initials('Ada Lovelace'), 'AL'));
test('Hyphenated name', () => assert.equal(initials('Jean-Luc Picard'), 'JLP'));
test('Lowercase input', () => assert.equal(initials('grace  hopper'), 'GH'));
test('Accented initial', () => assert.equal(initials('émile zola'), 'ÉZ'));
