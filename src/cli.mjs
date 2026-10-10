// textkit command-line core (capability cli): run(argv, io) -> exit code.
// io = { stdout, stderr, stdin, env }; streams only need write(). Later slices add one entry to COMMANDS.
import { slugify } from './slugify.mjs';

const USAGE = 'usage: textkit <command> [text]\ncommands: slugify\n';
const OK = 0;
const USAGE_ERROR = 2;

function usageError(io, message) {
  io.stderr.write(`${message ? `${message}\n` : ''}${USAGE}`);
  return USAGE_ERROR;
}

const COMMANDS = {
  slugify(args, io) {
    const text = args.join(' ');
    if (!text) return usageError(io, 'slugify: missing text');
    io.stdout.write(`${slugify(text)}\n`);
    return OK;
  },
};

export function run(argv, io) {
  const [name, ...args] = argv;
  if (name === undefined) return usageError(io);
  if (!Object.hasOwn(COMMANDS, name)) return usageError(io, `unknown command: ${name}`);
  return COMMANDS[name](args, io);
}
