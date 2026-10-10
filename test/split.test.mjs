// Change splitting (v6 control plane): /split-check counts, split.mjs apply / loss (git baseline,
// split notes, renamed_from) / next / mark, split-plan schema.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, run, initCli } from './helpers.mjs';
import { proposalLeaks } from '../scripts/lib/change.mjs';

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

const PROPOSAL = (approved = 'engineer (test)') => `---\napproved_by: ${approved}\n---\n\n## Slices\n\n### Slice: add-report-totals\n- goal: Weekly totals\n- capabilities: reports\n- requirements: Report totals\n- depends_on: none\n- flag: none\n\n### Slice: add-report-filters\n- goal: Filters for reports\n- capabilities: reports\n- requirements: Report filters\n- depends_on: add-report-totals\n- flag: none\n\n### Slice: add-csv-export\n- goal: File export behind a flag\n- capabilities: export\n- requirements: CSV export\n- depends_on: none\n- flag: csv-export\n\n### Slice: remove-csv-flag\n- goal: Remove the csv-export flag\n- capabilities: export-flags\n- depends_on: add-csv-export\n- removes_flag: csv-export\n`;

function splitProject() {
  const p = project();
  W(p.dir, `${p.c}/execution/split-proposal.md`, PROPOSAL());
  return p;
}
const FLAG_REQ = '\n### Requirement: Export flag gate\nThe system SHALL hide the export action while the csv-export flag is off.\n\n#### Scenario: Flag off\n- **WHEN** the flag is off\n- **THEN** no export action is shown\n';
const addFlag = (dir) => {
  W(dir, CHILD('add-csv-export', 'export'), R(dir, CHILD('add-csv-export', 'export')) + FLAG_REQ);
  notes(dir, 'add-csv-export', '- added: Requirement "Export flag gate" - gates the export until remove-csv-flag');
  W(dir, CHILD('remove-csv-flag', 'export'), '## REMOVED Requirements\n\n### Requirement: Export flag gate\n**Reason**: the export is released\n**Migration**: none\n');
};

test('split-check: counts only - one line when it fits, warns (exit 0) above 5 requirements or 2 capabilities, lints the proposal', () => {
  const { dir, c } = project();
  let r = run('split-check.mjs', ['add-reports'], dir);
  assert.equal(r.code, 0);
  assert.equal(r.out.trim(), 'split-check add-reports: fits (3 requirements, 2 capabilities)');
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
  assert.match(r.out, /Parallel-safe pairs \(no dependency, no shared capability\): add-report-totals ∥ add-csv-export, add-report-filters ∥ add-csv-export/);
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
  assert.match(r.out, new RegExp(`parent add-reports \\(schema split-plan, split_commit ${head.slice(0, 7)}\\); children: add-report-totals, add-report-filters, add-csv-export, remove-csv-flag`));
  assert.match(R(dir, `${c}/.openspec.yaml`), /schema: split-plan[\s\S]*skip_specs: true/);
  assert.equal(fs.existsSync(path.join(dir, c, 'specs')), false);
  assert.equal(fs.existsSync(path.join(dir, c, 'execution/split-proposal.md')), false);
  const slices = R(dir, `${c}/slices.md`);
  assert.match(slices, new RegExp(`^---\\nparent: add-reports\\napproved_by: engineer \\(test\\)\\nsplit_at: \\d{4}-\\d\\d-\\d\\d\\nsplit_commit: ${head}\\n---`));
  assert.match(slices, /### Slice: add-csv-export\n- goal: File export behind a flag\n- capabilities: export\n- depends_on: none\n- flag: csv-export\n- ticket: tickets\/add-csv-export.md\n- status: planned/);
  for (const n of ['Report totals', 'Report filters', 'CSV export', 'Filter by tag', 'Export week']) assert.ok(!slices.includes(n), `parent names ${n}`);
  assert.doesNotMatch(slices, /SHALL|\*\*WHEN\*\*|Amendments|- \[ \]/);
  assert.match(R(dir, `${c}/tickets/add-csv-export.md`), /^Summary: \[add-reports\] add-csv-export - File export behind a flag\n[\s\S]*Labels: openspec, split-add-reports, flag-csv-export/);
  assert.doesNotMatch(R(dir, `${c}/tickets/add-csv-export.md`), /CSV export"|Export week/);
  assert.equal(fs.existsSync(path.join(dir, c, 'tickets', 'add-report-filters.md')), false);
  const totals = R(dir, CHILD('add-report-totals', 'reports'));
  assert.match(totals, /^## Purpose\n\nWeekly activity reports/);
  assert.ok(totals.includes(req('Report totals', ['Totals per day', 'Empty week']).trim()));
  assert.match(R(dir, 'openspec/changes/add-csv-export/proposal.md'), /Behind the feature flag `csv-export`[\s\S]*## Split notes[\s\S]*_None\._/);
  assert.deepEqual(proposalLeaks(R(dir, 'openspec/changes/add-csv-export/proposal.md')), [], 'the split-notes template is not an implementation-detail leak');
  assert.match(R(dir, 'openspec/changes/add-report-totals/proposal.md'), /### New Capabilities\n\n- `reports`/);
  assert.match(R(dir, 'openspec/changes/add-report-filters/proposal.md'), /### New Capabilities\n\n_None\._\n\n### Modified Capabilities\n\n- `reports`/, 'an earlier slice in depends_on creates the capability');
  addFlag(dir);
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, new RegExp(`loss-check add-reports \\(after split\\): PASS\\n  baseline: original deltas at split commit ${head.slice(0, 7)} \\(git show\\) - 3 requirements, 6 scenarios; slices: 4; split notes: 1`));
  r = run('check-handoff.mjs', ['add-reports'], dir);
  assert.match(r.out, /is a split parent/);
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
  const f = CHILD('add-report-filters', 'reports');
  const orig = R(dir, f);
  W(dir, f, orig.replace(/\n#### Scenario: Filter by tag[\s\S]*$/, '\n'));
  let r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ Scenario "Filter by tag" -> MISSING/);
  notes(dir, 'add-report-filters', '- dropped: Scenario "Filter by tag" - tags ship in a later change');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Scenario "Filter by tag" -> dropped \(split note in add-report-filters\)/);
  // dropped but present again + duplicate + unsourced
  W(dir, f, orig + '\n### Requirement: Report sharing\nThe system SHALL share reports.\n\n#### Scenario: Share it\n- **WHEN** shared\n- **THEN** a link\n');
  const t = CHILD('add-report-totals', 'reports');
  W(dir, t, R(dir, t) + '\n' + req('Report filters', ['Filter by member']));
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /Requirement "Report filters".*DUPLICATE/);
  assert.match(r.out, /add-report-filters: Requirement "Report sharing" is unsourced/);
  assert.match(r.out, /Scenario "Filter by tag".*dropped.*still/);
  W(dir, f, orig); W(dir, t, R(dir, t).replace(/\n### Requirement: Report filters[\s\S]*$/, '\n'));
  const pf = 'openspec/changes/add-report-filters/proposal.md';
  W(dir, pf, R(dir, pf).replace(/^- dropped: Scenario "Filter by tag".*$/m, '_None._'));
  notes(dir, 'add-report-totals', '- dropped: Requirement "Nope" - typo');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /split note names Requirement "Nope", which is not in the original deltas/);
});

test('rename (Q7): an unmatched original is listed with child names that have no original; renamed_from accepts it', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  addFlag(dir);
  const f = CHILD('add-report-totals', 'reports');
  W(dir, f, R(dir, f).replace('### Requirement: Report totals', '### Requirement: Weekly totals').replace('#### Scenario: Empty week', '#### Scenario: Week without activity'));
  let r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /Requirement "Report totals" -> MISSING/);
  assert.match(r.out, /Possible renames \(Requirement\) - judge semantic equivalence:\n    unmatched originals: "Report totals"\n    child names with no original: "Weekly totals" \(add-report-totals\)/);
  assert.match(r.out, /Possible renames \(Scenario\)[\s\S]*unmatched originals: "Empty week"/);
  notes(dir, 'add-report-totals', '- renamed_from: Requirement "Report totals" -> "Weekly totals" - same behaviour, clearer name');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1, 'the scenario rename is still open');
  notes(dir, 'add-report-totals', '- renamed_from: Requirement "Report totals" -> "Weekly totals" - same behaviour, clearer name');
  const p = 'openspec/changes/add-report-totals/proposal.md';
  W(dir, p, R(dir, p).trimEnd() + '\n- renamed_from: Scenario "Empty week" -> "Week without activity" - same case\n');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Requirement "Report totals" -> add-report-totals as "Weekly totals" \(renamed_from\)/);
  assert.doesNotMatch(r.out, /Possible renames/);
});

test('split requirement: split_from needs a confirmed split note in each receiving child', () => {
  const { dir, c } = project();
  W(dir, `${c}/execution/split-proposal.md`, `---\napproved_by: engineer (test)\n---\n\n## Slices\n\n### Slice: add-reports-core\n- goal: Totals and member filter\n- capabilities: reports\n- requirements: Report totals\n- split: Report filters -> Member filter [Filter by member]\n- depends_on: none\n- flag: none\n\n### Slice: add-reports-more\n- goal: Tag filter and export\n- capabilities: export\n- requirements: CSV export\n- split: Report filters -> Tag filter [Filter by tag]\n- depends_on: add-reports-core\n- flag: none\n`);
  let r = run('split.mjs', ['apply', 'add-reports'], dir);
  assert.equal(r.code, 1, r.out);
  assert.match(R(dir, CHILD('add-reports-core', 'reports')), /### Requirement: Member filter\n<!-- split_from: Report filters -->\nThe system SHALL do report filters[\s\S]*#### Scenario: Filter by member/);
  assert.match(r.out, /needs confirmation/);
  assert.match(r.out, /add-reports-core\/proposal.md "## Split notes": - split_from: Requirement "Report filters" - confirmed/);
  notes(dir, 'add-reports-core', '- split_from: Requirement "Report filters" - confirmed');
  notes(dir, 'add-reports-more', '- split_from: Requirement "Report filters" - confirmed');
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Requirement "Report filters" -> split into "Member filter" \(add-reports-core\), "Tag filter" \(add-reports-more\)/);
});

const archive = (dir, id) => { fs.mkdirSync(path.join(dir, 'openspec/changes/archive'), { recursive: true }); fs.renameSync(path.join(dir, 'openspec/changes', id), path.join(dir, 'openspec/changes/archive', `2026-10-10-${id}`)); };

test('next + mark: ready when all depends_on are archived; in-progress is the engineer\'s mark; parallel-safe only without dependency and shared capability', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  let r = run('split.mjs', ['next', 'add-reports'], dir);
  assert.match(r.out, /0\/4 slices done \(archived folder present on main\)/);
  assert.match(r.out, /Ready now: add-report-totals, add-csv-export/);
  assert.match(r.out, /Parallel-safe now[^\n]*add-report-totals ∥ add-csv-export/);
  assert.match(r.out, /\| add-report-filters \| planned \| add-report-totals \| waits for add-report-totals \|/);
  r = run('split.mjs', ['mark', 'add-reports', 'add-report-totals', 'in-progress'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(R(dir, `${C}/slices.md`), /### Slice: add-report-totals\n[\s\S]*?- status: in-progress/);
  r = run('split.mjs', ['next', 'add-reports'], dir);
  assert.match(r.out, /\| add-report-totals \| in progress \|/);
  assert.match(r.out, /Ready now: add-csv-export/);
  assert.match(r.out, /In progress \(engineer's mark\): add-report-totals/);
  assert.match(r.out, /Parallel-safe with work in progress \(taken or ready, no dependency, no shared capability\): add-report-totals ∥ add-csv-export/);
  r = run('split.mjs', ['mark', 'add-reports', 'nope', 'in-progress'], dir);
  assert.equal(r.code, 2);
  archive(dir, 'add-report-totals');
  r = run('split.mjs', ['next', 'add-reports', '--write-tickets'], dir);
  assert.match(r.out, /1\/4 slices done/);
  assert.match(r.out, /\| add-report-totals \| done \|/);
  assert.match(r.out, /Ready now: add-report-filters, add-csv-export/);
  assert.match(r.out, /Tickets written: tickets\/add-report-filters.md/);
  assert.match(R(dir, `${C}/slices.md`), /### Slice: add-report-filters\n[\s\S]*?- ticket: tickets\/add-report-filters.md/);
  assert.match(R(dir, `${C}/tickets/add-report-filters.md`), /add-report-filters is committed in the slice's own PR with its code, merged to main/);
});

test('final loss check uses main specs + archived children; OpenSpec archives the parent with --skip-specs', { skip: !fs.existsSync(OPENSPEC) }, () => {
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
  assert.match(r.out, /slice "add-report-totals" is not archived yet/);
  for (const id of ['add-report-totals', 'add-report-filters', 'add-csv-export', 'remove-csv-flag']) {
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
  assert.doesNotMatch(R(dir, 'openspec/specs/export/spec.md'), /Export flag gate/);
});

test('re-split: a slice is split again into the SAME parent (no nested parents); its split notes carry over', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  addFlag(dir);
  W(dir, 'openspec/changes/add-csv-export/execution/split-proposal.md', `---\napproved_by: engineer (test)\n---\n\n## Slices\n\n### Slice: add-csv-export-core\n- goal: File export\n- capabilities: export\n- requirements: CSV export\n- depends_on: none\n- flag: none\n\n### Slice: add-csv-export-flag\n- goal: Flag for the export\n- capabilities: export-ui\n- requirements: Export flag gate\n- depends_on: add-csv-export-core\n- flag: csv-export\n`);
  const r = run('split.mjs', ['apply', 'add-csv-export'], dir);
  assert.match(r.out, /re-split into parent add-reports; children: add-csv-export-core, add-csv-export-flag/);
  assert.equal(fs.existsSync(path.join(dir, 'openspec/changes/add-csv-export')), false);
  const s = R(dir, `${C}/slices.md`);
  assert.match(s, /### Slice: remove-csv-flag[\s\S]*- depends_on: add-csv-export-core, add-csv-export-flag/);
  assert.equal(fs.existsSync(path.join(dir, 'openspec/changes/add-csv-export-core/slices.md')), false);
  assert.match(R(dir, 'openspec/changes/add-csv-export-flag/proposal.md'), /- added: Requirement "Export flag gate"/);
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
  assert.match(r.out, /total ~380 lines[\s\S]*! over budget: consider re-splitting with \/split-check/);
  assert.equal(r.code, 0, r.out);
});

test('parallel slice branches: sdd-pp init union merge for slices.md keeps both status marks; duplicate fields are flagged', () => {
  const { dir, git } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  const inst = initCli(dir, '--no-claude', '--no-cursor', '--no-opencode', '--no-set-default');
  assert.equal(inst.status, 0, inst.stderr);
  assert.match(R(dir, '.gitattributes'), /^openspec\/changes\/\*\*\/slices\.md merge=union$/m);
  git('add', '-A'); git('commit', '-qm', 'plan');
  git('switch', '-qc', 'a'); run('split.mjs', ['mark', 'add-reports', 'add-report-totals', 'in-progress'], dir); git('commit', '-qam', 'a');
  git('switch', '-q', 'main'); git('switch', '-qc', 'b'); run('split.mjs', ['mark', 'add-reports', 'add-csv-export', 'in-progress'], dir); git('commit', '-qam', 'b');
  git('switch', '-q', 'main'); git('merge', '-q', '--no-ff', 'a', '-m', 'a');
  git('merge', '-q', '--no-ff', 'b', '-m', 'b'); // no conflict
  const s = `${C}/slices.md`;
  const text = R(dir, s);
  assert.match(text, /### Slice: add-report-totals\n[\s\S]*?- status: in-progress/);
  assert.match(text, /### Slice: add-csv-export\n[\s\S]*?- status: in-progress/);
  W(dir, s, text.replace('- ticket: tickets/add-report-totals.md', '- ticket: tickets/add-report-totals.md\n- ticket: none'));
  const r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.match(r.out, /slice "add-report-totals" has "ticket:" twice \(a union merge of two branches\?\)/);
});
