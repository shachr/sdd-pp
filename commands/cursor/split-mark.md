---
name: /split-mark
id: split-mark
category: Workflow
description: "Mark a slice in-progress (or planned) in the parent's slices.md - commit it on main (usage: /split-mark <parent-id> <slice-id> <in-progress|planned>)"
---

Arguments: <parent-id> <slice-id> <in-progress|planned> - as given after the command.

Run this one command from the project root and show its output verbatim:

```bash
node .openspec-handoff/scripts/sdd.mjs split mark <arguments>
```

Do nothing else: no extra checks, no fixes, no follow-up commands. If it exits non-zero, say so and stop; the output says what failed.
