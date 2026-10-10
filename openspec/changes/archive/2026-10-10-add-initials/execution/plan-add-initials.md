# Initials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `initials` capability ([delta](../specs/initials/spec.md)) to textkit.

**Architecture:** One new pure-function module beside `src/slugify.mjs`: split the display name into parts, take each part's first Unicode letter, uppercase, join. No state, no dependencies.

**Tech Stack:** Node >= 18 ES modules, `node:test` + `node:assert/strict`.

**Spec:** [proposal](../proposal.md) · [specs/initials/spec.md](../specs/initials/spec.md) · [brainstorm](brainstorm.md) · [handoff](../handoff.md)

## Global Constraints

- [delta](../specs/initials/spec.md) - "Requirement: Initials from name parts"
- [delta](../specs/initials/spec.md) - "Requirement: Letters only"
- [delta](../specs/initials/spec.md) - "Requirement: Blank name"
- No runtime dependencies; one exported function per module (AGENTS.md, `src/slugify.mjs`).

## Review Focus

1. Non-string input (`undefined`, a number): coerced with `String(name)` like `slugify`; `initials(undefined)` returns "U" - accepted, matches slugify's coercion; pinned by no test on purpose (not in the delta).
2. Letters made of several code points (decomposed "e" + combining accent): `\p{L}` alone would match the base letter and drop the accent, contradicting Scenario "Accented initial"; normalise the name to NFC first so it gives "É" like the precomposed form - pinned in Task 2 ("decomposed accent stays accented"). (Found by /spec-check run 1.)
3. Uppercasing that changes length ("ß" -> "SS"): accepted as `toUpperCase()` behaviour - pinned in Task 2.
4. Non-Latin scripts: first character of a CJK part - pinned in Task 2.
5. Very long names: linear, no cap (proposal: caller decides) - no test needed.

---

### Task 1: initials module - parts and letters

**Covers:** [delta](../specs/initials/spec.md) - "Requirement: Initials from name parts"

**Files:**
- Create: `src/initials.mjs`
- Test: `test/initials.test.mjs`

**Interfaces:**
- Produces: `initials(name: string): string` exported from `src/initials.mjs`.

- [ ] **Step 1: Write the failing tests** - one per scenario, named after it:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initials } from '../src/initials.mjs';

test('Two-part name', () => assert.equal(initials('Ada Lovelace'), 'AL'));
test('Hyphenated name', () => assert.equal(initials('Jean-Luc Picard'), 'JLP'));
test('Lowercase input', () => assert.equal(initials('grace  hopper'), 'GH'));
test('Accented initial', () => assert.equal(initials('émile zola'), 'ÉZ'));
```

- [ ] **Step 2: Run to verify they fail** - `node --test test/initials.test.mjs`; expected FAIL (module not found).
- [ ] **Step 3: Implement `initials(name)` in `src/initials.mjs`** - split `String(name)` on `/[\s-]+/`, take the first character of each non-empty part, `toUpperCase()`, join with `''`.
- [ ] **Step 4: Run to verify they pass** - `node --test test/initials.test.mjs`; expected 4 pass.
- [ ] **Step 5: Commit** - `git add src/initials.mjs test/initials.test.mjs && git commit -m "feat(initials): initials from name parts"`

### Task 2: initials module - letter rules and blank names

**Covers:** [delta](../specs/initials/spec.md) - "Requirement: Letters only", "Requirement: Blank name"

**Files:**
- Modify: `src/initials.mjs`
- Test: `test/initials.test.mjs`

**Interfaces:**
- Consumes: `initials(name)` from Task 1 (same signature).

- [ ] **Step 1: Write the failing tests**

```js
test('Leading punctuation', () => assert.equal(initials("Mary (Bob) 'Smith"), 'MBS'));
test('Part without letters', () => assert.equal(initials('Louis 14 Bourbon'), 'LB'));
test('Blank name', () => {
  for (const name of ['', '   ', '-- 42']) assert.equal(initials(name), '');
});
// Review Focus 2-4
test('decomposed accent stays accented', () => assert.equal(initials('e\u0301mile'), 'É'));
test('uppercasing may lengthen', () => assert.equal(initials('ßtraße'), 'SS'));
test('non-Latin part', () => assert.equal(initials('李 小龍'), '李小'));
```

- [ ] **Step 2: Run to verify they fail** - expected FAIL on "Leading punctuation", "Part without letters" and "Blank name" ("-- 42").
- [ ] **Step 3: Normalise `String(name)` with `.normalize('NFC')`, then change the per-part pick to the first `\p{L}` match (`/\p{L}/u`)**; parts with no match contribute nothing.
- [ ] **Step 4: Run all tests** - `npm test`; expected all pass.
- [ ] **Step 5: Commit** - `git commit -am "feat(initials): letters only, blank names"`

## Self-Review

1. Spec coverage: "Initials from name parts" -> Task 1; "Letters only", "Blank name" -> Task 2. No gaps.
2. Step scan: every step names a file, signature, test or command; no "handle edge cases".
3. Type consistency: `initials(name)` in both tasks.
4. Review Focus: items 2-4 have tests in Task 2 (item 2 corrected after /spec-check run 1); 1 and 5 deliberately untested (reasons given).
5. Proportion: plan ~1.5x the delta; code blocks are tests only.

## Execution Handoff

Plan complete and saved to `execution/plan-add-initials.md`. Execution method already supplied in handoff.md (`apply_mode: executing-plans` - Native: the harness has no subagent tool), so no choice is asked. Plan review: approved on the partner's behalf by Grok Bot (decisions delegated).
