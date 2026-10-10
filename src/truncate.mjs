const ELLIPSIS = '\u2026';

export function truncate(text, maxLength) {
  if (!Number.isInteger(maxLength) || maxLength < 1) {
    throw new RangeError(`maxLength must be a positive integer, got ${maxLength}`);
  }
  if (text.length <= maxLength) return text;
  let kept = text.slice(0, maxLength - 1);
  const lastSpace = kept.lastIndexOf(' ');
  if (lastSpace !== -1) kept = kept.slice(0, lastSpace);
  return kept.trimEnd() + ELLIPSIS;
}
