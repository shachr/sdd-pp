---
description: "Take a READY slice: marks it in-progress in its parent's slices.md and prints the next lines (--undo: back to planned)"
argument-hint: <slice-id> [--undo]
allowed-tools: Bash(node .openspec-handoff/scripts/*)
---

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs split start $ARGUMENTS
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
