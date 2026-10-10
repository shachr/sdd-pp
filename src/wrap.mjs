/**
 * Wrap text into lines of at most `width` characters, breaking between words.
 * Each input line (paragraph) is wrapped on its own; runs of spaces/tabs collapse.
 * @param {string} text
 * @param {number} [width=80]
 * @returns {string}
 */
export function wordWrap(text, width = 80) {
  if (typeof text !== 'string') throw new TypeError('wordWrap: text must be a string');
  if (!Number.isInteger(width) || width < 1) throw new RangeError('wordWrap: width must be a positive integer');
  return text
    .split('\n')
    .map((paragraph) => wrapParagraph(paragraph, width))
    .join('\n');
}

function wrapParagraph(paragraph, width) {
  const lines = [];
  let line = '';
  for (let word of paragraph.split(/[ \t]+/).filter(Boolean)) {
    if (word.length > width) {
      if (line) lines.push(line);
      // Cut so each piece plus its hyphen fits the width; a width of 1 leaves no room for a hyphen.
      const step = width > 1 ? width - 1 : 1;
      const mark = width > 1 ? '-' : '';
      while (word.length > width) {
        lines.push(word.slice(0, step) + mark);
        word = word.slice(step);
      }
      line = word;
    } else if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  lines.push(line);
  return lines.join('\n');
}
