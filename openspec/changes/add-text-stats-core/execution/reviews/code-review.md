> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-stats/spec.md) · [plan](../plan-add-text-stats-core.md) · [handoff](../../handoff.md)

# requesting-code-review: add-text-stats-core

- Skill: Superpowers `requesting-code-review`, final whole-branch review, prompt = `code-reviewer.md` filled in (DESCRIPTION, PLAN_OR_REQUIREMENTS = delta + plan, BASE = handoff `base_ref` 2087405, HEAD = 04dbe7b), dispatched to a FRESH context: local Ollama `qwen3:4b-instruct` via `.openspec-handoff/scripts/runners/ollama.mjs` (no sub-agent tool). The model has no shell, so the `git diff --stat` / `git diff` output was pasted into the prompt (implementation only).
- Run: 2026-10-10 10:33-10:44 PT (queued behind the builder check; 161 s generation).

## Disposition (implementer, grok-bot)

| # | Finding | Severity claimed | Disposition |
|---|---------|------------------|-------------|
| R1 | `split(/\s+/)` "treats `...` or `--` as whitespace", so "a...b" is miscounted | Critical | **Declined, evidence.** `\s` matches whitespace only; probe `wordCount("a...b")` -> 1, `wordCount("a--b c")` -> 2, as "Requirement: Word count" says (whitespace-separated runs). |
| R2 | `split(/[.!?]+/)` mishandles isolated marks ("??!", "...!"); suggests boundaries only before whitespace | Important | **Declined, evidence.** Probes: `sentenceCount("??!")` -> 0, `sentenceCount("...!")` -> 0, `sentenceCount("Hi??! Ok")` -> 2 - runs without a word are not sentences ("Requirement: Sentence count", Scenario "Repeated punctuation"). The "only before whitespace" idea would change "a...b" from 2 to 1 and the delta's behaviour; it is the decimal-number limitation already pinned in plan Review Focus 5 (non-goal). Candidate for a later change, not this slice. |
| R3 | No JSDoc | Minor | Declined: module comment + named functions; repo has no doc standard (AGENTS.md). |
| R4 | Performance of split/filter on large texts | Minor | Declined: no size requirement; linear time. |

Reviewer verdict "Ready to merge? No" rests on R1/R2, both refuted by probes. No Critical/Important findings remain. Own re-grade: none.

## Reviewer output (verbatim)

### Strengths  
- **Clear alignment with requirements**: The implementation precisely matches the specified behavior for word and sentence counting, including edge cases like whitespace, Unicode, and punctuation.  
- **Proper use of `String()` coercion**: All inputs are safely coerced to strings, consistent with the spec’s requirement to handle `unknown` types (e.g., `wordCount(42)` → 1).  
- **Comprehensive testing**: All scenarios from the plan are covered, including the review focus cases (Unicode, newlines, empty strings, punctuation).  
- **Clean, modular architecture**: The shared `hasWord` helper promotes DRY principles and reusability across both functions.  
- **Correct sentence counting logic**: Handles repeated punctuation correctly (e.g., `Wait... really?! ...` → 2), and accounts for trailing text without punctuation.  

---

### Issues  

#### Critical (Must Fix)  
**File: `src/stats.mjs`: Line 6**  
`split(/\s+/)` may incorrectly split on non-whitespace sequences like `--` or `...` in words. For example, `"a...b"` becomes `["a", "", "b"]`, and if `hasWord` passes on `"b"`, it could be miscounted.  

**Why it matters**: The requirement defines a word as a "whitespace-separated run of characters containing at least one letter or digit." This implies that only *whitespace* should separate words. The current regex `/\\s+/` treats `...` or `--` as whitespace, which violates the intent.  

**Fix**: Replace `split(/\s+/)` with a more precise whitespace-only split. Use `split(/[\s\t\n\r]+/)` to ensure only true whitespace is split. Then, ensure `hasWord` is applied correctly to each part.  

> **Note**: The current implementation assumes that any run of characters with letters/digits is a word, which is correct, but the split must not break valid word sequences.  

#### Important (Should Fix)  
**File: `src/stats.mjs`: Line 9**  
`split(/[.!?]+/)` splits on any sequence of `.`, `!`, or `?`, but does not handle cases where punctuation is adjacent to non-words (e.g., `"??!"` or `"...!"`). This may result in empty or invalid segments.  

**Why it matters**: The requirement states that a sentence ends in one or more of `.`, `!`, or `?`. However, if punctuation is isolated (e.g., `"??!"`), it should still count as one sentence. The current logic may split incorrectly and miss the sentence boundary.  

**Fix**: Use a more robust sentence boundary detection. For example:  
```js
String(text).split(/([.!?]+)(?=[\s\.\!\?]|$)/)
```  
Or better: use a state machine or iterative parsing to detect sentence boundaries only when followed by whitespace or end-of-string.  

> **Alternative**: The current approach is too simplistic and may fail in real-world text with complex punctuation.  

#### Minor (Nice to Have)  
- **Missing documentation**: No JSDoc or comments explaining the logic or edge cases.  
- **No performance optimization**: For very large texts, `split()` and `filter()` may be expensive. Consider a streaming or iterative approach if performance becomes a concern.  

---

### Recommendations  
1. **Refactor the split logic** to ensure only true whitespace separates words and only valid sentence terminators (`.`, `!`, `?`) are used.  
2. **Add a test case** for edge cases like `"a...b"` (word split) or `"...!"` (sentence split) to validate correctness.  
3. **Add comments** to explain the design decisions, especially around whitespace and punctuation handling.  
4. **Consider a more robust sentence boundary parser** if the system grows to handle complex text (e.g., abbreviations, numbers, or nested punctuation).  

---

### Assessment  
**Ready to merge?** No  

**Reasoning**: While the implementation satisfies the core requirements and passes all provided tests, it fails to correctly handle edge cases involving punctuation and non-whitespace separators. These deviations could lead to incorrect counts in real-world text, especially with complex or noisy input. The current logic is brittle and not aligned with the precise intent of "whitespace-separated runs" and "sentence-ending punctuation." These issues must be addressed before merging.  

> **Note**: The plan did not explicitly require handling of punctuation sequences or non-whitespace separators, but the requirement for "a run of text that contains at least one word and ends in one or more of ., !, or ?" implies that only valid sentence terminators should trigger a count. The current implementation does not respect this boundary.

<!-- ollama: qwen3:4b-instruct, prompt 3433 tokens, output 1005 tokens, 161.4s wall -->
