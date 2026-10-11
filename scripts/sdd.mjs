#!/usr/bin/env node
// sdd: one entry point for the workflow's checks, so nobody types the individual scripts.
// The agent slash commands (/sdd-split-apply, /sdd-split-status, /sdd-split-finish, /sdd-slice-start, /sdd-slice-finish, /sdd-split-undo,
// /sdd-change-status, /sdd-tool) and the `sdd-pp` CLI subcommands both run this file; it only runs the scripts
// below and passes their output and exit code through.
//   spec-check <id> [--accept|--check]  spec-check.mjs <id> --write [--accept]  (--check: no --write, writes nothing)
//   split-check <id>                split-check.mjs <id> --write
//   change-status <id>              next-steps.mjs <id>
//   handoff-draft <id>              handoff-draft.mjs <id>   (pre-fills handoff.md for /sdd-handoff)
//   tool <id> [--set <tool>]        execution-tool.mjs <id> [--set <tool>]   (also: tool --default <tool>)
//   split apply <id> [--force]      split.mjs apply <id> [--force]   (--force: re-split an in-progress slice)
//   split-status <parent>           split.mjs next <parent> --write-tickets
//   slice-start <slice> [--undo]    split.mjs start <slice> [--undo]
//   split undo <parent> [--force]  split.mjs undo <parent> [--force]
//   split loss <parent> [--final]   split.mjs loss <parent> [--final]
//   slice-finish <slice>            split.mjs finish-check <slice> + openspec archive <slice> -y + split.mjs finish-mark <slice>
//   split-finish <parent>           split.mjs finalize <parent> (all slices archived? statuses done, final loss check)  +  openspec archive <parent> --skip-specs -y
// Exit: the first failing step's exit code; 2 on a usage error.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isMain } from './lib/main.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const USAGE = `usage: sdd <command> ...
  spec-check <id> [--accept|--check|--verbose] coverage report -> execution/spec-check.md (the agent's /sdd-spec-check adds the review; kept when unchanged since the accepted PASS); --accept: record a saved PASS as the spec-change baseline; --check: write nothing
  split-check <id>                 split gate counts -> execution/split-check.md
  change-status <id>               where the change is: its steps with [done] markers (before or after the handoff)
  handoff-draft <id>               pre-fill handoff.md (tool, base_ref, links, slice/parent, size); only apply_mode / harness / notes left
  tool <id> [--set <tool>]         show / set the change's execution tool (tool --default <tool>: project default)
  split apply <id> [--force]       apply the approved execution/split-proposal.md (--force: re-split a slice that is in progress)
  split-status <parent>            ready / parallel-safe slices + tickets for READY slices
  slice-start <slice> [--undo]     take a READY slice: mark it in-progress (finds the parent) + next lines; --undo: back to planned
  split undo <parent> [--force]    undo the split: the original change back from split_commit, slice folders removed (uncommitted)
  split loss <parent> [--final]    loss check
  slice-finish <slice>             finish an in-progress slice: needs execution/verify.md (+ progress.md for Superpowers), openspec archive <slice> -y, status done in slices.md
  split-finish <parent>            stops unless every slice is archived, marks them done, final loss check, then openspec archive <parent> --skip-specs -y`;

/** Retired command names (CLI and old slash-command spellings) -> the current command; they exit 2 naming it. */
export const RETIRED = {
  next: 'change-status <id>', 'next-steps': 'change-status <id>', 'sdd-next-steps': 'change-status <id>',
  'split-next': 'split-status <parent>', 'sdd-split-next': 'split-status <parent>',
  'split-start': 'slice-start <slice>', 'sdd-split-start': 'slice-start <slice>',
  'split-archive': 'split-finish <parent>', 'sdd-split-archive': 'split-finish <parent>',
  'split-apply': 'split apply <id>', 'split-undo': 'split undo <parent>', 'split-loss': 'split loss <parent>',
};

/** The steps a command runs: [label, executable, args]. Exported for tests and docs. */
export function plan(argv) {
  const [cmd, ...rest] = argv;
  const node = (script, args) => [`${script} ${args.join(' ')}`.trim(), process.execPath, [path.join(HERE, script), ...args]];
  const openspec = (args) => [`openspec ${args.join(' ')}`, 'openspec', args];
  const finish = (id) => [node('split.mjs', ['finish-check', id]), openspec(['archive', id, '-y']), node('split.mjs', ['finish-mark', id])];
  // a line printed after the steps ran (the commit line goes last, after OpenSpec's own output)
  const say = (text) => ['print commit line', null, [text]];
  const need = (n, what) => { if (rest.length < n || rest.slice(0, n).some((a) => a.startsWith('-'))) throw new SddUsage(`${what}\n\n${USAGE}`); };
  switch (cmd) {
    case 'spec-check': need(1, 'spec-check <id>'); return [node('spec-check.mjs', [rest[0], ...(rest.includes('--check') ? [] : ['--write']), ...rest.slice(1)])];
    case 'split-check': need(1, 'split-check <id>'); return [node('split-check.mjs', [rest[0], '--write', ...rest.slice(1)])];
    case 'handoff-draft': need(1, 'handoff-draft <id>'); return [node('handoff-draft.mjs', rest)];
    case 'change-status': need(1, 'change-status <id>'); return [node('next-steps.mjs', rest)];
    case 'split-status': need(1, 'split-status <parent>'); return [node('split.mjs', ['next', ...rest, ...(rest.includes('--write-tickets') ? [] : ['--write-tickets'])])];
    case 'tool': if (!rest.length) throw new SddUsage(`tool <id> [--set <tool>] | tool --default <tool>\n\n${USAGE}`); return [node('execution-tool.mjs', rest)];
    case 'slice-start': need(1, 'slice-start <slice>'); return [node('split.mjs', ['start', ...rest])];
    case 'slice-finish': need(1, 'slice-finish <slice>'); return finish(rest[0]);
    case 'split-finish': need(1, 'split-finish <parent>'); return [node('split.mjs', ['finalize', rest[0]]), openspec(['archive', rest[0], '--skip-specs', '-y']), say(`Commit the archive: git add -A openspec/changes && git commit -m "split: finish parent ${rest[0]}"`)];
    case 'split': {
      const [sub, ...a] = rest;
      if (!a.length || a[0].startsWith('-')) throw new SddUsage(`split ${sub || '<apply|undo|loss>'} <id>\n\n${USAGE}`);
      if (sub === 'apply' || sub === 'loss') return [node('split.mjs', [sub, ...a])];
      if (sub === 'undo') return [node('split.mjs', [sub, ...a])];
      const moved = { start: 'slice-start <slice>', archive: 'split-finish <parent>', finish: 'slice-finish <slice>', next: 'split-status <parent>' }[sub];
      throw new SddUsage(`${moved ? `"split ${sub}" is now "${moved}"` : `unknown split command "${sub}"`}\n\n${USAGE}`);
    }
    default:
      if (Object.hasOwn(RETIRED, cmd)) throw new SddUsage(`"${cmd}" is now "${RETIRED[cmd]}"\n\n${USAGE}`);
      throw new SddUsage(`${cmd ? `unknown command "${cmd}"` : 'no command'}\n\n${USAGE}`);
  }
}

export class SddUsage extends Error {}

/** Run the steps in order (stop at the first failure); output goes straight through. Returns the exit code. */
export function run(argv, { cwd = process.cwd(), log = (s) => console.log(s) } = {}) {
  const steps = plan(argv);
  for (const [label, exe, args] of steps) {
    if (exe === null) { log(args[0]); continue; }
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
