---
description: "Split change status: ready / parallel-safe slices; writes tickets for READY slices (usage: /sdd-split-status <parent-id>)"
---

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs split-status $ARGUMENTS
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
