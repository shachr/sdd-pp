## Spec check: add-title-case

- Tool: superpowers; design output: execution/plan-add-title-case.md; units checked: 3
- Source of truth: proposal.md + specs/title-case/spec.md

### Coverage

| Requirement | Covered by | Scenarios mentioned |
|---|---|---|
| Words are capitalised | Task 1: title-case module - word casing and spacing | ✓ Lowercase words<br>✓ Shouting is calmed |
| Minor words stay lowercase | Task 2: title-case module - minor words | ✓ Minor words inside the title<br>✓ Minor word at the end |
| Spacing is preserved | Task 1: title-case module - word casing and spacing | ✓ Space runs are kept<br>✓ Empty text |
| Non-string input is rejected | Task 3: title-case module - input type guard | ✓ Number input |

### Missing (in the delta, not in the design output)

- none

### Unknown references (in the design output, not in the delta)

- none

### Added without source (units that name no delta requirement)

- none

### Contradictions (agent review)

- none (agent review: Tasks 1-3 read against the requirements and scenarios they name, and the plan/design decisions against proposal.md out of scope. Run 1 found that Task 2 counted the empty strings left by `split` as words; [design](design.md) "Position of a word" and Tasks 1-2 now define words as non-empty, non-space items.)

### Result

PASS (mechanical checks). Contradictions: see agent review above.
