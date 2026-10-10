# Word Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `countWords(text)` to textkit so callers get one consistent word count.

**Architecture:** One new module `src/text-statistics.mjs` (named after the capability, per design.md) exporting a pure function: trim, split on whitespace, keep tokens that contain a letter or digit. Tests in `test/text-statistics.test.mjs` with `node:test`, mirroring the existing slugify/truncate tests.

**Tech Stack:** Node.js >= 18 ESM, `node:test`, `node:assert/strict`. No dependencies.

**Spec:** [proposal](../proposal.md) · [specs/text-statistics/spec.md](../specs/text-statistics/spec.md) · [design](../design.md) · [handoff](../handoff.md)

## Global Constraints

- Word separators: [specs/text-statistics/spec.md](../specs/text-statistics/spec.md) - "Requirement: Words are separated by whitespace"
- Which tokens count: [specs/text-statistics/spec.md](../specs/text-statistics/spec.md) - "Requirement: Only tokens with a letter or digit count"
- Input type: [specs/text-statistics/spec.md](../specs/text-statistics/spec.md) - "Requirement: Non-string input is rejected"
- Module/export names and the split+filter rule: [design.md](../design.md) - Decisions
- No new dependencies; `npm test` (= `node --test`) must stay green.

## Review Focus

1. Non-breaking space (U+00A0) between words: a person expects two words; `\s` matches it. Test added to Task 1.
2. Emoji-only token ("ship it 👍"): a person may expect 3; the rule counts 2 (no letter/digit). Pinned as 2 in Task 1 so the behavior is deliberate, not accidental.
3. Combining accents written as base letter + combining mark ("cafe\u0301 au lait"): must stay 3 words, not split at the mark. Test added to Task 1.
4. `new String("a b")` (a String object): `typeof` is "object", so it is rejected; pinned in Task 2 so nobody "fixes" it into coercion silently.
5. `null` input: the most common accidental non-string; must throw `TypeError`, not crash with a different error. Test added to Task 2.

---

### Task 1: countWords counts whitespace-separated words that contain a letter or digit

**Files:**
- Create: `src/text-statistics.mjs`
- Test: `test/text-statistics.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `countWords(text: string) => number` exported from `src/text-statistics.mjs`

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countWords } from '../src/text-statistics.mjs';

test('Single spaces', () => assert.equal(countWords('the quick brown fox'), 4));
test('Mixed whitespace', () => assert.equal(countWords('  one\ttwo\n\nthree  '), 3));
test('Empty or blank text', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords(' \n '), 0);
});
test('Stray punctuation', () => assert.equal(countWords('wait - what ... ok'), 3));
test('Hyphens and apostrophes stay inside a word', () => assert.equal(countWords("don't over-think it"), 3));
test('Non-Latin letters', () => assert.equal(countWords('héllo wörld 123'), 3));
test('Review focus: non-breaking space separates words', () => assert.equal(countWords('two\u00a0words'), 2));
test('Review focus: emoji-only token is not a word', () => assert.equal(countWords('ship it 👍'), 2));
test('Review focus: combining mark stays inside its word', () => assert.equal(countWords('cafe\u0301 au lait'), 3));
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/text-statistics.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/text-statistics.mjs`

- [ ] **Step 3: Implement `countWords(text: string): number` in `src/text-statistics.mjs`**

Trim, split on `/\s+/`, count tokens matching `/[\p{L}\p{N}]/u` (design.md - Decisions). Return 0 for blank text.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/text-statistics.test.mjs`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/text-statistics.mjs test/text-statistics.test.mjs openspec/changes/add-word-count/tasks.md
git commit -m "feat(text-statistics): countWords splits on whitespace and counts tokens with a letter or digit"
```

### Task 2: countWords rejects non-string input

**Files:**
- Modify: `src/text-statistics.mjs` (top of `countWords`)
- Test: `test/text-statistics.test.mjs`

**Interfaces:**
- Consumes: `countWords` from Task 1
- Produces: same signature; throws `TypeError` for non-strings

- [ ] **Step 1: Write the failing tests**

```js
test('Number input', () => assert.throws(() => countWords(42), TypeError));
test('Missing input', () => assert.throws(() => countWords(), TypeError));
test('Review focus: null input', () => assert.throws(() => countWords(null), TypeError));
test('Review focus: String object is rejected, not coerced', () => assert.throws(() => countWords(new String('a b')), TypeError));
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/text-statistics.test.mjs`
Expected: FAIL on "String object is rejected, not coerced" (Task 1 code returns 2). The number/missing/null tests may already pass, because calling `.trim` on them throws a `TypeError` by accident; Step 3 makes that rejection deliberate.

- [ ] **Step 3: Guard at the top of `countWords`**

`if (typeof text !== 'string') throw new TypeError(...)` with a message naming the received type.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all suites (slugify, truncate, text-statistics)

- [ ] **Step 5: Commit**

```bash
git add src/text-statistics.mjs test/text-statistics.test.mjs openspec/changes/add-word-count/tasks.md
git commit -m "feat(text-statistics): reject non-string input with TypeError"
```

## Execution choice

Native: `superpowers:executing-plans`, run by grok-bot in this session. Subagent-driven was not available (no sub-agent tool in this harness). Recorded per the openspec-handoff-superpowers wrapper (planning stops here).
