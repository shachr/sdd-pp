# Tasks

## 1. Execution

- [x] 1.1 Ticket 01 reading-time module - estimate from counted words - execution/tickets/01-reading-time-estimate.md - verify: `npm test`
- [ ] 1.2 Ticket 02 reading-time module - speed guard - execution/tickets/02-reading-speed-validation.md - verify: `npm test`

## 2. Review and verification

- [ ] 2.1 Run the tool's code review (AI Hero `code-review`) and resolve Critical/Important findings - verify: execution/reviews/code-review.md exists
- [ ] 2.2 Run `openspec validate add-reading-time --strict` - verify: exit 0
- [ ] 2.3 Run `node .openspec-handoff/scripts/check-handoff.mjs add-reading-time` - verify: exit 0

## Workflow follow-up

- Run /opsx:verify add-reading-time once every box above is ticked; save the report to execution/verify.md.
- Run /opsx:archive add-reading-time (agent-driven sync of the deltas, then move to archive/).
