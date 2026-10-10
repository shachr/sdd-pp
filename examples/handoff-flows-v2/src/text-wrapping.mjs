export function wrapText(text, width) {
  if (!Number.isInteger(width) || width < 1) {
    throw new RangeError(`width must be a positive integer, got ${width}`);
  }
  return text.split('\n').flatMap((paragraph) => wrapParagraph(paragraph, width));
}

function wrapParagraph(paragraph, width) {
  const lines = [];
  let line = '';
  for (const word of paragraph.split(/ +/).filter(Boolean)) {
    if (line !== '' && line.length + 1 + word.length <= width) {
      line += ` ${word}`;
      continue;
    }
    if (line !== '') lines.push(line);
    line = word;
    while (line.length > width) {
      lines.push(line.slice(0, width));
      line = line.slice(width);
    }
  }
  lines.push(line);
  return lines;
}
