// Change splitting (v6 control plane): /sdd-split-check counts, split.mjs apply / loss (git baseline,
// split notes, renamed_from) / next / start, split-plan schema.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, CLI, run, initCli, makeFixture, OPENSPEC_SKIP } from './helpers.mjs';

const W = (dir, rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
const R = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const req = (name, scen) => `### Requirement: ${name}\nThe system SHALL do ${name.toLowerCase()} for every report.\n\n${scen.map((s) => `#### Scenario: ${s}\n- **WHEN** ${s.toLowerCase()} happens\n- **THEN** the report shows it`).join('\n\n')}\n`;
const gitIn = (dir) => (...a) => { const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8' }); assert.equal(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`); return r.stdout; };
const C = 'openspec/changes/add-reports';
const CHILD = (id, cap) => `openspec/changes/${id}/specs/${cap}/spec.md`;
const notes = (dir, id, ...lines) => { const f = `openspec/changes/${id}/proposal.md`; const t = R(dir, f); const i = t.indexOf('## Split notes'); W(dir, f, t.slice(0, i) + t.slice(i).replace(/^_None\._$/m, lines.join('\n'))); };

/** A git project with one big change "add-reports" (capabilities reports + export); `extra` adds more. */
function project({ extra = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'split-'));
  W(dir, 'openspec/config.yaml', 'schema: handoff-driven\n');
  W(dir, 'openspec/specs/.gitkeep', '');
  fs.cpSync(path.join(TOOLKIT, 'schemas'), path.join(dir, 'openspec', 'schemas'), { recursive: true });
  W(dir, `${C}/.openspec.yaml`, 'schema: handoff-driven\ncreated: 2026-10-10\n');
  W(dir, `${C}/proposal.md`, '# Proposal\n\n## Why\n\nTeams need weekly reports of their activity to plan the next week well.\n\n## What Changes\n\n- Weekly reports and a file export.\n');
  W(dir, `${C}/specs/reports/spec.md`, `## Purpose\n\nWeekly activity reports for teams, so they can plan the next week.\n\n## ADDED Requirements\n\n${req('Report totals', ['Totals per day', 'Empty week'])}\n${req('Report filters', ['Filter by member', 'Filter by tag'])}\n`);
  W(dir, `${C}/specs/export/spec.md`, `## Purpose\n\nExport reports to files so teams can share them outside the app.\n\n## ADDED Requirements\n\n${req('CSV export', ['Export week', 'Export empty week'])}\n`);
  if (extra) W(dir, `${C}/specs/sharing/spec.md`, `## Purpose\n\nShare reports with people outside the team by link or by mail.\n\n## ADDED Requirements\n\n${req('Share link', ['Copy link'])}\n${req('Share by mail', ['Mail a report'])}\n${req('Share expiry', ['Link expires'])}\n`);
  const git = gitIn(dir);
  git('init', '-q', '-b', 'main'); git('config', 'user.name', 't'); git('config', 'user.email', 't@t');
  git('add', '-A'); git('commit', '-qm', 'original deltas');
  return { dir, c: C, git };
}

const PROPOSAL = (approved = 'engineer (test)') => `---\napproved_by: ${approved}\n---\n\n## Slices\n\n### Slice: totals\n- order: 01\n- goal: Weekly totals\n- capabilities: reports\n- requirements: Report totals\n- depends_on: none\n- flag: none\n\n### Slice: filters\n- order: 02\n- goal: Filters for reports\n- capabilities: reports\n- requirements: Report filters\n- depends_on: totals\n- flag: none\n\n### Slice: csv-export\n- order: 03\n- goal: File export behind a flag\n- capabilities: export\n- requirements: CSV export\n- depends_on: none\n- flag: csv-export\n\n### Slice: remove-csv-flag\n- goal: Remove the csv-export flag\n- capabilities: export-flags\n- depends_on: csv-export\n- removes_flag: csv-export\n`;

function splitProject() {
  const p = project();
  W(p.dir, `${p.c}/execution/split-proposal.md`, PROPOSAL());
  return p;
}
/** /sdd-split-apply scaffolds the flag: "Feature flag csv-export" ADDED in the flagged slice (+ "added:" note), REMOVED in the 99 slice. The agent fills the TODOs. */
const addFlag = (dir) => {
  const f = CHILD('add-reports-03-csv-export', 'export');
  W(dir, f, R(dir, f).replace(/TODO\(agent: the behaviour this slice adds\)/, 'the export action').replace(/TODO\(agent: [^)]*\)/, 'no export action is shown'));
};

test('split-check: counts only - one line when it fits, warns (exit 0) above 5 requirements or 2 capabilities, lints the proposal', () => {
  const { dir, c } = project();
  let r = run('split-check.mjs', ['add-reports'], dir);
  assert.equal(r.code, 0);
  assert.equal(r.out.trim(), 'split-check add-reports: fits (3 requirements, 2 capabilities)');
  assert.match(run('split-check.mjs', ['add-greeting-name'], makeFixture().dir).out, /fits \(2 requirements, 1 capability\)/);
  const big = project({ extra: true });
  r = run('split-check.mjs', ['add-reports', '--write'], big.dir);
  assert.equal(r.code, 0);
  assert.match(r.out, /split-check add-reports: WARNING - 6 requirements \(> 5\), 3 capabilities \(> 2\) - consider splitting/);
  assert.match(r.out, /line estimate/i);
  assert.doesNotMatch(r.out, /size-estimate/);
  const written = R(big.dir, `${c}/execution/split-check.md`);
  assert.match(written, /6 requirements/);
  assert.doesNotMatch(written, /Share by mail/, 'the written report holds counts, not names');
  W(big.dir, `${c}/execution/split-proposal.md`, PROPOSAL('').replace(/### Slice: remove-csv-flag[\s\S]*$/, ''));
  r = run('split-check.mjs', ['add-reports'], big.dir);
  assert.match(r.out, /NOT approved yet/);
  assert.match(r.out, /✗ flag "csv-export": no cleanup slice/);
  assert.match(r.out, /Parallel-safe pairs \(no dependency, no shared capability\): add-reports-01-totals ∥ add-reports-03-csv-export, add-reports-02-filters ∥ add-reports-03-csv-export/);
});

test('split apply: refuses without approval or with uncommitted deltas; the parent is a control plane with no names', () => {
  const { dir, c, git } = splitProject();
  W(dir, `${c}/execution/split-proposal.md`, PROPOSAL(''));
  let r = run('split.mjs', ['apply', 'add-reports'], dir);
  assert.equal(r.code, 2);
  assert.match(r.out, /approved_by:" is empty - the engineer approves/);
  W(dir, `${c}/execution/split-proposal.md`, PROPOSAL());
  W(dir, `${c}/specs/export/spec.md`, R(dir, `${c}/specs/export/spec.md`) + '\n');
  r = run('split.mjs', ['apply', 'add-reports'], dir);
  assert.equal(r.code, 2);
  assert.match(r.out, /commit .*specs.* first .*loss-check baseline/);
  git('commit', '-qam', 'deltas final');
  const head = git('rev-parse', 'HEAD').trim();
  r = run('split.mjs', ['apply', 'add-reports'], dir);
  assert.match(r.out, new RegExp(`parent add-reports \\(schema split-plan, split_commit ${head.slice(0, 7)}\\); children: add-reports-01-totals, add-reports-02-filters, add-reports-03-csv-export, add-reports-99-remove-csv-flag`));
  assert.match(R(dir, `${c}/.openspec.yaml`), /schema: split-plan[\s\S]*skip_specs: true/);
  assert.equal(fs.existsSync(path.join(dir, c, 'specs')), false);
  assert.equal(fs.existsSync(path.join(dir, c, 'execution/split-proposal.md')), false);
  const slices = R(dir, `${c}/slices.md`);
  assert.match(slices, new RegExp(`^---\\nparent: add-reports\\napproved_by: engineer \\(test\\)\\nsplit_at: \\d{4}-\\d\\d-\\d\\d\\nsplit_commit: ${head}\\n---`));
  assert.match(slices, /### Slice: add-reports-03-csv-export\n- goal: File export behind a flag\n- capabilities: export\n- depends_on: none\n- flag: csv-export\n- ticket: tickets\/add-reports-03-csv-export.md\n- status: planned/);
  for (const n of ['Report totals', 'Report filters', 'CSV export', 'Filter by tag', 'Export week']) assert.ok(!slices.includes(n), `parent names ${n}`);
  assert.doesNotMatch(slices, /SHALL|\*\*WHEN\*\*|Amendments|- \[ \]/);
  assert.match(R(dir, `${c}/tickets/add-reports-03-csv-export.md`), /^Summary: \[add-reports\] add-reports-03-csv-export - File export behind a flag\n[\s\S]*Labels: openspec, split-add-reports, flag-csv-export/);
  assert.doesNotMatch(R(dir, `${c}/tickets/add-reports-03-csv-export.md`), /CSV export"|Export week/);
  assert.match(R(dir, `${c}/tickets/add-reports-03-csv-export.md`), /^Start: \/sdd-split-start add-reports-03-csv-export \(marks it in-progress/m);
  assert.match(R(dir, `${c}/slices.md`), /\/sdd-split-start <slice>/);
  assert.equal(fs.existsSync(path.join(dir, c, 'tickets', 'add-reports-02-filters.md')), false);
  const totals = R(dir, CHILD('add-reports-01-totals', 'reports'));
  assert.match(totals, /^## Purpose\n\nWeekly activity reports/);
  assert.ok(totals.includes(req('Report totals', ['Totals per day', 'Empty week']).trim()));
  // flag scaffolding: the flagged slice ADDs the flag requirement (+ "added:" note), the 99 slice REMOVEs it (no note)
  const p03 = R(dir, 'openspec/changes/add-reports-03-csv-export/proposal.md');
  assert.match(p03, /Behind the feature flag `csv-export`[\s\S]*## Size Budget\n\n- Requirements in deltas: 2\n- Capabilities: 1\n[\s\S]*- Split decision: slice of add-reports[\s\S]*## Split notes[\s\S]*- added: Requirement "Feature flag csv-export" - gates this slice's behaviour until add-reports-99-remove-csv-flag removes the flag/);
  assert.match(R(dir, CHILD('add-reports-03-csv-export', 'export')), /## ADDED Requirements[\s\S]*### Requirement: CSV export[\s\S]*### Requirement: Feature flag csv-export\nThe system SHALL keep TODO\(agent: [^)]*\) off while the feature flag `csv-export` is off[\s\S]*#### Scenario: Feature flag csv-export off/);
  assert.match(R(dir, CHILD('add-reports-99-remove-csv-flag', 'export')), /^## REMOVED Requirements\n\n### Requirement: Feature flag csv-export\n\*\*Reason\*\*: [^\n]+\n\*\*Migration\*\*: /);
  assert.match(R(dir, 'openspec/changes/add-reports-99-remove-csv-flag/proposal.md'), /## Split notes[\s\S]*_None\._/);
  assert.match(r.out, /flag scaffold: add-reports-03-csv-export: ADDED Requirement "Feature flag csv-export" \(fill the TODOs\) \+ split note "added:"/);
  assert.match(r.out, /flag scaffold: add-reports-99-remove-csv-flag: REMOVED Requirement "Feature flag csv-export" \(no split note needed\)/);
  assert.match(r.out, /^Commit the split \(one planning PR\): git add -A openspec\/changes && git commit -m "split: add-reports into 4 slices"$/m);
  assert.match(R(dir, `${c}/proposal.md`), /- Split decision: split into 4 slices \(add-reports-01-totals, add-reports-02-filters, add-reports-03-csv-export, add-reports-99-remove-csv-flag\) - see slices\.md/);
  assert.match(R(dir, 'openspec/changes/add-reports-01-totals/proposal.md'), /### New Capabilities\n\n- `reports`/);
  assert.match(R(dir, 'openspec/changes/add-reports-02-filters/proposal.md'), /### New Capabilities\n\n_None\._\n\n### Modified Capabilities\n\n- `reports`/, 'an earlier slice in depends_on creates the capability');
  addFlag(dir);
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, new RegExp(`loss-check add-reports \\(after split\\): PASS\\n  baseline: original deltas at split commit ${head.slice(0, 7)} \\(git show\\) - 3 requirements, 6 scenarios; slices: 4; split notes: 1`));
  // a slice with split notes lists the parent decisions it overrides in its narrowed session (moved from check-handoff)
  const g = path.join(dir, 'openspec/changes/add-reports-03-csv-export/execution/grill.md');
  fs.mkdirSync(path.dirname(g), { recursive: true });
  fs.writeFileSync(g, '# Narrowed session\n');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /add-reports-03-csv-export\/execution\/grill\.md: this slice has split notes but its narrowed session has no "## Overrides" section/);
  fs.appendFileSync(g, '\n## Overrides\n\n- None\n');
  assert.doesNotMatch(run('split.mjs', ['loss', 'add-reports'], dir).out, /no "## Overrides" section/);
});

test('parent name leak: an original requirement name in the parent proposal fails the loss check', () => {
  const { dir, c, git } = splitProject();
  W(dir, `${c}/proposal.md`, R(dir, `${c}/proposal.md`).replace('a file export', 'CSV export'));
  git('commit', '-qam', 'proposal');
  run('split.mjs', ['apply', 'add-reports'], dir);
  addFlag(dir);
  let r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /add-reports\/proposal.md:\d+: names "CSV export" - the parent is a control plane/);
  W(dir, `${c}/proposal.md`, R(dir, `${c}/proposal.md`).replace('CSV export', 'a file export'));
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  // a session added after the split commit is a warning (exit 0)
  W(dir, `${c}/execution/grill.md`, '---\ntool: ai-hero\n---\n- Q1 -> delta Requirement "CSV export"\n');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, 'the shared design session is reported, not failed');
  assert.match(r.out, /! add-reports\/execution\/grill.md: shared design session was added after split commit [0-9a-f]{7} - it is frozen at the split/);
});

test('shared design session: unchanged since split_commit -> info line; edited -> warning; exit 0 both; --json separates info and warnings', () => {
  const { dir, c, git } = splitProject();
  W(dir, `${c}/execution/grill.md`, '---\ntool: ai-hero\n---\n- Q1 -> delta Requirement "CSV export", Scenario "Export week"\n');
  git('add', '-A'); git('commit', '-qm', 'deltas + session');
  const head = git('rev-parse', 'HEAD').trim().slice(0, 7);
  run('split.mjs', ['apply', 'add-reports'], dir);
  addFlag(dir);
  let r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, new RegExp(`  i add-reports/execution/grill.md: shared design session, frozen at split commit ${head}; it uses the original names \\(2\\) - the child deltas and their split notes win where they differ\\.`));
  assert.doesNotMatch(r.out, /! add-reports\/execution\/grill.md/);
  let j = JSON.parse(run('split.mjs', ['loss', 'add-reports', '--json'], dir).out);
  assert.equal(j.info.length, 1);
  assert.equal(j.warnings.filter((w) => w.includes('grill.md')).length, 0);
  W(dir, `${c}/execution/grill.md`, R(dir, `${c}/execution/grill.md`) + '- Q2 -> later edit\n');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, 'an edited session is a warning, not a failure');
  assert.match(r.out, new RegExp(`! add-reports/execution/grill.md: shared design session changed since split commit ${head} - it is frozen at the split`));
  assert.doesNotMatch(r.out, /  i add-reports\/execution\/grill.md/);
  j = JSON.parse(run('split.mjs', ['loss', 'add-reports', '--json'], dir).out);
  assert.equal(j.info.length, 0);
  assert.equal(j.warnings.filter((w) => w.includes('grill.md')).length, 1);
});

test('loss check: dropped scenario fails until a "dropped" split note in the child; duplicate, unsourced and unknown notes fail', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  addFlag(dir);
  const f = CHILD('add-reports-02-filters', 'reports');
  const orig = R(dir, f);
  W(dir, f, orig.replace(/\n#### Scenario: Filter by tag[\s\S]*$/, '\n'));
  let r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ Scenario "Filter by tag" -> MISSING/);
  notes(dir, 'add-reports-02-filters', '- dropped: Scenario "Filter by tag" - tags ship in a later change');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Scenario "Filter by tag" -> dropped \(split note in add-reports-02-filters\)/);
  // dropped but present again + duplicate + unsourced
  W(dir, f, orig + '\n### Requirement: Report sharing\nThe system SHALL share reports.\n\n#### Scenario: Share it\n- **WHEN** shared\n- **THEN** a link\n');
  const t = CHILD('add-reports-01-totals', 'reports');
  W(dir, t, R(dir, t) + '\n' + req('Report filters', ['Filter by member']));
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /Requirement "Report filters".*DUPLICATE/);
  assert.match(r.out, /add-reports-02-filters: Requirement "Report sharing" is unsourced/);
  assert.match(r.out, /Scenario "Filter by tag".*dropped.*still/);
  W(dir, f, orig); W(dir, t, R(dir, t).replace(/\n### Requirement: Report filters[\s\S]*$/, '\n'));
  const pf = 'openspec/changes/add-reports-02-filters/proposal.md';
  W(dir, pf, R(dir, pf).replace(/^- dropped: Scenario "Filter by tag".*$/m, '_None._'));
  notes(dir, 'add-reports-01-totals', '- dropped: Requirement "Nope" - typo');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /split note names Requirement "Nope", which is not in the original deltas/);
});

test('rename (Q7): an unmatched original is listed with child names that have no original; renamed_from accepts it', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  addFlag(dir);
  const f = CHILD('add-reports-01-totals', 'reports');
  W(dir, f, R(dir, f).replace('### Requirement: Report totals', '### Requirement: Weekly totals').replace('#### Scenario: Empty week', '#### Scenario: Week without activity'));
  let r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /Requirement "Report totals" -> MISSING/);
  assert.match(r.out, /Possible renames \(Requirement\) - judge semantic equivalence:\n    unmatched originals: "Report totals"\n    child names with no original: "Weekly totals" \(add-reports-01-totals\)/);
  assert.match(r.out, /Possible renames \(Scenario\)[\s\S]*unmatched originals: "Empty week"/);
  notes(dir, 'add-reports-01-totals', '- renamed_from: Requirement "Report totals" -> "Weekly totals" - same behaviour, clearer name');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1, 'the scenario rename is still open');
  notes(dir, 'add-reports-01-totals', '- renamed_from: Requirement "Report totals" -> "Weekly totals" - same behaviour, clearer name');
  const p = 'openspec/changes/add-reports-01-totals/proposal.md';
  W(dir, p, R(dir, p).trimEnd() + '\n- renamed_from: Scenario "Empty week" -> "Week without activity" - same case\n');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Requirement "Report totals" -> add-reports-01-totals as "Weekly totals" \(renamed_from\)/);
  assert.doesNotMatch(r.out, /Possible renames/);
});

test('split requirement: split_from needs a confirmed split note in each receiving child', () => {
  const { dir, c } = project();
  W(dir, `${c}/execution/split-proposal.md`, `---\napproved_by: engineer (test)\n---\n\n## Slices\n\n### Slice: add-reports-01-core\n- goal: Totals and member filter\n- capabilities: reports\n- requirements: Report totals\n- split: Report filters -> Member filter [Filter by member]\n- depends_on: none\n- flag: none\n\n### Slice: add-reports-02-more\n- goal: Tag filter and export\n- capabilities: export\n- requirements: CSV export\n- split: Report filters -> Tag filter [Filter by tag]\n- depends_on: add-reports-01-core\n- flag: none\n`);
  let r = run('split.mjs', ['apply', 'add-reports'], dir);
  assert.equal(r.code, 1, r.out);
  assert.match(R(dir, CHILD('add-reports-01-core', 'reports')), /### Requirement: Member filter\n<!-- split_from: Report filters -->\nThe system SHALL do report filters[\s\S]*#### Scenario: Filter by member/);
  assert.match(r.out, /needs confirmation/);
  assert.match(r.out, /add-reports-01-core\/proposal.md "## Split notes": - split_from: Requirement "Report filters" - confirmed/);
  notes(dir, 'add-reports-01-core', '- split_from: Requirement "Report filters" - confirmed');
  notes(dir, 'add-reports-02-more', '- split_from: Requirement "Report filters" - confirmed');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Requirement "Report filters" -> split into "Member filter" \(add-reports-01-core\), "Tag filter" \(add-reports-02-more\)/);
});

const archive = (dir, id) => { fs.mkdirSync(path.join(dir, 'openspec/changes/archive'), { recursive: true }); fs.renameSync(path.join(dir, 'openspec/changes', id), path.join(dir, 'openspec/changes/archive', `2026-10-10-${id}`)); };

test('next + start: ready when all depends_on are archived; in-progress is the engineer\'s mark; parallel-safe only without dependency and shared capability', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  let r = run('split.mjs', ['next', 'add-reports'], dir);
  assert.match(r.out, /0\/4 slices done \(archived folder present on main\)/);
  assert.match(r.out, /Ready now: add-reports-01-totals, add-reports-03-csv-export/);
  assert.match(r.out, /Parallel-safe now[^\n]*add-reports-01-totals ∥ add-reports-03-csv-export/);
  assert.match(r.out, /\| add-reports-02-filters \| planned \| add-reports-01-totals \| waits for add-reports-01-totals \|/);
  // refusals: not a slice, not READY (deps not archived)
  r = run('split.mjs', ['start', 'nope'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /split start nope: REFUSED - "nope" is not a slice of any split parent/);
  r = run('split.mjs', ['start', 'add-reports-02-filters'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /REFUSED - "add-reports-02-filters" is not READY: it waits for add-reports-01-totals \(not archived on this checkout\)/);
  assert.match(R(dir, `${C}/slices.md`), /### Slice: add-reports-02-filters\n[\s\S]*?- status: planned/);
  // --undo on a planned slice: nothing to undo
  r = run('split.mjs', ['start', 'add-reports-01-totals', '--undo'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /is planned, not in progress - nothing to undo/);
  // start: finds the parent itself, marks in-progress, prints the next lines
  r = run('split.mjs', ['start', 'add-reports-01-totals'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(R(dir, `${C}/slices.md`), /### Slice: add-reports-01-totals\n[\s\S]*?- status: in-progress/);
  assert.match(r.out, /split start add-reports-01-totals: in-progress in openspec\/changes\/add-reports\/slices\.md \(parent add-reports\)/);
  assert.match(r.out, /1\. Commit the mark on main so others see it: git add openspec\/changes\/add-reports\/slices\.md && git commit -m "split: start add-reports-01-totals"/);
  assert.match(r.out, /2\. git switch -c change\/add-reports-01-totals main/);
  assert.match(r.out, /3\. the slice's short design session/);
  assert.match(r.out, /4\. \/sdd-handoff add-reports-01-totals/);
  r = run('split.mjs', ['start', 'add-reports-01-totals'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /already in progress \(taken\)\. To release it: \/sdd-split-start add-reports-01-totals --undo/);
  // --undo: back to planned, then take it again
  r = run('split.mjs', ['start', 'add-reports-01-totals', '--undo'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /back to planned/);
  assert.match(R(dir, `${C}/slices.md`), /### Slice: add-reports-01-totals\n[\s\S]*?- status: planned/);
  assert.equal(run('split.mjs', ['start', 'add-reports-01-totals'], dir).code, 0);
  r = run('split.mjs', ['next', 'add-reports'], dir);
  assert.match(r.out, /\| add-reports-01-totals \| in progress \|/);
  assert.match(r.out, /Ready now: add-reports-03-csv-export/);
  assert.match(r.out, /In progress \(engineer's mark\): add-reports-01-totals/);
  assert.match(r.out, /Parallel-safe with work in progress \(taken or ready, no dependency, no shared capability\): add-reports-01-totals ∥ add-reports-03-csv-export/);
  archive(dir, 'add-reports-01-totals');
  r = run('split.mjs', ['next', 'add-reports', '--write-tickets'], dir);
  assert.match(r.out, /1\/4 slices done/);
  assert.match(r.out, /\| add-reports-01-totals \| done \|/);
  assert.match(r.out, /Ready now: add-reports-02-filters, add-reports-03-csv-export/);
  assert.match(r.out, /Tickets written: tickets\/add-reports-02-filters.md/);
  assert.match(R(dir, `${C}/slices.md`), /### Slice: add-reports-02-filters\n[\s\S]*?- ticket: tickets\/add-reports-02-filters.md/);
  assert.match(R(dir, `${C}/tickets/add-reports-02-filters.md`), /add-reports-02-filters is committed in the slice's own PR with its code, merged to main/);
});

test('final loss check uses main specs + archived children; OpenSpec archives the parent with --skip-specs', { skip: OPENSPEC_SKIP }, () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  addFlag(dir);
  const os_ = (...a) => spawnSync(OPENSPEC, a, { cwd: dir, encoding: 'utf8' });
  const sv = os_('schema', 'validate', 'split-plan');
  assert.equal(sv.status, 0, sv.stdout + sv.stderr);
  const st = JSON.parse(os_('status', '--change', 'add-reports', '--json').stdout);
  assert.deepEqual(st.artifacts.map((x) => x.id), ['proposal', 'slices']);
  const v = os_('validate', '--all', '--strict');
  assert.equal(v.status, 0, v.stdout + v.stderr);
  let r = run('split.mjs', ['loss', 'add-reports', '--final'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /slice "add-reports-01-totals" is not archived yet/);
  for (const id of ['add-reports-01-totals', 'add-reports-02-filters', 'add-reports-03-csv-export', 'add-reports-99-remove-csv-flag']) {
    const a = os_('archive', id, '--yes');
    assert.equal(a.status, 0, a.stdout + a.stderr);
  }
  r = run('split.mjs', ['loss', 'add-reports', '--final'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /loss-check add-reports \(final, before archiving the parent\): PASS/);
  const before = fs.readdirSync(path.join(dir, 'openspec/specs')).sort();
  const a = os_('archive', 'add-reports', '--skip-specs', '--yes');
  assert.equal(a.status, 0, a.stdout + a.stderr);
  assert.deepEqual(fs.readdirSync(path.join(dir, 'openspec/specs')).sort(), before);
  assert.doesNotMatch(R(dir, 'openspec/specs/export/spec.md'), /Feature flag csv-export/);
});

test('re-split: a slice is split again into the SAME parent (no nested parents); its split notes carry over', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  addFlag(dir);
  W(dir, 'openspec/changes/add-reports-03-csv-export/execution/split-proposal.md', `---\napproved_by: engineer (test)\n---\n\n## Slices\n\n### Slice: csv-export-core\n- goal: File export\n- capabilities: export\n- requirements: CSV export\n- depends_on: none\n- flag: none\n\n### Slice: csv-export-flag\n- goal: Flag for the export\n- capabilities: export-ui\n- requirements: Feature flag csv-export\n- depends_on: csv-export-core\n- flag: csv-export\n`);
  const r = run('split.mjs', ['apply', 'add-reports-03-csv-export'], dir);
  assert.match(r.out, /re-split into parent add-reports; children: add-reports-04-csv-export-core, add-reports-05-csv-export-flag/);
  assert.equal(fs.existsSync(path.join(dir, 'openspec/changes/add-reports-03-csv-export')), false);
  const s = R(dir, `${C}/slices.md`);
  assert.match(s, /### Slice: add-reports-99-remove-csv-flag[\s\S]*- depends_on: add-reports-04-csv-export-core, add-reports-05-csv-export-flag/);
  assert.equal(fs.existsSync(path.join(dir, 'openspec/changes/add-reports-04-csv-export-core/slices.md')), false);
  assert.match(R(dir, 'openspec/changes/add-reports-05-csv-export-flag/proposal.md'), /- added: Requirement "Feature flag csv-export"/);
  const l = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(l.code, 0, l.out);
});

test('spec-check: line estimate after planning from "Estimate: ~N lines" in tickets (warn-only)', async () => {
  const { makeFixture, CHANGE } = await import('./helpers.mjs');
  const { changeDir, dir } = makeFixture();
  const tdir = path.join(changeDir, 'execution', 'tickets');
  const files = fs.readdirSync(tdir).sort();
  fs.appendFileSync(path.join(tdir, files[0]), '\nEstimate: ~180 lines\n');
  let r = run('spec-check.mjs', [CHANGE], dir);
  assert.match(r.out, /### Size \(line estimate after planning, warn-only[^\n]*\)\n\n- 1\/2 tickets \/ plan tasks carry an "Estimate: ~N lines" line; total ~180 lines/);
  fs.appendFileSync(path.join(tdir, files[1]), '\nEstimate: ~200 lines\n');
  r = run('spec-check.mjs', [CHANGE], dir);
  assert.match(r.out, /total ~380 lines[\s\S]*! over budget: consider re-splitting with \/sdd-split-check/);
  assert.equal(r.code, 0, r.out);
});

test('parallel slice branches: sdd-pp init union merge for slices.md keeps both status marks; duplicate fields are flagged', () => {
  const { dir, git } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  const inst = initCli(dir, '--no-claude', '--no-cursor', '--no-opencode', '--no-set-default');
  assert.equal(inst.status, 0, inst.stderr);
  assert.match(R(dir, '.gitattributes'), /^openspec\/changes\/\*\*\/slices\.md merge=union$/m);
  git('add', '-A'); git('commit', '-qm', 'plan');
  git('switch', '-qc', 'a'); run('split.mjs', ['start', 'add-reports-01-totals'], dir); git('commit', '-qam', 'a');
  git('switch', '-q', 'main'); git('switch', '-qc', 'b'); run('split.mjs', ['start', 'add-reports-03-csv-export'], dir); git('commit', '-qam', 'b');
  git('switch', '-q', 'main'); git('merge', '-q', '--no-ff', 'a', '-m', 'a');
  git('merge', '-q', '--no-ff', 'b', '-m', 'b'); // no conflict
  const s = `${C}/slices.md`;
  const text = R(dir, s);
  assert.match(text, /### Slice: add-reports-01-totals\n[\s\S]*?- status: in-progress/);
  assert.match(text, /### Slice: add-reports-03-csv-export\n[\s\S]*?- status: in-progress/);
  W(dir, s, text.replace('- ticket: tickets/add-reports-01-totals.md', '- ticket: tickets/add-reports-01-totals.md\n- ticket: none'));
  const r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.match(r.out, /slice "add-reports-01-totals" has "ticket:" twice \(a union merge of two branches\?\)/);
});

test('next-steps CLI for a slice (ends with /sdd-split-next <parent>) and for a split parent (no handoff, points at /sdd-split-next)', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  W(dir, 'openspec/changes/add-reports-01-totals/handoff.md', '---\ntool: ai-hero\napply_mode: implement\n---\n\n# Handoff\n');
  let r = run('next-steps.mjs', ['add-reports-01-totals'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^Next steps for add-reports-01-totals \(ai-hero, apply_mode: implement\)/);
  assert.match(r.out, /On main: \/sdd-split-next add-reports /);
  assert.match(r.out, /\/sdd-slice-finish add-reports-01-totals on the change branch \(instead of \/opsx:archive\): it checks execution\/verify\.md, runs openspec archive add-reports-01-totals -y, marks the slice done in openspec\/changes\/add-reports\/slices\.md/);
  assert.doesNotMatch(r.out, /\/opsx:archive add-reports-01-totals on/);
  r = run('next-steps.mjs', ['add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.equal(r.out.trim(), 'add-reports is a split parent: no handoff or implementation. Run: /sdd-split-next add-reports');
});

test('split start off main: marks it but notes that readiness is read from this checkout and the mark belongs on main; CRLF slices.md stays CRLF', () => {
  const { dir, git } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  git('add', '-A'); git('commit', '-qm', 'plan');
  git('switch', '-qc', 'feature');
  const f = `${C}/slices.md`;
  W(dir, f, R(dir, f).replace(/\r?\n/g, '\r\n'));
  const r = run('split.mjs', ['start', 'add-reports-01-totals'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /note: you are on feature; readiness is read from this checkout and the mark belongs on main\./);
  const t = R(dir, f);
  assert.match(t, /### Slice: add-reports-01-totals\r\n[\s\S]*?- status: in-progress\r\n/);
  assert.doesNotMatch(t, /[^\r]\n/, 'no bare LF lines in a CRLF file');
});


// ---------------------------------------------------------------- /sdd-split-undo, driven through the sdd-pp CLI
/** A split project with the toolkit installed and the split committed (the planning PR). */
function undoProject() {
  const p = splitProject();
  assert.equal(initCli(p.dir, '--no-claude', '--no-cursor', '--no-opencode', '--no-set-default').status, 0);
  const split = sddPp(p.dir, 'split', 'apply', 'add-reports');
  assert.equal(split.code, 0, split.out);
  p.git('add', '-A'); p.git('commit', '-qm', 'planning PR');
  p.splitCommit = /^split_commit: (\w+)$/m.exec(R(p.dir, `${C}/slices.md`))[1];
  return p;
}
const sddPp = (cwd, ...a) => { const r = spawnSync(process.execPath, [CLI, ...a], { cwd, encoding: 'utf8' }); return { code: r.status, out: r.stdout + r.stderr }; };
const SLICES = ['add-reports-01-totals', 'add-reports-02-filters', 'add-reports-03-csv-export', 'add-reports-99-remove-csv-flag'];
/** The parent folder equals the original change at split_commit, byte for byte (same file list, same bytes). */
function assertOriginal(dir, git, commit) {
  const want = git('ls-tree', '-r', '--name-only', commit, '--', C).trim().split('\n').sort();
  const have = [];
  const walk = (d) => { for (const e of fs.readdirSync(path.join(dir, d), { withFileTypes: true })) (e.isDirectory() ? walk : (x) => have.push(x))(`${d}/${e.name}`); };
  walk(C);
  assert.deepEqual(have.sort(), want);
  for (const f of want) assert.equal(R(dir, f), git('show', `${commit}:${f}`), `${f} byte-identical`);
}
const status = (git) => git('status', '--porcelain', '--', 'openspec/changes').trim();

test('sdd-pp split undo: no slice started -> the original change back byte-identical from split_commit, slices removed, nothing committed', () => {
  const { dir, git, splitCommit } = undoProject();
  const head = git('rev-parse', 'HEAD').trim();
  const r = sddPp(dir, 'split', 'undo', 'add-reports');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, new RegExp(`^split undo add-reports: restored openspec/changes/add-reports/ from split_commit ${splitCommit.slice(0, 7)} \\(the original change\\); removed slices\\.md, tickets/ and 4 slice folder\\(s\\): ${SLICES.join(', ')}$`, 'm'));
  assert.match(r.out, /Next \(nothing is committed\):\n  1\. Review: git status[^\n]*\n  2\. Commit on main: git add -A openspec\/changes && git commit -m "split: undo add-reports"\n  3\. Then re-run \/sdd-split-check add-reports for a new split, or continue unsplit/);
  assertOriginal(dir, git, splitCommit);
  for (const s of SLICES) assert.equal(fs.existsSync(path.join(dir, 'openspec/changes', s)), false, `${s} removed`);
  assert.equal(git('rev-parse', 'HEAD').trim(), head, 'nothing committed');
  assert.notEqual(status(git), '', 'the undo is left as working-tree changes');
  assert.match(sddPp(dir, 'split-check', 'add-reports').out, /split-check add-reports: fits \(3 requirements, 2 capabilities\)/, 'the original change is a normal change again');
});

test('sdd-pp split undo refuses (exit 1, nothing touched): archived slice, dirty openspec/changes, unknown split_commit, not a split parent', () => {
  const { dir, git } = undoProject();
  const snapshot = () => git('ls-files', '-s', '-o', '--', 'openspec/changes') + status(git);
  // dirty tree
  W(dir, CHILD('add-reports-01-totals', 'reports'), R(dir, CHILD('add-reports-01-totals', 'reports')) + '\n<!-- edit -->\n');
  let before = snapshot();
  let r = sddPp(dir, 'split', 'undo', 'add-reports');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /split undo add-reports: REFUSED - uncommitted changes in openspec\/changes - commit or stash them first:\n  M openspec\/changes\/add-reports-01-totals\/specs\/reports\/spec\.md/);
  assert.equal(snapshot(), before);
  git('checkout', '--', 'openspec/changes');
  // archived slice
  archive(dir, 'add-reports-01-totals'); git('add', '-A'); git('commit', '-qm', 'archive 01');
  before = snapshot();
  r = sddPp(dir, 'split', 'undo', 'add-reports');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /REFUSED - slice\(s\) already archived on this checkout: add-reports-01-totals - .*cannot be undone/);
  assert.equal(snapshot(), before);
  // also with --force
  assert.equal(sddPp(dir, 'split', 'undo', 'add-reports', '--force').code, 1);
  // unknown split_commit
  W(dir, `${C}/slices.md`, R(dir, `${C}/slices.md`).replace(/^split_commit: \w+$/m, 'split_commit: 0123456789abcdef0123456789abcdef01234567'));
  git('commit', '-qam', 'bad commit');
  r = sddPp(dir, 'split', 'undo', 'add-reports');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /REFUSED - split_commit 0123456789abcdef0123456789abcdef01234567 is not a commit in this repository/);
  // a slice is not a parent: points at its parent
  r = sddPp(dir, 'split', 'undo', 'add-reports-02-filters');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /add-reports-02-filters is not a split parent \(no slices\.md\)\. It is a slice; undo its parent: \/sdd-split-undo add-reports/);
});

test('sdd-pp split undo with a slice in progress: refused without --force (names it), works with --force and warns; split start/--undo through sdd-pp', () => {
  const { dir, git, splitCommit } = undoProject();
  let r = sddPp(dir, 'split', 'start', 'add-reports-01-totals');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /split start add-reports-01-totals: in-progress in openspec\/changes\/add-reports\/slices\.md \(parent add-reports\)/);
  r = sddPp(dir, 'split', 'start', 'add-reports-02-filters');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /REFUSED - "add-reports-02-filters" is not READY: it waits for add-reports-01-totals/);
  git('commit', '-qam', 'take 01');
  r = sddPp(dir, 'split', 'undo', 'add-reports');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /REFUSED - slice\(s\) in progress: add-reports-01-totals - someone may be working on them\. Check with them; to undo anyway: \/sdd-split-undo add-reports --force/);
  assert.ok(fs.existsSync(path.join(dir, `${C}/slices.md`)), 'nothing touched');
  assert.equal(status(git), '');
  r = sddPp(dir, 'split', 'undo', 'add-reports', '--force');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^WARNING: undoing with slice\(s\) in progress: add-reports-01-totals - someone may be working on them/m);
  assertOriginal(dir, git, splitCommit);
  // start --undo through the CLI on a fresh project
  const p2 = undoProject();
  sddPp(p2.dir, 'split', 'start', 'add-reports-03-csv-export');
  r = sddPp(p2.dir, 'split', 'start', 'add-reports-03-csv-export', '--undo');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /split start add-reports-03-csv-export --undo: back to planned/);
  assert.match(R(p2.dir, `${C}/slices.md`), /### Slice: add-reports-03-csv-export\n[\s\S]*?- status: planned/);
});

test('sdd-pp split undo after a re-split restores the ORIGINAL change (first split_commit) and removes the new slices too', () => {
  const { dir, git, splitCommit } = undoProject();
  addFlag(dir);
  W(dir, 'openspec/changes/add-reports-03-csv-export/execution/split-proposal.md', `---\napproved_by: engineer (test)\n---\n\n## Slices\n\n### Slice: csv-export-core\n- goal: File export\n- capabilities: export\n- requirements: CSV export\n- depends_on: none\n- flag: none\n\n### Slice: csv-export-flag\n- goal: Flag for the export\n- capabilities: export-ui\n- requirements: Feature flag csv-export\n- depends_on: csv-export-core\n- flag: csv-export\n`);
  let r = sddPp(dir, 'split', 'apply', 'add-reports-03-csv-export');
  assert.match(r.out, /re-split into parent add-reports/);
  git('add', '-A'); git('commit', '-qm', 're-split');
  // a file added to the parent after the split is listed, not silently kept or lost
  W(dir, `${C}/execution/notes.md`, 'later notes\n'); git('add', '-A'); git('commit', '-qm', 'notes');
  r = sddPp(dir, 'split', 'undo', 'add-reports');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /removed slices\.md, tickets\/ and 5 slice folder\(s\): add-reports-01-totals, add-reports-02-filters, add-reports-04-csv-export-core, add-reports-05-csv-export-flag, add-reports-99-remove-csv-flag/);
  assert.match(r.out, /not restored \(added to the parent after split_commit; still in git history at HEAD\): execution\/notes\.md/);
  assertOriginal(dir, git, splitCommit);
  const left = fs.readdirSync(path.join(dir, 'openspec/changes')).filter((d) => d.startsWith('add-reports-'));
  assert.deepEqual(left, [], 'no slice folder left (old or re-split)');
});

test('sdd-pp split undo clears the old approved_by in the restored split-proposal.md and says so', () => {
  const p = project();
  W(p.dir, `${C}/execution/split-proposal.md`, PROPOSAL());
  p.git('add', '-A'); p.git('commit', '-qm', 'split proposal (approved)');
  assert.equal(initCli(p.dir, '--no-claude', '--no-cursor', '--no-opencode', '--no-set-default').status, 0);
  assert.equal(sddPp(p.dir, 'split', 'apply', 'add-reports').code, 0);
  p.git('add', '-A'); p.git('commit', '-qm', 'planning PR');
  const r = sddPp(p.dir, 'split', 'undo', 'add-reports');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^  cleared approved_by in openspec\/changes\/add-reports\/execution\/split-proposal\.md - the old approval does not carry over; the engineer approves again before \/sdd-split-apply$/m);
  const prop = R(p.dir, `${C}/execution/split-proposal.md`);
  assert.match(prop, /^---\napproved_by:\n---/);
  assert.match(prop, /### Slice: totals/, 'the proposal body is kept for editing');
  // /sdd-split-apply now refuses until the engineer approves again
  const again = sddPp(p.dir, 'split', 'apply', 'add-reports');
  assert.notEqual(again.code, 0, again.out);
  assert.match(again.out, /approved_by:" is empty - the engineer approves/);
});

test('sdd-pp tool <slice> (show) writes nothing; --set starts a slice session stub with the parent session link and "## Overrides / None"', () => {
  const p = project();
  W(p.dir, `${C}/execution/grill.md`, '# Grill\n\n## Decisions\n\n- weekly, Monday start\n');
  W(p.dir, `${C}/execution/split-proposal.md`, PROPOSAL());
  p.git('add', '-A'); p.git('commit', '-qm', 'design session + proposal');
  assert.equal(initCli(p.dir, '--no-claude', '--no-cursor', '--no-opencode', '--tool', 'ai-hero').status, 0);
  assert.equal(sddPp(p.dir, 'split', 'apply', 'add-reports').code, 0);
  const slice = 'openspec/changes/add-reports-02-filters';
  const before = fs.readdirSync(path.join(p.dir, slice), { recursive: true }).sort();
  let r = sddPp(p.dir, 'tool', 'add-reports-02-filters');
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(fs.readdirSync(path.join(p.dir, slice), { recursive: true }).sort(), before, 'show writes nothing');
  r = sddPp(p.dir, 'tool', 'add-reports-02-filters', '--set', 'superpowers');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /^Commit with the change: git add openspec\/changes\/add-reports-02-filters\/execution\/brainstorm\.md && git commit -m "tool\(add-reports-02-filters\): superpowers"$/m);
  const stub = R(p.dir, `${slice}/execution/brainstorm.md`);
  assert.match(stub, /^> Parent session: \[\.\.\/\.\.\/add-reports\/execution\/[\w.-]+\.md\]\(\.\.\/\.\.\/add-reports\/execution\/[\w.-]+\.md\) - read it first; this session is narrowed to the slice\.$/m);
  assert.match(stub, /^## Overrides\n\nNone$/m);
  // still a stub: switching back is allowed and replaces it
  r = sddPp(p.dir, 'tool', 'add-reports-02-filters', '--set', 'ai-hero');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /replaced the unused [^\n]*brainstorm\.md stub \(no design session in it yet\)/);
  assert.equal(fs.existsSync(path.join(p.dir, slice, 'execution/brainstorm.md')), false);
});
