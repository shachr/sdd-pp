---
name: /adversarial-review
id: adversarial-review
category: Workflow
description: Adversarially review an OpenSpec change with a different model than the one that implemented it
---

Run an adversarial review of an OpenSpec change (handoff-driven schema) using a **different model** from the implementer recorded in `handoff.md`. Arguments after the command: `<change-id> [--dry-run] [--reviewer-model <id>] [--runner claude|codex|cursor-agent] [--emit-prompt]`.

1. If no change id was given, run `openspec list --json` and pick the single active change; if there are several, ask which one.
2. Preview: `node .openspec-handoff/scripts/adversarial-review.mjs <change-id> --dry-run <other args>`. Show the summary block (tool → review skill, implementation model, reviewer model and why, runner, output path).
   - Exit 1 ("needs a different model" / "forbidSameFamily"): stop and tell the user; suggest `--reviewer-model <id>`. Never edit `implementation_model` to get around it.
   - Exit 2: usage problem (missing handoff.md → run `/handoff` first).
3. If `--dry-run` was passed, stop here.
4. Run for real (same command without `--dry-run`). The reviewer runs headlessly (default runner for non-Claude/GPT models is `cursor-agent -p --model <reviewer>`), output lands in `openspec/changes/<id>/execution/reviews/`, and handoff.md gets a `## Reviews` link.
   - If the runner binary is missing, re-run with `--emit-prompt`; tell the user to switch the Cursor model picker to the reviewer model, open a new chat, paste the prompt file, and save the answer at the printed path.
5. Read the review file and summarise the verdict and Critical/Important findings with file:line. Do not fix findings in this command.
