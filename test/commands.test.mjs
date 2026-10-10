// Command wrappers: scripts/sdd.mjs (one entry point), the `sdd-pp` CLI subcommands that run a
// project's installed copy, the agent slash commands, and the ai-hero issue-tracker install.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, CLI, CHANGE, initCli, makeFixture, OPENSPEC_SKIP, runPrinted } from './helpers.mjs';
import { plan } from '../scripts/sdd.mjs';
import { nextSteps } from '../scripts/next-steps.mjs';

const ENV = { ...process.env, PATH: `${path.dirname(OPENSPEC)}${path.delimiter}${process.env.PATH}` };
const sddPp = (cwd, ...args) => { const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', env: ENV }); return { code: r.status, out: r.stdout + r.stderr }; };
const labels = (argv) => plan(argv).map(([l]) => l);
const NEW = { 'next-steps': 'next', tool: 'tool', 'split-apply': 'split apply', 'split-next': 'split next', 'slice-start': 'slice-start', 'split-undo': 'split undo', 'split-finish': 'split-finish', 'slice-finish': 'slice-finish' };

test('sdd.mjs plan: each command maps to the scripts it runs', () => {
  assert.deepEqual(labels(['spec-check', 'x']), ['spec-check.mjs x --write']);
  assert.deepEqual(labels(['split-check', 'x']), ['split-check.mjs x --write']);
  assert.deepEqual(labels(['next', 'x']), ['next-steps.mjs x']);
  assert.deepEqual(labels(['tool', 'x', '--set', 'superpowers']), ['execution-tool.mjs x --set superpowers']);
  assert.deepEqual(labels(['tool', '--default', 'ai-hero']), ['execution-tool.mjs --default ai-hero']);
  assert.deepEqual(labels(['split', 'apply', 'p']), ['split.mjs apply p']);
  assert.deepEqual(labels(['split', 'next', 'p']), ['split.mjs next p --write-tickets']);
  assert.deepEqual(labels(['split', 'next', 'p', '--write-tickets']), ['split.mjs next p --write-tickets']);
  assert.deepEqual(labels(['slice-start', 's']), ['split.mjs start s']);
  assert.deepEqual(labels(['slice-start', 's', '--undo']), ['split.mjs start s --undo']);
  assert.deepEqual(labels(['split', 'undo', 'p', '--force']), ['split.mjs undo p --force']);
  assert.deepEqual(labels(['split', 'loss', 'p', '--final']), ['split.mjs loss p --final']);
  assert.deepEqual(labels(['split-finish', 'p']), ['split.mjs finalize p', 'openspec archive p --skip-specs -y', 'print commit line']);
  assert.deepEqual(labels(['slice-finish', 's']), ['split.mjs finish-check s', 'openspec archive s -y', 'split.mjs finish-mark s']);
  // renamed, no aliases: the old CLI names say where they went
  for (const [old, now] of [[['split', 'start', 's'], /"split start" is now "slice-start <slice>"/], [['split', 'archive', 'p'], /"split archive" is now "split-finish <parent>"/], [['split', 'finish', 's'], /"split finish" is now "slice-finish <slice>"/]]) assert.throws(() => plan(old), now);
  for (const bad of [[], ['check', 'x'], ['split'], ['split', 'bogus', 'p'], ['split', 'mark', 'p', 's', 'in-progress'], ['split', 'start'], ['split', 'apply'], ['nope', 'x'], ['next', '--strict']]) assert.throws(() => plan(bad), /usage|unknown|no command|<id>|split/i, bad.join(' '));
});

test('agent slash commands: claude, cursor, opencode each run sdd.mjs; argument hint / usage on every command', () => {
  for (const h of ['claude', 'cursor', 'opencode']) {
    for (const [name, sub] of Object.entries(NEW)) {
      const t = fs.readFileSync(path.join(TOOLKIT, 'commands', h, `sdd-${name}.md`), 'utf8');
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
    assert.match(s, /On main: \/sdd-split-next p /);
    assert.doesNotMatch(s, /node \.openspec-handoff|\.mjs/);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-init-'));
  fs.mkdirSync(path.join(dir, 'openspec'));
  const r = initCli(dir, '--tool', 'ai-hero', '--no-cursor');
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout.split('Done. Next')[1], /node \.openspec-handoff/);
  assert.match(r.stdout, /\/opsx:verify <id> \(save to execution\/verify\.md\)[\s\S]*\/sdd-split-finish <parent>/);
  assert.doesNotMatch(r.stdout, /check-handoff/);
  for (const h of ['.claude', '.cursor']) assert.ok(!fs.existsSync(path.join(dir, h, 'commands/check-handoff.md')), 'no /check-handoff command');
  for (const name of Object.keys(NEW)) assert.ok(fs.existsSync(path.join(dir, '.claude/commands', `sdd-${name}.md`)), name);
  assert.ok(fs.existsSync(path.join(dir, '.openspec-handoff/scripts/sdd.mjs')));
  assert.match(r.stdout, /\/sdd-slice-start <slice>/);
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

test('sdd-pp <command> from inside a project runs its installed scripts: tool, next, spec-check, usage errors; no check', { skip: OPENSPEC_SKIP }, () => {
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
  // a failing step stops the chain and passes its exit code through (split-finish: loss check, then openspec archive)
  r = sddPp(sub, 'split-finish', CHANGE);
  assert.notEqual(r.code, 0);
  assert.doesNotMatch(r.out, /\$ openspec archive/);
});

test('verify gets no review instruction: the schema apply instruction (what /opsx:verify reads) never mentions a review file', { skip: OPENSPEC_SKIP }, () => {
  const { dir } = makeFixture();
  assert.equal(initCli(dir, '--no-claude', '--no-cursor', '--no-opencode').status, 0);
  const r = spawnSync(OPENSPEC, ['instructions', 'apply', '--change', CHANGE, '--json'], { cwd: dir, encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  assert.match(j.instruction, /\/sdd-next-steps <change>/);
  assert.doesNotMatch(j.instruction, /review|check-handoff/i);
  // verify sees the tool's tasks: open tickets / unticked plan steps and a missing Superpowers ledger are CRITICAL
  assert.match(j.instruction, /every ticket in execution\/tickets\/ has "Status: done" and every plan step box in\s+execution\/plan-<change>\.md is ticked[\s\S]*CRITICAL[\s\S]*execution\/progress\.md[\s\S]*CRITICAL/);
});

test('sdd-pp init prints the exact commit line; with ai-hero + .claude the AGENTS.md block also goes to CLAUDE.md (idempotent)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-claude-md-'));
  fs.mkdirSync(path.join(dir, 'openspec'));
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), '# My project\n\nKeep this.\n');
  let r = initCli(dir, '--tool', 'ai-hero', '--no-cursor');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^  CLAUDE\.md block appended \(same agent skills block, for Claude Code\)$/m);
  const claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(claude, /^# My project\n\nKeep this\.\n/);
  assert.match(claude, /<!-- sdd-pp:agent-skills[\s\S]*docs\/agents\/issue-tracker\.md/);
  assert.match(r.stdout, /^Commit the setup: git add openspec \.openspec-handoff \.claude \.gitignore \.gitattributes docs\/agents AGENTS\.md CLAUDE\.md && git commit -m "setup: sdd-pp"$/m);
  // every path in the line exists, so the git add works as printed
  const paths = /git add (.*) && git commit/m.exec(r.stdout)[1].split(' ');
  for (const p of paths) assert.ok(fs.existsSync(path.join(dir, p)), p);
  r = initCli(dir, '--no-cursor');
  assert.match(r.stdout, /CLAUDE\.md block unchanged/);
  assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), claude);
  // no .claude: no CLAUDE.md
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-claude-md-'));
  fs.mkdirSync(path.join(d2, 'openspec'));
  assert.equal(initCli(d2, '--tool', 'ai-hero', '--no-claude').status, 0);
  assert.equal(fs.existsSync(path.join(d2, 'CLAUDE.md')), false);
});

test('sdd-pp spec-check <id> --check writes nothing; sdd-pp split-check (writes split-check.md) prints its commit line', () => {
  const { dir, changeDir, git } = makeFixture();
  assert.equal(initCli(dir, '--no-claude', '--no-cursor', '--no-opencode', '--no-set-default').status, 0);
  git('add', '-A'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'install');
  fs.rmSync(path.join(changeDir, 'execution', 'spec-check.md'), { force: true });
  let r = sddPp(dir, 'spec-check', CHANGE, '--check');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^PENDING: mechanical checks pass/m);
  assert.match(r.out, /\(check only: nothing written\)/);
  assert.equal(fs.existsSync(path.join(changeDir, 'execution', 'spec-check.md')), false);
  r = sddPp(dir, 'split-check', CHANGE);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^Commit the change with its deltas \(\/sdd-split-apply needs them committed - that commit is the loss-check baseline\): git add -A openspec\/changes\/add-greeting-name && git commit -m "split-check\(add-greeting-name\)"$/m);
  assert.ok(fs.existsSync(path.join(changeDir, 'execution', 'split-check.md')));
});

test('reinstall removes retired commands (check-handoff.md, split-mark.md) for claude, cursor and opencode', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-retired-'));
  fs.mkdirSync(path.join(dir, 'openspec'));
  assert.equal(initCli(dir, '--opencode', '--no-set-default').status, 0);
  const retired = ['check-handoff.md', 'split-mark.md'];
  for (const h of ['.claude', '.cursor', '.opencode']) for (const c of retired) fs.writeFileSync(path.join(dir, h, 'commands', c), 'old\n');
  const r = initCli(dir, '--no-set-default'); // .opencode/ exists, so it is reinstalled without --opencode
  assert.equal(r.status, 0, r.stderr);
  for (const h of ['.claude', '.cursor', '.opencode']) {
    assert.ok(fs.existsSync(path.join(dir, h, 'commands', 'sdd-slice-start.md')), `${h}: sdd-slice-start.md installed`);
    for (const c of retired) {
      assert.ok(!fs.existsSync(path.join(dir, h, 'commands', c)), `${h}/${c} removed`);
      assert.match(r.stdout, new RegExp(`${h.replace('.', '\\.')}/commands/${c.replace('.', '\\.')} \\(removed: retired\\)`));
    }
  }
});

test('commands are prefixed sdd-: the toolkit ships only sdd-*.md; a reinstall removes our old copies (unprefixed, or renamed: sdd-split-start, sdd-split-archive) and keeps a user\'s own same-named command', () => {
  const NAMES = ['handoff', 'tool', 'next-steps', 'spec-check', 'split-check', 'split-apply', 'split-next', 'slice-start', 'slice-finish', 'split-finish', 'split-undo'];
  // old file name -> current command (an earlier install wrote the old one)
  const OLD = { handoff: 'handoff', tool: 'tool', 'next-steps': 'next-steps', 'spec-check': 'spec-check', 'split-check': 'split-check', 'split-apply': 'split-apply', 'split-next': 'split-next', 'split-undo': 'split-undo',
    'split-start': 'slice-start', 'split-archive': 'split-finish', 'sdd-split-start': 'slice-start', 'sdd-split-archive': 'split-finish' };
  for (const h of ['claude', 'cursor', 'opencode']) {
    assert.deepEqual(fs.readdirSync(path.join(TOOLKIT, 'commands', h)).sort(), NAMES.map((n) => `sdd-${n}.md`).sort(), h);
  }
  for (const n of NAMES) assert.match(fs.readFileSync(path.join(TOOLKIT, 'commands/cursor', `sdd-${n}.md`), 'utf8'), new RegExp(`^name: /sdd-${n}\\nid: sdd-${n}$`, 'm'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-prefix-'));
  fs.mkdirSync(path.join(dir, 'openspec'));
  assert.equal(initCli(dir, '--opencode', '--no-set-default').status, 0);
  // an earlier install's unprefixed copies (ours: they use the openspec-handoff skill / scripts), plus a user's own /tool
  for (const h of ['.claude', '.cursor', '.opencode']) {
    for (const [o, n] of Object.entries(OLD)) fs.writeFileSync(path.join(dir, h, 'commands', `${o}.md`), fs.readFileSync(path.join(dir, h, 'commands', `sdd-${n}.md`), 'utf8'));
  }
  fs.writeFileSync(path.join(dir, '.claude/commands/tool.md'), '---\ndescription: my own tool command\n---\n\nRun make tool.\n');
  const r = initCli(dir, '--no-set-default');
  assert.equal(r.status, 0, r.stderr);
  for (const h of ['.claude', '.cursor', '.opencode']) {
    for (const n of NAMES) assert.ok(fs.existsSync(path.join(dir, h, 'commands', `sdd-${n}.md`)), `${h}/sdd-${n}.md`);
    for (const [o, n] of Object.entries(OLD)) {
      if (h === '.claude' && o === 'tool') continue;
      assert.ok(!fs.existsSync(path.join(dir, h, 'commands', `${o}.md`)), `${h}/${o}.md removed`);
      assert.match(r.stdout, new RegExp(`${h.replace('.', '\\.')}/commands/${o}\\.md \\(removed: now /sdd-${n}\\)`));
    }
  }
  assert.equal(fs.readFileSync(path.join(dir, '.claude/commands/tool.md'), 'utf8'), '---\ndescription: my own tool command\n---\n\nRun make tool.\n');
  assert.match(r.stdout, /\.claude\/commands\/tool\.md \(kept: not installed by sdd-pp\)/);
  // the init summary names only the prefixed commands
  const next = r.stdout.split('Done. Next')[1];
  assert.match(next, /\/sdd-tool <id> --set superpowers[\s\S]*\/sdd-handoff <id>[\s\S]*\/sdd-split-undo <parent>/);
  assert.doesNotMatch(next, /(^|[\s,(])\/(handoff|tool|next-steps|spec-check|split-[a-z]+)\b/m);
});

test('sdd-pp init: following the printed commit line leaves git status clean (openspec init .gitkeep files, skills-lock.json)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-init-clean-'));
  const git = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' }).stdout;
  git('init', '-q', '-b', 'main');
  // what openspec init and the skills CLI leave behind
  for (const f of ['openspec/specs/.gitkeep', 'openspec/changes/archive/.gitkeep']) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), ''); }
  fs.writeFileSync(path.join(dir, 'openspec/config.yaml'), 'schema: spec-driven\n');
  fs.writeFileSync(path.join(dir, 'skills-lock.json'), '{}\n');
  const r = initCli(dir, '--tool', 'superpowers', '--no-cursor');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^Commit the setup: git add openspec \.openspec-handoff \.claude \.gitignore \.gitattributes skills-lock\.json && git commit -m "setup: sdd-pp"$/m);
  runPrinted(dir, r.stdout, 'Commit the setup');
  assert.equal(git('status', '--porcelain'), '', 'nothing left untracked after the printed line');
});

test('no double prefix and no retired names in anything init installs or the CLI prints (sdd-sdd-, /sdd-split-start, /sdd-split-archive); old CLI names exit 2 naming the new one', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmd-dbl-'));
  fs.mkdirSync(path.join(dir, 'openspec'));
  assert.equal(initCli(dir, '--claude', '--cursor', '--opencode', '--no-set-default').status, 0);
  const bad = /sdd-sdd-|\/sdd-split-start\b|\/sdd-split-archive\b|sdd-pp split (start|archive|finish)\b/;
  const hits = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') walk(f); } else if (/\.(md|mdc|yaml|json|mjs|txt)$/.test(e.name) && bad.test(fs.readFileSync(f, 'utf8'))) hits.push(path.relative(dir, f));
    }
  };
  walk(dir);
  assert.deepEqual(hits, []);
  for (const f of ['sdd-slice-start.md', 'sdd-split-finish.md']) assert.ok(fs.existsSync(path.join(dir, '.claude/commands', f)), f);
  for (const [old, now] of [['start', 'slice-start <slice>'], ['archive', 'split-finish <parent>'], ['finish', 'slice-finish <slice>']]) {
    const r = spawnSync(process.execPath, [CLI, 'split', old, 'x'], { cwd: dir, encoding: 'utf8' });
    assert.equal(r.status, 2, old);
    assert.match(r.stderr + r.stdout, new RegExp(`"split ${old}" is now "${now}"`));
  }
  for (const [tool, mode] of [['ai-hero', 'implement'], ['superpowers', 'subagent-driven-development']]) {
    for (const parent of [null, 'p']) assert.doesNotMatch(nextSteps({ id: 'x', tool, applyMode: mode, parent }), bad);
  }
});
