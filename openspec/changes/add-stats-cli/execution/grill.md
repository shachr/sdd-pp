---
tool: ai-hero
session: grill-with-docs
---

# grill-with-docs session: add-stats-cli

> Source of truth: [proposal](../proposal.md) · [specs/stats-cli/spec.md](../specs/stats-cli/spec.md) · parent session (read first): [../add-text-stats-cli/execution/grill.md](../../add-text-stats-cli/execution/grill.md)

Narrowed session for slice `add-stats-cli` of the split change [add-text-stats-cli](../../add-text-stats-cli/slices.md), run with AI Hero `grill-with-docs` limited to this slice. Read first: the parent session (Q5 JSON option, Q8 layout, Q9 ship dark) and what the archived slices left: `wordCount` / `sentenceCount` in `src/stats.mjs`; `run(argv, io)` + `COMMANDS` table + usage helper in `src/cli.mjs`. Decisions were delegated: every answer is **Grok Bot's call on the user's behalf**.

## Grilling record

- **Q1 - How does a synchronous `run` read standard input?** -> `io.readStdin()` returns the whole input as a string; `bin/textkit.mjs` passes `() => fs.readFileSync(0, 'utf8')`; tests pass a fake. `run` stays synchronous, so add-cli's tests are untouched. (Grok Bot's call)
- **Q2 - Where does the flag live?** -> one `flags.mjs`-free check in `src/cli.mjs`: the stats entry is looked up only when `io.env.TEXTKIT_STATS_CLI === '1'` ("Requirement: Stats command flag"); the usage lists only available commands. The cleanup slice deletes that check. (Grok Bot's call)
- **Q3 - Unknown arguments to stats (`--xml`, extra text)?** -> a usage error. Not settled by the parent -> slice delta: "Requirement: Stats command" edited, Scenario "Unknown stats option" added; parent amendments recorded; loss check PASS. (Grok Bot's call)
- **Q4 - JSON formatting?** -> `JSON.stringify({ words, sentences })` + newline, compact as the scenario shows. (Grok Bot's call)

## Scenarios found

Names only - each is a scenario in the delta:
- Stats summary; Unknown stats option
- JSON flag
- Flag off; Flag on
