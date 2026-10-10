# Word Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the text-statistics capability's word counting as specified in [the delta](../specs/text-statistics/spec.md).

**Architecture:** One new module `src/text-statistics.mjs` exporting a pure function; tests in `test/text-statistics.test.mjs` mirroring the existing module/test pairs.

**Tech Stack:** Node.js ESM, node:test.

**Spec:** [proposal](../proposal.md) · [specs/text-statistics/spec.md](../specs/text-statistics/spec.md) · [handoff](../handoff.md)

## Global Constraints

- [delta](../specs/text-statistics/spec.md) - "Requirement: Words are separated by whitespace"
- [delta](../specs/text-statistics/spec.md) - "Requirement: Only tokens with a letter or digit count"
- [delta](../specs/text-statistics/spec.md) - "Requirement: Non-string input is rejected"
- No new dependencies; `npm test` stays green.

---

### Task 1: text-statistics module - word counting

**Files:**
- Create: `src/text-statistics.mjs`
- Test: `test/text-statistics.test.mjs`

- [ ] **Step 1: Write the failing tests** - one per scenario of the first two requirements, named after the scenario:

```js
test('Single spaces', () => assert.equal(countWords('the quick brown fox'), 4));
test('Stray punctuation', () => assert.equal(countWords('wait - what ... ok'), 3));
```

- [ ] **Step 2: Run** `node --test test/text-statistics.test.mjs` - Expected: FAIL (module missing)

### Task 2: text-statistics module - input guard

- [ ] **Step 1: Write the failing tests** for scenarios "Number input" and "Missing input".
