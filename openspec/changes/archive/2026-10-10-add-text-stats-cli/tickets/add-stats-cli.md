Summary: [add-text-stats-cli] add-stats-cli - textkit stats command (text and JSON), behind the stats-cli flag
Issue type: Story
Labels: openspec, split-add-text-stats-cli, flag-stats-cli
Depends on: add-text-stats-core, add-cli (all archived)
Estimate: ~135 lines (code + tests)

Description:
textkit stats command (text and JSON), behind the stats-cli flag

OpenSpec change: openspec/changes/add-stats-cli/ (proposal.md, specs/) - the delta is the only place behaviour is written.
Parent plan: openspec/changes/add-text-stats-cli/slices.md
Feature flag: stats-cli (user-visible behaviour stays off until the flag is turned on; cleanup slice removes it)

Requirements (names only):
- Requirement: Stats command
- Requirement: Stats JSON output
- Requirement: Stats command flag

Done when: /opsx:verify add-stats-cli passes and the change is archived (/opsx:archive add-stats-cli).
Start: git switch -c change/add-stats-cli main, then the slice's design session and /handoff add-stats-cli.
