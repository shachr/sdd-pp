Summary: [add-text-stats-cli] add-cli - The textkit command-line tool with slugify and usage errors
Issue type: Story
Labels: openspec, split-add-text-stats-cli
Depends on: none

Description:
The textkit command-line tool with slugify and usage errors

Behaviour: openspec/changes/add-cli/specs/ (the slice's delta - the only place behaviour is written).
Parent plan: openspec/changes/add-text-stats-cli/slices.md

Start: node .openspec-handoff/scripts/split.mjs mark add-text-stats-cli add-cli in-progress (commit it on main), then git switch -c change/add-cli main, the slice's design session and /handoff add-cli.
Size: line estimate after planning (/spec-check add-cli), budget ~300 lines of code + tests.
Done when: /opsx:verify add-cli passes and /opsx:archive add-cli is committed in the slice's own PR with its code, merged to main.
