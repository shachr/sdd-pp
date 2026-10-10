/**
 * Turn a free-text phrase into a camelCase identifier.
 * Behaviour: openspec/specs/casing/spec.md
 */
export function camelCase(text) {
  return String(text)
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)) // a lone combining mark is not a word
    .map((word, i) => (i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join('');
}
