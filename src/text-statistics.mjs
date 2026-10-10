const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

export function countWords(text) {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return trimmed.split(/\s+/).filter((token) => HAS_LETTER_OR_DIGIT.test(token)).length;
}
