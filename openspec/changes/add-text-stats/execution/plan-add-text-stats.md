# Text Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `text-stats` capability ([delta](../specs/text-stats/spec.md)).

**Architecture:** One new module `src/stats.mjs` with two pure functions; `readingTime` reuses `countWords`. Both are re-exported from `src/index.mjs`. Validation runs first in each function.

**Tech Stack:** Node >= 18, ES modules, node:test, no dependencies.

**Spec:** [proposal](../proposal.md) · [specs/text-stats/spec.md](../specs/text-stats/spec.md) · [brainstorm](brainstorm.md) · [handoff](../handoff.md)

## Global Constraints

- [delta](../specs/text-stats/spec.md) - "Requirement: Word count"
- [delta](../specs/text-stats/spec.md) - "Requirement: Reading time"
- [delta](../specs/text-stats/spec.md) - "Requirement: Input checked"
- Node >= 18, ES modules, no runtime dependencies; error messages prefixed with the function name (as `slugify`, `wordWrap`).

## Review Focus

1. Carriage returns (`\r\n` text from Windows) - must separate words like `\n`; pinned in Task 1 (`countWords("a\r\nb") === 2`).
2. Leading/trailing whitespace - must not create empty words; covered by Scenario "No words" and pinned in Task 1 (`countWords("  a  ") === 1`).
3. Non-integer speeds (e.g. 250.5) - allowed (brainstorm builder check); pinned in Task 2.
4. `NaN` / `Infinity` speed - must throw RangeError (not finite); pinned in Task 2.
5. Speed passed as a numeric string (`"200"`) - must throw RangeError, not coerce; pinned in Task 2.

## File Structure

- Create `src/stats.mjs` - `countWords`, `readingTime`.
- Modify `src/index.mjs` - re-export both.
- Create `test/stats.test.mjs` - one test per delta scenario (named after it) + Review Focus pins.

---

### Task 1: Word counter

**Covers:** [delta](../specs/text-stats/spec.md) - "Requirement: Word count"; "Requirement: Input checked" (Scenario "Text is not a string", countWords half)

**Estimate:** ~45 lines

**Files:**
- Create: `src/stats.mjs`
- Modify: `src/index.mjs`
- Test: `test/stats.test.mjs`

**Interfaces:**
- Produces: `countWords(text: string): number` exported from `src/index.mjs`.

- [ ] **Step 1: Write the failing tests** `Counts words` (`countWords("one two\tthree\nfour, five") === 5`), `No words` (`countWords(" \t\n ") === 0`), `CRLF separates words` (`countWords("a\r\nb") === 2`), `Edges are not words` (`countWords("  a  ") === 1`), `Text is not a string (countWords)` (`assert.throws(() => countWords(null), TypeError)`).
- [ ] **Step 2: Run to verify they fail** - `node --test test/stats.test.mjs`; expected FAIL: `countWords` is not exported.
- [ ] **Step 3: Implement `countWords(text)` in `src/stats.mjs`** - split on `/[ \t\n\r]+/`, drop empty pieces; `TypeError('countWords: text must be a string')` first. Re-export from `src/index.mjs`.
- [ ] **Step 4: Run to verify they pass** - `npm test`; expected all PASS.
- [ ] **Step 5: Commit** - `git add src/stats.mjs src/index.mjs test/stats.test.mjs && git commit -m "feat(stats): countWords"`

### Task 2: Reading-time estimate

**Covers:** [delta](../specs/text-stats/spec.md) - "Requirement: Reading time"; "Requirement: Input checked" (Scenario "Text is not a string", readingTime half; Scenario "Reading speed is not positive")

**Estimate:** ~55 lines

**Files:**
- Modify: `src/stats.mjs`, `src/index.mjs`
- Test: `test/stats.test.mjs`

**Interfaces:**
- Consumes: `countWords(text)` from Task 1.
- Produces: `readingTime(text: string, wordsPerMinute = 200): number` exported from `src/index.mjs`.

- [ ] **Step 1: Write the failing tests** `Rounds up to whole minutes` (201 words, no speed -> `2`), `Empty text reads in zero minutes` (`readingTime("") === 0`), `Custom reading speed` (300 words at 300 -> `1`), `Text is not a string (readingTime)` (`readingTime(42)` throws TypeError), `Reading speed is not positive` (`0` and `-5` throw RangeError), `Fractional speed allowed` (400 words at 250.5 -> `2`), `NaN, Infinity and string speeds rejected` (each throws RangeError).
- [ ] **Step 2: Run to verify they fail** - `node --test test/stats.test.mjs`; expected FAIL: `readingTime` is not exported.
- [ ] **Step 3: Implement `readingTime(text, wordsPerMinute = 200)` in `src/stats.mjs`** - check text (TypeError, message prefixed `readingTime:`), then `typeof wordsPerMinute !== 'number' || !Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0` -> RangeError; return `Math.ceil(countWords(text) / wordsPerMinute)`. Re-export.
- [ ] **Step 4: Run to verify they pass** - `npm test`; expected all PASS.
- [ ] **Step 5: Commit** - `git add src/stats.mjs src/index.mjs test/stats.test.mjs && git commit -m "feat(stats): readingTime"`

## Self-review

1. Spec coverage: Word count -> Task 1; Reading time -> Task 2; Input checked -> Tasks 1 and 2. 2. Step scan: each step names one test set, signature or command. 3. Types: `countWords` signature identical in both tasks. 4. Review Focus: five lines, each pinned in its task. 5. Proportion: plan ~ the size of the code it describes.

## Execution Handoff

Execution method supplied by handoff.md: `apply_mode: subagent-driven-development`. Plan reviewed and approved by the agent on the user's behalf (decisions delegated).
