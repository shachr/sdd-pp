// textkit command-line core (capabilities cli, stats-cli): run(argv, io) -> exit code.
// io = { stdout, stderr, readStdin, env }; streams only need write(), readStdin() returns all input as a string.
import { slugify } from './slugify.mjs';
import { sentenceCount, wordCount } from './stats.mjs';

const OK = 0;
const USAGE_ERROR = 2;

const COMMANDS = {
  slugify(args, io) {
    const text = args.join(' ');
    if (!text) return usageError(io, 'slugify: missing text');
    io.stdout.write(`${slugify(text)}\n`);
    return OK;
  },
  stats(args, io) {
    const unknown = args.find((a) => a !== '--json');
    if (unknown !== undefined) return usageError(io, `stats: unknown option: ${unknown}`);
    const text = io.readStdin();
    const counts = { words: wordCount(text), sentences: sentenceCount(text) };
    io.stdout.write(args.includes('--json') ? `${JSON.stringify(counts)}\n` : `words: ${counts.words}\nsentences: ${counts.sentences}\n`);
    return OK;
  },
};

// Feature flag stats-cli: the stats command is off unless TEXTKIT_STATS_CLI is "1" (removed by slice remove-stats-cli-flag).
function availableCommands(env) {
  return Object.keys(COMMANDS).filter((name) => name !== 'stats' || env?.TEXTKIT_STATS_CLI === '1');
}

function usageError(io, message) {
  io.stderr.write(`${message ? `${message}\n` : ''}usage: textkit <command> [text]\ncommands: ${availableCommands(io.env).join(', ')}\n`);
  return USAGE_ERROR;
}

export function run(argv, io) {
  const [name, ...args] = argv;
  if (name === undefined) return usageError(io);
  if (!availableCommands(io.env).includes(name)) return usageError(io, `unknown command: ${name}`);
  return COMMANDS[name](args, io);
}
