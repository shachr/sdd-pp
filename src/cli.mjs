// textkit command-line core (capability cli): run(argv, io) -> exit code.
// io = { stdout, stderr, stdin, env }; streams only need write(). Later slices add one entry to COMMANDS.
import { slugify } from './slugify.mjs';

const COMMANDS = {
  slugify(args, io) {
    io.stdout.write(`${slugify(args.join(' '))}\n`);
    return 0;
  },
};

export function run(argv, io) {
  const [name, ...args] = argv;
  return COMMANDS[name](args, io);
}
