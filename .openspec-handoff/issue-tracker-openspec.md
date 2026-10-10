# Issue tracker: OpenSpec change folder (Other)

Work for this repo is planned as OpenSpec changes (`openspec/changes/<change-id>/`). The OpenSpec spec deltas
in each change are the requirements; this file tells the engineering skills where their spec and tickets go.

## Conventions

- One feature = one active OpenSpec change. Its folder is the "tracker" for that feature:
  `openspec/changes/<change-id>/`. Find the active change with `openspec list --json`; if several are active,
  use the one named in the request or in `handoff.md`.
- There is no separate spec document: the change's `proposal.md` + `specs/**/spec.md` delta ARE the spec. Do not run `to-spec` for an OpenSpec change.
- Design decisions (from `grill-with-docs`) go to `openspec/changes/<change-id>/execution/design.md`.
- Tickets (from `to-tickets`) are one file per ticket at `openspec/changes/<change-id>/execution/tickets/<NN>-<slug>.md`,
  numbered from `01` in dependency order, never a single combined file. Use the local ticket template from `to-tickets`.
- Triage state is a `Status:` line near the top of each ticket (role strings in `triage-labels.md`); `done` when finished.
- Comments append to the bottom of the ticket under `## Comments`.
- Requirements are never restated or paraphrased in these files: cite requirements and scenarios by name with a link to `../../specs/<capability>/spec.md`.
- Nothing for a change goes in `.scratch/`, GitHub/GitLab issues, or anywhere outside its change folder.

## When a skill says "publish to the issue tracker"

Write the file under `openspec/changes/<change-id>/execution/` as above (create `execution/tickets/` if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path under `openspec/changes/<change-id>/execution/tickets/`.

## Closing work

A ticket is resolved by setting `Status: done` and ticking its line in `openspec/changes/<change-id>/tasks.md` in the same commit.
