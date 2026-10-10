# Triage labels (OpenSpec change folders)

AI Hero's skills name five triage roles. Here the "label" is the `Status:` line near the top of a ticket in
`openspec/changes/<change-id>/execution/tickets/` (see `issue-tracker.md`).

| Role (mattpocock/skills) | Status value | Meaning |
|---|---|---|
| `needs-triage` | `needs-triage` | not evaluated yet |
| `needs-info` | `needs-info` | waiting for more information |
| `ready-for-agent` | `ready-for-agent` | fully specified; an agent can take it |
| `ready-for-human` | `ready-for-human` | needs a person to implement |
| `wontfix` | `wontfix` | will not be done |

A finished ticket is `Status: done` (with its checkboxes ticked in the same commit).
