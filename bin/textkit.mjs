#!/usr/bin/env node
import { run } from '../src/cli.mjs';

process.exitCode = run(process.argv.slice(2), { stdin: process.stdin, stdout: process.stdout, stderr: process.stderr, env: process.env });
