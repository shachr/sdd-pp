import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

export const TOOLKIT = path.resolve(new URL('..', import.meta.url).pathname);
export const CHANGE = 'add-greeting-name';
export const OPENSPEC = path.join(TOOLKIT, 'node_modules', '.bin', 'openspec');

/**
 * Copy example/ into a fresh git repo in a temp dir (symlinks dereferenced),
 * commit it, and point handoff.md's base_ref at that commit.
 */
export function makeFixture({ handoff = {}, keepExecution = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-fixture-'));
  fs.cpSync(path.join(TOOLKIT, 'example'), dir, { recursive: true, dereference: true });
  const changeDir = path.join(dir, 'openspec', 'changes', CHANGE);
  if (!keepExecution) fs.rmSync(path.join(changeDir, 'execution'), { recursive: true, force: true });
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' }).toString().trim();
  g('init', '-q', '-b', 'main');
  g('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A');
  g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'fixture');
  const base = g('rev-parse', 'HEAD');
  setHandoff(dir, { base_ref: base, ...handoff });
  return { dir, changeDir, base, git: g };
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
