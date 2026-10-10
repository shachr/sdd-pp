> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-stats/spec.md) · [plan](../plan-add-text-stats-core.md) · [handoff](../../handoff.md)

**weak fallback reviewer: qwen3:4b-instruct (local Ollama)** - the default reviewer (a fresh session of the engineer's own coding agent) was not available: this harness has no sub-agent tool and cannot open a new session. Findings below were triaged with probes; treat the verdict as weak evidence.

# requesting-code-review: add-text-stats-core

- Skill: Superpowers `requesting-code-review`, final whole-branch review, prompt = `code-reviewer.md` filled in (DESCRIPTION, PLAN_OR_REQUIREMENTS = delta + plan, BASE = handoff `base_ref` 327e035, HEAD = 52c2c7a), run in a fresh context via `.openspec-handoff/scripts/runners/ollama.mjs`. The model has no shell, so the `git diff --stat` / `git diff` output was pasted into the prompt (implementation only).
- Run: 2026-10-10 12:09-12:13 PT (194 s).

## Disposition (implementer, grok-bot)

| # | Finding | Severity claimed | Disposition |
|---|---------|------------------|-------------|
| R1 | `/[\p{L}\p{N}]/u` "may not match all Unicode letters"; suggests `/[a-zA-Z0-9]/` | Critical (self-downgraded to "not critical" in the same paragraph) | **Declined, evidence.** `\p{L}` is the Unicode Letter category; probe `wordCount("Ελληνικά हिन्दी")` -> 2. The suggested ASCII class would break "café"/"日本" (Review Focus 2). |
| R2 | "a!" might be miscounted; fragments like "!" counted | Important (self-withdrawn: "No fix needed") | **Declined, evidence.** Probes: `wordCount("a!b")` -> 1, `sentenceCount("a!b")` -> 2, `sentenceCount("!")` -> 0, as the requirements say. |
| R3 | No JSDoc / comments | Minor | Declined: module comment + named functions; repo has no doc standard (AGENTS.md). |
| R4 | Performance on very large texts | Minor | Declined: no size requirement; linear time. |

Reviewer verdict: "Ready to merge? Yes". No Critical/Important findings remain.

## Reviewer output (verbatim)

### Strengths  
- **Clear alignment with plan**: All three functions (`wordCount`, `sentenceCount`, `readingMinutes`) are implemented exactly as specified, with correct logic and interface.  
- **Proper handling of edge cases**: The implementation correctly handles empty strings, whitespace-only inputs, and coercion of non-string inputs (e.g., `wordCount(42)` → 1).  
- **Comprehensive testing**: Every scenario from the spec is covered, including Unicode (e.g., `café 日本`), newlines, tabs, and punctuation boundaries.  
- **Clean separation of concerns**: The `hasWord` helper is reused across functions, promoting DRYness and reducing duplication.  
- **Correct reading time logic**: Reading time is computed as `Math.ceil(wordCount / 200)`, satisfying the requirement to round up for any word count ≥ 200.  

---

### Issues  

#### Critical (Must Fix)  
**File: `src/stats.mjs`:line 7**  
`hasWord` is defined as `/[\p{L}\p{N}]/u.test(part)` — this may not correctly identify words in all Unicode contexts. For example, `café` contains a non-ASCII letter (`é`) which is correctly matched, but the regex may fail to parse certain edge cases (e.g., accented characters in non-Latin scripts).  

**Why it matters**: The requirement specifies "a run of characters that contains at least one letter or digit", which is satisfied by the presence of any Unicode letter or digit. However, the regex `/[\p{L}\p{N}]/u` is not guaranteed to match all valid word characters under all Unicode standards (e.g., some scripts may have non-Latin letters that don’t match `\p{L}`).  

**Fix**: Replace with a more robust check using `/\p{L}\p{N}/u` (which is correct) or explicitly validate that the string contains at least one letter or digit via `/[a-zA-Z0-9]/u.test(part)`. The current regex is *mostly* correct, but the specification does not define Unicode boundaries — so we should ensure it matches the intent: "contains at least one letter or digit".  

> ✅ **Note**: The current regex is actually correct for the given examples and intent. This is a *minor* concern, but we must confirm it aligns with the spec. Since the spec says "contains at least one letter or digit", and the regex matches that, this is **not critical**.  

#### Important (Should Fix)  
**File: `src/stats.mjs`:line 7**  
The `hasWord` function is used in both `wordCount` and `sentenceCount`, but it is not defined in a way that avoids false positives from punctuation. For example, a string like `"a!"` would be split into `"a!"`, which passes `hasWord` — but the word "a!" is not a valid word.  

**Why it matters**: The requirement defines a "word" as a whitespace-separated run of characters that contains at least one letter or digit. It does not say "only letters or digits". So `"a!"` should be considered a word. However, in `sentenceCount`, we split on `.!?`, and then filter by `hasWord`, which may incorrectly count fragments like `"!"` or `"?"` as words.  

**Fix**: The `hasWord` function is correctly applied *after* splitting, so only valid word fragments are counted. Since the requirement does not require word boundaries to be strictly alphanumeric, and the test cases don’t include such edge cases, this is acceptable.  

> ✅ **Conclusion**: This is not a bug — it's a design choice consistent with the spec. No fix needed.  

#### Minor (Nice to Have)  
- **Missing documentation**: No JSDoc or inline comments explaining the logic or assumptions.  
- **No performance optimization**: For very large texts, `split(/\s+/)` and `split(/[.!?]+/)`, followed by filtering, may be inefficient. However, this is not a concern for typical use cases.  

---

### Recommendations  
- Add brief inline comments to explain the logic (e.g., "Filters fragments containing letters or digits").  
- Consider adding a test for a case like `"a!b"` to verify that only valid word fragments are counted.  
- Future-proof by defining a clearer boundary between "word" and "fragment" in the spec.  

---

### Assessment  
**Ready to merge?** Yes  

**Reasoning**: The implementation fully satisfies the requirements, handles all specified scenarios, and passes all tests. The design is clean, the logic is sound, and edge cases are properly addressed. The only potential concern (Unicode robustness) is not a critical failure given the test cases and specification.  

> ✅ Final verdict: Implementation is correct, complete, and production-ready.


<!-- ollama: qwen3:4b-instruct, prompt 3793 tokens, output 1031 tokens, 194.1s wall -->
