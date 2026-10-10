> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/initials/spec.md) · [plan](../plan-add-initials.md) · [brainstorm](../brainstorm.md)

# Final whole-branch review (Superpowers `requesting-code-review`) - add-initials

- Range: `f1e0b18..7826a8f` (merge base = plan commit, head = Task 2), package from `review-package` (4 commits).
- Reviewer context: **fresh context, not a self-review.** No subagent tool in this harness, so the skill's `code-reviewer.md` template, filled in (delta + plan Global Constraints + the review package inline, since the reviewer cannot run git) - [code-review.prompt.md](code-review.prompt.md) - was sent to a separate local model, **qwen3:4b-instruct via Ollama** (free, open-weight), which saw only that prompt. Run 00:29-00:35 PT (Oct 10), exit 0, not truncated. Caveat: a 4B model; see triage - its one Critical is factually wrong.

## Reviewer output (verbatim)

### Strengths  
- **Clear alignment with the OpenSpec delta**: The implementation precisely matches the required behavior for all specified scenarios: two-part names, hyphenated names, lowercase input, accented initials, leading punctuation, parts without letters, and blank names.  
- **Proper handling of Unicode normalization**: The use of `.normalize('NFC')` ensures that decomposed accented characters (like `e\u0301`) are correctly preserved and treated as a single accented letter (e.g., "É"), which directly addresses the critical requirement to preserve accented initials.  
- **Robust edge case coverage**: Tests explicitly cover leading punctuation, parts without letters, and blank inputs (including whitespace and non-letter content), fulfilling the "Letters only" and "Blank name" requirements.  
- **Consistent with existing coercion pattern**: The function uses `String(name)` to handle non-string inputs, aligning with the `slugify` module’s behavior and maintaining consistency across the library.  
- **Comprehensive test suite**: All core scenarios from the spec are tested, and additional edge cases (decomposed accents, `ß` → `SS`, non-Latin scripts) are included, demonstrating proactive testing beyond the spec.  

---

### Issues  

#### Critical (Must Fix)  
**File: `src/initials.mjs`:line 5**  
`match(/\p{L}/u)?.[0] ?? ''` may fail to match the first letter in non-Latin scripts (e.g., CJK characters) when the first character is a letter.  

**What's wrong**:  
The current regex `\p{L}` matches any letter in any script, which is correct in principle. However, the specification does **not** require behavior for non-Latin scripts (e.g., Chinese, Japanese, Korean), and the test `test('non-Latin part', () => assert.equal(initials('李 小龍'), '李小'))` assumes that the first character of a CJK part is treated as a letter and thus included.  

But the **spec does not define** what should happen with non-Latin scripts. The requirement says: *"The system SHALL take each part's initial from its first letter in any script"*, which implies **all scripts**, including CJK. However, in practice, CJK characters are not typically considered "letters" in the same way as Latin letters.  

This creates a **misalignment**:  
- The test case `initials('李 小龍')` returns `"李小"`, which implies that the first character of each part is taken as the initial.  
- But in reality, "李" and "小" are **not letters** in the Unicode sense (they are ideographs), and `\p{L}` does **not** match them.  

**Why it matters**:  
This violates the "Letters only" requirement — the system is **including non-letter characters** as initials, which contradicts the requirement to "skip any parts that contain no letter".  

**How to fix**:  
The regex must be changed to **only match actual letters**, and **non-letter parts must be skipped**. The current logic fails because it treats CJK characters as letters.  

✅ **Fix**:  
Replace the current logic with:  
```js
.match(/\p{L}/u)?.[0] ?? ''
```  
→ This already does the right thing, **but only if `\p{L}` correctly excludes CJK ideographs**.  

🔍 **Reality check**:  
`\p{L}` in Unicode **does include** CJK characters (e.g., "李" is not a letter, but in Unicode, it is classified as a **"Cjk Unified Ideograph"**, which is **not** in `\p{L}`).  

✅ **Verification**:  
- `U+4E2D` (李) → not in `\p{L}`  
- `U+65B0` (小) → not in `\p{L}`  

So, `initials('李 小龍')` would return `''`, not `'李小'`.  

❌ **But the test currently asserts it returns `'李小'`** — this is a **bug in the test**, not the implementation.  

➡️ **Conclusion**:  
The test case `test('non-Latin part', () => assert.equal(initials('李 小龍'), '李小'))` is **invalid** because it assumes CJK characters are letters, which contradicts the spec.  

**Critical issue**:  
The test **violates the spec** by asserting behavior that is not defined. The spec says: *"The system SHALL take each part's initial from its first letter in any script, skipping any characters before it, and SHALL ignore parts that contain no letter."*  

→ CJK characters are **not letters** → they should be **ignored**.  

Thus, the test case is **not valid** and must be **removed or corrected**.  

**Action**:  
❌ Remove the test `test('non-Latin part', ...)` because it:  
- Assumes CJK characters are letters  
- Is not aligned with the spec  
- Misrepresents the "letters only" requirement  

---

#### Important (Should Fix)  
**File: `test/initials.test.mjs`:line 13**  
`test('decomposed accent stays accented', () => assert.equal(initials('e\u0301mile'), 'É'))` — while correct in intent, it **does not verify the normalization step**.  

**What's wrong**:  
The test assumes that `e\u0301` becomes "É" due to normalization. However, the test does **not verify** that the input is normalized to NFC before processing.  

**Why it matters**:  
If the normalization step were missing or broken, the test would fail. This test is **only valid if the normalization is correctly applied**.  

**How to fix**:  
Add a **sanity check** in the test to ensure the input is properly normalized. Alternatively, **rephrase** the test to be more explicit:  

✅ **Improved test**:  
```js
test('decomposed accent stays accented', () => {
  const result = initials('e\u0301mile');
  assert.equal(result, 'É');
});
```
→ This is already correct. But to be safe, ensure that the test is **not relying on a side effect** of normalization.  

➡️ This is **not a critical flaw**, just a **test clarity issue**.  

**Recommendation**:  
Keep the test, but **add a comment** explaining that it verifies NFC normalization.  

---

#### Minor (Nice to Have)  
**File: `src/initials.mjs`:line 5**  
The function uses `toUpperCase()` at the end, which may change the length (e.g., `ß` → `SS`).  

**What's wrong**:  
The spec explicitly **accepts** this behavior: *"Uppercasing that changes length ("ß" -> "SS"): accepted as `toUpperCase()` behaviour - pinned in Task 2"*.  

So this is **not a bug**, just a **behavioral note**.  

✅ **No action needed** — this is already documented and accepted.  

---

#### Minor (Nice to Have)  
**File: `test/initials.test.mjs`**  
Missing test for `undefined`, `null`, `NaN`, or other non-string inputs.  

**What's wrong**:  
The spec says: *"Non-string input (`undefined`, a number): coerced with `String(name)` like `slugify`"* — and that `initials(undefined)` returns `"U"`.  

But **no test exists** to verify this.  

**Why it matters**:  
A missing test for `undefined` or `null` means the behavior is **not verified**.  

**How to fix**:  
Add a test:  
```js
test('non-string input', () => {
  assert.equal(initials(undefined), 'U');
  assert.equal(initials(null), 'N');
  assert.equal(initials(123), '1');
});
```

✅ This is a **minor gap** — not critical, but improves test coverage.  

---

### Recommendations  
1. **Remove or revise the test for non-Latin scripts** (`test('non-Latin part', ...)`):  
   - The test assumes CJK characters are letters, which contradicts the spec.  
   - Remove it or replace it with a test that verifies **only letters** are taken.  

2. **Add a test for non-string inputs** (`undefined`, `null`, `number`):  
   - Ensures coercion behavior is verified.  

3. **Add a comment in `src/initials.mjs`** explaining the normalization and letter matching logic:  
   ```js
   // Initial of a part = its first letter in any script (\p{L}); parts without one are skipped.
   // NFC first, so a decomposed accent stays on its letter ("e\u0301" -> "É").
   ```  
   → Already present, so no change needed.  

4. **Update the OpenSpec task list** to clarify that:  
   - "Letters only" means **only Unicode letters (\p{L})**, not ideographs or symbols.  
   - Non-Latin scripts (e.g., CJK) are **not letters** and should be **ignored**.  

---

### Assessment  
**Ready to merge?** **No**  

**Reasoning**:  
The implementation correctly handles all core requirements from the spec, including accented initials, whitespace/hyphen splitting, and letter-only extraction. However, a test case for non-Latin scripts is **invalid** because it assumes CJK characters are letters — which contradicts the "letters only" requirement. This test must be removed or corrected to avoid misleading behavior. Additionally, the behavior of non-string inputs is not tested. These are **important** deviations from sound test coverage and spec alignment.  

Once these issues are addressed, the implementation will be **fully compliant** with the OpenSpec delta and production-ready.  

---  
✅ **Final note**: The implementation is **well-designed**, **correct in principle**, and **thoroughly tested** — but **one test is misaligned with the spec** and must be removed. This is a **critical issue** in test validity, not in logic.

<!-- ollama: qwen3:4b-instruct, prompt 2905 tokens, output 2187 tokens, 362.6s wall -->

## Triage (Grok Bot, executor - superpowers `receiving-code-review`: verify before acting, push back with reasons)

| Finding | Ruling | Evidence |
|---|---|---|
| Critical: CJK ideographs are not `\p{L}`, so the "non-Latin part" test is invalid | **Declined - reviewer is wrong.** CJK unified ideographs are General Category Lo (Letter, other), inside `\p{L}`. The reviewer contradicts itself (calls `\p{L}` correct "in any script", then claims the opposite). The test is consistent with Requirement "Letters only" ("first letter in any script") and with brainstorm.md (my call 5). | `node -e "/\p{L}/u.test('李')"` -> `true`; test passes |
| Important: NFC test does not explain itself | **Accepted** (cheap): comment added above the test, commit `b57ebd3`. No behaviour change, suite green (19/19). | `test/initials.test.mjs` |
| Minor: `toUpperCase` may lengthen ("ß") | No action - reviewer agrees it is pinned and accepted (plan Review Focus 3). | - |
| Minor: no tests for non-string input | **Declined** - not in the delta; plan Review Focus 1 leaves it untested on purpose (same coercion as `slugify`, which has no such test either). Ledgered. | plan Review Focus 1 |
| Assessment "No" | Overridden: the only blocking finding is the false Critical. After the Important fix: **ready to merge.** | - |
