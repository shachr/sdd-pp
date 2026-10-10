/**
 * Count the words in a text: runs of characters other than spaces, tabs and line breaks.
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (typeof text !== 'string') throw new TypeError('countWords: text must be a string');
  return text.split(/[ \t\n\r]+/).filter(Boolean).length;
}

/**
 * Estimate reading time in whole minutes, rounded up.
 * @param {string} text
 * @param {number} [wordsPerMinute=200]
 * @returns {number}
 */
export function readingTime(text, wordsPerMinute = 200) {
  if (typeof text !== 'string') throw new TypeError('readingTime: text must be a string');
  if (typeof wordsPerMinute !== 'number' || !Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) {
    throw new RangeError('readingTime: wordsPerMinute must be a finite number greater than 0');
  }
  return Math.ceil(countWords(text) / wordsPerMinute);
}
