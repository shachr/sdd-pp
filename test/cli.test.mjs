// sdd-pp: the cross-platform Node installer (replaces install.sh).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CLI, initCli, TOOLKIT } from './helpers.mjs';

const project = (extra = []) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-pp-cli-'));
  fs.mkdirSync(path.join(dir, 'openspec'));
  for (const d of extra) fs.mkdirSync(path.join(dir, d), { recursive: true });
  return dir;
};
const lstatAll = (dir) => {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d)) { const p = path.join(d, e); const st = fs.lstatSync(p); if (st.isSymbolicLink()) out.push(p); else if (st.isDirectory()) walk(p); } };
  walk(dir); return out;
};

test('sdd-pp: --help, --version, unknown command, bad --tool, missing openspec/', () => {
  let r = spawnSync(process.execPath, [CLI, '--help'], { encoding: 'utf8' });
  assert.equal(r.status, 0); assert.match(r.stdout, /^Usage: sdd-pp init \[dir\] \[options\]/);
  r = spawnSync(process.execPath, [CLI, '--version'], { encoding: 'utf8' });
  assert.equal(r.stdout.trim(), JSON.parse(fs.readFileSync(path.join(TOOLKIT, 'package.json'), 'utf8')).version);
  r = spawnSync(process.execPath, [CLI, 'install'], { encoding: 'utf8' });
  assert.equal(r.status, 2); assert.match(r.stderr, /unknown command "install"/);
  assert.equal(initCli(project(), '--tool', 'bogus').status, 2);
  assert.equal(initCli(project(), '--link').status, 2, 'symlink installs are gone');
  r = initCli(fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-pp-empty-')));
  assert.equal(r.status, 1); assert.match(r.stderr, /no openspec\/ directory - run 'openspec init' first/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(TOOLKIT, 'package.json'), 'utf8')).bin['sdd-pp'], 'bin/sdd-pp.mjs');
});

test('sdd-pp init: plain copies (no symlinks), host selection, config.yaml, gitignore/gitattributes once; re-install keeps project.json', () => {
  const dir = project(['.opencode']);
  fs.writeFileSync(path.join(dir, 'openspec', 'config.yaml'), 'schema: spec-driven\r\ncontext: demo\r\n');
  let r = initCli(dir, '--tool', 'superpowers', '--no-claude');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(lstatAll(dir), []);
  assert.ok(fs.existsSync(path.join(dir, '.opencode/skills/openspec-handoff-superpowers/SKILL.md')), '.opencode/ auto-detected');
  assert.ok(fs.existsSync(path.join(dir, '.cursor/commands/handoff.md')));
  assert.ok(!fs.existsSync(path.join(dir, '.claude')));
  assert.ok(!fs.existsSync(path.join(dir, '.openspec-handoff/scripts/dev-generate-schema.mjs')), 'dev-only script not installed');
  assert.ok(!fs.existsSync(path.join(dir, '.openspec-handoff/scripts/adversarial-review.mjs')));
  assert.match(fs.readFileSync(path.join(dir, 'openspec/config.yaml'), 'utf8'), /^schema: handoff-driven\r?\ncontext: demo/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.openspec-handoff/project.json'), 'utf8')).defaultTool, 'superpowers');
  assert.match(r.stdout, /\/handoff <id> {2}/);
  assert.doesNotMatch(r.stdout, /adversarial|<model>/);
  r = initCli(dir, '--no-claude', '--no-opencode');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /project\.json \(kept: "defaultTool": "superpowers"\)/);
  assert.match(r.stdout, /config\.json \(kept existing; --force to overwrite\)/);
  assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8').match(/\.superpowers\//g).length, 1);
  assert.equal(fs.readFileSync(path.join(dir, '.gitattributes'), 'utf8').match(/slices\.md merge=union/g).length, 1);
});

test('sdd-pp init with a relative dir and the current directory', () => {
  const dir = project();
  let r = spawnSync(process.execPath, [CLI, 'init', '--tool', 'ai-hero', '--no-claude', '--no-cursor'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(dir, '.openspec-handoff/scripts/check-handoff.mjs')));
  r = spawnSync(process.execPath, [CLI, 'init', path.basename(dir), '--no-claude', '--no-cursor'], { cwd: path.dirname(dir), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /kept: "defaultTool": "ai-hero"/);
});
