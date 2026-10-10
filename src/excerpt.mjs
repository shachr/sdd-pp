const ELLIPSIS = '…';

/**
 * Shorten a text into a one-line excerpt of at most `maxLength` characters.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function excerpt(text, maxLength) {
  const line = text.replace(/\s+/g, ' ').trim();
  const chars = Array.from(line);
  if (chars.length <= maxLength) return line;
  const budget = maxLength - Array.from(ELLIPSIS).length;
  let cut = chars.slice(0, budget);
  if (chars[budget] !== ' ') {
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > 0) cut = cut.slice(0, lastSpace);
  }
  return cut.join('').replace(/[\s,;:.\-]+$/u, '') + ELLIPSIS;
}
