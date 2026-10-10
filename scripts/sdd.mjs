#!/usr/bin/env node
// sdd: one entry point for the workflow's checks, so nobody types the individual scripts.
// The agent slash commands (/sdd-split-apply, /sdd-split-next, /sdd-split-archive, /sdd-split-start, /sdd-slice-finish, /sdd-split-undo,
// /sdd-next-steps, /sdd-tool) and the `sdd-pp` CLI subcommands both run this file; it only runs the scripts
// below and passes their output and exit code through.
//   spec-check <id> [--accept|--check]  spec-check.mjs <id> --write [--accept]  (--check: no --write, writes nothing)
//   split-check <id>                split-check.mjs <id> --write
//   next <id>                       next-steps.mjs <id>
//   tool <id> [--set <tool>]        execution-tool.mjs <id> [--set <tool>]   (also: tool --default <tool>)
//   split apply <id>                split.mjs apply <id>
//   split next <parent>             split.mjs next <parent> --write-tickets
//   split start <slice> [--undo]  split.mjs start <slice> [--undo]
//   split undo <parent> [--force]  split.mjs undo <parent> [--force]
//   split loss <parent> [--final]   split.mjs loss <parent> [--final]
//   slice-finish <slice>            split.mjs finish-check <slice> + openspec archive <slice> -y + split.mjs finish-mark <slice>   (also: split finish <slice>)
//   split archive <parent>          split.mjs finalize <parent> (all slices archived? statuses done, final loss check)  +  openspec archive <parent> --skip-specs -y
// Exit: the first failing step's exit code; 2 on a usage error.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isMain } from './lib/main.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const USAGE = `usage: sdd <command> ...
  spec-check <id> [--accept|--check] coverage report -> execution/spec-check.md (the agent's /sdd-spec-check adds the review; kept when unchanged since the accepted PASS); --accept: record a saved PASS as the spec-change baseline; --check: write nothing
  split-check <id>                 split gate counts -> execution/split-check.md
  next <id>                        print the change's next steps again
  tool <id> [--set <tool>]         show / set the change's execution tool (tool --default <tool>: project default)
  split apply <id>                 apply the approved execution/split-proposal.md
  split next <parent>              ready / parallel-safe slices + tickets for READY slices
  split start <slice> [--undo]     take a READY slice: mark it in-progress (finds the parent) + next lines; --undo: back to planned
  split undo <parent> [--force]    undo the split: the original change back from split_commit, slice folders removed (uncommitted)
  split loss <parent> [--final]    loss check
  slice-finish <slice>             finish an in-progress slice: needs execution/verify.md (+ progress.md for Superpowers), openspec archive <slice> -y, status done in slices.md
  split archive <parent>           stops unless every slice is archived, marks them done, final loss check, then openspec archive <parent> --skip-specs -y`;

/** The steps a command runs: [label, executable, args]. Exported for tests and docs. */
export function plan(argv) {
  const [cmd, ...rest] = argv;
  const node = (script, args) => [`${script} ${args.join(' ')}`.trim(), process.execPath, [path.join(HERE, script), ...args]];
  const openspec = (args) => [`openspec ${args.join(' ')}`, 'openspec', args];
  const finish = (id) => [node('split.mjs', ['finish-check', id]), openspec(['archive', id, '-y']), node('split.mjs', ['finish-mark', id])];
  const need = (n, what) => { if (rest.length < n || rest.slice(0, n).some((a) => a.startsWith('-'))) throw new SddUsage(`${what}\n\n${USAGE}`); };
  switch (cmd) {
    case 'spec-check': need(1, 'spec-check <id>'); return [node('spec-check.mjs', [rest[0], ...(rest.includes('--check') ? [] : ['--write']), ...rest.slice(1)])];
    case 'split-check': need(1, 'split-check <id>'); return [node('split-check.mjs', [rest[0], '--write', ...rest.slice(1)])];
    case 'next': case 'next-steps': need(1, 'next <id>'); return [node('next-steps.mjs', rest)];
    case 'tool': if (!rest.length) throw new SddUsage(`tool <id> [--set <tool>] | tool --default <tool>\n\n${USAGE}`); return [node('execution-tool.mjs', rest)];
    case 'slice-finish': need(1, 'slice-finish <slice>'); return finish(rest[0]);
    case 'split': {
      const [sub, ...a] = rest;
      if (!a.length || a[0].startsWith('-')) throw new SddUsage(`split ${sub || '<apply|next|start|finish|undo|loss|archive>'} <id>\n\n${USAGE}`);
      if (sub === 'apply' || sub === 'loss') return [node('split.mjs', [sub, ...a])];
      if (sub === 'next') return [node('split.mjs', ['next', ...a, ...(a.includes('--write-tickets') ? [] : ['--write-tickets'])])];
      if (sub === 'start' || sub === 'undo') return [node('split.mjs', [sub, ...a])];
      if (sub === 'finish') return finish(a[0]);
      if (sub === 'archive') return [node('split.mjs', ['finalize', a[0]]), openspec(['archive', a[0], '--skip-specs', '-y'])];
      throw new SddUsage(`unknown split command "${sub}"\n\n${USAGE}`);
    }
    default: throw new SddUsage(`${cmd ? `unknown command "${cmd}"` : 'no command'}\n\n${USAGE}`);
  }
}

export class SddUsage extends Error {}

/** Run the steps in order (stop at the first failure); output goes straight through. Returns the exit code. */
export function run(argv, { cwd = process.cwd(), log = (s) => console.log(s) } = {}) {
  const steps = plan(argv);
  for (const [label, exe, args] of steps) {
    if (steps.length > 1) log(`$ ${label}`);
    const r = spawnSync(exe, args, { cwd, stdio: 'inherit', shell: exe === 'openspec' && process.platform === 'win32' });
    if (r.error) {
      if (r.error.code === 'ENOENT' && exe === 'openspec') { console.error('sdd: the openspec CLI is not on PATH (npm i -g @fission-ai/openspec)'); return 1; }
      throw r.error;
    }
    if (r.status !== 0) return r.status ?? 1;
  }
  return 0;
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (!argv.length || argv[0] === '--help' || argv[0] === '-h') { console.log(USAGE); process.exit(argv.length ? 0 : 2); }
  try { process.exit(run(argv)); } catch (e) { console.error(`sdd: ${e.message}`); process.exit(e instanceof SddUsage ? 2 : 1); }
}
