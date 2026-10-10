# Case Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `case-conversion` capability ([delta](../specs/case-conversion/spec.md)).

**Architecture:** One new module `src/case.mjs` with an internal word splitter shared by three exported converters, re-exported from `src/index.mjs` like `slugify` and `excerpt`.

**Tech Stack:** Node >= 20 ESM, `node:test` + `node:assert/strict`, no dependencies.

**Spec:** [proposal](../proposal.md) · [specs/case-conversion/spec.md](../specs/case-conversion/spec.md) · [brainstorm](brainstorm.md) · [handoff](../handoff.md)

## Global Constraints

- [delta](../specs/case-conversion/spec.md) - "Requirement: Word splitting"
- [delta](../specs/case-conversion/spec.md) - "Requirement: snake_case conversion"
- [delta](../specs/case-conversion/spec.md) - "Requirement: kebab-case conversion"
- [delta](../specs/case-conversion/spec.md) - "Requirement: camelCase conversion"
- [delta](../specs/case-conversion/spec.md) - "Requirement: Input handling"
- No dependencies; ESM; exports added to `src/index.mjs`; `npm test` stays green.

## Review Focus

1. Caseless letters (CJK, e.g. `"東京 tower"`) - a person expects them kept as a word, not dropped. Test in Task 1.
2. Upper-case run followed by digits (`"ABC2"`, `"HTML5Parser"`) - expected one word with its digits (`abc2`, `html5_parser`). Test in Task 1.
3. Decomposed accents (`"cafe\u0301"`, NFD) - the combining mark stays with its letter. Test in Task 1.
4. Leading/trailing separators (`"__init__"`) - no empty words, `init`. Test in Task 1.
5. Single word in camelCase (`"USER"`) - `user`. Test in Task 2.

---

### Task 1: Word splitter + snake/kebab converters

**Covers:** [delta](../specs/case-conversion/spec.md) - "Requirement: Word splitting"; "Requirement: snake_case conversion"; "Requirement: kebab-case conversion"; "Requirement: Input handling"

**Estimate:** ~95 lines

**Files:**
- Create: `src/case.mjs`
- Modify: `src/index.mjs` (add export)
- Test: `test/case.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `snakeCase(text: string): string`, `kebabCase(text: string): string`, internal `words(text: string): string[]` (not exported from index; throws `TypeError` when `text` is not a string).

- [ ] **Step 1: Write the failing tests** in `test/case.test.mjs`, importing from `../src/index.mjs`, one test per scenario name:

```js
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
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/case.test.mjs` - Expected: FAIL (`snakeCase` is not exported).

- [ ] **Step 3: Implement `words`, `snakeCase`, `kebabCase` in `src/case.mjs`**; export the two converters from `src/index.mjs`. The splitter is the one algorithm the tests do not pin down:

```js
const WORD = /\p{Lu}+[\p{N}]*(?=\p{Lu}[\p{Ll}\p{M}])|\p{Lu}?[\p{Ll}\p{Lo}\p{Lm}\p{M}\p{N}]+|\p{Lu}+[\p{M}\p{N}]*/gu;
```

`words` throws `TypeError('case conversion: text must be a string')` for non-strings and returns `text.match(WORD) ?? []`. Converters lower-case each word (`toLowerCase()`, no locale) and join.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test` - Expected: all pass, 0 fail.

- [ ] **Step 5: Commit**

`git add src/case.mjs src/index.mjs test/case.test.mjs && git commit -m "feat(case): word splitter, snakeCase, kebabCase"`

### Task 2: camelCase converter

**Covers:** [delta](../specs/case-conversion/spec.md) - "Requirement: camelCase conversion"; "Requirement: Input handling"

**Estimate:** ~40 lines

**Files:**
- Modify: `src/case.mjs`, `src/index.mjs`
- Test: `test/case.test.mjs`

**Interfaces:**
- Consumes: `words(text)` from Task 1.
- Produces: `camelCase(text: string): string`.

- [ ] **Step 1: Write the failing tests**

```js
test('camelCase output', () => assert.equal(camelCase('XML http_request'), 'xmlHttpRequest'));
test('Already converted input unchanged', () => {
  assert.equal(camelCase('userId'), 'userId'); assert.equal(snakeCase('user_id'), 'user_id'); assert.equal(kebabCase('user-id'), 'user-id');
});
test('Empty or separator-only input (camelCase)', () => assert.equal(camelCase(' _ '), ''));
test('Text is not a string', () => assert.throws(() => camelCase(42), TypeError));
test('single word', () => assert.equal(camelCase('USER'), 'user')); // Review Focus 5
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/case.test.mjs` - Expected: FAIL (`camelCase` is not exported).

- [ ] **Step 3: Implement `camelCase(text)` in `src/case.mjs`** from `words`: first word lower-case, each following word first character (code point) upper-case and the rest lower-case; export it from `src/index.mjs`.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test` - Expected: all pass, 0 fail.

- [ ] **Step 5: Commit**

`git add src/case.mjs src/index.mjs test/case.test.mjs && git commit -m "feat(case): camelCase"`

## Self-review (writing-plans checklist)

1. Spec coverage: all five requirements have a task (Covers lines); all 11 scenarios have a test named after them.
2. Step scan: each step names a file, signature, command or test; the only body given is the splitter regex.
3. Type consistency: `words`, `snakeCase`, `kebabCase`, `camelCase` named the same in both tasks.
4. Review Focus: five items, each with a test in its owning task.
5. Proportion: plan ~2x the delta, mostly test code.

## Execution Handoff

Execution method already supplied by handoff.md (`apply_mode: executing-plans`, native - no subagent tool). Plan reviewed and approved by the agent on the user's behalf (decisions delegated).
