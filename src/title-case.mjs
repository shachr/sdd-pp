const isWord = (item) => item !== '' && !item.startsWith(' ');
const capitalise = (word) => word[0].toUpperCase() + word.slice(1).toLowerCase();

export function toTitleCase(text) {
  return text
    .split(/( +)/)
    .map((item) => (isWord(item) ? capitalise(item) : item))
    .join('');
}
