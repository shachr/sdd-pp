# Tasks

## 1. Execution

- [x] 1.1 Plan Task 1 initials module - parts and letters - execution/plan-add-initials.md#task-1-initials-module---parts-and-letters - verify: `npm test`
- [x] 1.2 Plan Task 2 initials module - letter rules and blank names - execution/plan-add-initials.md#task-2-initials-module---letter-rules-and-blank-names - verify: `npm test`

## 2. Review and verification

- [ ] 2.1 Run the tool's code review (Superpowers `requesting-code-review`) and resolve Critical/Important findings - verify: execution/reviews/code-review.md exists
- [ ] 2.2 Run `openspec validate add-initials --strict` - verify: exit 0
- [ ] 2.3 Run `node .openspec-handoff/scripts/check-handoff.mjs add-initials` - verify: exit 0

## Workflow follow-up

- Run /opsx:verify add-initials once every box above is ticked; save the report to execution/verify.md.
- Run /opsx:archive add-initials (agent-driven sync of the deltas, then move to archive/).
