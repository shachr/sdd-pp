/**
 * Wrap text into lines of at most `width` characters, breaking between words.
 * Each input line (paragraph) is wrapped on its own; runs of spaces/tabs collapse.
 * @param {string} text
 * @param {number} [width=80]
 * @returns {string}
 */
export function wordWrap(text, width = 80) {
  return text
    .split('\n')
    .map((paragraph) => wrapParagraph(paragraph, width))
    .join('\n');
}

function wrapParagraph(paragraph, width) {
  const lines = [];
  let line = '';
  for (const word of paragraph.split(/[ \t]+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  lines.push(line);
  return lines.join('\n');
}
