# Text stats core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `text-stats` capability's word and sentence counting described in the [delta](../specs/text-stats/spec.md).

**Architecture:** Two pure functions in one module `src/stats.mjs`, sibling to `slugify`; a shared "has a word" test (approach A in [brainstorm](brainstorm.md)). The later slice add-stats-cli imports them.

**Tech Stack:** Node >= 18 ES modules, node:test + node:assert/strict, no dependencies.

**Spec:** [proposal](../proposal.md) · [specs/text-stats/spec.md](../specs/text-stats/spec.md) · [brainstorm](brainstorm.md) · [handoff](../handoff.md)

## Global Constraints

- [delta](../specs/text-stats/spec.md) - "Requirement: Word count"
- [delta](../specs/text-stats/spec.md) - "Requirement: Sentence count"
- Node >= 18, ES modules, no runtime dependencies (AGENTS.md); `String(text)` coercion like `src/slugify.mjs`.
- Interface for the later slice: named exports `wordCount`, `sentenceCount` from `src/stats.mjs` (parent session Q8).

## File Structure

- Create `src/stats.mjs` - `wordCount`, `sentenceCount`, private `hasWord`.
- Create `test/stats.test.mjs` - one test per delta scenario + review focus.

## Review Focus

1. Non-string input: `wordCount(42)` is 1, `wordCount(null)` is 1 ("null" via `String()`, same as slugify) - test in Task 1.
2. Unicode words: `wordCount("café 日本")` is 2 - test in Task 1.
3. Newlines and tabs are whitespace: `wordCount("a\nb\tc")` is 3 - test in Task 1.
4. Marks with no words: `sentenceCount("?!")` is 0, `sentenceCount("")` is 0 - test in Task 2.
5. Decimal numbers ("3.5") split into two parts that both have digits -> counted as 2 sentences; accepted limitation (no abbreviation/number handling, non-goal) - test in Task 2 pins it.

---

### Task 1: word count

**Covers:** [delta](../specs/text-stats/spec.md) - "Requirement: Word count"
**Estimate:** ~45 lines

**Files:**
- Create: `src/stats.mjs`
- Test: `test/stats.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function wordCount(text: unknown): number` from `src/stats.mjs`.

- [x] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordCount } from '../src/stats.mjs';

test('Words in a sentence', () => assert.equal(wordCount('Hello, big   world - again'), 4));
test('Whitespace only', () => { assert.equal(wordCount(''), 0); assert.equal(wordCount(' \n\t '), 0); });
test('Review focus: coercion, Unicode, newlines', () => {
  assert.equal(wordCount(42), 1);
  assert.equal(wordCount('café 日本'), 2);
  assert.equal(wordCount('a\nb\tc'), 3);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test` - Expected: FAIL (module `src/stats.mjs` not found).

- [x] **Step 3: Implement `wordCount`**

`const hasWord = (s) => /[\p{L}\p{N}]/u.test(s);` then `String(text).split(/\s+/).filter(hasWord).length`.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test` - Expected: PASS.

- [x] **Step 5: Commit**

`git add src/stats.mjs test/stats.test.mjs && git commit -m "feat(text-stats): word count (plan task 1)"`

### Task 2: sentence count

**Covers:** [delta](../specs/text-stats/spec.md) - "Requirement: Sentence count"
**Estimate:** ~55 lines

**Files:**
- Modify: `src/stats.mjs`
- Test: `test/stats.test.mjs`

**Interfaces:**
- Consumes: `hasWord` from Task 1.
- Produces: `export function sentenceCount(text: unknown): number` from `src/stats.mjs`.

- [x] **Step 1: Write the failing tests**

```js
import { sentenceCount } from '../src/stats.mjs';

test('Sentences ending in punctuation', () => assert.equal(sentenceCount('Hi. How are you? Great!'), 3));
test('No terminal punctuation', () => assert.equal(sentenceCount('One. two words'), 2));
test('Repeated punctuation', () => assert.equal(sentenceCount('Wait... really?! ...'), 2));
test('Review focus: no words, decimals', () => {
  assert.equal(sentenceCount(''), 0);
  assert.equal(sentenceCount('?!'), 0);
  assert.equal(sentenceCount('It costs 3.5 euros.'), 2);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test` - Expected: FAIL (`sentenceCount` is not exported).

- [x] **Step 3: Implement `sentenceCount`**

`String(text).split(/[.!?]+/).filter(hasWord).length`.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test` - Expected: PASS.

- [x] **Step 5: Commit**

`git add src/stats.mjs test/stats.test.mjs && git commit -m "feat(text-stats): sentence count (plan task 2)"`

## Execution Handoff

Choice: executing-plans (inline; this harness has no sub-agent tool) = `apply_mode` in handoff.md.
