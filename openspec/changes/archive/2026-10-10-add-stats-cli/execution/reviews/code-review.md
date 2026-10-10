> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [handoff](../../handoff.md)

# code-review: add-stats-cli

- Skill: AI Hero `code-review` (Standards + Spec reviewer briefs), run in a FRESH context: local Ollama `qwen3:4b-instruct` via `.openspec-handoff/scripts/runners/ollama.mjs`, one prompt per reviewer containing only the brief, the commit list, the diff (`git diff 7dfeddb...HEAD -- . ':!openspec'` at 68fe353), and the delta + execution/spec.md (Spec) or AGENTS.md + the smell baseline (Standards). No access to the implementing session.
- Run: 2026-10-10 10:45-10:47 PT (Spec 61 s, Standards 61 s).

## Disposition (implementer, grok-bot)

| # | Finding | Severity claimed | Disposition |
|---|---------|------------------|-------------|
| S1 | Flag handling - reviewer concludes "not in logic", consistent with the spec | none | Agreed. |
| S2 | Empty input not validated | none (not specified) | Agreed, no change: empty input gives `words: 0` / `sentences: 0` (Scenario "Whitespace only" of the archived text-stats spec). |
| T1 | No documented-standard violations | - | Agreed. |
| T2 | Mysterious Name: `availableCommands` -> `enabledCommands` | judgement | Declined (reviewer: clear in context; it goes away with the flag cleanup). |
| T3 | Duplicated Code: `usageError` "in cli.mjs and the test" | judgement | Declined - factually wrong: the test file has no `usageError`; it has a `cli` fake-stream helper like test/cli.test.mjs. |
| T4 | Speculative Generality: `readStdin` | judgement | Reviewer itself calls it justified. Agreed. |

No Critical/Important findings. Own re-grade: none.

## Spec reviewer output (verbatim)

**(a) Missing requirements**: None. All core requirements—stats command, JSON output, flag control—are fully addressed.  

**(b) Scope creep**: The test `bin/textkit.mjs pipes standard input into stats` verifies input piping, which is *explicitly* in scope (spec: "reads standard input"). No unintended additions.  

**(c) Implementation issues**:  
- **Incorrect flag handling in `availableCommands`**: The spec requires that *only* when `TEXTKIT_STATS_CLI="1"` is set, `stats` appears. However, the current `availableCommands` returns `"stats"` only when `env.TEXTKIT_STATS_CLI === '1'`, but the test `Flag on` assumes `stats` appears in `commands: slugify, stats`. This is correct *only* if the flag is set. However, the test `Flag off` correctly excludes it. The issue is not in logic, but in **test clarity**: the test `Flag on` checks `commands: slugify, stats`, which is valid *only* when the flag is on. This is consistent with the spec.  
- **No validation of `readStdin()` input**: The spec does not require input validation (e.g., empty input), but the implementation assumes valid text. This is acceptable as per "out of scope" (no file reading).  

**Spec line**: *"The system SHALL treat `stats` as an unknown command unless the environment variable TEXTKIT_STATS_CLI is set to '1'"* — implemented correctly.  

**Conclusion**: All requirements are met. The implementation matches the spec precisely. No scope creep. No bugs in logic. Tests cover all scenarios. The only minor gap is untested edge cases (e.g., empty input), but these are not specified.  

✅ Fully compliant.

<!-- ollama: qwen3:4b-instruct, prompt 2926 tokens, output 372 tokens, 61.3s wall -->

## Standards reviewer output (verbatim)

### Violations of Documented Standards

**No violations** of the *AGENTS.md* or *Smell baseline* standards are found in the diff.

The change adheres to the OpenSpec `handoff-driven` schema and correctly implements the `stats-cli` feature via a feature flag (`TEXTKIT_STATS_CLI`), aligning with the planning and execution handoff described in AGENTS.md.

### Baseline Smells (Judgement Calls)

1. **Mysterious Name**:  
   - *Hunk*: `availableCommands(env)` — the name is descriptive but not self-explanatory.  
   - *Comment*: Slight concern; could be renamed to `enabledCommands(env)` for clarity. However, the function’s purpose is clear in context, and the name is acceptable under current standards.

2. **Duplicated Code**:  
   - *Hunk*: `usageError(io, message)` appears in both `cli.mjs` and `cli-stats.test.mjs`.  
   - *Comment*: This is a *repeated* pattern, not a violation. The test uses a local version, and the core logic is shared. This is acceptable as it reflects a shared concern, and the test is not duplicating logic unnecessarily.

3. **Speculative Generality**:  
   - *Hunk*: `readStdin()` in `bin/textkit.mjs` and `cli.mjs`.  
   - *Comment*: The abstraction is justified by the need to support stdin in the stats command. No speculative abstraction is present — it's a necessary, domain-aligned design.

### Conclusion  
No hard violations. All baseline smells are minor and contextually justified. The diff follows the agent-driven planning and execution schema, and the implementation is clean, testable, and aligned with the domain.  

✅ Pass.

<!-- ollama: qwen3:4b-instruct, prompt 2554 tokens, output 372 tokens, 61.2s wall -->
