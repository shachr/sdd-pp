---
name: /split-archive
id: split-archive
category: Workflow
description: "Archive a split parent last: final loss check, then openspec archive <parent> --skip-specs -y (usage: /split-archive <parent-id>)"
---

Arguments: <parent-id> - as given after the command.

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs split archive <arguments>
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
