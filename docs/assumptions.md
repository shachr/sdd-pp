# Assumptions

Made autonomously while the user was unavailable. Each is cheap to change; the file to edit is named.

## Tool versions and names (verified 2026-10-09 PT)

- **OpenSpec** `@fission-ai/openspec` **1.14.1** (latest on npm). Custom schemas are the `schema.yaml` format
  validated by its zod `SchemaYamlSchema` (`name`, `version`, `description`, `artifacts[] {id, generates,
  description, template, instruction, requires}`, `apply {requires, tracks, instruction}`), discovered from
  `openspec/schemas/<name>/` in the project. All schema behavior here was validated with the real CLI.
- OpenSpec 1.14.1 has **no `openspec verify` CLI command**. Verification is the `/opsx:verify` agent workflow
  (opt-in through `openspec config profile`); the CLI offers `openspec validate [--strict]`. The brief's
  "`openspec verify`" is treated as `/opsx:verify` + `validate --strict`.
- **AI Hero** = `mattpocock/skills` (commit 49dd158). Real names: `grill-with-docs`, **`to-spec`** (brief said
  to-spec/to-prd), **`to-tickets`** (brief said to-tickets/to-issues), `implement`, `implement-spec`, `tdd`,
  `code-review`. Most are `disable-model-invocation: true`, so the wrapper allows "user types the slash
  command" or "read SKILL.md and follow it".
- **Superpowers** = `obra/superpowers` (commit bb92a77). Real names match the brief: `brainstorming`,
  `writing-plans`, `executing-plans`, `subagent-driven-development`, `requesting-code-review` (+ `code-reviewer.md`
  template), `finishing-a-development-branch`, `using-git-worktrees`.
- The upstream skills are **not vendored**; users install them from their repos.

## Workflow

- `tasks.md` comes *after* the execution tool's breakdown and only links to it (decisions G2/G3).
- `design.md` stays required (as in upstream `spec-driven`); tiny changes write a two-line design.
- AI Hero's project-level outputs (ADRs, glossary/CONTEXT.md) are not redirected; Superpowers' git-ignored
  SDD scratch (`.superpowers/sdd/`) is not redirected; only their durable change-specific outputs are.
- writing-plans' "copy Global Constraints verbatim" is overridden to "link the requirement name" to keep
  one source of truth.
- Reviews may quote requirements; `execution/reviews/` is exempt from the duplicate-text check.
- Duplicate detection is line-based (normalised requirement description and WHEN/THEN lines ≥ 25 chars).
  Paraphrases are not caught; it's a guardrail, not a proof.

## Models and runners (`config/handoff-review.json`)

- Model ids (`claude-sonnet-4-5`, `claude-opus-4-1`, `gpt-5`, `gpt-5-codex`, `gemini-2.5-pro`) are examples
  for the mapping; edit `reviewerFor` / `defaultReviewer` to your accounts.
- "Different model" = different after normalisation (lowercase, no `provider/` prefix, no `-YYYYMMDD` /
  `-latest` suffix) **and**, by default, different family (`forbidSameFamily: true`).
- Runner command lines (`claude -p --model … --permission-mode plan`, `codex exec --model … --sandbox
  read-only -`, `cursor-agent -p --model … --output-format text <prompt>`) follow each CLI's documented
  headless mode but were **not executed** here: none of those CLIs is installed on this machine (and no
  credentials). Runner execution is tested with a local fake runner; `--emit-prompt` is the no-CLI fallback.

## Environment

- Node ≥ 18.17 (developed on 20.19.2); bash for `install.sh`; git required for `base_ref` size/diff checks
  (`--no-git` skips them).
- The example project lives inside this toolkit repo, so its `handoff.md` uses `diff_paths` to scope size
  checks; standalone projects usually omit it.
- Symlinks in `example/` (schema, scripts, config) point into the toolkit so there's one copy; tests copy the
  example with symlinks dereferenced.
- In the example change, `tasks.md` items 2.1 (adversarial review) and 2.2 (`/opsx:verify`) are deliberately
  left unticked: only the review *prompt* was emitted (no reviewer CLI here), and `/opsx:verify` is an agent
  workflow that wasn't run. `openspec validate --strict` and `check-handoff` do pass.
