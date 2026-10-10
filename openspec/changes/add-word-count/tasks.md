# Tasks

## 1. Execution

- [ ] 1.1 Plan Task 1 countWords counts whitespace-separated words that contain a letter or digit - execution/plan.md#task-1-countwords-counts-whitespace-separated-words-that-contain-a-letter-or-digit - verify: `node --test test/text-statistics.test.mjs`
- [ ] 1.2 Plan Task 2 countWords rejects non-string input - execution/plan.md#task-2-countwords-rejects-non-string-input - verify: `npm test`

## 2. Review and verification

- [ ] 2.1 Run /adversarial-review add-word-count and resolve Critical/Important findings - verify: review file exists in execution/reviews/
- [ ] 2.2 Run `openspec validate add-word-count --strict` - verify: exit 0
- [ ] 2.3 Run `node .openspec-handoff/scripts/check-handoff.mjs add-word-count` - verify: exit 0

## Workflow follow-up

- Run /opsx:verify add-word-count once every box above is ticked.
- Archive with `openspec archive add-word-count` after verification.
