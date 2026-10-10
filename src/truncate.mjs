/**
 * Shorten text to at most `maxLength` UTF-16 code units for previews,
 * marking the cut with `ellipsis` (counted towards the limit).
 * Behaviour: openspec/specs/truncation/spec.md
 */
export function truncate(text, maxLength, { ellipsis = '…' } = {}) {
  if (!Number.isInteger(maxLength) || maxLength < 1 || maxLength < ellipsis.length) {
    throw new RangeError(`maxLength must be a whole number >= max(1, ellipsis length), got ${maxLength}`);
  }
  const s = String(text);
  if (s.length <= maxLength) return s;
  const room = maxLength - ellipsis.length;
  let kept = s.slice(0, room);
  const cutMidWord = !/\s/.test(s[room] ?? ' ');
  if (cutMidWord && /\s/.test(kept)) kept = kept.slice(0, kept.search(/\s\S*$/));
  return kept.trimEnd() + ellipsis;
}
