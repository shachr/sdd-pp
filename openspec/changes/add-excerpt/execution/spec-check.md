## Spec check: add-excerpt

- Tool: ai-hero; design output: execution/spec.md, execution/tickets/ (2); units checked: 10
- Source of truth: proposal.md + specs/text-excerpt/spec.md

### Coverage

| Requirement | Covered by | Scenarios mentioned |
|---|---|---|
| Excerpt within a length limit | story 1<br>story 2<br>story 3<br>01: Word-safe excerpt with the default ellipsis | ✓ Text that fits<br>✓ Cut at a word boundary<br>✓ First word too long<br>✓ Trailing punctuation dropped |
| Ellipsis option | story 4<br>story 5<br>01: Word-safe excerpt with the default ellipsis<br>02: Caller-chosen ellipsis and input validation | ✓ Default ellipsis<br>✓ Custom ellipsis<br>✓ No ellipsis |
| Whitespace normalisation | story 6<br>01: Word-safe excerpt with the default ellipsis | ✓ Whitespace collapsed |
| Length counted in characters | story 7<br>01: Word-safe excerpt with the default ellipsis | ✓ Emoji count as one character |
| Input validation | story 8<br>02: Caller-chosen ellipsis and input validation | ✓ Text is not a string<br>✓ Invalid maximum length |

### Missing (in the delta, not in the design output)

- none

### Unknown references (in the design output, not in the delta)

- none

### Added without source (units that name no delta requirement)

- none

### Size (line estimate after planning, warn-only - the real diff is measured at the PR by check-handoff)

- 2/2 tickets / plan tasks carry an "Estimate: ~N lines" line; total ~140 lines (code + tests), budget ~300.

### Contradictions (agent review)

- none (agent review: stories 1-8 and tickets 01-02 read against each named requirement and scenario; the grill.md decisions - code points, ellipsis inside the limit, dangling-separator strip, range error when the limit is shorter than the ellipsis - match the delta; "Out of Scope" grapheme clusters is consistent with "Requirement: Length counted in characters")

### Result

PASS (mechanical checks). Contradictions: see agent review above.
