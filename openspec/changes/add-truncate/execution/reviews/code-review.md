# code-review: add-truncate

- Skill: AI Hero `code-review` (Standards + Spec reviewer briefs), run in a FRESH context: local Ollama `qwen3:4b-instruct` via `.openspec-handoff/scripts/runners/ollama.mjs`, one prompt per reviewer containing only the brief, the diff (`git diff 043b06c439d165758c503d3c847ee094d2bd40c2...HEAD -- . ':!openspec'` at 5f34e7e), the delta (Spec) or the repo standards + smell baseline (Standards). No access to the implementing session.
- Run: 2026-10-10 00:59-01:01 PT.

## Disposition (implementer, grok-bot)

| # | Finding | Severity claimed | Disposition |
|---|---------|------------------|-------------|
| S1 | `s[room] ?? ' '` may index out of bounds | (b)/(c) | **Partly accepted.** Index is always in range (the function returns early when `s.length <= maxLength`, so `room < s.length`), which makes the `?? ' '` fallback dead code. Removed it and added a comment. Tests 8/8. |
| S2 | room can be negative ("`…` has length 3") | (c) implementation error | **Declined.** `'…'.length === 1`; validation rejects `maxLength < ellipsis.length` before cutting, so `room >= 0` (probe: `truncate('ab cd', 1)` -> `"…"`, `truncate('abc', 2, {ellipsis: '..'})` -> `".."`). Covered by Scenario "Invalid limit rejected". |
| S3 | word-boundary logic is "scope creep" | (b) | **Declined.** Required by "Requirement: Truncation with ellipsis" (Scenarios "Cut at word boundary", "Long single word"). |
| S4 | Validation misses negative/fractional limits | (c) | **Declined.** `Number.isInteger` + `< 1` reject them; test covers 0, -1, 2.5, NaN. |
| T1 | Standards: no hard violations | - | Agreed. |
| T2 | Judgement call: boundary check could be a helper | judgement | **Declined** (single use; would be Speculative Generality). |

No Critical/Important findings remain.

## Spec reviewer output (verbatim)

**(a) Missing or partial requirements:**  
None. All core requirements are covered: short text unchanged, truncation at word boundary, custom ellipsis, and limit validation.

**(b) Scope creep (unauthorized behaviour):**  
The implementation uses `s[room] ?? ' '` to check if a word boundary is crossed, which may incorrectly assume that `room` is a valid index. This logic could fail for edge cases (e.g., `room` beyond string length), though it's not explicitly forbidden by spec. However, the spec does **not** require mid-word cutting logic beyond "cut mid-word otherwise," and the current implementation's `search(/\s\S*$/)` is overly complex and not specified. This introduces unapproved complexity.

**(c) Implementation errors:**  
The implementation incorrectly handles the case where `room` is zero or negative. For example, if `maxLength = 1` and `ellipsis = '…'` (length 3), `room = -2`, and `s[room]` is out of bounds. The spec requires `maxLength >= ellipsis.length`, but the code does not validate that `room >= 0`. This could lead to invalid indexing.  

> **Spec line:** *"The system SHALL shorten longer text so that the result, including the ellipsis, is no longer than the limit, cutting at the last word boundary when the kept part has one and mid-word otherwise, with no whitespace before the ellipsis"*  
> This implies truncation only when the text exceeds the limit, and the kept part must be valid. The current code does not ensure `room >= 0` or validate that `s[room]` is within bounds.

> **Spec line:** *"The system SHALL reject a limit that is not a whole number of at least 1 and at least the ellipsis length"*  
> The error message is correct, but the condition `maxLength < 1 || maxLength < ellipsis.length` fails to guard against `maxLength` being negative or fractional — though it correctly rejects non-integers. Still, the logic assumes `maxLength` is positive, which is not fully validated in edge cases.

**Conclusion:** The implementation satisfies the core spec but has unvalidated edge cases and overcomplicated mid-word logic not specified. A minimal, safe truncation with proper bounds checking is required.

<!-- ollama: qwen3:4b-instruct, prompt 1356 tokens, output 481 tokens, 64.0s wall -->

## Standards reviewer output (verbatim)

**Report: Standards Compliance & Baseline Smells**

**(a) Violations of Documented Standards**  
None. All standards are met:  
- **AGENTS.md**: The function is pure, exports one function per module, uses `String(text)` coercion, and no runtime dependencies.  
- **Node version & ES modules**: Code uses ES modules and targets Node ≥18.  
- **Testing**: Tests use `node:test` and `assert`, as required.  

**(b) Baseline Smells**  
- **Mysterious Name**: *No*. The function `truncate` clearly conveys its purpose.  
- **Data Clumps**: *No*. `text`, `maxLength`, and `ellipsis` are logically grouped and self-explanatory.  
- **Primitive Obsession**: *No*. `maxLength` is validated as an integer; `ellipsis` is a configurable string, not a primitive standing in for a concept.  
- **Duplicated Code**: *No*. Only one function and one test file.  
- **Shotgun Surgery / Divergent Change**: *No*. Single file change, focused on one feature.  
- **Speculative Generality**: *No*. Parameters are only used where specified.  

**One minor judgement call**:  
> Hunk in `truncate.mjs`: `const cutMidWord = !/\s/.test(s[room] ?? ' ');`  
> → This checks if the cut point is mid-word, but the logic for trimming `kept` to the last word boundary is fragile. It assumes `kept` has a trailing space, which may not hold.  
> **Smell**: *Primitive Obsession* (indirectly) — the `s[room]` access is a primitive check that could be abstracted into a word-boundary utility. However, this is a *judgement call*, not a violation, and the existing design is acceptable given the spec constraints.  

**Conclusion**: No hard violations. All standards are satisfied. Baseline smells are minor and non-critical. The change is clean, focused, and aligned with the repo’s standards.

<!-- ollama: qwen3:4b-instruct, prompt 1469 tokens, output 437 tokens, 58.3s wall -->
