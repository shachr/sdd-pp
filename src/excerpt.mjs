/**
 * Shorten a text into a one-line excerpt of at most `maxLength` characters.
 * @param {string} text
 * @param {number} maxLength
 * @param {{ ellipsis?: string }} [options] ellipsis appended when the text is cut (default "…")
 * @returns {string}
 */
export function excerpt(text, maxLength, { ellipsis = '…' } = {}) {
  if (typeof text !== 'string') throw new TypeError('excerpt: text must be a string');
  const ellipsisLength = Array.from(ellipsis).length;
  if (!Number.isInteger(maxLength) || maxLength < 0 || maxLength < ellipsisLength) {
    throw new RangeError(`excerpt: maxLength must be an integer >= ${ellipsisLength} (the ellipsis length)`);
  }
  const line = text.replace(/\s+/g, ' ').trim();
  const chars = Array.from(line);
  if (chars.length <= maxLength) return line;
  const budget = maxLength - ellipsisLength;
  let cut = chars.slice(0, budget);
  if (chars[budget] !== ' ') {
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > 0) cut = cut.slice(0, lastSpace);
  }
  return cut.join('').replace(/[\s,;:.\-]+$/u, '') + ellipsis;
}
