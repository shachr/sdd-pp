Summary: [add-text-stats-cli] add-stats-cli - The stats sub-command, dark behind a flag
Issue type: Story
Labels: openspec, split-add-text-stats-cli, flag-stats-cli
Depends on: add-text-stats-core, add-cli (all done)

Description:
The stats sub-command, dark behind a flag

Behaviour: openspec/changes/add-stats-cli/specs/ (the slice's delta - the only place behaviour is written).
Parent plan: openspec/changes/add-text-stats-cli/slices.md
Feature flag: stats-cli (user-visible behaviour stays off until the cleanup slice removes the flag)

Start: node .openspec-handoff/scripts/split.mjs mark add-text-stats-cli add-stats-cli in-progress (commit it on main), then git switch -c change/add-stats-cli main, the slice's design session and /handoff add-stats-cli.
Size: line estimate after planning (/spec-check add-stats-cli), budget ~300 lines of code + tests.
Done when: /opsx:verify add-stats-cli passes and /opsx:archive add-stats-cli is committed in the slice's own PR with its code, merged to main.
