/**
 * Turn a free-text phrase into a camelCase identifier.
 * Behaviour: openspec/specs/casing/spec.md
 */
export function camelCase(text) {
  return String(text)
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)) // a lone combining mark is not a word
    .map((word, i) => {
      if (i === 0) return word.toLowerCase();
      const [first, ...rest] = word; // code points, so letters outside the BMP stay whole
      return first.toUpperCase() + rest.join('').toLowerCase();
    })
    .join('');
}
