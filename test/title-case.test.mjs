import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTitleCase } from '../src/title-case.mjs';

test('Lowercase words', () => assert.equal(toTitleCase('hello world'), 'Hello World'));
test('Shouting is calmed', () => assert.equal(toTitleCase('hELLO WORLD'), 'Hello World'));
test('Space runs are kept', () => assert.equal(toTitleCase('  big   deal '), '  Big   Deal '));
test('Empty text', () => assert.equal(toTitleCase(''), ''));
test('A tab is not a word boundary', () => assert.equal(toTitleCase('ab\tcd ef'), 'Ab\tcd Ef'));
