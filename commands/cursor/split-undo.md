---
name: /split-undo
id: split-undo
category: Workflow
description: "Undo a split: restore the original change from split_commit and remove the slice folders (refuses with archived slices; in-progress slices need --force); nothing is committed (usage: /split-undo <parent-id> [--force])"
---

Arguments: <parent-id> [--force] - as given after the command.

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs split undo <arguments>
```

Do nothing else: no extra checks, no fixes, no follow-up commands (do not add --force yourself, do not commit). If it exits non-zero, say so and stop; the output says what failed.
