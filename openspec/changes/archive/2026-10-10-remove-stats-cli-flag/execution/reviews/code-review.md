> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md) · [plan](../plan-remove-stats-cli-flag.md) · [handoff](../../handoff.md)

**weak fallback reviewer: qwen3:4b-instruct (local Ollama)** - the default reviewer (a fresh session of the engineer's own coding agent) was not available: this harness has no sub-agent tool. Treat the verdict as weak evidence; the implementer triaged it.

# requesting-code-review: remove-stats-cli-flag

- Skill: Superpowers `requesting-code-review`, final whole-branch review, prompt = `code-reviewer.md` filled in (DESCRIPTION, PLAN_OR_REQUIREMENTS = delta + main stats-cli spec + plan, BASE = handoff `base_ref` a912aef, HEAD = 6891309), run in a fresh context via `.openspec-handoff/scripts/runners/ollama.mjs`; diff pasted (no shell).
- Run: 2026-10-10 12:24-12:26 PT (144 s).

## Disposition (implementer, grok-bot)

| # | Finding | Severity claimed | Disposition |
|---|---------|------------------|-------------|
| R1 | Removing the "Flag off" test misaligns with "the spec", which "still defines the behavior under the flag" | Critical | **Declined.** The delta REMOVES "Requirement: Stats command flag"; once archived the main spec no longer has it (the reviewer read the REMOVED block as live - the same weak-model error seen in v5). The released behaviour is pinned by the new usage test. |
| R2 | Ungated lookup "may introduce a subtle bug"; add a comment about the removed gate | Important | **Declined.** No bug named; history lives in git and this change folder, not in code comments. |
| R3 | Commit message / test comments | Minor | Declined (commit message already says it). |

Reviewer verdict "Ready to merge? Yes". No Critical/Important findings remain.

## Reviewer output (verbatim)

### Strengths  
- **Clear alignment with spec**: The implementation successfully removes the `TEXTKIT_STATS` gate as required, fully matching the delta and plan.  
- **Correct behavior**: The `stats` command now works by default, and the usage list correctly includes `stats` (verified in the new test).  
- **Test coverage**: All core behaviors (stats summary, JSON output, unknown option handling) are preserved and tested.  
- **No residual flags**: `rg TEXTKIT_STATS` confirms zero instances of the environment variable in code or tests — a clean removal.  
- **DRY and maintainable**: The usage list now uses `Object.keys(COMMANDS)` directly, eliminating conditional logic and reducing complexity.  

---

### Issues  

#### Critical (Must Fix)  
**File: `test/cli-stats.test.mjs`, line 10**  
- The test `test('Flag off')` is removed, but the original test case for `flag off` (where `stats` is hidden) is **not fully replaced**.  
- **Why it matters**: The spec explicitly requires that *without* `TEXTKIT_STATS=1`, the command should be marked as "unknown". This behavior was removed, and the test now assumes `stats` is always visible.  
- **Risk**: This creates a **misalignment with the original spec**, which required the flag to gate visibility. Even though the requirement was marked "REMOVED", the spec still defines the behavior under the flag.  
- **Fix**: Either:  
  - Reintroduce the `flag off` test **with a comment** explaining it's now obsolete (since the requirement was removed), or  
  - **Remove the test entirely** and clearly document in the commit message that the gate is now fully removed and the command is always available.  

#### Important (Should Fix)  
**File: `src/cli.mjs`, line 24–25**  
- The `visible` function and `commandNames` logic were removed, but the `run` function now checks `Object.hasOwn(COMMANDS, name)` **without any gate**.  
- **Why it matters**: This change may **introduce a subtle bug** if future commands are added or removed. The original gate ensured that only `stats` was hidden under a flag, but now the command is always visible — which is correct *only* because the requirement was removed.  
- **Risk**: If the team later wants to re-add the gate, this change would require a major refactor.  
- **Fix**: Add a **comment** in `src/cli.mjs` explaining:  
  > // `stats` is now always visible; the `TEXTKIT_STATS` gate has been removed per spec delta.  
  This prevents future confusion and ensures maintainability.  

---

### Recommendations  
1. **Add a comment in `src/cli.mjs`** to document the removal of the gate and the current behavior.  
2. **Update the commit message** to explicitly state:  
   > "Release `textkit stats` — remove `TEXTKIT_STATS` gate. Command is now always visible and available by default."  
3. **Add a note in the test file** (e.g., in a comment) that the `flag off` test is now obsolete due to the removal of the gate requirement.  
4. **Ensure future changes** to the stats command (e.g., adding new flags) are reviewed against the spec to avoid re-introducing gates.  

---

### Assessment  
**Ready to merge?** ✅ **Yes**  

**Reasoning**: The implementation correctly removes the `TEXTKIT_STATS` gate as per the spec delta and plan. All required behaviors (stats summary, JSON output, usage listing) are preserved and tested. The code is clean, the tests are comprehensive, and the removal is fully justified. The only issue is a minor gap in test documentation — which is addressed by adding comments. No functional bugs or architectural risks exist.  

> ✅ Final verdict: **Ready to merge with minor documentation updates**.

<!-- ollama: qwen3:4b-instruct, prompt 3170 tokens, output 842 tokens, 143.6s wall -->
