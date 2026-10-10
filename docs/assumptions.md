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

## Free local reviewer (Ollama)

- Ollama v0.40.2 (MIT) installed user-local at `~/.local/ollama` (CPU-only libraries extracted; no root).
  `ollama pull` failed on this box (`redirect target not allowed: …r2.cloudflarestorage.com resolves to non-public
  198.18.0.1` - the sandbox DNS maps the model CDN to a private IP, which Ollama refuses), so the open-weight
  GGUF `Qwen/Qwen2.5-Coder-3B-Instruct-GGUF` (`q4_k_m`, Apache-2.0) was downloaded from Hugging Face and
  registered with `ollama create qwen2.5-coder:3b` using an explicit ChatML template (the GGUF's Jinja template
  produced empty output).
- 3B, not 7B: the box has 8 CPUs, 15 GiB RAM but only ~3 GiB available, no GPU. A 7B Q4 model needs ~5 GB.
- Runner `ollama` (`scripts/runners/ollama.mjs`) calls the local HTTP API (`/api/generate`, `num_ctx` 8192)
  rather than `ollama run`, which emitted only terminal control codes when piped. `codex exec --oss` was not
  used (direct runner was simpler and needs no Codex config).
- Plain models have no tools, so runners with `inlineContext: true` get the proposal, deltas, the tool's design/plan, tasks and
  the full `git diff` pasted into the prompt. Fine for PR-sized changes; large diffs will overflow `num_ctx`
  (the runner warns).
- Review quality from the 3B model is weak (see `example/.../execution/reviews/triage.md`): one run copied the
  format placeholder, two runs reported Critical findings that were false. Treat it as a smoke-test reviewer.
