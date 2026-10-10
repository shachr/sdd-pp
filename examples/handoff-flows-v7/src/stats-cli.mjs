// textkit-stats: a text's measurements from a file or standard input (capability stats-cli).
import { textStats } from './stats.mjs';

const USAGE = 'usage: textkit-stats [--json] [file]';

export function run(argv, io) {
  const fail = (msg) => { io.stderr.write(`${msg ? `${msg}\n` : ''}${USAGE}\n`); return 2; };
  const json = argv.includes('--json');
  const rest = argv.filter((a) => a !== '--json');
  const bad = rest.find((a) => a.startsWith('-'));
  if (bad) return fail(`unknown option: ${bad}`);
  let text;
  if (rest.length) {
    try { text = io.readFile(rest[0]); } catch { return fail(`cannot read file: ${rest[0]}`); }
  } else text = io.readStdin();
  const s = textStats(text);
  io.stdout.write(json ? `${JSON.stringify(s)}\n` : `words: ${s.words}\nsentences: ${s.sentences}\nreading time: ${s.readingMinutes} min\n`);
  return 0;
}
