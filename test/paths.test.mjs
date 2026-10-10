// Path handling: the installed scripts must run from a project whose path has spaces (and, by the same
// code path, a Windows drive-letter path): each script's "run directly" check goes through one helper.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, CHANGE, makeFixture, initCli } from './helpers.mjs';

test('scripts run from a path with spaces: next-steps, spec-check, split-check, split, execution-tool, sdd', () => {
  const { dir: src } = makeFixture();
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'space path ')), 'my project');
  fs.cpSync(src, dir, { recursive: true });
  const inst = initCli(dir, '--tool', 'ai-hero', '--no-claude', '--no-cursor', '--no-opencode', '--no-set-default');
  assert.equal(inst.status, 0, inst.stdout + inst.stderr);
  const node = (script, ...a) => {
    const r = spawnSync(process.execPath, [path.join(dir, '.openspec-handoff', 'scripts', script), ...a], { cwd: dir, encoding: 'utf8' });
    return { code: r.status, out: r.stdout + r.stderr };
  };
  let r = node('next-steps.mjs', CHANGE);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^Next steps for add-greeting-name \(ai-hero/, 'next-steps must not be silent');
  r = node('spec-check.mjs', CHANGE);
  assert.match(r.out, /PENDING: mechanical checks pass|GAPS:/, r.out);
  r = node('split-check.mjs', CHANGE);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /split-check add-greeting-name: fits/);
  r = node('split.mjs', 'next', CHANGE);
  assert.match(r.out, /add-greeting-name is not a split parent/, r.out);
  r = node('execution-tool.mjs', CHANGE);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /add-greeting-name: ai-hero/);
  r = node('sdd.mjs', 'next', CHANGE);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^Next steps for add-greeting-name/m);
  // the CLI itself from a path with spaces
  const cli = path.join(path.dirname(dir), 'tool kit');
  fs.cpSync(TOOLKIT, cli, { recursive: true, filter: (s) => !s.includes(`${path.sep}node_modules`) && !s.includes(`${path.sep}.git`) && !s.includes(`${path.sep}examples`) });
  r = spawnSync(process.execPath, [path.join(cli, 'bin', 'sdd-pp.mjs'), '--version'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /\d+\.\d+\.\d+/);
});

test('entry-point guard: every runnable script uses the shared isMain helper (no URL .pathname or file:// string compare); win32 compares case-insensitively', async () => {
  const files = [...fs.readdirSync(path.join(TOOLKIT, 'scripts')).filter((f) => f.endsWith('.mjs') && !f.startsWith('dev-')).map((f) => `scripts/${f}`), 'bin/sdd-pp.mjs'];
  for (const f of files) {
    const t = fs.readFileSync(path.join(TOOLKIT, f), 'utf8');
    assert.doesNotMatch(t, /import\.meta\.url\)?\.pathname|`file:\/\/\$\{process\.argv/, `${f}: URL-based path compare`);
    if (/process\.argv\[1\]|isMain/.test(t)) assert.match(t, /if \(isMain\(import\.meta\.url\)\)/, `${f}: use isMain`);
  }
  for (const f of fs.readdirSync(path.join(TOOLKIT, 'scripts/lib'))) assert.doesNotMatch(fs.readFileSync(path.join(TOOLKIT, 'scripts/lib', f), 'utf8'), /import\.meta\.url\)?\.pathname/, `scripts/lib/${f}`);
  const { isMain, normalPath } = await import('../scripts/lib/main.mjs');
  const self = path.join(TOOLKIT, 'scripts', 'lib', 'main.mjs');
  const url = (await import('node:url')).pathToFileURL(self).href;
  assert.equal(isMain(url, self), true);
  assert.equal(isMain(url, path.join(TOOLKIT, 'scripts', 'sdd.mjs')), false);
  assert.equal(isMain(url, undefined), false);
  assert.equal(normalPath('/Some/Dir/X.mjs', 'win32'), path.resolve('/Some/Dir/X.mjs').toLowerCase());
  assert.equal(normalPath('/Some/Dir/X.mjs', 'linux'), path.resolve('/Some/Dir/X.mjs'));
});
