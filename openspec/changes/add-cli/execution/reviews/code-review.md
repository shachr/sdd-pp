> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/cli/spec.md) · [handoff](../../handoff.md)

# code-review: add-cli

- Skill: AI Hero `code-review` (Standards + Spec reviewer briefs), run in a FRESH context: local Ollama `qwen3:4b-instruct` via `.openspec-handoff/scripts/runners/ollama.mjs`, one prompt per reviewer containing only the brief, the commit list, the diff (`git diff 1c01fed...HEAD -- . ':!openspec'` at 407144d), and the delta + execution/spec.md (Spec) or AGENTS.md + the smell baseline (Standards). No access to the implementing session.
- Run: 2026-10-10 10:39-10:42 PT (Spec 75 s, Standards 69 s).

## Disposition (implementer, grok-bot)

| # | Finding | Severity claimed | Disposition |
|---|---------|------------------|-------------|
| S1 | Test for inherited names (`toString`, `__proto__`) is scope creep | (b) | **Declined.** Not new behaviour: those names are unknown commands under "Requirement: Command errors" (Scenario "Unknown command"). Without `Object.hasOwn`, `textkit toString` would call `Object.prototype.toString` and return a string as the exit code - the test pins the fix. |
| S2 | (c) usage printed in every error case | none (reviewer concluded "not a flaw") | Agreed - the delta wants the usage in each case. |
| T1 | No documented-standard violations | - | Agreed. |
| T2 | Mysterious Name: `OK`, `USAGE_ERROR` | judgement | Declined (reviewer: conventional exit-code names). |
| T3 | Duplicated Code: usage regex repeated in two tests | judgement | Declined (two assertions; a helper would hide the scenario's check). |
| T4 | Speculative Generality: no guard on command names | judgement | Declined (`Object.hasOwn` is the guard; nothing speculative added). |

No Critical/Important findings. Own re-grade: none.

## Spec reviewer output (verbatim)

**(a) Requirements missing or partial:**  
None. All core requirements from the spec are addressed: the `slugify` command outputs a slug and exits 0 (Scenario: Slugify argument), and usage errors print a message and exit 2 for unknown commands or missing arguments (Scenarios: Unknown command, Missing argument).

**(b) Scope creep:**  
The implementation includes a test for `inherited names` like `'toString'` or `'__proto__'`, which was not in the spec. This extends beyond the scope of the requirement to handle only valid commands like `slugify`. The spec does not define or require handling of non-command strings.

**(c) Implementation issues:**  
The spec requires the usage message to be printed *only* when a command is unknown or missing an argument. However, the `usageError` function in `cli.mjs` prints the full usage message *in all error cases*, including when the command is missing its argument. This is consistent with the spec, which says "standard error contains the usage". The implementation correctly includes the usage message in all error cases, so this is not a flaw.  

Additionally, the test for `slugify` joining multiple words (e.g., `'Hello'`, `'World'`) is valid and matches the spec’s note on "several text arguments joined with a single space" (slice grill Q3), so it is correctly implemented.

**Conclusion:**  
The diff fully implements the spec’s requirements with no missing or incorrect logic. The only deviation is the test for non-command strings, which is not required by the spec and thus constitutes scope creep. No implementation errors are found. All scenarios in the spec are covered, and the error handling and output behavior align exactly with the stated requirements.  

> Spec line: "The system SHALL print a usage message to standard error and exit with code 2 when the command is unknown or missing its argument." — This is correctly implemented.  
> Spec line: "The system SHALL provide a `textkit slugify` command that prints the slug of its text argument..." — Fully implemented.

<!-- ollama: qwen3:4b-instruct, prompt 2269 tokens, output 430 tokens, 74.5s wall -->

## Standards reviewer output (verbatim)

**Code Review Report**

---

### **Documented Standard Violations**  
None. All changes align with the *Agents.md* workflow and OpenSpec handoff schema. The addition of CLI commands and `bin/textkit.mjs` follows the planned structure for a command-line tool, with clear separation of concerns and execution via `/handoff`.

---

### **Baseline Smells**  

1. **Mysterious Name**  
   - **Hunk**: `const OK = 0; const USAGE_ERROR = 2;`  
   - **Issue**: `OK` and `USAGE_ERROR` are named with minimal context. While not egregious, they lack clarity about intent.  
   - **Judgement**: Minor. These are constants in a well-known context (exit codes), and the naming is conventional. No real risk of confusion.  

2. **Duplicated Code**  
   - **Hunk**: `test('Unknown command')` and `test('Missing argument')` both use `assert.match(r.err, /usage: textkit <command> \[text\]/)`  
   - **Issue**: Repeated pattern in test cases.  
   - **Judgement**: A *judgement call*. The duplication is minimal and the test logic is clear. Could be refactored into a shared helper, but not urgent.  

3. **Speculative Generality**  
   - **Hunk**: `COMMANDS` object uses `name` as key, with no type guard or validation beyond `hasOwn`.  
   - **Issue**: No explicit validation of command names (e.g., against reserved keywords).  
   - **Judgement**: Low risk. The current design is simple and sufficient for the scope. Future expansion can add guards.  

---

**Summary**  
No hard violations of documented standards. All changes are consistent with the OpenSpec handoff workflow and agent skill expectations. Baseline smells are minor and contextually acceptable. No action required beyond potential future refactoring for clarity.  

✅ **Approved** — meets standards and agent workflow.

<!-- ollama: qwen3:4b-instruct, prompt 2131 tokens, output 421 tokens, 68.8s wall -->
