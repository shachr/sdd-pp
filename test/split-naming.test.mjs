// Slice naming: <parent>-<nn>-<slice>. The proposal lists the slice part + order; split apply builds
// (or validates) the full id; the cleanup slice uses 99; a re-split continues the numbering.
// Also the split commands through `sdd-pp split apply`, `split-status`, `slice-start`, `split-finish`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, CLI, run, initCli, OPENSPEC_SKIP } from './helpers.mjs';
import { nameSlices, parseSliceId } from '../scripts/lib/split.mjs';

const W = (dir, rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
const R = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const req = (name, scen) => `### Requirement: ${name}\nThe system SHALL support ${name.toLowerCase()} in every count.\n\n#### Scenario: ${scen}\n- **WHEN** ${scen.toLowerCase()} happens\n- **THEN** the count shows it\n`;
const S = (id, o = {}) => ({ id, depends_on: [], capabilities: [], requirements: [], split: [], flag: null, ...o });
const P = 'add-text-stats';
const ENV = { ...process.env, PATH: `${path.dirname(OPENSPEC)}${path.delimiter}${process.env.PATH}` };

function project(slices) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'naming-'));
  W(dir, 'openspec/config.yaml', 'schema: handoff-driven\n');
  W(dir, 'openspec/specs/.gitkeep', '');
  fs.cpSync(path.join(TOOLKIT, 'schemas'), path.join(dir, 'openspec', 'schemas'), { recursive: true });
  const c = `openspec/changes/${P}`;
  W(dir, `${c}/.openspec.yaml`, 'schema: handoff-driven\ncreated: 2026-10-10\n');
  W(dir, `${c}/proposal.md`, '# Proposal\n\n## Why\n\nWriters want quick statistics about their texts while they edit them.\n\n## What Changes\n\n- Text statistics and a command line tool.\n');
  W(dir, `${c}/specs/text-stats/spec.md`, `## Purpose\n\nCounts words and characters in a text so writers can check its length.\n\n## ADDED Requirements\n\n${req('Word count', 'Count words')}\n${req('Character count', 'Count characters')}\n`);
  W(dir, `${c}/specs/stats-cli/spec.md`, `## Purpose\n\nA command line tool that prints text statistics for a file.\n\n## ADDED Requirements\n\n${req('CLI output', 'Print stats')}\n${req('CLI flag', 'Flag off')}\n`);
  W(dir, `${c}/specs/stats-api/spec.md`, `## Purpose\n\nA small programming interface that returns text statistics as an object.\n\n## ADDED Requirements\n\n${req('Stats object', 'Get stats')}\n`);
  W(dir, `${c}/execution/split-proposal.md`, `---\napproved_by: engineer (test)\n---\n\n## Slices\n\n${slices}`);
  const g = (...a) => { const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout; };
  g('init', '-q', '-b', 'main'); g('config', 'user.name', 't'); g('config', 'user.email', 't@t'); g('add', '-A'); g('commit', '-qm', 'deltas');
  return { dir, c, g };
}
const CORE = '### Slice: core\n- order: 01\n- goal: Counts\n- capabilities: text-stats, stats-api\n- requirements: Word count; Character count; Stats object\n- depends_on: none\n- flag: none\n\n';
const CLI_ = '### Slice: cli\n- order: 02\n- goal: Command line tool behind a flag\n- capabilities: stats-cli\n- requirements: CLI output; CLI flag\n- depends_on: core\n- flag: stats-cli\n\n';
const CLEAN = '### Slice: remove-flag\n- goal: Remove the stats-cli flag\n- capabilities: stats-cli\n- depends_on: cli\n- removes_flag: stats-cli\n';

test('nameSlices: parts + order -> <parent>-<nn>-<slice>; cleanup 99; missing orders filled; full ids validated', () => {
  let r = nameSlices([S('core', { order: '01' }), S('cli', { order: '02', depends_on: ['core'] }), S('remove-flag', { removes_flag: 'f', depends_on: ['cli'] })], P);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.slices.map((s) => s.id), ['add-text-stats-01-core', 'add-text-stats-02-cli', 'add-text-stats-99-remove-flag']);
  assert.deepEqual(r.slices[2].depends_on, ['add-text-stats-02-cli']);
  r = nameSlices([S('a'), S('b', { order: '01' }), S('c')], P);
  assert.deepEqual(r.slices.map((s) => s.id), ['add-text-stats-02-a', 'add-text-stats-01-b', 'add-text-stats-03-c'], 'explicit orders first, then the gaps in order');
  r = nameSlices([S('add-text-stats-01-core'), S('02-cli')], P);
  assert.deepEqual([r.errors, r.slices.map((s) => s.id)], [[], ['add-text-stats-01-core', 'add-text-stats-02-cli']], 'a matching full id (or nn-part) is accepted');
  assert.deepEqual(nameSlices([S('add-text-stats-core', { order: '01' })], P).errors, ['slice "add-text-stats-core": not a slice name of add-text-stats - expected "add-text-stats-01-core" (list only the slice part, e.g. "### Slice: core", plus "- order: NN")']);
  assert.match(nameSlices([S('add-text-stats-01-core', { order: '02' })], P).errors[0], /"- order: 02" does not match the order in its name \(01\)/);
  assert.match(nameSlices([S('remove-flag', { order: '03', removes_flag: 'f' })], P).errors[0], /cleanup slice \(removes_flag\) uses order 99 - expected "add-text-stats-99-remove-flag"/);
  assert.match(nameSlices([S('core', { order: '99' })], P).errors[0], /order 99 is reserved for the flag cleanup slice/);
  assert.match(nameSlices([S('core', { order: '1' })], P).errors[0], /must be two digits/);
  assert.match(nameSlices([S('a', { order: '01' }), S('b', { order: '01' })], P).errors[0], /both use order 01/);
  // re-split: continues after the highest existing order (99 does not count)
  r = nameSlices([S('cli-parse'), S('cli-print', { depends_on: ['cli-parse'] })], P, { existing: ['add-text-stats-01-core', 'add-text-stats-02-cli', 'add-text-stats-99-remove-flag'] });
  assert.deepEqual(r.slices.map((s) => `${s.id} <- ${s.depends_on}`), ['add-text-stats-03-cli-parse <- ', 'add-text-stats-04-cli-print <- add-text-stats-03-cli-parse']);
  assert.match(nameSlices([S('x', { order: '02' })], P, { existing: ['add-text-stats-02-cli'] }).errors[0], /order 02 is already used in add-text-stats - a re-split continues the numbering/);
  assert.deepEqual(parseSliceId('add-text-stats-07-a-b', P), { order: '07', part: 'a-b' });
  assert.equal(parseSliceId('other-07-a', P), null);
});

test('split-check shows the ids split apply will create; split apply builds them and refuses a wrong full id with the expected name', () => {
  let { dir, c, g } = project(CORE + CLI_ + CLEAN);
  let r = run('split-check.mjs', [P], dir);
  assert.match(r.out, /\| add-text-stats-01-core \|[\s\S]*\| add-text-stats-02-cli \|[\s\S]*\| add-text-stats-99-remove-flag \|/);
  assert.match(r.out, /Approved\. Apply[^\n]*\/sdd-split-apply add-text-stats/);
  r = run('split.mjs', ['apply', P], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /children: add-text-stats-01-core, add-text-stats-02-cli, add-text-stats-99-remove-flag/);
  assert.match(r.out, /slice ids \(<parent>-<nn>-<slice>\): core -> add-text-stats-01-core, cli -> add-text-stats-02-cli, remove-flag -> add-text-stats-99-remove-flag/);
  assert.match(R(dir, `${c}/slices.md`), /### Slice: add-text-stats-99-remove-flag\n[\s\S]*?- depends_on: add-text-stats-02-cli/);
  assert.ok(fs.existsSync(path.join(dir, 'openspec/changes/add-text-stats-01-core/specs/text-stats/spec.md')));
  ({ dir, c, g } = project(CORE + CLI_.replace('### Slice: cli\n- order: 02', '### Slice: add-text-stats-cli\n- order: 02') + CLEAN));
  r = run('split.mjs', ['apply', P], dir);
  assert.equal(r.code, 1, "a refusal is exit 1");
  assert.match(r.out, /expected "add-text-stats-02-cli"/);
  assert.ok(!fs.existsSync(path.join(dir, 'openspec/changes/add-text-stats-cli')), 'nothing created');
  ({ dir } = project(CORE + CLI_ + CLEAN.replace('- goal: Remove', '- order: 03\n- goal: Remove')));
  r = run('split.mjs', ['apply', P], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /uses order 99 - expected "add-text-stats-99-remove-flag"/);
});

test('re-split into the same parent continues the numbering', () => {
  const { dir } = project(CORE + CLI_ + CLEAN);
  run('split.mjs', ['apply', P], dir);
  W(dir, 'openspec/changes/add-text-stats-02-cli/execution/split-proposal.md', '---\napproved_by: engineer (test)\n---\n\n## Slices\n\n### Slice: cli-output\n- goal: Statistics on the console\n- capabilities: stats-cli\n- requirements: CLI output\n- depends_on: none\n- flag: stats-cli\n\n### Slice: cli-flag\n- goal: Flag\n- capabilities: stats-cli\n- requirements: CLI flag; Feature flag stats-cli\n- depends_on: cli-output\n- flag: stats-cli\n');
  const r = run('split.mjs', ['apply', 'add-text-stats-02-cli'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /re-split into parent add-text-stats; children: add-text-stats-03-cli-output, add-text-stats-04-cli-flag/);
  assert.match(R(dir, 'openspec/changes/add-text-stats/slices.md'), /### Slice: add-text-stats-99-remove-flag\n[\s\S]*?- depends_on: add-text-stats-03-cli-output, add-text-stats-04-cli-flag/);
});

test('sdd-pp split apply | next | start | archive from inside the project (archive = final loss check + openspec archive --skip-specs)', { skip: OPENSPEC_SKIP }, () => {
  const { dir, g } = project(CORE + '### Slice: cli\n- order: 02\n- goal: Command line tool\n- capabilities: stats-cli\n- requirements: CLI output; CLI flag\n- depends_on: core\n- flag: none\n');
  assert.equal(initCli(dir, '--no-claude', '--no-cursor', '--no-opencode', '--no-set-default').status, 0);
  g('add', '-A'); g('commit', '-qm', 'install');
  const sdd = (...a) => { const r = spawnSync(process.execPath, [CLI, ...a], { cwd: path.join(dir, 'openspec'), encoding: 'utf8', env: ENV }); return { code: r.status, out: r.stdout + r.stderr }; };
  let r = sdd('split', 'apply', P);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /children: add-text-stats-01-core, add-text-stats-02-cli/);
  r = sdd('split-status', P);
  assert.match(r.out, /Ready now: add-text-stats-01-core/);
  assert.match(r.out, /Tickets written: none new/);
  assert.ok(fs.existsSync(path.join(dir, 'openspec/changes/add-text-stats/tickets/add-text-stats-01-core.md')), 'apply wrote the READY ticket');
  r = sdd('slice-start', 'add-text-stats-02-cli');
  assert.equal(r.code, 1, 'refused: depends on core, not archived');
  assert.match(r.out, /REFUSED - "add-text-stats-02-cli" is not READY: it waits for add-text-stats-01-core/);
  r = sdd('slice-start', 'add-text-stats-01-core');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /slice-start add-text-stats-01-core: in-progress in openspec\/changes\/add-text-stats\/slices\.md \(parent add-text-stats\)/);
  assert.match(r.out, /git switch -c change\/add-text-stats-01-core main/);
  assert.match(r.out, /\/sdd-handoff add-text-stats-01-core/);
  r = sdd('split-finish', P);
  assert.equal(r.code, 1, 'refused while slices are not archived');
  assert.match(r.out, /split-finish add-text-stats: REFUSED - 2 slices not archived: add-text-stats-01-core \(in progress\), add-text-stats-02-cli \(planned\)/);
  assert.doesNotMatch(r.out, /loss-check|\$ openspec archive/, 'stops before the final loss check');
  for (const id of ['add-text-stats-01-core', 'add-text-stats-02-cli']) {
    const a = spawnSync(OPENSPEC, ['archive', id, '--yes'], { cwd: dir, encoding: 'utf8' });
    assert.equal(a.status, 0, a.stdout + a.stderr);
  }
  r = sdd('split-status', P);
  assert.match(r.out, /all slices done; finish the parent: \/sdd-split-finish add-text-stats/);
  // change-status on an archived slice: done, the archive path, and (all archived) the parent's finish
  const cs = sdd('change-status', 'add-text-stats-02-cli');
  assert.equal(cs.code, 0, cs.out);
  assert.match(cs.out, /^add-text-stats-02-cli is done: archived in openspec\/changes\/archive\/\d{4}-\d\d-\d\d-add-text-stats-02-cli\/ - every step is \[done\]\. Slice of add-text-stats: every slice is archived - finish the parent: \/sdd-split-finish add-text-stats\.$/m);
  assert.doesNotMatch(cs.out, /openspec\/changes\/add-text-stats-02-cli\//, 'no live path');
  // slices.md says done for archived slices, and the commit line is printed
  assert.match(r.out, /slices\.md: status done for add-text-stats-01-core, add-text-stats-02-cli \(archived folder present\)/);
  assert.match(r.out, /Commit on main: git add openspec\/changes\/add-text-stats && git commit -m "split-status: add-text-stats \(done: add-text-stats-01-core, add-text-stats-02-cli\)"/);
  const sl = R(dir, 'openspec/changes/add-text-stats/slices.md');
  assert.match(sl, /### Slice: add-text-stats-01-core\n[\s\S]*?- status: done/);
  assert.match(sl, /### Slice: add-text-stats-02-cli\n[\s\S]*?- status: done/);
  assert.doesNotMatch(sdd('split-status', P).out, /status done for/, 'marked once');
  r = sdd('split-finish', P);
  assert.equal(r.code, 0, r.out);
  assert.match(sdd('change-status', P).out, /^add-text-stats is done: archived in openspec\/changes\/archive\/[^\n]*The split is finished/m, 'archived parent: done, not split-finish');
  assert.match(sdd('change-status', 'add-text-stats-01-core').out, /Slice of add-text-stats, which is archived too: the split is finished\./);
  const ss = sdd('split-status', P);
  assert.equal(ss.code, 0, ss.out);
  assert.match(ss.out, /^split-status add-text-stats: done - the split is finished \(parent archived in openspec\/changes\/archive\/\d{4}-\d\d-\d\d-add-text-stats\/ after every slice\)\. Nothing left to do\.$/m);
  assert.doesNotMatch(ss.out, /split-finish|Commit on main/, 'no stale finish hint, nothing written');
  assert.match(r.out, /\$ split\.mjs finalize add-text-stats[\s\S]*final, before archiving the parent\): PASS[\s\S]*\$ openspec archive add-text-stats --skip-specs -y/);
  // the commit line is the last thing on screen, after OpenSpec's archive output
  assert.equal(r.out.trim().split('\n').at(-1), 'Commit the archive: git add -A openspec/changes && git commit -m "split: finish parent add-text-stats"');
  const arch = fs.readdirSync(path.join(dir, 'openspec/changes/archive'));
  assert.ok(arch.some((a) => /^\d{4}-\d\d-\d\d-add-text-stats$/.test(a)), arch.join(', '));
  assert.ok(arch.some((a) => /^\d{4}-\d\d-\d\d-add-text-stats-01-core$/.test(a)));
});

// ---------------------------------------------------------------- /sdd-slice-finish, driven through the sdd-pp CLI
function finishProject() {
  const p = project(CORE + '### Slice: cli\n- order: 02\n- goal: Command line tool\n- capabilities: stats-cli\n- requirements: CLI output; CLI flag\n- depends_on: core\n- flag: none\n');
  assert.equal(initCli(p.dir, '--no-claude', '--no-cursor', '--no-opencode', '--no-set-default').status, 0);
  p.g('add', '-A'); p.g('commit', '-qm', 'install');
  p.sdd = (...a) => { const r = spawnSync(process.execPath, [CLI, ...a], { cwd: p.dir, encoding: 'utf8', env: ENV }); return { code: r.status, out: r.stdout + r.stderr }; };
  assert.equal(p.sdd('split', 'apply', P).code, 0);
  p.g('add', '-A'); p.g('commit', '-qm', 'planning PR');
  return p;
}
const CORE_ID = 'add-text-stats-01-core';
const archived = (dir, id) => fs.readdirSync(path.join(dir, 'openspec/changes/archive')).some((a) => a.endsWith(`-${id}`));

test('sdd-pp slice-finish (ai-hero): verify.md present -> openspec archive, status done in slices.md, commit line', { skip: OPENSPEC_SKIP }, () => {
  const { dir, sdd } = finishProject();
  assert.equal(sdd('slice-start', CORE_ID).code, 0);
  assert.equal(sdd('tool', CORE_ID, '--set', 'ai-hero').code, 0);
  W(dir, `openspec/changes/${CORE_ID}/execution/verify.md`, '# Verify\n\nNo critical issues.\n');
  // --run-tests: no test command declared -> refused; failing tests -> refused; nothing archived either way
  let t = sdd('slice-finish', CORE_ID, '--run-tests');
  assert.equal(t.code, 1, t.out);
  assert.match(t.out, /REFUSED - --run-tests: no test command declared \(package\.json "scripts\.test"\) - nothing archived/);
  W(dir, 'package.json', JSON.stringify({ name: 'x', scripts: { test: 'node -e "process.exit(3)"' } }));
  t = sdd('slice-finish', CORE_ID, '--run-tests');
  assert.equal(t.code, 1, t.out);
  assert.match(t.out, /REFUSED - npm test failed \(exit 3\) - nothing archived/);
  assert.doesNotMatch(t.out, /\$ openspec archive/);
  assert.ok(!fs.existsSync(path.join(dir, 'openspec/changes/archive')) || !archived(dir, CORE_ID));
  W(dir, 'package.json', JSON.stringify({ name: 'x', scripts: { test: 'node -e "process.exit(0)"' } }));
  const r = sdd('slice-finish', CORE_ID, '--run-tests');
  assert.match(r.out, /^\$ run-tests\.mjs add-text-stats-01-core\nslice finish add-text-stats-01-core: running the project's tests[\s\S]*slice finish add-text-stats-01-core: tests pass$/m);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^\$ split\.mjs finish-check add-text-stats-01-core\nslice finish add-text-stats-01-core: execution\/verify\.md present \(ai-hero\); archiving the slice \(parent add-text-stats\)$/m);
  assert.match(r.out, /^\$ openspec archive add-text-stats-01-core -y$/m);
  assert.match(r.out, /^slice finish add-text-stats-01-core: archived to openspec\/changes\/archive\/\d{4}-\d\d-\d\d-add-text-stats-01-core; status done in openspec\/changes\/add-text-stats\/slices\.md$/m);
  assert.match(r.out, /^Commit with the slice's PR: git add -A openspec\/changes openspec\/specs && git commit -m "archive\(add-text-stats-01-core\): finish slice of add-text-stats"$/m);
  assert.ok(archived(dir, CORE_ID));
  assert.ok(fs.existsSync(path.join(dir, 'openspec/specs/text-stats/spec.md')), 'the delta was synced into the main specs');
  assert.match(R(dir, 'openspec/changes/add-text-stats/slices.md'), /### Slice: add-text-stats-01-core\n[\s\S]*?- status: done/);
  // finished: a second run is refused, and the next slice is ready
  const again = sdd('slice-finish', CORE_ID);
  assert.equal(again.code, 1, again.out);
  assert.match(again.out, /slice finish add-text-stats-01-core: REFUSED - "add-text-stats-01-core" is already archived\./);
  assert.match(sdd('split-status', P).out, /Ready now: add-text-stats-02-cli/);
});

test('sdd-pp slice-finish refuses (exit 1, nothing archived): missing verify.md, missing progress.md for superpowers, not a slice, not in progress', () => {
  const { dir, sdd } = finishProject();
  const nothingArchived = () => assert.ok(!fs.existsSync(path.join(dir, 'openspec/changes/archive')) || !archived(dir, CORE_ID));
  // not a slice: the parent itself, and an unknown id
  let r = sdd('slice-finish', P);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /slice finish add-text-stats: REFUSED - "add-text-stats" is not a slice of any split parent[^\n]*For a normal change use \/opsx:archive add-text-stats\./);
  assert.doesNotMatch(r.out, /\$ openspec archive/);
  // a planned slice (not taken)
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /REFUSED - "add-text-stats-01-core" is planned, not in progress - take it first with \/sdd-slice-start add-text-stats-01-core\./);
  // in progress, no verify.md
  assert.equal(sdd('slice-start', CORE_ID).code, 0);
  assert.equal(sdd('tool', CORE_ID, '--set', 'superpowers').code, 0);
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /REFUSED - 2 problems in add-text-stats-01-core - nothing archived\.[^\n]*\n  missing: openspec\/changes\/add-text-stats-01-core\/execution\/verify\.md \(run \/opsx:verify and save the report there\)\n  missing: openspec\/changes\/add-text-stats-01-core\/execution\/progress\.md \(copy the Superpowers ledger there\)$/m);
  assert.doesNotMatch(r.out, /\$ openspec archive/);
  nothingArchived();
  // superpowers: verify.md alone is not enough
  W(dir, `openspec/changes/${CORE_ID}/execution/verify.md`, '# Verify\n\nNo critical issues.\n');
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /REFUSED - 1 problem in add-text-stats-01-core - nothing archived\.[^\n]*\n  missing: openspec\/changes\/add-text-stats-01-core\/execution\/progress\.md \(copy the Superpowers ledger there\)$/m);
  assert.doesNotMatch(r.out, /verify\.md \(run/);
  nothingArchived();
  assert.match(R(dir, 'openspec/changes/add-text-stats/slices.md'), /### Slice: add-text-stats-01-core\n[\s\S]*?- status: in-progress/, 'slices.md untouched');
  if (OPENSPEC_SKIP) return;
  W(dir, `openspec/changes/${CORE_ID}/execution/progress.md`, '# Progress\n\n- task 1 done\n');
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /execution\/verify\.md and execution\/progress\.md present \(superpowers\)/);
  assert.ok(archived(dir, CORE_ID));
});

test('sdd-pp slice-finish refuses open work (exit 1, nothing archived): open tickets, CRITICAL issues in verify.md, unticked plan steps, TODO(agent:) placeholders - each listed', () => {
  const { dir, sdd } = finishProject();
  const ex = (f) => `openspec/changes/${CORE_ID}/execution/${f}`;
  assert.equal(sdd('slice-start', CORE_ID).code, 0);
  assert.equal(sdd('tool', CORE_ID, '--set', 'ai-hero').code, 0);
  W(dir, ex('verify.md'), '# Verify\n\n### Issues by Priority\n\n1. **CRITICAL** (Must fix before archive):\n   - none\n\n2. **WARNING** (Should fix):\n   - none\n\nNo critical issues.\n');
  W(dir, ex('tickets/01-counts.md'), '# 01: Counts\n\n**Status:** done\n\n- [x] Scenario "Count words" passes\n');
  W(dir, ex('tickets/02-api.md'), '# 02: API\n\n**Status:** ready-for-agent\n\n- [ ] Scenario "Get stats" passes\n');
  let r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /slice finish add-text-stats-01-core: REFUSED - 2 problems in add-text-stats-01-core - nothing archived\. Fix them all [^\n]*\n  open: openspec\/changes\/add-text-stats-01-core\/execution\/tickets\/02-api\.md: Status "ready-for-agent", not done\n  open: openspec\/changes\/add-text-stats-01-core\/execution\/tickets\/02-api\.md:5: unticked checkbox: Scenario "Get stats" passes$/m);
  assert.doesNotMatch(r.out, /01-counts\.md|CRITICAL in/);
  // e2e3 #1: Status done but an unticked checkbox is still open work
  W(dir, ex('tickets/02-api.md'), '# 02: API\n\n**Status:** done\n\n- [x] Scenario "Get stats" passes\n- [ ] Scenario "Stats for empty text" passes\n');
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^  open: openspec\/changes\/add-text-stats-01-core\/execution\/tickets\/02-api\.md:6: unticked checkbox: Scenario "Stats for empty text" passes$/m);
  assert.doesNotMatch(r.out, /Status "done"/);
  // e2e3 #8: every problem at once - missing verify.md, an open ticket and a TODO placeholder in execution/spec.md
  fs.renameSync(path.join(dir, ex('verify.md')), path.join(dir, ex('verify.bak')));
  W(dir, ex('spec.md'), '# Spec\n\n1. As a user TODO(agent: the story)\n');
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /REFUSED - 3 problems/);
  assert.match(r.out, /^  missing: [^\n]*execution\/verify\.md/m);
  assert.match(r.out, /^  open: openspec\/changes\/add-text-stats-01-core\/execution\/tickets\/02-api\.md:6: unticked checkbox/m);
  assert.match(r.out, /^  open: openspec\/changes\/add-text-stats-01-core\/execution\/spec\.md:3: TODO\(agent: \.\.\.\) placeholder left$/m);
  fs.renameSync(path.join(dir, ex('verify.bak')), path.join(dir, ex('verify.md')));
  fs.rmSync(path.join(dir, ex('spec.md')));
  assert.doesNotMatch(r.out, /\$ openspec archive/);
  // the ticket is done, but verify recorded a CRITICAL issue (a report quoting TODO(agent: is not scanned)
  W(dir, ex('tickets/02-api.md'), '# 02: API\n\n**Status:** done\n\n- [x] Scenario "Get stats" passes\n');
  W(dir, ex('verify.md'), '# Verify\n\n### CRITICAL\n- Incomplete task: execution/tickets/02-api.md is not "Status: done".\n\n### Final Assessment\n\nReady. Checked for TODO(agent: ...) leftovers.\n');
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /^  CRITICAL in openspec\/changes\/add-text-stats-01-core\/execution\/verify\.md: Incomplete task: execution\/tickets\/02-api\.md is not "Status: done"\.$/m);
  assert.doesNotMatch(r.out, /verify\.md:\d+: TODO/);
  W(dir, ex('verify.md'), '# Verify\n\n- CRITICAL: 1 - the export overwrites files\n');
  assert.match(sdd('slice-finish', CORE_ID).out, /CRITICAL in openspec\/changes\/add-text-stats-01-core\/execution\/verify\.md: - CRITICAL: 1 - the export overwrites files/);
  // a heading + a bullet that repeats the word is ONE problem
  W(dir, ex('verify.md'), '# Verify\n\n### CRITICAL\n- CRITICAL: export overwrites files\n');
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.equal(r.out.match(/CRITICAL in /g).length, 1, r.out);
  assert.match(r.out, /REFUSED - 1 problem in add-text-stats-01-core/);
  // OpenSpec verify's own summary wording, with no other CRITICAL line
  W(dir, ex('verify.md'), '# Verify\n\n## Final Assessment\n\n2 critical issue(s) found. Fix before archiving.\n');
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /verify\.md: 2 critical issue\(s\) found\. Fix before archiving\.$/m);
  W(dir, ex('verify.md'), '# Verify\n\n## Final Assessment\n\n0 critical issue(s) found. Ready for archive.\n');
  W(dir, ex('tickets/03-tmp.md'), '# 03\n\n**Status:** open\n'); // keeps the refusal (nothing archived)
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.doesNotMatch(r.out, /CRITICAL in /, '0 critical issues is clean');
  fs.rmSync(path.join(dir, ex('tickets/03-tmp.md')));
  // superpowers: unticked plan steps are open work (named with their task)
  W(dir, ex('verify.md'), '# Verify\n\n- CRITICAL: none\n');
  W(dir, ex('progress.md'), '# Ledger\n');
  W(dir, ex(`plan-${CORE_ID}.md`), '# Plan\n\n### Task 1: Counts\n- [x] **Step 1:** write the test\n- [ ] **Step 2:** make it pass\n');
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, new RegExp(`^  open: openspec/changes/${CORE_ID}/execution/plan-${CORE_ID}\\.md:5: unticked step in Task 1: Counts: \\*\\*Step 2:\\*\\* make it pass$`, 'm'));
  fs.rmSync(path.join(dir, ex(`plan-${CORE_ID}.md`)));
  // a flag placeholder left in the slice's delta
  const delta = `openspec/changes/${CORE_ID}/specs/text-stats/spec.md`;
  W(dir, delta, R(dir, delta) + '\n### Requirement: Placeholder\nThe system SHALL TODO(agent: the behaviour).\n');
  r = sdd('slice-finish', CORE_ID);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /open: openspec\/changes\/add-text-stats-01-core\/specs\/text-stats\/spec\.md:\d+: TODO\(agent: \.\.\.\) placeholder left/);
  assert.ok(!fs.existsSync(path.join(dir, 'openspec/changes/archive')) || !archived(dir, CORE_ID), 'nothing archived');
  assert.match(R(dir, 'openspec/changes/add-text-stats/slices.md'), /### Slice: add-text-stats-01-core\n[\s\S]*?- status: in-progress/);
});
