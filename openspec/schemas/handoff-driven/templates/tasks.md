# Tasks

<!-- Link-only index of the execution breakdown. One checkbox per ticket / plan task. -->

## 1. Execution

- [ ] 1.1 <!-- Ticket 01 <title> - execution/tickets/01-<slug>.md - verify: <check> -->

## 2. Review and verification

- [ ] 2.1 Run /adversarial-review <change-id> and resolve Critical/Important findings - verify: review file exists in execution/reviews/
- [ ] 2.2 Run `openspec validate <change-id> --strict` - verify: exit 0
- [ ] 2.3 Run `node .openspec-handoff/scripts/check-handoff.mjs <change-id>` - verify: exit 0

## Workflow follow-up

<!-- Plain bullets, not checkboxes: /opsx:verify flags every unticked box as CRITICAL. -->
- Run /opsx:verify <change-id> once every box above is ticked; save the report to execution/verify.md.
- Run /opsx:archive <change-id> (agent-driven sync of the deltas, then move to archive/).
