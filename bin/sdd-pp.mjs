#!/usr/bin/env node
// sdd-pp: install the OpenSpec handoff workflow into a project that already ran `openspec init`.
// Cross-platform (Node only, no shell steps, plain copies - no symlinks).
//   npx <path-or-git-url-of-this-toolkit> init [dir] --tool ai-hero|superpowers
//   npx sdd-pp init [dir] --tool ...   (once published to npm)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = ['ai-hero', 'superpowers'];

export const USAGE = `Usage: sdd-pp init [dir] [options]      install into <dir> (default: the current directory)
       sdd-pp --help | --version

Options for init:
  --tool <ai-hero|superpowers>  setup phase: the project's default execution tool (.openspec-handoff/project.json);
                                changes may override it. A re-install without --tool keeps the existing default.
  --claude / --no-claude        install skills + commands into .claude/   (default: on)
  --cursor / --no-cursor        install skills + commands into .cursor/   (default: on)
  --opencode / --no-opencode    install skills + commands into .opencode/ (default: only if .opencode/ exists)
  --no-set-default              keep openspec/config.yaml as is (default: schema: handoff-driven)
  --force                       overwrite an existing .openspec-handoff/config.json

Run from anywhere: npx <path-or-git-url-of-this-toolkit> init [dir] --tool ai-hero`;

class UsageError extends Error {}

const rel = (root, p) => path.relative(root, p).split(path.sep).join('/');

function put(src, dest, root, log) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true, filter: (s) => !/(^|[\\/])(node_modules|dev-generate-schema\.mjs)$/.test(s) });
  log(`  ${rel(root, dest)}`);
}

function appendLine(file, line) {
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (cur.split(/\r?\n/).some((l) => l.trim() === line)) return false;
  fs.writeFileSync(file, cur + (cur && !cur.endsWith('\n') ? '\n' : '') + line + '\n');
  return true;
}

/** Install into `dir`. Returns the log lines. Throws UsageError on bad input, Error when openspec/ is missing. */
export function init(dir, opts = {}, log = console.log) {
  const { tool, claude = true, cursor = true, setDefault = true, force = false } = opts;
  if (tool !== undefined && !TOOLS.includes(tool)) throw new UsageError(`--tool must be one of ${TOOLS.join(', ')}`);
  const root = path.resolve(dir || '.');
  if (!fs.existsSync(path.join(root, 'openspec'))) throw new Error(`${root} has no openspec/ directory - run 'openspec init' first`);
  const opencode = opts.opencode ?? fs.existsSync(path.join(root, '.opencode'));
  const S = (...p) => path.join(SRC, ...p);
  const T = (...p) => path.join(root, ...p);

  log(`Installing into ${root}`);
  put(S('schemas/handoff-driven'), T('openspec/schemas/handoff-driven'), root, log);
  put(S('schemas/split-plan'), T('openspec/schemas/split-plan'), root, log);
  put(S('scripts'), T('.openspec-handoff/scripts'), root, log);
  put(S('docs/small-changes.md'), T('.openspec-handoff/small-changes.md'), root, log);
  put(S('docs/switching-tools.md'), T('.openspec-handoff/switching-tools.md'), root, log);
  put(S('config/issue-tracker-openspec.md'), T('.openspec-handoff/issue-tracker-openspec.md'), root, log);
  const cfg = T('.openspec-handoff/config.json');
  if (!fs.existsSync(cfg) || force) {
    fs.rmSync(cfg, { force: true });
    fs.copyFileSync(S('config/handoff-review.json'), cfg);
    log('  .openspec-handoff/config.json');
  } else log('  .openspec-handoff/config.json (kept existing; --force to overwrite)');

  const targets = [['claude', claude], ['cursor', cursor], ['opencode', opencode]].filter(([, on]) => on).map(([h]) => h);
  for (const h of targets) {
    for (const s of fs.readdirSync(S('skills'))) put(S('skills', s), T(`.${h}`, 'skills', s), root, log);
    for (const c of fs.readdirSync(S('commands', h)).filter((f) => f.endsWith('.md'))) put(S('commands', h, c), T(`.${h}`, 'commands', c), root, log);
  }

  if (setDefault) {
    const f = T('openspec/config.yaml');
    const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    fs.writeFileSync(f, /^schema:.*$/m.test(cur) ? cur.replace(/^schema:.*$/m, 'schema: handoff-driven') : `schema: handoff-driven\n${cur}`);
    log('  openspec/config.yaml -> schema: handoff-driven');
  }

  // setup phase: project default execution tool (kept on re-install unless --tool is given again)
  const pj = T('.openspec-handoff/project.json');
  if (tool) {
    fs.writeFileSync(pj, `${JSON.stringify({ defaultTool: tool }, null, 2)}\n`);
    log(`  .openspec-handoff/project.json -> defaultTool: ${tool}`);
  } else if (fs.existsSync(pj)) {
    let cur = '?';
    try { cur = JSON.parse(fs.readFileSync(pj, 'utf8')).defaultTool; } catch { /* keep the file as is */ }
    log(`  .openspec-handoff/project.json (kept: "defaultTool": "${cur}")`);
  } else {
    log('  WARNING: no default execution tool - rerun with --tool ai-hero|superpowers, or set one per change:');
    log('           node .openspec-handoff/scripts/execution-tool.mjs <change> --set <tool>');
  }

  if (appendLine(T('.gitignore'), '.superpowers/')) log('  .gitignore += .superpowers/ (Superpowers SDD scratch)');
  if (appendLine(T('.gitattributes'), 'openspec/changes/**/slices.md merge=union')) log('  .gitattributes += slices.md merge=union (parallel slice branches each edit slices.md)');

  log(`
Done. Next:
  openspec schema validate handoff-driven && openspec schema validate split-plan
  openspec new change <id>                              # handoff-driven is the project default
  /opsx:propose <id>  (or /opsx:continue)               # proposal phase runs the tool's design session:
                                                        #   ai-hero -> grill-with-docs -> execution/grill.md
                                                        #   superpowers -> brainstorming -> execution/brainstorm.md (stops before writing-plans)
  node .openspec-handoff/scripts/execution-tool.mjs <id> --set superpowers   # per-change override, before the session
  /split-check <id>                                     # split gate at the end of the specs stage (runs automatically; rerunnable)
  node .openspec-handoff/scripts/split.mjs next <parent> --write-tickets   # split changes: ready / parallel-safe slices + tickets
  node .openspec-handoff/scripts/split.mjs mark <parent> <slice> in-progress   # take a slice (commit on main)
  node .openspec-handoff/scripts/split.mjs loss <parent> [--final]         # loss check; archive the parent last with --skip-specs
  /handoff <id>                                         # last OpenSpec stage: handoff.md + prints the next steps
  node .openspec-handoff/scripts/next-steps.mjs <id>    # reprint them: planning, /spec-check, implement, review, verify, archive
Also install the execution toolkits themselves (not bundled):
  AI Hero:     npx skills add mattpocock/skills   (grill-with-docs, to-spec, to-tickets, implement, tdd, code-review)
  Superpowers: npx skills add obra/superpowers    (brainstorming, writing-plans, executing-plans / subagent-driven-development, requesting-code-review)`);
}

export function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv, allowPositionals: true,
      options: {
        tool: { type: 'string' }, force: { type: 'boolean' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
        claude: { type: 'boolean' }, 'no-claude': { type: 'boolean' }, cursor: { type: 'boolean' }, 'no-cursor': { type: 'boolean' },
        opencode: { type: 'boolean' }, 'no-opencode': { type: 'boolean' }, 'set-default': { type: 'boolean' }, 'no-set-default': { type: 'boolean' },
      },
    });
  } catch (e) {
    console.error(`sdd-pp: ${e.message}\n\n${USAGE}`);
    return 2;
  }
  const { values: v, positionals: [cmd, dir, extra] } = parsed;
  if (v.version) { console.log(JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf8')).version); return 0; }
  if (v.help || cmd === 'help') { console.log(USAGE); return 0; }
  if (cmd !== 'init' || extra) { console.error(`${cmd && cmd !== 'init' ? `sdd-pp: unknown command "${cmd}"\n\n` : extra ? 'sdd-pp: only one project dir allowed\n\n' : ''}${USAGE}`); return 2; }
  const flag = (on, off, dflt) => (v[off] ? false : v[on] ? true : dflt);
  try {
    init(dir, {
      tool: v.tool, force: !!v.force,
      claude: flag('claude', 'no-claude', true), cursor: flag('cursor', 'no-cursor', true),
      opencode: flag('opencode', 'no-opencode', undefined), setDefault: flag('set-default', 'no-set-default', true),
    });
    return 0;
  } catch (e) {
    console.error(`sdd-pp: ${e.message}`);
    return e instanceof UsageError ? 2 : 1;
  }
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(fileURLToPath(import.meta.url))) process.exitCode = main();
