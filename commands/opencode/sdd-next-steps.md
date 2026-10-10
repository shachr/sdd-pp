---
description: "Print the next steps of a handed-off change again (usage: /sdd-next-steps <change-id>)"
---

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs next $ARGUMENTS
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
