// v3 setup phase: execution tool chosen up front (project default / per-change override),
// design session file in the proposal phase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, CHANGE, CLI, makeFixture, setHandoff, run, initCli, OPENSPEC_SKIP, runPrinted } from './helpers.mjs';

const ex = (dir) => path.join(dir, 'openspec', 'changes', CHANGE, 'execution');
const warns = (dir) => JSON.parse(run('split-check.mjs', [CHANGE, '--json'], dir).stdout).warnings.join('\n');

test('execution-tool: project default, per-change override, refusal to switch after the session', () => {
  const { dir, changeDir } = makeFixture();
  fs.rmSync(path.join(dir, '.openspec-handoff', 'project.json'));
  fs.rmSync(path.join(changeDir, 'handoff.md'));
  fs.rmSync(path.join(ex(dir), 'grill.md'));
  let r = run('execution-tool.mjs', [CHANGE], dir);
  assert.equal(r.code, 1); assert.match(r.out, /no execution tool set/);
  r = run('execution-tool.mjs', ['--default', 'ai-hero'], dir);
  assert.match(r.out, /^Commit: git add \.openspec-handoff\/project\.json && git commit -m "setup: default execution tool ai-hero"$/m);
  assert.equal(r.code, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, '.openspec-handoff/project.json'), 'utf8')).defaultTool, 'ai-hero');
  r = run('execution-tool.mjs', [CHANGE, '--json'], dir);
  assert.deepEqual({ ...JSON.parse(r.stdout) }, { change: CHANGE, tool: 'ai-hero', source: '.openspec-handoff/project.json (project default)', projectDefault: 'ai-hero', override: false, sessionFile: 'execution/grill.md', sessionSkill: 'grill-with-docs', sessionStarted: false });
  // per-change override: starts execution/brainstorm.md with front matter
  r = run('execution-tool.mjs', [CHANGE, '--set', 'superpowers'], dir);
  assert.equal(r.code, 0, r.out); assert.match(r.out, /superpowers .*overrides project default ai-hero/);
  assert.match(fs.readFileSync(path.join(ex(dir), 'brainstorm.md'), 'utf8'), /^---\ntool: superpowers\nsession: brainstorming\n---/);
  // switching back after the session started is refused (redo the session)
  fs.appendFileSync(path.join(ex(dir), 'brainstorm.md'), '\n## Understanding\n\nThe user wants names in greetings.\n');
  r = run('execution-tool.mjs', [CHANGE, '--set', 'ai-hero'], dir);
  assert.equal(r.code, 1); assert.match(r.out, /switching tools means redoing the session/i);
  assert.equal(run('execution-tool.mjs', [CHANGE, '--set', 'nope'], dir).code, 2);
});

test('/sdd-tool <id> (show) writes nothing; --set starts the session file and prints the commit line; a stub-only session counts as not started, so --set can replace it', () => {
  const { dir, changeDir, git } = makeFixture();
  fs.rmSync(path.join(changeDir, 'handoff.md'));
  fs.rmSync(path.join(ex(dir), 'grill.md'));
  git('add', '-A'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'no session yet');
  const clean = () => assert.equal(git('status', '--porcelain'), '', 'nothing written');
  let r = run('execution-tool.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
  assert.equal(r.out.trim(), `${CHANGE}: ai-hero (from .openspec-handoff/project.json (project default)) -> design session: grill-with-docs -> execution/grill.md (not started)`);
  clean();
  assert.equal(run('execution-tool.mjs', [CHANGE, '--json'], dir).code, 0); clean();
  // --set writes the stub + the exact commit line
  r = run('execution-tool.mjs', [CHANGE, '--set', 'ai-hero'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /-> execution\/grill\.md \(created\)\nCommit with the change: git add -A openspec\/changes\/add-greeting-name && git commit -m "tool\(add-greeting-name\): ai-hero"/);
  assert.equal(fs.readFileSync(path.join(ex(dir), 'grill.md'), 'utf8'), `---\ntool: ai-hero\nsession: grill-with-docs\n---\n\n> Links: [proposal](../proposal.md) · specs: [greeting](../specs/greeting/spec.md)\n\n# grill-with-docs session: ${CHANGE}\n`);
  assert.match(run('execution-tool.mjs', [CHANGE], dir).out, /\(not started\)/, 'the stub is not a started session');
  runPrinted(dir, r.out, 'Commit with the change'); clean();
  // the stub does not lock the tool: --set superpowers replaces it
  r = run('execution-tool.mjs', [CHANGE, '--set', 'superpowers'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /replaced the unused execution\/grill\.md stub \(no design session in it yet\)/);
  // B12: the printed line stages the committed stub's deletion too, so following it leaves a clean tree
  assert.match(r.out, /^Commit with the change: git add -A openspec\/changes\/add-greeting-name && git commit -m "tool\(add-greeting-name\): superpowers"$/m);
  runPrinted(dir, r.out, 'Commit with the change'); clean();
  assert.equal(git('ls-files', 'openspec/changes/add-greeting-name/execution/grill.md').trim(), '', 'the stub is gone from HEAD too');
  assert.equal(fs.existsSync(path.join(ex(dir), 'grill.md')), false);
  assert.match(fs.readFileSync(path.join(ex(dir), 'brainstorm.md'), 'utf8'), /^---\ntool: superpowers\n/);
  // ... and back again
  assert.equal(run('execution-tool.mjs', [CHANGE, '--set', 'ai-hero'], dir).code, 0);
  // once the session has content, a switch is refused
  fs.appendFileSync(path.join(ex(dir), 'grill.md'), '\nQ1: who greets? A: the CLI\n');
  r = run('execution-tool.mjs', [CHANGE, '--set', 'superpowers'], dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /refused: execution\/grill\.md already holds an ai-hero design session/);
  assert.doesNotMatch(run('execution-tool.mjs', [CHANGE], dir).out, /not started|created/);
});

test('split-check: new capability delta without ## Purpose warns (archive would write TBD)', () => {
  const { dir, changeDir } = makeFixture();
  const cap = path.join(changeDir, 'specs', 'farewell', 'spec.md');
  fs.mkdirSync(path.dirname(cap), { recursive: true });
  const body = '## ADDED Requirements\n\n### Requirement: Farewell\nThe system SHALL say goodbye.\n\n#### Scenario: Bye\n- **WHEN** run\n- **THEN** bye\n';
  fs.writeFileSync(cap, body);
  assert.match(warns(dir), /specs\/farewell\/spec\.md: new capability without "## Purpose"/);
  fs.writeFileSync(cap, '## Purpose\n\nSay goodbye to the user when the command line tool exits normally.\n\n' + body);
  assert.doesNotMatch(warns(dir), /Purpose/);
  // modified capability (main spec exists): no Purpose needed
  assert.doesNotMatch(warns(dir), /specs\/greeting\/spec\.md: new capability/);
});

test('sdd-pp init --tool writes the project default; a later install keeps it', { skip: OPENSPEC_SKIP }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-tool-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  spawnSync(OPENSPEC, ['init', '--tools', 'none', '--no-animation', '.'], { cwd: dir });
  let r = initCli(dir, '--no-claude', '--no-cursor');
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /WARNING: no default execution tool/);
  r = initCli(dir, '--tool', 'superpowers', '--no-claude', '--no-cursor');
  assert.equal(r.status, 0, r.stderr);
  const pj = path.join(dir, '.openspec-handoff', 'project.json');
  assert.equal(JSON.parse(fs.readFileSync(pj, 'utf8')).defaultTool, 'superpowers');
  r = initCli(dir, '--force', '--no-claude', '--no-cursor');
  assert.match(r.stdout, /project\.json \(kept: "defaultTool": "superpowers"\)/);
  assert.equal(initCli(dir, '--tool=bogus').status, 2);
});

test('commit lines cover the whole change and AI Hero project docs: tool --set on a brand-new change (.openspec.yaml), GLOSSARY.md + docs/adr/, spec-check --accept after a delta edit - git status clean after each', () => {
  const { dir, git } = makeFixture();
  const status = () => git('status', '--porcelain');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qam', 'handoff base_ref');
  // a brand-new change: only .openspec.yaml (as `openspec new change` writes it), plus grill-with-docs' project docs
  const nc = path.join(dir, 'openspec/changes/add-thing');
  fs.mkdirSync(nc, { recursive: true });
  fs.writeFileSync(path.join(nc, '.openspec.yaml'), 'schema: handoff-driven\ncreated: 2026-10-10\n');
  fs.writeFileSync(path.join(dir, 'GLOSSARY.md'), '# Glossary\n\n- thing: a thing\n');
  fs.mkdirSync(path.join(dir, 'docs/adr'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs/adr/0001-things.md'), '# ADR 1\n');
  let r = run('execution-tool.mjs', ['add-thing', '--set', 'ai-hero'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^Commit with the change: git add -A openspec\/changes\/add-thing GLOSSARY\.md docs\/adr && git commit -m "tool\(add-thing\): ai-hero"$/m);
  runPrinted(dir, r.out, 'Commit with the change');
  assert.equal(status(), '', 'nothing left untracked');
  // spec-check --accept after a delta edit: the edited delta is in the printed line too
  const c = path.join(dir, 'openspec/changes', CHANGE);
  const delta = path.join(c, 'specs/greeting/spec.md');
  fs.writeFileSync(delta, fs.readFileSync(delta, 'utf8').replace('#### Scenario: Name given', '#### Scenario: Name given\n<!-- tightened -->'));
  fs.appendFileSync(path.join(dir, 'GLOSSARY.md'), '- name: what the user types\n');
  r = run('spec-check.mjs', [CHANGE, '--write'], dir);
  const rep = path.join(c, 'execution/spec-check.md');
  fs.writeFileSync(rep, fs.readFileSync(rep, 'utf8').replace(/^PENDING: .*$/m, 'PASS').replace(/<!-- \/sdd-spec-check: the agent reads[^>]*-->/, '- Missing: none'));
  r = run('spec-check.mjs', [CHANGE, '--accept'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /git add -A openspec\/changes\/add-greeting-name GLOSSARY\.md && git commit -m "spec-check\(add-greeting-name\): PASS"$/m, 'only the changed project doc: docs/adr is committed and unchanged');
  const m = /(git add -A [^\n]*&& git commit -m "[^"]*")/.exec(r.out);
  assert.equal(spawnSync('bash', ['-c', m[1]], { cwd: dir }).status, 0);
  assert.equal(status(), '', 'delta edit, report, baseline and glossary committed');
  // nothing changed in GLOSSARY.md / docs/adr: they are left out of the line
  r = run('execution-tool.mjs', ['add-thing', '--set', 'superpowers'], dir);
  assert.match(r.out, /^Commit with the change: git add -A openspec\/changes\/add-thing && git commit/m, r.out);
});

test('sdd-pp handoff-draft pre-fills handoff.md (change, tool, base_ref, every delta + session link, size) leaving only apply_mode / harness / notes; refuses to overwrite; for a slice it links the parent', () => {
  const { dir, changeDir, git } = makeFixture();
  fs.rmSync(path.join(changeDir, 'handoff.md'));
  fs.writeFileSync(path.join(changeDir, 'execution/split-check.md'), '# split-check\n'); // written before the handoff, not committed yet
  const cli = (...a) => { const r = spawnSync(process.execPath, [CLI, ...a], { cwd: dir, encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr }; };
  let r = cli('handoff-draft', CHANGE);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^handoff-draft add-greeting-name: wrote openspec\/changes\/add-greeting-name\/handoff\.md \(tool ai-hero, base_ref [0-9a-f]{7}; links, deltas and size filled\)$/m);
  assert.match(r.out, /Left for you: apply_mode, harness \(optional\)[^\n]*git add -A openspec\/changes\/add-greeting-name && git commit -m "handoff\(add-greeting-name\): ai-hero"/, 'the whole change folder');
  const h = fs.readFileSync(path.join(changeDir, 'handoff.md'), 'utf8');
  assert.match(h, /^change: add-greeting-name$/m);
  assert.match(h, /^tool: ai-hero$/m);
  assert.match(h, new RegExp(`^base_ref: ${git('rev-parse', 'HEAD')}$`, 'm'));
  assert.match(h, /^apply_mode: <implement \| implement-spec>$/m, 'judgment field left, only this tool\'s modes');
  assert.match(h, /^  - \[specs\/greeting\/spec\.md\]\(specs\/greeting\/spec\.md\)$/m);
  assert.match(h, /^- Design session \(proposal phase\): \[execution\/grill\.md\]\(execution\/grill\.md\)$/m);
  assert.match(h, /^- Requirements in deltas: 2 \(budget 5\)$/m);
  assert.match(h, /^- Split decision: fits$/m);
  assert.doesNotMatch(h, /brainstorm|writing-plans|<capability>|<base_ref>/, 'only the chosen tool\'s rows, real deltas, no literal placeholders');
  assert.match(h, /^Implementation diff: `git diff main\.\.\.HEAD -- \. ':!openspec'` \(since the branch point with main/m);
  // the filled draft is a valid handoff once apply_mode is chosen
  fs.writeFileSync(path.join(changeDir, 'handoff.md'), h.replace(/^apply_mode: .*$/m, 'apply_mode: implement').replace(/^harness: .*\n/m, ''));
  runPrinted(dir, r.out, 'Left for you');
  assert.equal(git('status', '--porcelain'), '', 'the printed commit line leaves a clean tree');
  const cs = cli('change-status', CHANGE).out;
  assert.match(cs, /^Next steps for add-greeting-name \(ai-hero, apply_mode: implement\)/m);
  assert.match(cs, /Review the branch's own diff: git diff main\.\.\.HEAD -- \. ':!openspec' \(three dots = since the branch point with main/);
  r = cli('handoff-draft', CHANGE);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /handoff\.md exists - edit it \(nothing overwritten\)/);
});
