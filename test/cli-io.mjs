// Shared test helper (not a test file): run the CLI core with fake streams.
import { run } from '../src/cli.mjs';

/** Returns { code, out, err }. */
export function cli(argv, { stdin = '', env = {} } = {}) {
  let out = ''; let err = '';
  const code = run(argv, {
    stdout: { write: (s) => { out += s; } },
    stderr: { write: (s) => { err += s; } },
    readStdin: () => stdin,
    env,
  });
  return { code, out, err };
}
