/**
 * Case conversion: one shared word splitter, three naming styles.
 */

// Upper-case run before a Capitalised word | (optional capital +) lower/caseless letters, marks, digits | trailing upper-case run (+ digits)
const WORD = /\p{Lu}+[\p{N}]*(?=\p{Lu}[\p{Ll}\p{M}])|\p{Lu}?[\p{Ll}\p{Lo}\p{Lm}\p{M}\p{N}]+|\p{Lu}+[\p{M}\p{N}]*/gu;

/**
 * Split text into words (internal; not exported from the entry point).
 * @param {string} text
 * @returns {string[]}
 */
export function words(text) {
  if (typeof text !== 'string') throw new TypeError('case conversion: text must be a string');
  return text.match(WORD) ?? [];
}

/** @param {string} text @returns {string} words in lower case joined by "_" */
export function snakeCase(text) {
  return words(text).map((w) => w.toLowerCase()).join('_');
}

/** @param {string} text @returns {string} words in lower case joined by "-" */
export function kebabCase(text) {
  return words(text).map((w) => w.toLowerCase()).join('-');
}
