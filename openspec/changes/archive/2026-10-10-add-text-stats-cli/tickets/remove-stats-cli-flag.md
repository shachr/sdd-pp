Summary: [add-text-stats-cli] remove-stats-cli-flag - Release the stats sub-command by removing its flag
Issue type: Story
Labels: openspec, split-add-text-stats-cli
Depends on: add-stats-cli (all done)

Description:
Release the stats sub-command by removing its flag

Behaviour: openspec/changes/remove-stats-cli-flag/specs/ (the slice's delta - the only place behaviour is written).
Parent plan: openspec/changes/add-text-stats-cli/slices.md
Removes feature flag: stats-cli

Start: node .openspec-handoff/scripts/split.mjs mark add-text-stats-cli remove-stats-cli-flag in-progress (commit it on main), then git switch -c change/remove-stats-cli-flag main, the slice's design session and /handoff remove-stats-cli-flag.
Size: line estimate after planning (/spec-check remove-stats-cli-flag), budget ~300 lines of code + tests.
Done when: /opsx:verify remove-stats-cli-flag passes and /opsx:archive remove-stats-cli-flag is committed in the slice's own PR with its code, merged to main.
