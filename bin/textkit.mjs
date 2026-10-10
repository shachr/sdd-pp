#!/usr/bin/env node
import fs from 'node:fs';
import { run } from '../src/cli.mjs';

process.exitCode = run(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  readStdin: () => fs.readFileSync(0, 'utf8'),
  env: process.env,
});
