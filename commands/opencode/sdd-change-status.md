---
description: "Where a change is: its steps with [done] markers, before or after the handoff (usage: /sdd-change-status <change-id>)"
---

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs change-status $ARGUMENTS
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
