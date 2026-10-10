const MINOR_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);

const isWord = (item) => item !== '' && !item.startsWith(' ');
const capitalise = (word) => word[0].toUpperCase() + word.slice(1).toLowerCase();

export function toTitleCase(text) {
  if (typeof text !== 'string') {
    throw new TypeError(`text must be a string, got ${typeof text}`);
  }
  const items = text.split(/( +)/);
  const wordCount = items.filter(isWord).length;
  let position = 0;
  return items
    .map((item) => {
      if (!isWord(item)) return item;
      position += 1;
      const inside = position > 1 && position < wordCount;
      return inside && MINOR_WORDS.has(item.toLowerCase()) ? item.toLowerCase() : capitalise(item);
    })
    .join('');
}
