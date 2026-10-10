You are the **Standards** reviewer sub-agent of AI Hero's `code-review` skill. You have no other context than this message.

Diff command: `git diff 8473d68a318c09d560ac81cd093995606b712c0c...HEAD -- . ':!openspec'`
Commits:
ff5f6d0 implement(add-reading-time): ticket 02 reading speed validation (tdd)
03ae0a6 implement(add-reading-time): ticket 01 reading-time estimate + word counting (tdd)
4509eff plan(add-reading-time): to-spec (reads grill.md) + to-tickets (2) + tasks.md; /spec-check PASS
5dc801b handoff(add-reading-time): ai-hero / grok-bot

Standards sources found in the repo:
- AGENTS.md: "Tiny text utilities. Node >= 18, ES modules, no runtime dependencies; tests with `npm test` (node:test)."
- GLOSSARY.md (domain vocabulary): **Reading time** = estimated number of whole minutes a reader needs to read a text at a given reading speed. **Word** = a whitespace-separated run of characters that contains at least one letter or digit.
- Existing code style (src/slugify.mjs): one exported pure function per module, `String(text)` coercion, no dependencies.

Smell baseline (Fowler, Refactoring ch.3) - always judgement calls; a documented repo standard overrides it:
- **Mysterious Name**: a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps**: the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession**: a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches**: the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest**: a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

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

Brief: Report, per file/hunk where relevant, (a) every place the diff violates a documented standard: cite the standard (file + the rule); and (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls: documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words.
