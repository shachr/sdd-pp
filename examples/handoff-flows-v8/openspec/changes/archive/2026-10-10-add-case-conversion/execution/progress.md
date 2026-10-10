# SDD ledger — plan: openspec/changes/add-case-conversion/execution/plan-add-case-conversion.md
> Source of truth: [proposal](../proposal.md) · [specs/case-conversion/spec.md](../specs/case-conversion/spec.md) · [plan](plan-add-case-conversion.md)
Spec: openspec/changes/add-case-conversion/specs/case-conversion/spec.md (+ proposal, brainstorm, handoff)
Setup: Ruling: no separate worktree - work on branch change/add-case-conversion in the main checkout, as the OpenSpec wrapper/next-steps name the branch — the repo is a single-user scratch repo, main untouched — cost if wrong: none (branch isolates the work)
Pre-flight: Task 1 produces words(text) / snakeCase / kebabCase; Task 2 consumes words(text) — names and signature match, no conflict
Task 1: complete (commits 85ad825..87af192, tests: npm test → # duration_ms 88.931531)
Task 2: complete (commits 87af192..b4c4771, tests: npm test → # duration_ms 95.368043)
Final review: self-review (no subagent tool)
Final: fixed Important "title-case letters silently dropped" — title-case letter kept RED→GREEN, suite 33/33 (lone-letter assertion added after its regex change, not RED-first)
Final: minor (deferred): ß capitalises to "SS" in camelCase
Final: minor (deferred): words() exported from src/case.mjs though internal
Final: Ruling: apostrophes split words — delta: any non-letter/digit run separates words — cost if wrong: one regex class
Final: Ruling: emoji/symbols dropped — same delta rule — cost if wrong: users lose emoji in identifiers (unusual)
Final: Ruling: leading digits kept in camelCase — proposal is about naming styles, not JS identifier validity — cost if wrong: a follow-up option
