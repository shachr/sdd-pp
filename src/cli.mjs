// textkit command-line core (capabilities cli, stats-cli): run(argv, io) -> exit code.
// io = { stdout, stderr, readStdin, env }; streams only need write(), readStdin() returns all input as a string.
import { slugify } from './slugify.mjs';
import { readingMinutes, sentenceCount, wordCount } from './stats.mjs';

const OK = 0;
const USAGE_ERROR = 2;

const COMMANDS = {
  slugify(args, io) {
    const text = args.length ? args.join(' ') : io.readStdin().replace(/\r?\n$/, '');
    io.stdout.write(`${slugify(text)}\n`);
    return OK;
  },
  stats(args, io) {
    const unknown = args.find((a) => a !== '--json');
    if (unknown !== undefined) return usageError(io, `stats: unknown option: ${unknown}`);
    const text = io.readStdin();
    const words = wordCount(text);
    io.stdout.write(`words: ${words}\nsentences: ${sentenceCount(text)}\nreading time: ${readingMinutes(text)} min\n`);
    return OK;
  },
};

// Feature flag stats-cli: `stats` stays dark (an unknown command) until TEXTKIT_STATS=1.
const STATS_FLAG = 'TEXTKIT_STATS';
const visible = (name, io) => name !== 'stats' || io.env?.[STATS_FLAG] === '1';
const commandNames = (io) => Object.keys(COMMANDS).filter((n) => visible(n, io));

function usageError(io, message) {
  io.stderr.write(`${message ? `${message}\n` : ''}usage: textkit <command> [text]\ncommands: ${commandNames(io).join(', ')}\n`);
  return USAGE_ERROR;
}

export function run(argv, io) {
  const [name, ...args] = argv;
  if (name === undefined) return usageError(io);
  if (!Object.hasOwn(COMMANDS, name) || !visible(name, io)) return usageError(io, `unknown command: ${name}`);
  return COMMANDS[name](args, io);
}
