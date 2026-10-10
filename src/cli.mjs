// textkit command-line core (capability cli): run(argv, io) -> exit code.
// io = { stdout, stderr, readStdin, env }; streams only need write(), readStdin() returns all input as a string.
import { slugify } from './slugify.mjs';

const OK = 0;

const COMMANDS = {
  slugify(args, io) {
    const text = args.length ? args.join(' ') : io.readStdin().replace(/\r?\n$/, '');
    io.stdout.write(`${slugify(text)}\n`);
    return OK;
  },
};

export function run(argv, io) {
  const [name, ...args] = argv;
  return COMMANDS[name](args, io);
}
