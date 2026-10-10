> Source of truth: [proposal](../proposal.md) · specs: ../specs/

Size gate estimates (Grok Bot, from each requirement's scenarios and the code it touches; lines of code + tests, no tooling).

| Requirement | Scenarios | Code touched | Estimate |
|---|---|---|---|
| Word count | 2 | src/stats.mjs (new), test/stats.test.mjs (new) | 45 |
| Sentence count | 2 | src/stats.mjs, test/stats.test.mjs | 55 |
| Slugify command | 2 | src/cli.mjs (new: argv dispatch, stdin reading, io injection), bin/textkit.mjs (new), package.json bin, test/cli.test.mjs (new, incl. one spawn test) | 130 |
| Command errors | 2 | src/cli.mjs (usage text, exit codes), test/cli.test.mjs | 60 |
| Stats command | 1 | src/cli.mjs (stats sub-command, uses src/stats.mjs), test/cli-stats.test.mjs (new) | 70 |
| Stats JSON output | 1 | src/cli.mjs (option parsing), test/cli-stats.test.mjs | 40 |
