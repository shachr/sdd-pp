# Tasks

## 1. Execution

- [x] 1.1 Ticket 01 truncate shortens long text within the budget - execution/tickets/01-truncate-shortens-long-text.md - verify: `npm test` (truncate scenario tests)
- [x] 1.2 Ticket 02 truncate rejects invalid limits - execution/tickets/02-reject-invalid-limits.md - verify: `npm test` (RangeError tests)

## 2. Review and verification

- [x] 2.1 Run /adversarial-review add-text-truncation and resolve Critical/Important findings - verify: review file exists in execution/reviews/
- [x] 2.2 Run `openspec validate add-text-truncation --strict` - verify: exit 0
- [x] 2.3 Run `node .openspec-handoff/scripts/check-handoff.mjs add-text-truncation` - verify: exit 0

## Workflow follow-up

- Run /opsx:verify add-text-truncation once every box above is ticked.
- Archive with `openspec archive add-text-truncation` after verification.
