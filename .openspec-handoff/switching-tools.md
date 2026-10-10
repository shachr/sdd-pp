# Switching execution tools mid-change

Rare. The execution tool is picked in the setup phase (`install.sh --tool`, `.openspec-handoff/project.json`)
or overridden per change at proposal time (`execution-tool.mjs <id> --set <tool>`, recorded as `tool:` front
matter in the session file). Its design session runs before `proposal.md` is written, and everything after it
reads that session's output: AI Hero's to-spec reads `execution/grill.md`, Superpowers' writing-plans reads
`execution/brainstorm.md`. The two are not interchangeable (a grilling record vs an approved written design with
builder-check piles), so a switch means **redoing the session**, not converting the file.

## What a switch costs

| State of the change | What to redo |
|---|---|
| Session done, no `handoff.md` | Delete the old session file, `execution-tool.mjs <id> --set <new>`, run the new tool's design session. Re-read `proposal.md` and the delta against its output (they should not change unless the new session finds new behaviour). |
| Handed off, planning done, no code | Also delete `handoff.md`, `tasks.md` and the planning output (`execution/spec.md`, `execution/tickets/` or `execution/plan-<id>.md`, `execution/spec-check.md`), then `/handoff` again. |
| Code written | Do not switch. Finish with the current tool, or abandon the change and open a new one. |

## Guard rails

- `execution-tool.mjs <id> --set <other>` refuses while the other tool's session file or a `handoff.md` naming the
  other tool exists.
- `check-handoff` fails when both session files exist, when `handoff.md`'s `tool` differs from the session file,
  when the session file's `tool:` front matter does not match its name, or when the session file is missing.
- Keep the old session in git history (the commit that deletes it), not in the change folder.
