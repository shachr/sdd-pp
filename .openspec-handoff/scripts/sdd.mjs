#!/usr/bin/env node
// sdd: one entry point for the workflow's checks, so nobody types the individual scripts.
// The agent slash commands (/split-apply, /split-next, /split-archive, /split-mark,
// /next-steps, /tool) and the `sdd-pp` CLI subcommands both run this file; it only runs the scripts
// below and passes their output and exit code through.
//   spec-check <id>                 spec-check.mjs <id> --write
//   split-check <id>                split-check.mjs <id> --write
//   next <id>                       next-steps.mjs <id>
//   tool <id> [--set <tool>]        execution-tool.mjs <id> [--set <tool>]   (also: tool --default <tool>)
//   split apply <id>                split.mjs apply <id>
//   split next <parent>             split.mjs next <parent> --write-tickets
//   split mark <parent> <slice> <in-progress|planned>   split.mjs mark ...
//   split loss <parent> [--final]   split.mjs loss <parent> [--final]
//   split archive <parent>          split.mjs loss <parent> --final  +  openspec archive <parent> --skip-specs -y
// Exit: the first failing step's exit code; 2 on a usage error.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const USAGE = `usage: sdd <command> ...
  spec-check <id>                  coverage report -> execution/spec-check.md (the agent's /spec-check adds the contradiction review)
  split-check <id>                 split gate counts -> execution/split-check.md
  next <id>                        print the change's next steps again
  tool <id> [--set <tool>]         show / set the change's execution tool (tool --default <tool>: project default)
  split apply <id>                 apply the approved execution/split-proposal.md
  split next <parent>              ready / parallel-safe slices + tickets for READY slices
  split mark <parent> <slice> <in-progress|planned>
  split loss <parent> [--final]    loss check
  split archive <parent>           final loss check, then openspec archive <parent> --skip-specs -y`;

/** The steps a command runs: [label, executable, args]. Exported for tests and docs. */
export function plan(argv) {
  const [cmd, ...rest] = argv;
  const node = (script, args) => [`${script} ${args.join(' ')}`.trim(), process.execPath, [path.join(HERE, script), ...args]];
  const openspec = (args) => [`openspec ${args.join(' ')}`, 'openspec', args];
  const need = (n, what) => { if (rest.length < n || rest.slice(0, n).some((a) => a.startsWith('-'))) throw new SddUsage(`${what}\n\n${USAGE}`); };
  switch (cmd) {
    case 'spec-check': need(1, 'spec-check <id>'); return [node('spec-check.mjs', [rest[0], '--write', ...rest.slice(1)])];
    case 'split-check': need(1, 'split-check <id>'); return [node('split-check.mjs', [rest[0], '--write', ...rest.slice(1)])];
    case 'next': case 'next-steps': need(1, 'next <id>'); return [node('next-steps.mjs', rest)];
    case 'tool': if (!rest.length) throw new SddUsage(`tool <id> [--set <tool>] | tool --default <tool>\n\n${USAGE}`); return [node('execution-tool.mjs', rest)];
    case 'split': {
      const [sub, ...a] = rest;
      if (!a.length || a[0].startsWith('-')) throw new SddUsage(`split ${sub || '<apply|next|mark|loss|archive>'} <id>\n\n${USAGE}`);
      if (sub === 'apply' || sub === 'loss') return [node('split.mjs', [sub, ...a])];
      if (sub === 'next') return [node('split.mjs', ['next', ...a, ...(a.includes('--write-tickets') ? [] : ['--write-tickets'])])];
      if (sub === 'mark') return [node('split.mjs', ['mark', ...a])];
      if (sub === 'archive') return [node('split.mjs', ['loss', a[0], '--final']), openspec(['archive', a[0], '--skip-specs', '-y'])];
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (!argv.length || argv[0] === '--help' || argv[0] === '-h') { console.log(USAGE); process.exit(argv.length ? 0 : 2); }
  try { process.exit(run(argv)); } catch (e) { console.error(`sdd: ${e.message}`); process.exit(e instanceof SddUsage ? 2 : 1); }
}
