// Length facts about a text: words, sentences, reading time estimate (capability text-stats).
const hasWord = (part) => /[\p{L}\p{N}]/u.test(part);

export function wordCount(text) {
  return String(text).split(/\s+/).filter(hasWord).length;
}

export function sentenceCount(text) {
  return String(text).split(/[.!?]+/).filter(hasWord).length;
}

const WORDS_PER_MINUTE = 200;

export function readingMinutes(text) {
  return Math.ceil(wordCount(text) / WORDS_PER_MINUTE);
}

export function textStats(text) {
  return { words: wordCount(text), sentences: sentenceCount(text), readingMinutes: readingMinutes(text) };
}
