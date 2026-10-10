/**
 * Count the words in a text: runs of characters other than spaces, tabs and line breaks.
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (typeof text !== 'string') throw new TypeError('countWords: text must be a string');
  return text.split(/[ \t\n\r]+/).filter(Boolean).length;
}
