#!/usr/bin/env node
// run-tests: the project's declared test command (package.json "scripts.test"), for /sdd-slice-finish <slice> --run-tests.
// Exit: the test command's exit code (1 when it failed, so nothing is archived); 1 when no test command is declared.
// Usage: node .openspec-handoff/scripts/run-tests.mjs <slice> [--root <dir>]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findProjectRoot } from './lib/change.mjs';
import { isMain } from './lib/main.mjs';

export function testCommand(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts?.test || null; } catch { return null; }
}

function main(argv = process.argv.slice(2)) {
  const i = argv.indexOf('--root');
  const root = i >= 0 ? path.resolve(argv[i + 1]) : findProjectRoot() || process.cwd();
  const id = argv.find((a, j) => !a.startsWith('-') && argv[j - 1] !== '--root') || '<slice>';
  const cmd = testCommand(root);
  if (!cmd) {
    console.log(`slice finish ${id}: REFUSED - --run-tests: no test command declared (package.json "scripts.test") - nothing archived. Run your tests yourself and /sdd-slice-finish ${id} without --run-tests.`);
    return 1;
  }
  console.log(`slice finish ${id}: running the project's tests (npm test: ${cmd})`);
  const r = spawnSync('npm', ['test'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.log(`slice finish ${id}: REFUSED - npm test failed (exit ${r.status ?? 1}) - nothing archived. Fix the failures, then /sdd-slice-finish ${id} --run-tests again.`);
    return 1;
  }
  console.log(`slice finish ${id}: tests pass`);
  return 0;
}

if (isMain(import.meta.url)) process.exit(main());
