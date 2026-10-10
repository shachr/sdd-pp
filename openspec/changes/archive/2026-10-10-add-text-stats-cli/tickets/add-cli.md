Summary: [add-text-stats-cli] add-cli - textkit command-line tool with the slugify command and usage errors
Issue type: Story
Labels: openspec, split-add-text-stats-cli
Depends on: none (all archived)
Estimate: ~190 lines (code + tests)

Description:
textkit command-line tool with the slugify command and usage errors

OpenSpec change: openspec/changes/add-cli/ (proposal.md, specs/) - the delta is the only place behaviour is written.
Parent plan: openspec/changes/add-text-stats-cli/slices.md

Requirements (names only):
- Requirement: Slugify command
- Requirement: Command errors

Done when: /opsx:verify add-cli passes and the change is archived (/opsx:archive add-cli).
Start: git switch -c change/add-cli main, then the slice's design session and /handoff add-cli.
