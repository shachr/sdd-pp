# Tasks

## 1. Execution

- [x] 1.1 Plan Task 1 title-case module - word casing and spacing - execution/plan-add-title-case.md#task-1-title-case-module---word-casing-and-spacing - verify: `node --test test/title-case.test.mjs`
- [ ] 1.2 Plan Task 2 title-case module - minor words - execution/plan-add-title-case.md#task-2-title-case-module---minor-words - verify: `node --test test/title-case.test.mjs`
- [ ] 1.3 Plan Task 3 title-case module - input type guard - execution/plan-add-title-case.md#task-3-title-case-module---input-type-guard - verify: `npm test`

## 2. Review and verification

- [ ] 2.1 Run the tool's code review (Superpowers `requesting-code-review`) and resolve Critical/Important findings - verify: execution/reviews/code-review.md exists
- [ ] 2.2 Run `openspec validate add-title-case --strict` - verify: exit 0
- [ ] 2.3 Run `node .openspec-handoff/scripts/check-handoff.mjs add-title-case` - verify: exit 0

## Workflow follow-up

- Run /opsx:verify add-title-case once every box above is ticked; save the report to execution/verify.md.
- Run /opsx:archive add-title-case (agent-driven sync of the deltas, then move to archive/).
