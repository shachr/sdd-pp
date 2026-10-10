# Tasks

## 1. Execution

- [x] 1.1 Ticket 01 greet() accepts a name - execution/tickets/01-greet-accepts-a-name.md - verify: `npm test` (greet unit tests)
- [x] 1.2 Ticket 02 CLI passes the name through - execution/tickets/02-cli-passes-the-name.md - verify: `npm test` (CLI tests)

## 2. Review and verification

- [x] 2.1 Run /adversarial-review add-greeting-name and resolve Critical/Important findings - verify: review file exists in execution/reviews/
- [ ] 2.2 Run `openspec validate add-greeting-name --strict` - verify: exit 0
- [x] 2.3 Run `node .openspec-handoff/scripts/check-handoff.mjs add-greeting-name` - verify: exit 0

## Workflow follow-up

- Run /opsx:verify add-greeting-name once every box above is ticked.
- Archive with `openspec archive add-greeting-name` after the PR merges.
