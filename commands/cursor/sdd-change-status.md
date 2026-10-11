---
name: /sdd-change-status
id: sdd-change-status
category: Workflow
description: "Where a change is: its steps with [done] markers, before or after the handoff (usage: /sdd-change-status <change-id>)"
---

Arguments: <change-id> - as given after the command.

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs change-status <arguments>
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
