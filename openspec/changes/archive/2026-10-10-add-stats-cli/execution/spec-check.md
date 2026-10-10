## Spec check: add-stats-cli

- Tool: ai-hero; design output: execution/spec.md, execution/tickets/ (2); units checked: 5
- Source of truth: proposal.md + specs/stats-cli/spec.md

### Coverage

| Requirement | Covered by | Scenarios mentioned |
|---|---|---|
| Stats command | story 1<br>01 - stats command behind the flag | ✓ Stats summary |
| Stats JSON output | story 2<br>02 - stats JSON output | ✓ JSON flag |
| Stats command flag | story 3<br>01 - stats command behind the flag | ✓ Flag off<br>✓ Flag on |

### Missing (in the delta, not in the design output)

- none

### Unknown references (in the design output, not in the delta)

- none

### Added without source (units that name no delta requirement)

- none

### Size (line estimate after planning, warn-only - the real diff is measured at the PR by check-handoff)

- 2/2 tickets / plan tasks carry an "Estimate: ~N lines" line; total ~110 lines (code + tests), budget ~300.

### Contradictions (agent review)

- none (agent review by Grok Bot: tickets and stories match the named requirements; the flag check before lookup gives the "unknown command: stats" error the flag scenario expects).

### Result

PASS (mechanical checks). Contradictions: see agent review above.
