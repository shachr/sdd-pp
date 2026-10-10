self-review (no subagent tool: code-reviewer.md performed by the implementing session itself against the review package; weaker than a fresh reviewer - the user decides whether that is enough before merge)

> Source of truth: [proposal](../../proposal.md) · [specs/case-conversion/spec.md](../../specs/case-conversion/spec.md) · [plan](../plan-add-case-conversion.md)

# Final whole-branch review: add-case-conversion

- Skill: superpowers `requesting-code-review` / `code-reviewer.md`, via `executing-plans` "Final Review" (without a subagent tool)
- Range: 85ad825..b4c4771 (review package `.superpowers/sdd/plan-add-case-conversion/review-85ad825..b4c4771.diff`, 2 commits)
- Plan: [plan-add-case-conversion.md](../plan-add-case-conversion.md) · Spec: [delta](../../specs/case-conversion/spec.md) · Review Focus: plan section, items 1-5 checked deliberately (all have tests; all pass)

### Strengths
- One shared splitter (`src/case.mjs:6`, `words`) - the three converters cannot disagree on boundaries, which is the proposal's whole point.
- Tests are named after the 11 delta scenarios plus the 5 Review Focus cases; they go through `src/index.mjs`, the public entry point.
- Error type and message follow `slugify`/`excerpt` (`TypeError`, helper-prefixed message).

### Issues

#### Critical (Must Fix)
- none

#### Important (Should Fix)
1. **Title-case letters silently dropped** - `src/case.mjs:6`: the word pattern had no `\p{Lt}`, so `snakeCase('ǅemal x')` returned `"emal_x"`. Breaks "Requirement: Word splitting" (non-ASCII letters count as letters) and the brainstorm anti-goal "dropping non-ASCII letters". Fix: accept `\p{Lt}` wherever `\p{Lu}` starts a word.

#### Minor (Nice to Have)
1. `src/case.mjs` camelCase: `ß` capitalises to `"SS"` (`camelCase('foo ßar')` -> `"fooSSar"`); a person might expect `"fooSsar"`.
2. `src/case.mjs:13` `words` is exported from the module (not from the entry point); a leading underscore or a non-exported helper would make "internal" explicit.

### Declined to judge
- Apostrophes split words (`don't stop` -> `don_t_stop`): the delta says every non-letter/digit run separates words.
- Emoji and symbols are dropped (`👍 ok` -> `ok`): same rule.
- Leading digits stay (`2024 plan` -> `2024Plan`, not a valid JS identifier): the proposal targets naming styles, not identifier validity.

### Assessment

**Ready to merge?** With fixes

**Reasoning:** Matches the plan and all scenarios; one Important spec breach on title-case letters, fixed in one pass below.

## Fix pass (executor)
- Fixed Important 1 - test `title-case letter kept` RED (17/18) -> GREEN; suite 33/33. The lone-letter alternative (`ǅ x` -> `ǆ_x`) was changed in the same pass and its assertion added right after, not watched failing first.
- Minors 1-2 deferred (ledger).
