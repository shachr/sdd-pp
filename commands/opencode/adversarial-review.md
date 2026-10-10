---
description: "Adversarially review an OpenSpec change with a different model than the one that implemented it"
---

Run an adversarial review of an OpenSpec change (handoff-driven schema) using a **different model** from the implementer recorded in `handoff.md`.

Arguments: $ARGUMENTS

1. If no change id was given, run `openspec list --json` and pick the single active change; if there are several, ask which one.
2. Preview: `node .openspec-handoff/scripts/adversarial-review.mjs <change-id> --dry-run <other args>`. Show the user the summary block (tool → review skill, implementation model, reviewer model and why, runner, output path). Do not paste the whole prompt unless asked.
   - Exit 1 with "needs a different model" / "forbidSameFamily": stop and tell the user. Suggest `--reviewer-model <id>`; never work around it by editing `implementation_model`.
   - Exit 2: a usage problem (missing handoff.md → run `/handoff` first).
3. If the user passed `--dry-run`, stop here.
4. Run for real (same command without `--dry-run`). The script launches the reviewer CLI headlessly with the reviewer model and writes `openspec/changes/<id>/execution/reviews/<timestamp>-<model>.md`, then links it under `## Reviews` in `handoff.md`.
   - If the runner binary is missing, re-run with `--emit-prompt`, and tell the user to paste the prompt file into a session running the reviewer model (for Cursor: switch the model picker, then paste) and save the answer at the printed path.
5. Read the review file and summarise: verdict, then Critical and Important findings with file:line. Do not fix anything in this command; the implementer (original model) addresses findings.
