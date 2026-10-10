---
name: /sdd-slice-start
id: sdd-slice-start
category: Workflow
description: "Take a READY slice: marks it in-progress in its parent's slices.md and prints the next lines (--undo: back to planned) (usage: /sdd-slice-start <slice-id> [--undo])"
---

Arguments: <slice-id> [--undo] - as given after the command.

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs slice-start <arguments>
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
