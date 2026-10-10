Summary: [add-text-stats-cli] remove-stats-cli-flag - Release the stats command by removing the stats-cli flag
Issue type: Story
Labels: openspec, split-add-text-stats-cli
Depends on: add-stats-cli (all archived)
Estimate: ~25 lines (code + tests)

Description:
Release the stats command by removing the stats-cli flag

OpenSpec change: openspec/changes/remove-stats-cli-flag/ (proposal.md, specs/) - the delta is the only place behaviour is written.
Parent plan: openspec/changes/add-text-stats-cli/slices.md
Removes feature flag: stats-cli

Requirements (names only):
- Remove: Stats command flag

Done when: /opsx:verify remove-stats-cli-flag passes and the change is archived (/opsx:archive remove-stats-cli-flag).
Start: git switch -c change/remove-stats-cli-flag main, then the slice's design session and /handoff remove-stats-cli-flag.
