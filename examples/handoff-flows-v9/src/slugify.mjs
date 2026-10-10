/**
 * Turn a title into a URL slug: lowercase ASCII letters and digits joined by single dashes.
 * Accented Latin letters are folded to their base letter ("Café" -> "cafe").
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  if (typeof text !== 'string') throw new TypeError('slugify: text must be a string');
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
