## Spec check: add-case-conversion

- Tool: superpowers; design output: execution/plan-add-case-conversion.md; units checked: 2
- Source of truth: proposal.md + specs/case-conversion/spec.md

### Coverage

| Requirement | Covered by | Scenarios mentioned |
|---|---|---|
| Word splitting | Task 1: Word splitter + snake/kebab converters | ✓ Separators split words<br>✓ Lower-to-upper boundary<br>✓ Acronym kept as one word<br>✓ Digits stay with their word<br>✓ Non-ASCII letters kept |
| snake_case conversion | Task 1: Word splitter + snake/kebab converters | ✓ snake_case output |
| kebab-case conversion | Task 1: Word splitter + snake/kebab converters | ✓ kebab-case output |
| camelCase conversion | Task 2: camelCase converter | ✓ camelCase output<br>✓ Already converted input unchanged |
| Input handling | Task 1: Word splitter + snake/kebab converters<br>Task 2: camelCase converter | ✓ Empty or separator-only input<br>✓ Text is not a string |

### Missing (in the delta, not in the design output)

- none

### Unknown references (in the design output, not in the delta)

- none

### Added without source (units that name no delta requirement)

- none

### Size (line estimate after planning, warn-only - the real diff is measured at the PR by check-handoff)

- 2/2 tickets / plan tasks carry an "Estimate: ~N lines" line; total ~135 lines (code + tests), budget ~300.

### Contradictions (agent review)

- none (Task 1 and Task 2 read against "Requirement: Word splitting", "snake_case conversion", "kebab-case conversion", "camelCase conversion", "Input handling" and their scenarios: same values, same TypeError, no out-of-scope work; Review Focus tests 1-5 stay within "Word splitting" / "camelCase conversion")

### Result

PASS (mechanical checks). Contradictions: see agent review above.
