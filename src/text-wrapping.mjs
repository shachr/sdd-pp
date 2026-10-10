export function wrapText(text, width) {
  return text.split('\n').flatMap((paragraph) => wrapParagraph(paragraph, width));
}

function wrapParagraph(paragraph, width) {
  const lines = [];
  let line = '';
  for (const word of paragraph.split(/ +/).filter(Boolean)) {
    if (line === '') line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  lines.push(line);
  return lines;
}
