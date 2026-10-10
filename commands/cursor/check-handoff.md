---
name: /check-handoff
id: check-handoff
category: Workflow
description: "Finish check for a change: openspec validate <id> --strict, then check-handoff <id> --expect-complete (usage: /check-handoff <change-id>)"
---

Arguments: <change-id> - as given after the command.

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs check <arguments>
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
