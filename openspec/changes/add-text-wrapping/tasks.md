# Tasks

## 1. Execution

- [x] 1.1 Ticket 01 text-wrapping module - line filling - execution/tickets/01-line-filling.md - verify: `node --test test/text-wrapping.test.mjs`
- [x] 1.2 Ticket 02 text-wrapping module - overlong Words - execution/tickets/02-overlong-words.md - verify: `node --test test/text-wrapping.test.mjs`
- [x] 1.3 Ticket 03 text-wrapping module - Width validation - execution/tickets/03-width-validation.md - verify: `npm test`

## 2. Review and verification

- [x] 2.1 Run /adversarial-review add-text-wrapping and resolve Critical/Important findings - verify: review file exists in execution/reviews/
- [x] 2.2 Run `openspec validate add-text-wrapping --strict` - verify: exit 0
- [x] 2.3 Run `node .openspec-handoff/scripts/check-handoff.mjs add-text-wrapping` - verify: exit 0

## Workflow follow-up

- Run /opsx:verify add-text-wrapping once every box above is ticked; save the report to execution/verify.md.
- Run /opsx:archive add-text-wrapping (agent-driven sync of the deltas, then move to archive/).
