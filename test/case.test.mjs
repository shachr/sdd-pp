import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snakeCase, kebabCase, camelCase } from '../src/index.mjs';

test('Separators split words', () => assert.equal(snakeCase('user id-number.v'), 'user_id_number_v'));
test('Lower-to-upper boundary', () => assert.equal(kebabCase('userId'), 'user-id'));
test('Acronym kept as one word', () => assert.equal(snakeCase('XMLHttpRequest'), 'xml_http_request'));
test('Digits stay with their word', () => assert.equal(snakeCase('version2Beta'), 'version2_beta'));
test('Non-ASCII letters kept', () => assert.equal(kebabCase('caféCrème au lait'), 'café-crème-au-lait'));
test('snake_case output', () => assert.equal(snakeCase('Hello World'), 'hello_world'));
test('kebab-case output', () => assert.equal(kebabCase('user_id'), 'user-id'));
test('Empty or separator-only input', () => { assert.equal(snakeCase(''), ''); assert.equal(kebabCase('--'), ''); });
// Review Focus 1-4
test('caseless letters kept', () => assert.equal(snakeCase('東京 tower'), '東京_tower'));
test('upper run with digits', () => { assert.equal(snakeCase('ABC2'), 'abc2'); assert.equal(snakeCase('HTML5Parser'), 'html5_parser'); });
test('decomposed accent kept', () => assert.equal(kebabCase('cafe\u0301 au'), 'cafe\u0301-au'));
test('leading and trailing separators', () => assert.equal(snakeCase('__init__'), 'init'));

test('camelCase output', () => assert.equal(camelCase('XML http_request'), 'xmlHttpRequest'));
test('Already converted input unchanged', () => {
  assert.equal(camelCase('userId'), 'userId'); assert.equal(snakeCase('user_id'), 'user_id'); assert.equal(kebabCase('user-id'), 'user-id');
});
test('Empty or separator-only input (camelCase)', () => assert.equal(camelCase(' _ '), ''));
test('Text is not a string', () => assert.throws(() => camelCase(42), TypeError));
test('single word', () => assert.equal(camelCase('USER'), 'user')); // Review Focus 5
