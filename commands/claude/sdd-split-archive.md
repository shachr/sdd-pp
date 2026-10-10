---
description: "Archive a split parent last: stops if a slice is not archived, marks slices done, final loss check, then openspec archive <parent> --skip-specs -y"
argument-hint: <parent-id>
allowed-tools: Bash(node .openspec-handoff/scripts/*)
---

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs split archive $ARGUMENTS
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
