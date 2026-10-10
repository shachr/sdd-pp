# Title Case Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `toTitleCase` function that makes the [title-case delta](../specs/title-case/spec.md) pass.

**Architecture:** One new ES module beside `slugify` and `wrapText`. The text is split on space runs with a capturing regex so separators survive the round trip; each word is cased by its position among the words and by membership in a fixed minor-word set (decisions in [design](design.md#the-how-as-decided)).

**Tech Stack:** Node >= 18 ES modules, `node:test`, `node:assert/strict`; no dependencies.

**Spec:** [proposal](../proposal.md) · [specs/title-case/spec.md](../specs/title-case/spec.md) · [design](design.md) · [handoff](../handoff.md)

## Global Constraints

- [delta](../specs/title-case/spec.md) - "Requirement: Words are capitalised"
- [delta](../specs/title-case/spec.md) - "Requirement: Minor words stay lowercase" (the word list is the delta's, verbatim in the code only)
- [delta](../specs/title-case/spec.md) - "Requirement: Spacing is preserved"
- [delta](../specs/title-case/spec.md) - "Requirement: Non-string input is rejected"
- No runtime dependencies; `slugify` and `wrapText` untouched; `npm test` stays green.

## Review Focus

1. A text that is a single minor word (edge of "Minor words stay lowercase"; expected `"The"`, see Task 2 test).
2. Leading spaces before a minor word: position is counted among words only, so it still gets a capital.
3. A minor word typed in capitals in the middle (`OF`) comes out lowercase.
4. `null` / `undefined` input: the type guard, not a crash inside `split`.
5. A tab inside the text is part of a word (only spaces separate words), so it is not a word boundary.

---

### Task 1: title-case module - word casing and spacing

**Covers:** [delta](../specs/title-case/spec.md) - "Requirement: Words are capitalised", "Requirement: Spacing is preserved"

**Files:**
- Create: `src/title-case.mjs`
- Test: `test/title-case.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `toTitleCase(text: string): string` (named export of `src/title-case.mjs`).

- [ ] **Step 1: Write the failing tests** (one per scenario, named after it)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTitleCase } from '../src/title-case.mjs';

test('Lowercase words', () => assert.equal(toTitleCase('hello world'), 'Hello World'));
test('Shouting is calmed', () => assert.equal(toTitleCase('hELLO WORLD'), 'Hello World'));
test('Space runs are kept', () => assert.equal(toTitleCase('  big   deal '), '  Big   Deal '));
test('Empty text', () => assert.equal(toTitleCase(''), ''));
test('A tab is not a word boundary', () => assert.equal(toTitleCase('ab\tcd ef'), 'Ab\tcd Ef'));
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/title-case.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/title-case.mjs`

- [ ] **Step 3: Implement `toTitleCase(text)` in `src/title-case.mjs`**

Split with `/( +)/`, case every non-space item (first character upper, rest lower), join with `''`.

- [ ] **Step 4: Run to verify they pass**

Run: `node --test test/title-case.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/title-case.mjs test/title-case.test.mjs
git commit -m "feat(title-case): capitalise words and keep spacing"
```

### Task 2: title-case module - minor words

**Covers:** [delta](../specs/title-case/spec.md) - "Requirement: Minor words stay lowercase"

**Files:**
- Modify: `src/title-case.mjs`
- Test: `test/title-case.test.mjs`

**Interfaces:**
- Consumes: `toTitleCase` from Task 1.
- Produces: no new exports; a module-private `MINOR_WORDS` set.

- [ ] **Step 1: Write the failing tests**

```js
test('Minor words inside the title', () => assert.equal(toTitleCase('the LORD of the rings'), 'The Lord of the Rings'));
test('Minor word at the end', () => assert.equal(toTitleCase('what are you looking at'), 'What Are You Looking At'));
test('A lone minor word is capitalised', () => assert.equal(toTitleCase('the'), 'The'));
test('Leading spaces do not hide the first word', () => assert.equal(toTitleCase('  the end'), '  The End'));
test('A shouted minor word in the middle is lowered', () => assert.equal(toTitleCase('war OF worlds'), 'War of Worlds'));
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/title-case.test.mjs`
Expected: FAIL - "Minor words inside the title" and "A shouted minor word in the middle is lowered" (`of` capitalised)

- [ ] **Step 3: Add `MINOR_WORDS` and position-aware casing in `src/title-case.mjs`**

`MINOR_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to'])`. Index words among non-space items; a word that is in the set and is neither the first nor the last word is lowercased whole.

- [ ] **Step 4: Run to verify they pass**

Run: `node --test test/title-case.test.mjs`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/title-case.mjs test/title-case.test.mjs
git commit -m "feat(title-case): keep minor words lowercase inside a title"
```

### Task 3: title-case module - input type guard

**Covers:** [delta](../specs/title-case/spec.md) - "Requirement: Non-string input is rejected"

**Files:**
- Modify: `src/title-case.mjs`
- Test: `test/title-case.test.mjs`

**Interfaces:**
- Consumes: `toTitleCase` from Task 2.
- Produces: no new exports.

- [ ] **Step 1: Write the failing tests**

```js
test('Number input', () => assert.throws(() => toTitleCase(42), { name: 'TypeError', message: /number/ }));
test('null and undefined are rejected', () => {
  assert.throws(() => toTitleCase(null), { name: 'TypeError', message: /string/ });
  assert.throws(() => toTitleCase(undefined), { name: 'TypeError', message: /string/ });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/title-case.test.mjs`
Expected: FAIL - messages come from `split` (e.g. "text.split is not a function"), not from the guard

- [ ] **Step 3: Add the guard at the top of `toTitleCase`**

`typeof text !== 'string'` -> `throw new TypeError(\`text must be a string, got ${typeof text}\`)` (`null` reports `object`, which the `/string/` assertion still accepts).

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS (all slugify, text-wrapping and title-case tests)

- [ ] **Step 5: Commit**

```bash
git add src/title-case.mjs test/title-case.test.mjs
git commit -m "feat(title-case): reject non-string input"
```

---

## Self-review (writing-plans checklist)

1. Spec coverage: every delta requirement has a task (Task 1: capitalised + spacing; Task 2: minor words; Task 3: rejection). Each delta scenario has a same-named test.
2. Step scan: no step decides nothing; no task body transcribed (Task 2 step 3 names the rule's data, the body is left to the implementer).
3. Type consistency: `toTitleCase(text: string): string` throughout.
4. Review Focus: all five lines have a test in the owning task (1, 2, 3 -> Task 2; 4 -> Task 3; 5 -> Task 1).
5. Proportion: the plan is mostly test code; implementation bodies are omitted.

## Execution Handoff

Execution method chosen on the user's behalf (decisions delegated): **Native** -> `superpowers:executing-plans`, because there are three small, strictly sequential tasks in one file and this harness has no subagent tool; the fresh review at the end is the self-review (requesting-code-review) plus `/adversarial-review` by a different model. Plan reviewed and accepted on the user's behalf.
