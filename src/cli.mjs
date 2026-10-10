// textkit command-line core (capability cli): run(argv, io) -> exit code.
// io = { stdout, stderr, readStdin, env }; streams only need write(), readStdin() returns all input as a string.
import { slugify } from './slugify.mjs';

const OK = 0;
const USAGE_ERROR = 2;

const COMMANDS = {
  slugify(args, io) {
    const text = args.length ? args.join(' ') : io.readStdin().replace(/\r?\n$/, '');
    io.stdout.write(`${slugify(text)}\n`);
    return OK;
  },
};

function usageError(io, message) {
  io.stderr.write(`${message ? `${message}\n` : ''}usage: textkit <command> [text]\ncommands: ${Object.keys(COMMANDS).join(', ')}\n`);
  return USAGE_ERROR;
}

export function run(argv, io) {
  const [name, ...args] = argv;
  if (name === undefined) return usageError(io);
  if (!Object.hasOwn(COMMANDS, name)) return usageError(io, `unknown command: ${name}`);
  return COMMANDS[name](args, io);
}
