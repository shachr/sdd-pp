Summary: [add-text-stats] add-text-stats-core - Library functions that measure a text
Issue type: Story
Labels: openspec, split-add-text-stats
Depends on: none

Description:
Library functions that measure a text

Behaviour: openspec/changes/add-text-stats-core/specs/ (the slice's delta - the only place behaviour is written).
Parent plan: openspec/changes/add-text-stats/slices.md

Start: node .openspec-handoff/scripts/split.mjs mark add-text-stats add-text-stats-core in-progress (commit it on main), then git switch -c change/add-text-stats-core main, the slice's design session and /handoff add-text-stats-core.
Size: line estimate after planning (/spec-check add-text-stats-core), budget ~300 lines of code + tests.
Done when: /opsx:verify add-text-stats-core passes and /opsx:archive add-text-stats-core is committed in the slice's own PR with its code, merged to main.
