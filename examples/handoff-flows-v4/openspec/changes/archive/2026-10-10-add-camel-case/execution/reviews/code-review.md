> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/casing/spec.md) · [plan](../plan-add-camel-case.md) · [handoff](../../handoff.md)

# requesting-code-review: add-camel-case (final whole-branch review)

- Skill: Superpowers `requesting-code-review`, `code-reviewer.md` filled in (description, delta + plan, git range 0f59559..3344f44, diff pasted because the model cannot run git). Run in a FRESH context: local Ollama `qwen3:4b-instruct` via `.openspec-handoff/scripts/runners/ollama.mjs` (no sub-agent tool).
- Run 1 (01:14 PT) produced no output: the model was still generating after 23 min and was killed (old runner had no output cap and dropped partial answers). Toolkit runner fixed (a472d79: `OLLAMA_NUM_PREDICT` cap 1500, partial answer kept on timeout). Run 2 (01:37-01:41 PT, 234 s) below.
- The reviewer did not produce the template's "Declined to judge" list.

## Disposition (implementer, grok-bot)

| # | Finding | Severity | Disposition |
|---|---------|----------|-------------|
| R1 | Note in the code that `\p{..}` needs Node >= 18 | Minor | **Declined.** Unicode property escapes exist since Node 10; AGENTS.md already pins Node >= 18. |
| R2 | Comment the emoji case in "Nothing to convert" | Minor | **Declined.** The test is named after the delta scenario; the rule is in the delta. |
| G1 | (implementer re-grade, not from the reviewer) a text of only combining marks returned them instead of "" - diverges from "Requirement: Empty result" | Important | **Fixed** RED->GREEN in 7f1a514 (filter keeps only parts with a letter or digit); test "Review fix: combining marks alone are not a word". |

Verdict after the fix pass: no open Critical/Important findings.

## Reviewer output (verbatim)

### Strengths  
- **Complete adherence to the OpenSpec requirements**: The implementation precisely satisfies all three core requirements—word splitting with Unicode-aware separators, proper word casing (first word lowercase, subsequent words with capitalized first letter), and empty result handling—verified through explicit test cases.  
- **Correct Unicode handling**: The use of `\p{L}\p{N}\p{M}` in the regex ensures that combining marks (like accents in NFD form) are preserved within words, which directly addresses the decomposed accent scenario. This is a sophisticated and correct handling of Unicode text, especially in edge cases like `élan vital`.  
- **Robust input coercion**: The function correctly coerces any input to a string via `String(text)`, aligning with the `slugify` module’s design and satisfying the plan’s requirement for consistent behavior with non-string inputs (e.g., numbers, `null`, or `undefined`).  
- **Clear, focused architecture**: The function follows a clean, readable pipeline: split → filter → map → join, with minimal complexity and no unnecessary abstractions. This is a well-structured, maintainable design.  
- **Comprehensive testing**: All scenarios from the spec—including mixed separators, shouting input, decomposed accents, edge cases (digits, ß), and empty input—are explicitly tested. The test suite is both thorough and directly tied to the requirements.  

---

### Issues  

#### Critical (Must Fix)  
**None**  

> The implementation fully satisfies all requirements as specified. No critical bugs, missing functionality, or broken behavior are present. The function correctly handles all test cases, including Unicode decomposition, edge cases, and coercion.  

---

#### Important (Should Fix)  
**None**  

> The implementation is fully aligned with the plan and spec. All required features are present, edge cases are covered, and the code is well-structured. There are no architectural flaws, missing error handling, or test gaps.  

---

#### Minor (Nice to Have)  
- **File: `src/camel-case.mjs`: Line 4**  
  **What's wrong**: The regex `/[^\p{L}\p{N}\p{M}]+/u` uses a Unicode property class (`\p{L}`) which is valid in Node.js >= 18, but it may not be fully supported in all environments or older versions of Node. While the plan specifies Node >= 18, this should be documented or explicitly noted in the code comment.  
  **Why it matters**: Without a clear version constraint or comment, future maintainers or users might misinterpret compatibility. This is a minor risk if the code is used in environments with limited Unicode support.  
  **How to fix**: Add a comment like: `// Requires Node.js >= 18 due to Unicode property escapes in regex` to clarify the dependency.  

- **File: `test/camel-case.test.mjs`: Line 15**  
  **What's wrong**: The test `test('Nothing to convert', ...)` includes `camelCase('🙂 !!')` as a valid case for returning an empty string. While this is consistent with the spec (no letters/digits → empty), it may be misleading because the input contains non-ASCII characters that are not letters or digits.  
  **Why it matters**: This could confuse users who expect the function to preserve or handle non-ASCII characters differently. The spec says "no letters or digits" → empty, which is correct, but the example uses emoji, which are not letters/digits in the strict sense.  
  **How to fix**: Clarify in the test comment or documentation that the function returns an empty string only when *no letters or digits* are present. Consider adding a more explicit comment:  
    ```js
    // Only returns empty string when no letters or digits are present (e.g., "🙂 !!", "🚀", "  --  ")
    ```  

---

### Recommendations  
1. **Add a version note in the source comment** to explicitly state that the regex relies on Unicode property escapes, which are only available in Node.js >= 18. This improves transparency and prevents misuse in older versions.  
2. **Improve test clarity** by adding a comment in the test explaining the logic behind the "nothing to convert" case, especially for non-ASCII inputs. This helps future maintainers understand the boundary conditions.  
3. **Consider adding a brief doc comment** in the source file (e.g., in `camelCase` function) that summarizes the behavior in plain language, such as:  
   > "Splits text on non-letter, non-digit, non-combining-mark sequences. First word is lowercased; all subsequent words have their first letter uppercased and the rest lowercased. Returns empty string if no letters or digits exist."  

---

### Assessment  
**Ready to merge?** Yes  

**Reasoning**: The implementation fully satisfies the OpenSpec requirements, with correct handling of Unicode, edge cases, and input coercion. All planned functionality is present, tested, and working. The code is clean, readable, and production-ready. The only minor suggestions are for documentation clarity and version awareness—neither of which represent functional defects.  

> ✅ The work is complete, correct, and aligned with both the plan and the spec. No deviations were found that require correction. The implementation is robust, well-tested, and ready for integration.

<!-- ollama: qwen3:4b-instruct, prompt 3530 tokens, output 1125 tokens, 233.8s wall -->
