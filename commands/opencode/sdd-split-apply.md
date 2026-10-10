---
description: "Apply the approved split proposal: parent + slices named <parent>-<nn>-<slice>, loss check, tickets (usage: /sdd-split-apply <change-id>)"
---

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs split apply $ARGUMENTS
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
