Summary: [add-text-stats] add-stats-cli - A terminal command that prints a text's measurements
Issue type: Story
Labels: openspec, split-add-text-stats
Depends on: add-text-stats-core (all done)

Description:
A terminal command that prints a text's measurements

Behaviour: openspec/changes/add-stats-cli/specs/ (the slice's delta - the only place behaviour is written).
Parent plan: openspec/changes/add-text-stats/slices.md

Start: node .openspec-handoff/scripts/split.mjs mark add-text-stats add-stats-cli in-progress (commit it on main), then git switch -c change/add-stats-cli main, the slice's design session and /handoff add-stats-cli.
Size: line estimate after planning (/spec-check add-stats-cli), budget ~300 lines of code + tests.
Done when: /opsx:verify add-stats-cli passes and /opsx:archive add-stats-cli is committed in the slice's own PR with its code, merged to main.
