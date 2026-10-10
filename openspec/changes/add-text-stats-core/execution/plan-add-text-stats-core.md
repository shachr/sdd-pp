# Text stats core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `text-stats` capability described in the [delta](../specs/text-stats/spec.md).

**Architecture:** Three pure functions in one module `src/stats.mjs`, sibling to `slugify`; a shared "has a word" test (approach A in [brainstorm](brainstorm.md)). The later slice add-stats-cli imports them.

**Tech Stack:** Node >= 18 ES modules, node:test + node:assert/strict, no dependencies.

**Spec:** [proposal](../proposal.md) · [specs/text-stats/spec.md](../specs/text-stats/spec.md) · [brainstorm](brainstorm.md) · [handoff](../handoff.md)

## Global Constraints

- [delta](../specs/text-stats/spec.md) - "Requirement: Word count", "Requirement: Sentence count", "Requirement: Reading time"
- Node >= 18, ES modules, no runtime dependencies (AGENTS.md); `String(text)` coercion like `src/slugify.mjs`.
- Interface for the later slice: named exports `wordCount`, `sentenceCount`, `readingMinutes` from `src/stats.mjs` (parent session Q9).

## File Structure

- Create `src/stats.mjs` - `wordCount`, `sentenceCount`, `readingMinutes`, private `hasWord`, `WORDS_PER_MINUTE`.
- Create `test/stats.test.mjs` - one test per delta scenario + review focus.

## Review Focus

1. Non-string input: `wordCount(42)` is 1 (coercion like slugify) - Task 1.
2. Unicode words: `wordCount("café 日本")` is 2; newlines and tabs are whitespace - Task 1.
3. Marks with no words: `sentenceCount("?!")` and `sentenceCount("")` are 0 - Task 2.
4. Reading time boundaries: 0 words -> 0 (the dropped scenario's case, still required by the requirement text), 200 -> 1, 201 -> 2 - Task 3.

---

### Task 1: word count

**Covers:** [delta](../specs/text-stats/spec.md) - "Requirement: Word count"
**Estimate:** ~25 lines

**Files:**
- Create: `src/stats.mjs`
- Test: `test/stats.test.mjs`

**Interfaces:**
- Produces: `export function wordCount(text: unknown): number`.

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

- [x] **Step 2: Run test to verify it fails** - `npm test`, expected FAIL (module not found).
- [x] **Step 3: Implement `wordCount`** - `const hasWord = (s) => /[\p{L}\p{N}]/u.test(s);` then `String(text).split(/\s+/).filter(hasWord).length`.
- [x] **Step 4: Run test to verify it passes** - `npm test`, expected PASS.
- [x] **Step 5: Commit** - `git commit -m "feat(text-stats): word count (plan task 1)"`

### Task 2: sentence count

**Covers:** [delta](../specs/text-stats/spec.md) - "Requirement: Sentence count"
**Estimate:** ~20 lines

**Files:**
- Modify: `src/stats.mjs`, `test/stats.test.mjs`

**Interfaces:**
- Consumes: `hasWord` from Task 1. Produces: `export function sentenceCount(text: unknown): number`.

- [x] **Step 1: Write the failing tests**

```js
import { sentenceCount } from '../src/stats.mjs';

test('Sentences ending in punctuation', () => assert.equal(sentenceCount('Hi. How are you? Great!'), 3));
test('No terminal punctuation', () => assert.equal(sentenceCount('One. two words'), 2));
test('Review focus: no words', () => { assert.equal(sentenceCount(''), 0); assert.equal(sentenceCount('?!'), 0); });
```

- [x] **Step 2: Run test to verify it fails** - `npm test`, expected FAIL (`sentenceCount` not exported).
- [x] **Step 3: Implement `sentenceCount`** - `String(text).split(/[.!?]+/).filter(hasWord).length`.
- [x] **Step 4: Run test to verify it passes** - `npm test`, expected PASS.
- [x] **Step 5: Commit** - `git commit -m "feat(text-stats): sentence count (plan task 2)"`

### Task 3: reading time

**Covers:** [delta](../specs/text-stats/spec.md) - "Requirement: Reading time"
**Estimate:** ~20 lines

**Files:**
- Modify: `src/stats.mjs`, `test/stats.test.mjs`

**Interfaces:**
- Consumes: `wordCount`. Produces: `export function readingMinutes(text: unknown): number`.

- [x] **Step 1: Write the failing tests**

```js
import { readingMinutes } from '../src/stats.mjs';

const words = (n) => Array.from({ length: n }, () => 'w').join(' ');
test('Short text reads in one minute', () => { assert.equal(readingMinutes('one'), 1); assert.equal(readingMinutes(words(200)), 1); });
test('Review focus: reading time boundaries', () => { assert.equal(readingMinutes(''), 0); assert.equal(readingMinutes(words(201)), 2); });
```

- [x] **Step 2: Run test to verify it fails** - `npm test`, expected FAIL (`readingMinutes` not exported).
- [x] **Step 3: Implement `readingMinutes`** - `Math.ceil(wordCount(text) / WORDS_PER_MINUTE)` with `const WORDS_PER_MINUTE = 200`.
- [x] **Step 4: Run test to verify it passes** - `npm test`, expected PASS.
- [x] **Step 5: Commit** - `git commit -m "feat(text-stats): reading time (plan task 3)"`

## Execution Handoff

Choice: executing-plans (inline; this harness has no sub-agent tool) = `apply_mode` in handoff.md.
