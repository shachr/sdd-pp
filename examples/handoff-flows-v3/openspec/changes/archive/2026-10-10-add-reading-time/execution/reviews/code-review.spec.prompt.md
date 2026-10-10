You are the **Spec** reviewer sub-agent of AI Hero's `code-review` skill. You have no other context than this message.

Diff command: `git diff 8473d68a318c09d560ac81cd093995606b712c0c...HEAD -- . ':!openspec'`
Commits:
ff5f6d0 implement(add-reading-time): ticket 02 reading speed validation (tdd)
03ae0a6 implement(add-reading-time): ticket 01 reading-time estimate + word counting (tdd)
4509eff plan(add-reading-time): to-spec (reads grill.md) + to-tickets (2) + tasks.md; /spec-check PASS
5dc801b handoff(add-reading-time): ai-hero / grok-bot

The spec (OpenSpec change add-reading-time: the delta below is the source of truth for behaviour):
```markdown
## Purpose

Estimate how long a text takes to read, in whole minutes, so callers can show a consistent "N min read" label.

## ADDED Requirements

### Requirement: Reading time estimate
The system SHALL estimate reading time as the number of words divided by the reading speed in words per minute, rounded up to a whole number of minutes, using 200 words per minute when the caller gives no speed.

#### Scenario: Default reading speed
- **WHEN** the text has 400 words and no reading speed is given
- **THEN** the estimate is 2 minutes

#### Scenario: Partial minute rounds up
- **WHEN** the text has 201 words and no reading speed is given
- **THEN** the estimate is 2 minutes

#### Scenario: Custom reading speed
- **WHEN** the text has 300 words and the reading speed is 100 words per minute
- **THEN** the estimate is 3 minutes

#### Scenario: Empty text
- **WHEN** the text is empty or contains only whitespace
- **THEN** the estimate is 0 minutes

### Requirement: Word counting
The system SHALL count as a word every whitespace-separated run of characters that contains at least one letter or digit, in any script.

#### Scenario: Punctuation-only tokens ignored
- **WHEN** the text is "wait — what ... ok"
- **THEN** 3 words are counted

#### Scenario: Mixed whitespace
- **WHEN** words are separated by tabs, newlines and repeated spaces, as in "café\tnaïve\n\n  über"
- **THEN** 3 words are counted

### Requirement: Reading speed validation
The system SHALL reject a reading speed that is not a finite number greater than zero with a RangeError.

#### Scenario: Invalid speed rejected
- **WHEN** the reading speed is 0, -5, NaN or Infinity
- **THEN** a RangeError is thrown
```

The diff:
```diff
diff --git a/src/reading-time.mjs b/src/reading-time.mjs
new file mode 100644
index 0000000..d7ff842
--- /dev/null
+++ b/src/reading-time.mjs
@@ -0,0 +1,14 @@
+const DEFAULT_WORDS_PER_MINUTE = 200;
+
+// A word is a whitespace-separated run with at least one letter or digit (GLOSSARY.md: Word).
+function countWords(text) {
+  return String(text).split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
+}
+
+export function readingTime(text, { wordsPerMinute = DEFAULT_WORDS_PER_MINUTE } = {}) {
+  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) {
+    throw new RangeError(`wordsPerMinute must be a finite number greater than 0, got ${wordsPerMinute}`);
+  }
+  const words = countWords(text);
+  return Math.ceil(words / wordsPerMinute);
+}
diff --git a/test/reading-time.test.mjs b/test/reading-time.test.mjs
new file mode 100644
index 0000000..905293b
--- /dev/null
+++ b/test/reading-time.test.mjs
@@ -0,0 +1,38 @@
+import { test } from 'node:test';
+import assert from 'node:assert/strict';
+import { readingTime } from '../src/reading-time.mjs';
+
+const words = (n) => Array.from({ length: n }, () => 'word').join(' ');
+
+test('Default reading speed', () => {
+  assert.equal(readingTime(words(400)), 2);
+});
+
+test('Partial minute rounds up', () => {
+  assert.equal(readingTime(words(201)), 2);
+});
+
+test('Custom reading speed', () => {
+  assert.equal(readingTime(words(300), { wordsPerMinute: 100 }), 3);
+});
+
+test('Empty text', () => {
+  assert.equal(readingTime(''), 0);
+  assert.equal(readingTime('  \n\t '), 0);
+});
+
+test('Punctuation-only tokens ignored', () => {
+  // 3 words -> 1 minute at 200 wpm; at 1 wpm the word count is visible as minutes
+  assert.equal(readingTime('wait — what ... ok', { wordsPerMinute: 1 }), 3);
+});
+
+test('Mixed whitespace', () => {
+  assert.equal(readingTime('café\tnaïve\n\n  über', { wordsPerMinute: 1 }), 3);
+});
+
+test('Invalid speed rejected', () => {
+  for (const wordsPerMinute of [0, -5, NaN, Infinity]) {
+    assert.throws(() => readingTime('some words', { wordsPerMinute }), RangeError, `wordsPerMinute ${wordsPerMinute}`);
+    assert.throws(() => readingTime('', { wordsPerMinute }), RangeError, `empty text, wordsPerMinute ${wordsPerMinute}`);
+  }
+});
```

Brief: Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words.
