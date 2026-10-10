## Spec check: add-initials

- Tool: superpowers; design output: execution/plan-add-initials.md; units checked: 2
- Source of truth: proposal.md + specs/initials/spec.md

### Coverage

| Requirement | Covered by | Scenarios mentioned |
|---|---|---|
| Initials from name parts | Task 1: initials module - parts and letters | ✓ Two-part name<br>✓ Hyphenated name<br>✓ Lowercase input<br>✓ Accented initial |
| Letters only | Task 2: initials module - letter rules and blank names | ✓ Leading punctuation<br>✓ Part without letters |
| Blank name | Task 2: initials module - letter rules and blank names | ✓ Blank name |

### Missing (in the delta, not in the design output)

- none

### Unknown references (in the design output, not in the delta)

- none

### Added without source (units that name no delta requirement)

- none

### Contradictions (agent review)

- none. Checked (Grok Bot), run 2: Tasks 1-2 against the three requirements. Run 1 found one contradiction (plan pinned "E" for a decomposed "é", against Scenario "Accented initial" and the brainstorm's "accents stay accented"); the plan now normalises to NFC and pins "É". "ß" -> "SS" is the uppercase of the first letter (consistent); "-- 42" yields no letters -> "" (consistent with "Blank name").

### Result

PASS (mechanical checks; agent review run 2: no contradictions).
