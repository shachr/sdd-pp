---
name: /tool
id: tool
category: Workflow
description: "Show the change's execution tool, or set a per-change override (--set) before its design session (usage: /tool <change-id> [--set ai-hero|superpowers])"
---

Arguments: <change-id> [--set ai-hero|superpowers] - as given after the command.

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs tool <arguments>
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
