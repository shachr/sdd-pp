> Source of truth: [proposal](../../proposal.md) · [spec delta](../../specs/text-truncation/spec.md) · [execution spec](../spec.md)

# 02: truncate rejects invalid limits

**What to build:** A developer who passes a limit that is not a positive integer gets a `RangeError` straight away instead of odd output.

**Blocked by:** 01

**Status:** done

- [x] Scenarios "Zero limit" and "Fractional limit" pass
- [x] Valid limits from ticket 01 still behave the same
