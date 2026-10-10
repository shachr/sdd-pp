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

- execution/plan-add-title-case.md Task 2 (via [design](design.md) "Position of a word") vs "Requirement: Minor words stay lowercase": `text.split(/( +)/)` yields empty strings at the ends of `"  the end"`; counting "non-space items" makes `""` the first word, so the plan as written lowercases a minor word that opens the title after leading spaces. Words must be the non-empty, non-space items.

### Result

GAPS: 0 mechanical finding(s), 1 contradiction (agent review). Fix the design output before implementation.
