---
description: "Finish check for a change: openspec validate <id> --strict, then check-handoff <id> --expect-complete"
argument-hint: <change-id>
allowed-tools: Bash(node .openspec-handoff/scripts/*)
---

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs check $ARGUMENTS
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
