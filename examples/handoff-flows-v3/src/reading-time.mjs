const DEFAULT_WORDS_PER_MINUTE = 200;

// A word is a whitespace-separated run with at least one letter or digit (GLOSSARY.md: Word).
function countWords(text) {
  return String(text).split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

export function readingTime(text, { wordsPerMinute = DEFAULT_WORDS_PER_MINUTE } = {}) {
  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) {
    throw new RangeError(`wordsPerMinute must be a finite number greater than 0, got ${wordsPerMinute}`);
  }
  const words = countWords(text);
  return Math.ceil(words / wordsPerMinute);
}
