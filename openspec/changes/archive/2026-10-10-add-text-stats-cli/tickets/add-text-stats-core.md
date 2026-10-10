Summary: [add-text-stats-cli] add-text-stats-core - Count words and sentences in a text (library)
Issue type: Story
Labels: openspec, split-add-text-stats-cli
Depends on: none (all archived)
Estimate: ~100 lines (code + tests)

Description:
Count words and sentences in a text (library)

OpenSpec change: openspec/changes/add-text-stats-core/ (proposal.md, specs/) - the delta is the only place behaviour is written.
Parent plan: openspec/changes/add-text-stats-cli/slices.md

Requirements (names only):
- Requirement: Word count
- Requirement: Sentence count

Done when: /opsx:verify add-text-stats-core passes and the change is archived (/opsx:archive add-text-stats-core).
Start: git switch -c change/add-text-stats-core main, then the slice's design session and /handoff add-text-stats-core.
