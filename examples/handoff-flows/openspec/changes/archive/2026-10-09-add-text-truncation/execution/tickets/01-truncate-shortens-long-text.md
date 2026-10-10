> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-truncation/spec.md) · [execution spec](../spec.md)

# 01: truncate shortens long text within the budget

**What to build:** A developer can import `truncate` from textkit and get text back that fits a length budget: unchanged when it already fits, otherwise ending in a single ellipsis that is counted inside the budget, cut at the last word boundary when there is one and hard-cut otherwise.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Scenarios "Shorter than the limit" and "Exactly the limit" pass
- [x] Scenarios "Result fits the limit" and "Limit of one" pass
- [x] Scenarios "Word boundary available" and "Single long word" pass
