> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/greeting/spec.md) · [grill session](../grill.md)

# Code review (AI Hero `code-review`) - add-greeting-name

Example of the expected output location and shape (the toolkit's example, not a real review run).

- Fixed point: handoff `base_ref`; diff `git diff <base_ref>...HEAD -- src test`.
- Spec source: proposal + spec delta; implementation context: grill session, to-spec output, tickets.
- Reviewer context: fresh sub-agent per axis when the harness has one; otherwise say "self-review".

## Spec axis
- Missing / partial: none. Scope creep: none. Looks wrong: none.

## Standards axis
- Hard violations: none. Smells: none.
