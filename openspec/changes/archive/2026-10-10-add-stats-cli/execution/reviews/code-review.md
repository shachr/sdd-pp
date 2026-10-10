> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [handoff](../../handoff.md)

**weak fallback reviewer: qwen3:4b-instruct (local Ollama)** - the default reviewer (a fresh session of the engineer's own coding agent) was not available: this harness has no sub-agent tool. Treat the verdicts as weak evidence; the implementer triaged them.

# code-review: add-stats-cli

- Skill: AI Hero `code-review` (Standards + Spec reviewer briefs), each run in a fresh context via `.openspec-handoff/scripts/runners/ollama.mjs`, one prompt per reviewer containing only the brief, the commit list, the diff (`git diff 7973ed1...HEAD -- . ':!openspec'` at 4d3852b), and the delta + execution/spec.md (Spec) or AGENTS.md + the smell baseline (Standards).
- Run: 2026-10-10 12:20-12:22 PT (Spec 82 s, Standards 60 s).

## Disposition (implementer, grok-bot)

| # | Finding | Severity claimed | Disposition |
|---|---------|------------------|-------------|
| S1 | (a) missing / (b) scope creep / (c) bugs | none | Agreed for (a)/(c). |
| T1 | Standards violations / smells | none | Agreed. |
| O1 | **Own re-grade (missed by the reviewer):** `textkit stats --xml` -> usage error, exit 2 (slice grill Q3) is behaviour that no delta requirement states - small scope creep | Minor | Kept (fails safe, matches the CLI's other usage errors); recorded as an open item in the v6 report rather than silently widening a requirement. |

No Critical/Important findings.

## Spec reviewer output (verbatim)

**(a) Missing or partial requirements**: None. All core requirements are addressed: the `stats` command, JSON output, and flag control are fully implemented per the spec.

**(b) Scope creep**: The `stats` command now accepts only `--json` as a valid flag, correctly rejecting unknown options (e.g., `--xml`). This is consistent with the spec. However, the test suite now includes `stats` in the command list when `TEXTKIT_STATS=1`, which is correct. No unintended additions are present.

**(c) Implementation issues**: The implementation correctly handles the flag via `visible(name, io)` and uses `commandNames(io)` to filter commands, so the command list in error messages reflects the flag state — **this is correct**. The `stats` command correctly parses input, computes counts, and outputs in both text and JSON formats. The `readingMinutes` function is used as specified, and the output format matches the spec exactly.

One minor concern: the spec requires the reading time to be in **minutes** (e.g., "1 min"), and the implementation outputs `"reading time: ${facts.readingMinutes} min\n"` — this matches the spec. However, the test for "Flag off" includes a check that the command list excludes `stats`, which is correct. The test output for `Flag off` correctly shows `commands: slugify` — no `stats`.

**No implementation errors** are found. The code fully satisfies the spec requirements, with correct flag handling, output formatting, and error messaging. All test cases cover the scenarios described in the spec. The implementation is clean, scoped, and aligned with the requirements.

> Spec line: *"The system SHALL provide a `textkit stats` command that reads standard input and prints 'words: <n>', 'sentences: <n>' and 'reading time: <n> min' on separate lines..."* — fully implemented.  
> Spec line: *"The system SHALL print the counts as one JSON object with the keys 'words', 'sentences' and 'readingMinutes' when `textkit stats` is given the `--json` option."* — fully implemented.  
> Spec line: *"The system SHALL treat `textkit stats` as an unknown command unless the environment variable `TEXTKIT_STATS` is set to '1'."* — fully implemented.

<!-- ollama: qwen3:4b-instruct, prompt 2726 tokens, output 488 tokens, 82.2s wall -->

## Standards reviewer output (verbatim)

### Violations of Documented Standards

**No violations** of the *AGENTS.md* or *Smell baseline* standards are present in the diff.

The feature flag logic (`TEXTKIT_STATS`) is correctly implemented using a `visible()` helper and `commandNames()` to dynamically filter commands—this aligns with the *handoff-driven* schema and supports conditional execution, consistent with OpenSpec practices.

The shared test helper (`cli` in `cli-io.mjs`) is appropriately extracted and reused across tests, avoiding **shotgun surgery** and **divergent change**. It is also a clean, reusable abstraction, fulfilling the intent of shared test infrastructure.

The `stats` command handles unknown options via early validation, preventing **feature envy** or **primitive obsession**. The logic is focused and self-contained, with no data clumps or message chains.

### Baseline Smells (Judgement Calls)

- **Mysterious Name**: The function `visible()` is named clearly and accurately—it expresses its purpose (determining command visibility). No renaming needed.
- **Duplicated Code**: The `cli` helper is reused across test files, which is good. No duplication in logic.
- **Shotgun Surgery**: No scattered edits; the change is focused and modular.
- **Speculative Generality**: No abstract parameters or hooks added without spec support. The flag is strictly tied to the `TEXTKIT_STATS` environment variable.

All changes are minimal, focused, and aligned with the OpenSpec handoff schema. The implementation is clean, testable, and adheres to both the documented standards and the baseline smells.

✅ **No hard violations**.  
✅ **No baseline smells** that require correction.  

The diff is well-structured, readable, and compliant.

<!-- ollama: qwen3:4b-instruct, prompt 2489 tokens, output 361 tokens, 59.8s wall -->
