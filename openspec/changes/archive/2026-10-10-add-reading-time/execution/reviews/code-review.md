> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/reading-time/spec.md) · [grill session](../grill.md) · [spec](../spec.md)

# Code review (AI Hero `code-review`) - add-reading-time

- Fixed point: `8473d68a318c09d560ac81cd093995606b712c0c` (handoff base_ref); diff `git diff 8473d68a318c09d560ac81cd093995606b712c0c...HEAD -- . ':!openspec'` (src/reading-time.mjs, test/reading-time.test.mjs; 52 lines).
- Reviewer context: **fresh context, not a self-review.** The harness has no sub-agent tool, so the skill's two sub-agent briefs (Standards with the full smell baseline; Spec with the delta) were each sent as a standalone prompt to a separate local model, **qwen3:4b-instruct via Ollama** (free, open-weight), which saw nothing but its prompt. Prompts: [code-review.standards.prompt.md](code-review.standards.prompt.md), [code-review.spec.prompt.md](code-review.spec.prompt.md). Caveat: a 4B model is a weak reviewer; its output is shallow.
- Run: Standards 00:20-00:21 PT, Spec 00:21-00:22 PT (Oct 10), both exit 0, not truncated.

## Standards

**No documented standard violations.**  
All code adheres to the repo standards:  
- **AGENTS.md**: Tiny text utilities, Node ≥18, ES modules, no runtime dependencies — satisfied (no deps, pure functions).  
- Existing style (e.g., `src/slugify.mjs`): one exported function per module — satisfied (`readingTime` is the only export).  
- `String(text)` coercion — used in `countWords`.  

**Baseline smells:**  
- **Mysterious Name**: *None*. `countWords` and `readingTime` are clear, domain-aligned.  
- **Primitive Obsession**: *None*. "Word" is properly defined via GLOSSARY.md and implemented with a type-aware filter.  
- **Duplicated Code**: *None*. Only one function and one test suite.  
- **Data Clumps**: *None*. Parameters are minimal and meaningful.  
- **Repeated Switches**: *None*. No cascading conditionals.  
- **Shotgun Surgery**: *None*. Single file, single responsibility.  
- **Divergent Change**: *None*. One logical unit.  
- **Speculative Generality**: *None*. No abstract parameters beyond needed.  
- **Message Chains / Middle Man / Refused Bequest**: *None*. No delegation or chains.  

**Conclusion**: The diff is clean, aligned with standards, and free of baseline smells. No hard violations. All design choices are transparent and domain-resonant.  

(Word count: 238)

<!-- ollama: qwen3:4b-instruct, prompt 1560 tokens, output 319 tokens, 48.4s wall -->

## Spec

(a) **No missing requirements**: All spec requirements are addressed — reading time estimate, word counting, and speed validation.  
(b) **No scope creep**: The diff adheres strictly to the spec. No extra features (e.g., support for non-ASCII scripts beyond Unicode) or unrequested behaviour (e.g., handling of emojis, special characters beyond letter/digit) are present.  
(c) **Implementation correctness**:  
- **Word counting**: The regex `/[\p{L}\p{N}]/u` correctly matches letters and digits across scripts (e.g., "café", "naïve", "über"). The split by `\s+` handles mixed whitespace. ✅  
- **Speed validation**: The check `Number.isFinite(wordsPerMinute) && wordsPerMinute > 0` correctly rejects 0, -5, NaN, Infinity. ✅  
- **Empty text**: Returns 0, as required. ✅  
- **Rounding**: `Math.ceil()` ensures partial minutes round up — e.g., 201 words → 2 minutes. ✅  

**Spec line**: *"The system SHALL estimate reading time as the number of words divided by the reading speed in words per minute, rounded up to a whole number of minutes..."* — fully implemented.  

**Spec line**: *"The system SHALL count as a word every whitespace-separated run of characters that contains at least one letter or digit..."* — correctly implemented.  

**Spec line**: *"The system SHALL reject a reading speed that is not a finite number greater than zero with a RangeError."* — correctly implemented.  

✅ All requirements are fully and correctly implemented. No deviations or gaps.

<!-- ollama: qwen3:4b-instruct, prompt 1438 tokens, output 349 tokens, 49.8s wall -->

## Summary

Standards: 0 findings. Spec: 0 findings.

## Triage (Grok Bot, implementer)

- No Critical/Important findings to resolve; 2.1 ticked.
- Reviewer slip noted, not acted on: the Spec reviewer calls Unicode handling "beyond" the spec, but the delta says "in any script", so it is in scope (the reviewer's own conclusion is still right).
- Own note (not from the reviewer): two scenario tests ("Partial minute rounds up", "Empty text") were green on arrival during TDD because earlier minimal code already satisfied them; they still pin the behaviour. A string speed such as "100" is rejected with RangeError (not a finite number) - consistent with the delta, not tested separately.
