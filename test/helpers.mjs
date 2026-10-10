import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const TOOLKIT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CHANGE = 'add-greeting-name';
export const OPENSPEC = path.join(TOOLKIT, 'node_modules', '.bin', 'openspec');
/** Skip reason for the tests that need the real OpenSpec CLI (devDependency). openspec-required.test.mjs
 *  fails the run when it is missing, unless SDD_SKIP_OPENSPEC=1 says skipping is intended. */
export const OPENSPEC_SKIP = fs.existsSync(OPENSPEC) ? false : 'OpenSpec CLI not installed - run npm install';

/**
 * Copy example/ into a fresh git repo in a temp dir (symlinks dereferenced),
 * commit it, and point handoff.md's base_ref at that commit.
 */
export function makeFixture({ handoff = {}, keepExecution = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-fixture-'));
  // fs.cpSync's `dereference` only applies to the top-level source, so nested symlinks
  // (example/.openspec-handoff/config.json -> ../../config/...) would be copied as links and a
  // test writing the fixture config would overwrite the toolkit's real config. Copy link targets.
  copyDeref(path.join(TOOLKIT, 'example'), dir);
  const changeDir = path.join(dir, 'openspec', 'changes', CHANGE);
  if (!keepExecution) fs.rmSync(path.join(changeDir, 'execution'), { recursive: true, force: true });
  // start every fixture without prior review output so tests can assert on what a run writes
  fs.rmSync(path.join(changeDir, 'execution', 'reviews'), { recursive: true, force: true });
  const hf = path.join(changeDir, 'handoff.md');
  if (fs.existsSync(hf)) fs.writeFileSync(hf, fs.readFileSync(hf, 'utf8').replace(/\n## Reviews\n[\s\S]*$/, '\n'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' }).toString().trim();
  g('init', '-q', '-b', 'main'); g('config', 'user.name', 't'); g('config', 'user.email', 't@t');
  g('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A');
  g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'fixture');
  const base = g('rev-parse', 'HEAD');
  setHandoff(dir, { base_ref: base, ...handoff });
  return { dir, changeDir, base, git: g };
}

function copyDeref(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src)) {
    if (e === 'node_modules') continue;
    const s = path.join(src, e), d = path.join(dest, e);
    if (fs.statSync(s).isDirectory()) copyDeref(s, d);
    else fs.copyFileSync(s, d);
  }
}

/** Overwrite (or delete with null) front matter keys in the fixture's handoff.md. */
export function setHandoff(dir, patch) {
  const file = path.join(dir, 'openspec', 'changes', CHANGE, 'handoff.md');
  let text = fs.readFileSync(file, 'utf8');
  for (const [k, v] of Object.entries(patch)) {
    const re = new RegExp(`^${k}:.*$`, 'm');
    if (v === null) text = text.replace(new RegExp(`^${k}:.*\\n`, 'm'), '');
    else if (re.test(text)) text = text.replace(re, `${k}: ${v}`);
    else text = text.replace(/^---\n/, `---\n${k}: ${v}\n`);
  }
  fs.writeFileSync(file, text);
}

export function run(script, args, cwd) {
  const r = spawnSync(process.execPath, [path.join(TOOLKIT, 'scripts', script), ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr, stdout: r.stdout };
}

/** Run the Node installer CLI: `sdd-pp init <dir> ...args`. */
export const CLI = path.join(TOOLKIT, 'bin', 'sdd-pp.mjs');
export function initCli(dir, ...args) {
  return spawnSync(process.execPath, [CLI, 'init', dir, ...args], { encoding: 'utf8' });
}
