// Command wrappers: scripts/sdd.mjs (one entry point), the `sdd-pp` CLI subcommands that run a
// project's installed copy, the agent slash commands, and the ai-hero issue-tracker install.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, CLI, CHANGE, initCli, makeFixture } from './helpers.mjs';
import { plan } from '../scripts/sdd.mjs';
import { nextSteps } from '../scripts/next-steps.mjs';

const ENV = { ...process.env, PATH: `${path.dirname(OPENSPEC)}${path.delimiter}${process.env.PATH}` };
const sddPp = (cwd, ...args) => { const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: ENV }); return { code: r.status, out: r.stdout + r.stderr }; };
const labels = (argv) => plan(argv).map(([l]) => l);
const NEW = { 'next-steps': 'next', tool: 'tool', 'split-apply': 'split apply', 'split-next': 'split next', 'split-start': 'split start', 'split-archive': 'split archive' };

test('sdd.mjs plan: each command maps to the scripts it runs', () => {
  assert.deepEqual(labels(['spec-check', 'x']), ['spec-check.mjs x --write']);
  assert.deepEqual(labels(['split-check', 'x']), ['split-check.mjs x --write']);
  assert.deepEqual(labels(['next', 'x']), ['next-steps.mjs x']);
  assert.deepEqual(labels(['tool', 'x', '--set', 'superpowers']), ['execution-tool.mjs x --set superpowers']);
  assert.deepEqual(labels(['tool', '--default', 'ai-hero']), ['execution-tool.mjs --default ai-hero']);
  assert.deepEqual(labels(['split', 'apply', 'p']), ['split.mjs apply p']);
  assert.deepEqual(labels(['split', 'next', 'p']), ['split.mjs next p --write-tickets']);
  assert.deepEqual(labels(['split', 'next', 'p', '--write-tickets']), ['split.mjs next p --write-tickets']);
  assert.deepEqual(labels(['split', 'start', 's']), ['split.mjs start s']);
  assert.deepEqual(labels(['split', 'start', 's', '--undo']), ['split.mjs start s --undo']);
  assert.deepEqual(labels(['split', 'loss', 'p', '--final']), ['split.mjs loss p --final']);
  assert.deepEqual(labels(['split', 'archive', 'p']), ['split.mjs loss p --final', 'openspec archive p --skip-specs -y']);
  for (const bad of [[], ['check', 'x'], ['split'], ['split', 'bogus', 'p'], ['split', 'mark', 'p', 's', 'in-progress'], ['split', 'start'], ['split', 'apply'], ['nope', 'x'], ['next', '--strict']]) assert.throws(() => plan(bad), /usage|unknown|no command|<id>|split/i, bad.join(' '));
});

test('agent slash commands: claude, cursor, opencode each run sdd.mjs; argument hint / usage on every command', () => {
  for (const h of ['claude', 'cursor', 'opencode']) {
    for (const [name, sub] of Object.entries(NEW)) {
      const t = fs.readFileSync(path.join(TOOLKIT, 'commands', h, `${name}.md`), 'utf8');
      assert.match(t, new RegExp(`node \\.openspec-handoff/scripts/sdd\\.mjs ${sub} `), `${h}/${name}`);
      assert.match(t, /Do nothing else/);
    }
    for (const f of fs.readdirSync(path.join(TOOLKIT, 'commands', h))) {
      const t = fs.readFileSync(path.join(TOOLKIT, 'commands', h, f), 'utf8');
      const front = t.split('---')[1];
      if (h === 'claude') assert.match(front, /^argument-hint: /m, `${h}/${f}`);
      else assert.match(front, new RegExp(`^description: .*\\(usage: /${f.replace(/\.md$/, '')} `, 'm'), `${h}/${f}`);
    }
  }
});

test('next-steps and the init summary use the commands, not node script paths', () => {
  for (const [tool, mode] of [['ai-hero', 'implement'], ['superpowers', 'executing-plans']]) {
    const s = nextSteps({ id: 'x', tool, applyMode: mode, parent: 'p' });
    assert.match(s, /\/opsx:verify x - save the report verbatim/);
    assert.doesNotMatch(s, /check-handoff/);
    assert.match(s, /On main: \/split-next p /);
    assert.doesNotMatch(s, /node \.openspec-handoff|\.mjs/);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-init-'));
  fs.mkdirSync(path.join(dir, 'openspec'));
  const r = initCli(dir, '--tool', 'ai-hero', '--no-cursor');
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout.split('Done. Next')[1], /node \.openspec-handoff/);
  assert.match(r.stdout, /\/opsx:verify <id> \(save to execution\/verify\.md\)[\s\S]*\/split-archive <parent>/);
  assert.doesNotMatch(r.stdout, /check-handoff/);
  for (const h of ['.claude', '.cursor']) assert.ok(!fs.existsSync(path.join(dir, h, 'commands/check-handoff.md')), 'no /check-handoff command');
  for (const name of Object.keys(NEW)) assert.ok(fs.existsSync(path.join(dir, '.claude/commands', `${name}.md`)), name);
  assert.ok(fs.existsSync(path.join(dir, '.openspec-handoff/scripts/sdd.mjs')));
  assert.match(r.stdout, /\/split-start <slice>/);
  assert.doesNotMatch(r.stdout, /split-mark|split mark/);
  // a reinstall removes a leftover /split-mark from an earlier install
  fs.writeFileSync(path.join(dir, '.claude/commands/split-mark.md'), 'old\n');
  const r2 = initCli(dir, '--no-cursor');
  assert.equal(r2.status, 0, r2.stderr);
  assert.match(r2.stdout, /\.claude\/commands\/split-mark\.md \(removed: retired\)/);
  assert.ok(!fs.existsSync(path.join(dir, '.claude/commands/split-mark.md')));
  for (const h of ['claude', 'cursor', 'opencode']) assert.ok(!fs.existsSync(path.join(TOOLKIT, 'commands', h, 'split-mark.md')), `no ${h}/split-mark.md in the toolkit`);
});

test('sdd-pp init --tool ai-hero installs docs/agents/issue-tracker.md if absent (kept if present; not for superpowers)', () => {
  const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-it-')); fs.mkdirSync(path.join(d, 'openspec')); return d; };
  let dir = mk();
  let r = initCli(dir, '--tool', 'ai-hero', '--no-claude', '--no-cursor');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(path.join(dir, 'docs/agents/issue-tracker.md'), 'utf8'), fs.readFileSync(path.join(TOOLKIT, 'config/issue-tracker-openspec.md'), 'utf8'));
  assert.match(r.stdout, /docs\/agents\/issue-tracker\.md \(AI Hero issue tracker/);
  fs.writeFileSync(path.join(dir, 'docs/agents/issue-tracker.md'), 'mine\n');
  r = initCli(dir, '--no-claude', '--no-cursor');
  assert.match(r.stdout, /docs\/agents\/issue-tracker\.md \(kept existing\)/);
  assert.equal(fs.readFileSync(path.join(dir, 'docs/agents/issue-tracker.md'), 'utf8'), 'mine\n');
  dir = mk();
  initCli(dir, '--tool', 'superpowers', '--no-claude', '--no-cursor');
  assert.ok(!fs.existsSync(path.join(dir, 'docs/agents/issue-tracker.md')));
  assert.ok(!fs.existsSync(path.join(dir, 'AGENTS.md')));
});

test('sdd-pp init --tool ai-hero: triage-labels.md + a marked AGENTS.md block, idempotent on rerun (created, appended, refreshed in place)', () => {
  const mk = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-ag-')); fs.mkdirSync(path.join(d, 'openspec')); return d; };
  const agents = (d) => fs.readFileSync(path.join(d, 'AGENTS.md'), 'utf8');
  const count = (t) => t.split('<!-- sdd-pp:agent-skills').length - 1;
  let dir = mk();
  let r = initCli(dir, '--tool', 'ai-hero', '--no-claude', '--no-cursor');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /AGENTS\.md created/);
  assert.equal(fs.readFileSync(path.join(dir, 'docs/agents/triage-labels.md'), 'utf8'), fs.readFileSync(path.join(TOOLKIT, 'config/triage-labels-openspec.md'), 'utf8'));
  const first = agents(dir);
  assert.match(first, /docs\/agents\/issue-tracker\.md/); assert.match(first, /docs\/agents\/triage-labels\.md/);
  r = initCli(dir, '--no-claude', '--no-cursor');
  assert.match(r.stdout, /AGENTS\.md block unchanged/);
  assert.equal(agents(dir), first, 'rerun leaves AGENTS.md byte-identical');
  // an existing AGENTS.md: block appended once, user text kept; a stale block is refreshed in place
  dir = mk();
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# My project\n\nRules here.\n');
  initCli(dir, '--tool', 'ai-hero', '--no-claude', '--no-cursor');
  initCli(dir, '--no-claude', '--no-cursor');
  let t = agents(dir);
  assert.match(t, /^# My project\n\nRules here\.\n\n<!-- sdd-pp:agent-skills/); assert.equal(count(t), 1);
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), t.replace('### Issue tracker', '### Issue tracker (old)') + '\nAfter.\n');
  r = initCli(dir, '--no-claude', '--no-cursor');
  assert.match(r.stdout, /AGENTS\.md block updated/);
  t = agents(dir);
  assert.equal(count(t), 1); assert.doesNotMatch(t, /\(old\)/); assert.match(t, /\nAfter\.\n$/);
});

test('sdd-pp <command> from inside a project runs its installed scripts: tool, next, spec-check, usage errors; no check', { skip: !fs.existsSync(OPENSPEC) }, () => {
  const { dir } = makeFixture();
  assert.equal(initCli(dir, '--no-claude', '--no-cursor', '--no-opencode', '--no-set-default').status, 0);
  // the project's copy is the one that runs (marker in the installed sdd.mjs)
  const inst = path.join(dir, '.openspec-handoff/scripts/sdd.mjs');
  fs.writeFileSync(inst, fs.readFileSync(inst, 'utf8').replace("const HERE =", "console.log('[installed sdd]');\nconst HERE ="));
  const sub = path.join(dir, 'src');
  let r = sddPp(sub, 'tool', CHANGE);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /\[installed sdd\][\s\S]*add-greeting-name: ai-hero/);
  r = sddPp(sub, 'next', CHANGE);
  assert.match(r.out, /Next steps for add-greeting-name \(ai-hero[\s\S]*\/opsx:verify add-greeting-name - save/);
  r = sddPp(sub, 'check', CHANGE);
  assert.equal(r.code, 2, 'sdd-pp check is gone'); assert.match(r.out, /unknown command "check"/);
  r = sddPp(sub, 'spec-check', CHANGE);
  assert.match(r.out, /Spec check: add-greeting-name/);
  assert.ok(fs.existsSync(path.join(dir, 'openspec/changes', CHANGE, 'execution/spec-check.md')));
  r = sddPp(sub, 'next');
  assert.equal(r.code, 2); assert.match(r.out, /next <id>/);
  r = sddPp(sub, 'split', 'bogus', 'x');
  assert.equal(r.code, 2); assert.match(r.out, /unknown split command "bogus"/);
  // a failing step stops the chain and passes its exit code through (split archive: loss check, then openspec archive)
  r = sddPp(sub, 'split', 'archive', CHANGE);
  assert.notEqual(r.code, 0);
  assert.doesNotMatch(r.out, /\$ openspec archive/);
});

test('verify gets no review instruction: the schema apply instruction (what /opsx:verify reads) never mentions a review file', { skip: !fs.existsSync(OPENSPEC) }, () => {
  const { dir } = makeFixture();
  assert.equal(initCli(dir, '--no-claude', '--no-cursor', '--no-opencode').status, 0);
  const r = spawnSync(OPENSPEC, ['instructions', 'apply', '--change', CHANGE, '--json'], { cwd: dir, encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  assert.match(j.instruction, /\/next-steps <change>/);
  assert.doesNotMatch(j.instruction, /review|CRITICAL|check-handoff/i);
});
