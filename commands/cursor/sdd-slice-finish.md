---
name: /sdd-slice-finish
id: sdd-slice-finish
category: Workflow
description: "Finish an in-progress slice: needs execution/verify.md (+ execution/progress.md for Superpowers), runs openspec archive <slice> -y, marks it done in the parent's slices.md, prints the commit line (usage: /sdd-slice-finish <slice-id>)"
---

Arguments: <slice-id> - as given after the command.

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs slice-finish <arguments>
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
