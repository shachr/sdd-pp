# textkit

Tiny text utilities. Node >= 18, ES modules, no runtime dependencies; tests with `npm test` (node:test).
Planning uses OpenSpec with the `handoff-driven` schema (`openspec/`); execution uses AI Hero or Superpowers
skills via `/handoff <id>` (see `.openspec-handoff/`).

## Agent skills

### Issue tracker

Each feature is an OpenSpec change: proposal + delta specs are the spec; design, spec and tickets live in its change folder under `execution/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root (created lazily). See `docs/agents/domain.md`.
