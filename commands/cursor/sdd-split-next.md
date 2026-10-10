---
name: /sdd-split-next
id: sdd-split-next
category: Workflow
description: "Split change status: ready / parallel-safe slices; writes tickets for READY slices (usage: /sdd-split-next <parent-id>)"
---

Arguments: <parent-id> - as given after the command.

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs split next <arguments>
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
