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

- There is no `tasks.md` (v4, decisions §9): progress is the execution tool's own tracking (AI Hero ticket `Status:` + checkboxes, Superpowers plan step checkboxes), enforced by the tool itself (decisions §15); `check-handoff --expect-complete` can still read it, e.g. in CI.
- There is no OpenSpec `design.md` (v2, decisions C1, D1): design is the execution tool's (v3: the design session file `execution/grill.md` / `execution/brainstorm.md`, then `execution/spec.md` + tickets or the plan).
- Whether an agent following to-spec / brainstorming keeps their user-facing sections reference-only depends on it honouring `docs/agents/issue-tracker.md` and the wrapper; the lint only warns.
- `planningHome.defaultSchema` / the `openspec new change` spinner always says `spec-driven` (hard-coded in OpenSpec 1.14.1); the change itself gets `handoff-driven` from `openspec/config.yaml`.
- Paraphrase detection is lexical (token overlap), not semantic: it catches restated rules that reuse the delta's words and warns on looser overlap, but a fully reworded paraphrase can pass. Its findings are warnings (v2.1, D4); the wrapper templates and review carry the rest.
- AI Hero's project-level outputs (ADRs, glossary/CONTEXT.md) are not redirected; Superpowers' git-ignored
  SDD scratch (`.superpowers/sdd/`) is not redirected; only their durable change-specific outputs are.
- writing-plans' "copy Global Constraints verbatim" is overridden to "link the requirement name" to keep
  one source of truth.
- Reviews may quote requirements; `execution/reviews/` is exempt from the duplicate-text check.
- Duplicate detection is line-based (normalised requirement description and WHEN/THEN lines ≥ 25 chars).
  Paraphrases are not caught; it's a guardrail, not a proof.

## Environment

- Node ≥ 18.17 (developed on 20.19.2); the installer is a Node CLI (`bin/sdd-pp.mjs`, no bash); git required for `base_ref` size/diff checks
  (`--no-git` skips them).
- The example project lives inside this toolkit repo, so its `handoff.md` uses `diff_paths` to scope size
  checks; standalone projects usually omit it.
- Symlinks in `example/` (schema, scripts, config) point into the toolkit so there's one copy; tests copy the
  example with symlinks dereferenced.
- The example change's `execution/reviews/code-review.md` is illustrative (no review was run for the example); `openspec validate --strict` and `check-handoff --expect-complete` pass.
