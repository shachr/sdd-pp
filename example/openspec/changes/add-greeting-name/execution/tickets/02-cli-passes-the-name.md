# 02: CLI passes the name through

> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/greeting/spec.md) · [execution spec](../spec.md)

**What to build:** `greet Ada` on the command line prints the named greeting, by passing the first argument to `greet()`.

**Blocked by:** 01

**Status:** done

- [x] CLI test spawning `node src/cli.mjs Ada` sees the named greeting on stdout and exit status 0
- [x] Running with no arguments is unchanged (CLI test)
