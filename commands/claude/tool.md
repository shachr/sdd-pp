---
description: "Show the change's execution tool, or set a per-change override (--set) before its design session"
argument-hint: <change-id> [--set ai-hero|superpowers]
allowed-tools: Bash(node .openspec-handoff/scripts/*)
---

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs tool $ARGUMENTS
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
