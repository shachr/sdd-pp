# camelCase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `casing` capability's camelCase conversion described in the [delta](../specs/casing/spec.md).

**Architecture:** One pure function `camelCase(text)` in its own module, sibling to `slugify`: split with a Unicode-aware regex, map words, join (approach A in [brainstorm](brainstorm.md)).

**Tech Stack:** Node >= 18 ES modules, node:test + node:assert/strict, no dependencies.

**Spec:** [proposal](../proposal.md) · [specs/casing/spec.md](../specs/casing/spec.md) · [brainstorm](brainstorm.md) · [handoff](../handoff.md)

## Global Constraints

- [delta](../specs/casing/spec.md) - "Requirement: Word splitting"
- [delta](../specs/casing/spec.md) - "Requirement: Word casing"
- [delta](../specs/casing/spec.md) - "Requirement: Empty result"
- Node >= 18, ES modules, no runtime dependencies (AGENTS.md); `String(text)` coercion like `src/slugify.mjs`.

## Review Focus

1. Non-string input (numbers, null): coerced with `String()` like slugify -> `camelCase(42)` is `"42"`; test in Task 1.
2. Leading/trailing separators: no empty words -> `camelCase("--hello--")` is `"hello"`; test in Task 1.
3. Digits inside and starting words: `camelCase("version 2 beta")` is `"version2Beta"`; test in Task 1.
4. Characters whose upper-case form is longer (German ß): upper-casing the first character only -> `camelCase("a ßtraße")` is `"aSStraße"` (JS `toUpperCase`); accepted, test in Task 1.
5. Decomposed (NFD) text: combining marks stay inside words - now Scenario "Decomposed accents" in the delta, test in Task 1.
6. Separator-only input of other kinds (emoji, punctuation): `camelCase("🙂 !!")` is `""`; test in Task 2.

---

### Task 1: camelCase conversion

**Covers:** [delta](../specs/casing/spec.md) - "Requirement: Word splitting", [delta](../specs/casing/spec.md) - "Requirement: Word casing"

**Files:**
- Create: `src/camel-case.mjs`
- Test: `test/camel-case.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function camelCase(text: unknown): string` from `src/camel-case.mjs`.

- [x] **Step 1: Write the failing tests**

```js
test('Mixed separators', () => assert.equal(camelCase('hello-world_foo  bar!'), 'helloWorldFooBar'));
test('Shouting input', () => assert.equal(camelCase('HELLO WORLD'), 'helloWorld'));
test('Unicode letters', () => assert.equal(camelCase('élan vital'), 'élanVital'));
test('Decomposed accents', () => assert.equal(camelCase('élan vital'.normalize('NFD')), 'élanVital'.normalize('NFD')));
test('Review focus: coercion, edges, digits, ß', () => {
  assert.equal(camelCase(42), '42');
  assert.equal(camelCase('--hello--'), 'hello');
  assert.equal(camelCase('version 2 beta'), 'version2Beta');
  assert.equal(camelCase('a ßtraße'), 'aSStraße');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test` - Expected: FAIL (module `src/camel-case.mjs` not found).

- [x] **Step 3: Implement `camelCase(text: unknown): string` in `src/camel-case.mjs`**

Split `String(text)` on `/[^\p{L}\p{N}\p{M}]+/u`, filter out empty strings, map index 0 to `toLowerCase()` and later words to `w[0].toUpperCase() + w.slice(1).toLowerCase()`, `join('')`.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test` - Expected: PASS, all tests.

- [x] **Step 5: Commit**

`git add src/camel-case.mjs test/camel-case.test.mjs && git commit -m "feat(casing): camelCase word splitting and casing"`

### Task 2: empty result

**Covers:** [delta](../specs/casing/spec.md) - "Requirement: Empty result"

**Files:**
- Modify: `src/camel-case.mjs` (only if the test fails)
- Test: `test/camel-case.test.mjs`

**Interfaces:**
- Consumes: `camelCase` from Task 1.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

```js
test('Nothing to convert', () => {
  assert.equal(camelCase('  --  '), '');
  assert.equal(camelCase('🙂 !!'), '');
});
```

- [ ] **Step 2: Run the test**

Run: `npm test` - Expected: may already PASS (Task 1's filter drops empty parts). If it passes without code changes, record a Ruling in the ledger; do not add code.

- [ ] **Step 3: Commit**

`git add test/camel-case.test.mjs && git commit -m "test(casing): empty result"`

## Execution Handoff

Execution method chosen at handoff: **executing-plans** (native/inline; `apply_mode` in [handoff.md](../handoff.md)), on branch `change/add-camel-case`, final whole-branch review in a fresh context (local Ollama). Plan reviewed and approved by Grok Bot on the user's behalf (decisions delegated).
