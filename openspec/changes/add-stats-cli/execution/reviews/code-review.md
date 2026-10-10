> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/stats-cli/spec.md)

# Code review: add-stats-cli - self-review

Label: **self-review** (Grok Bot reviewed its own diff; no fresh session of the coding agent exists in this harness).

- Spec: one test per delta scenario, named after it (Stats summary, Stats from a file, JSON flag, Unknown option, Unreadable file); bin wiring checked by hand (stdin summary; missing file -> exit 2 with the file name and usage).
- Standards: `run` is pure over `io`; no dependencies.
- Findings: none.
