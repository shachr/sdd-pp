> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [handoff](../../handoff.md)

# code-review: remove-stats-cli-flag

- Skill: AI Hero `code-review` (Standards + Spec reviewer briefs), run in a FRESH context: local Ollama `qwen3:4b-instruct` via `.openspec-handoff/scripts/runners/ollama.mjs`, one prompt per reviewer containing only the brief, the commit list, the diff (`git diff 28d3ab9...HEAD -- . ':!openspec'` at 91da515), and the delta + current main stats-cli spec + execution/spec.md (Spec) or AGENTS.md + the smell baseline (Standards). No access to the implementing session.
- Run: 2026-10-10 10:48-10:50 PT (Spec 53 s, Standards 51 s).

## Disposition (implementer, grok-bot)

| # | Finding | Severity claimed | Disposition |
|---|---------|------------------|-------------|
| S1 | Removing the flag check "violates" Scenario "Flag off" | "critical deviation" | **Declined.** This change's delta removes "Requirement: Stats command flag" (`## REMOVED Requirements`), Scenario "Flag off" with it; the reviewer read the current main spec (given as context) as the target. |
| S2 | Flag-off test removed "is a regression" | (c) | **Declined**, same reason; the replacement test pins the released behaviour with an empty environment. |
| T1 | "Hard violation": `FLAG_ON` still in the tests (Speculative Generality) | hard | **Declined, evidence.** The diff removes `FLAG_ON` (the reviewer read `-` lines as present); `rg TEXTKIT_STATS_CLI src bin test` and `rg FLAG_ON test` find nothing. A smell is never a hard violation under the brief anyway. |
| T2 | Duplicated Code in one test's two assertions | judgement | Declined (two different facts: output and usage). |

No Critical/Important findings remain. Own re-grade: none.

## Spec reviewer output (verbatim)

**(a) Requirements missing or partial**: None. The spec’s "Requirement: Stats command flag" is correctly marked as removed, and the rest of the stats command requirements (command behavior, JSON output, input handling) remain intact and fully implemented.

**(b) Scope creep**: None. The diff removes only the flag logic and associated tests, aligning exactly with the spec delta. No new behaviors or features are introduced.

**(c) Implementation issues**:  
- **Incorrect behavior in `usageError`**: The spec requires that when `TEXTKIT_STATS_CLI` is off, the CLI should report "unknown command: stats" and *not* list `stats` in the commands list. However, the diff *removes* the flag check entirely and now always lists `stats` in the command list when `stats` is in `COMMANDS`. This violates the original requirement:  
  > *"WHEN TEXTKIT_STATS_CLI is not set and the user runs textkit stats, THEN standard error contains 'unknown command: stats' and the exit code is 2"*  
  The current implementation *always* includes `stats` in the command list, even when the flag is off — contradicting the spec.  

- **Missing flag-off test**: The test suite now only validates the "flag on" case. The spec explicitly required testing both flag-on and flag-off scenarios. The removal of the flag-off test (e.g., `test('Flag off')`) is a regression, though it's not a bug in the code itself — it’s a missing requirement validation.

**Conclusion**: The implementation correctly removes the flag logic, but fails to preserve the spec’s requirement that `stats` is *not* listed in the command list when the flag is off. This is a critical deviation. The test suite also lacks validation of the flag-off scenario, which is required by the spec.

<!-- ollama: qwen3:4b-instruct, prompt 2066 tokens, output 384 tokens, 52.7s wall -->

## Standards reviewer output (verbatim)

**Review Report**

---

### ✅ Hard Violation (Documented Standard)

**File**: `src/cli.mjs`  
**Rule**: *Speculative Generality* (Smell Baseline)  
**Violation**: The `availableCommands` function and its dependency on `TEXTKIT_STATS_CLI` were removed, but the test suite still includes a `FLAG_ON` environment variable and a `cli` function that accepts `env = FLAG_ON`. This introduces speculative generality—abstraction for a feature that is now removed—without justification in the spec.  

**Standard Citation**: *AGENTS.md* requires OpenSpec-driven planning; changes must be grounded in spec. The removal of `stats-cli` flag implies no longer needing environment-based toggling. The presence of `FLAG_ON` in tests violates *Speculative Generality* by maintaining a parameter for a now-deprecated feature.

---

### 🚩 Judgment Call (Baseline Smell)

**File**: `test/cli-stats.test.mjs`  
**Smell**: *Duplicated Code*  
**Hunk**:  
```js
assert.equal(r.out, 'words: 1\nsentences: 1\n');
assert.match(cli([], {}).err, /commands: slugify, stats/);
```
This test asserts both output and command listing, but the command listing is redundant with the `usageError` message. The test logic is duplicated across multiple test cases.  

**Suggestion**: Extract a shared assertion helper for command listing to reduce duplication and improve clarity.

---

### ✅ Compliance Summary

- All changes align with OpenSpec handoff-driven planning (no new flags, no speculative abstractions).
- The removal of `TEXTKIT_STATS_CLI` is consistent with the ticket and spec.
- No feature envy, data clumps, or middle-man patterns observed.
- No shotgun surgery or divergent change.

**Final Note**: The diff cleanly removes a deprecated feature with minimal code churn. The only smell is a minor duplication in testing, which is a judgment call and not a hard violation.  

(Word count: 348)

<!-- ollama: qwen3:4b-instruct, prompt 1876 tokens, output 429 tokens, 51.1s wall -->
