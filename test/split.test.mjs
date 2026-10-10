// Change splitting: /split-check gate, split.mjs apply / loss / next, split-plan schema.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, run } from './helpers.mjs';

const W = (dir, rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
const R = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const req = (name, scen) => `### Requirement: ${name}\nThe system SHALL do ${name.toLowerCase()} for every report.\n\n${scen.map((s) => `#### Scenario: ${s}\n- **WHEN** ${s.toLowerCase()} happens\n- **THEN** the report shows it`).join('\n\n')}\n`;

/** A project with one big change "add-reports" (capabilities reports + export). */
function project() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'split-'));
  W(dir, 'openspec/config.yaml', 'schema: handoff-driven\n');
  W(dir, 'openspec/specs/.gitkeep', '');
  fs.cpSync(path.join(TOOLKIT, 'schemas'), path.join(dir, 'openspec', 'schemas'), { recursive: true });
  const c = 'openspec/changes/add-reports';
  W(dir, `${c}/.openspec.yaml`, 'schema: handoff-driven\ncreated: 2026-10-10\n');
  W(dir, `${c}/proposal.md`, '# Proposal\n\n## Why\n\nTeams need weekly reports of their activity to plan the next week well.\n\n## What Changes\n\n- Weekly reports and CSV export.\n');
  W(dir, `${c}/specs/reports/spec.md`, `## Purpose\n\nWeekly activity reports for teams, so they can plan the next week.\n\n## ADDED Requirements\n\n${req('Report totals', ['Totals per day', 'Empty week'])}\n${req('Report filters', ['Filter by member', 'Filter by tag'])}\n`);
  W(dir, `${c}/specs/export/spec.md`, `## Purpose\n\nExport reports to files so teams can share them outside the app.\n\n## ADDED Requirements\n\n${req('CSV export', ['Export week', 'Export empty week'])}\n`);
  return { dir, c };
}

const estimate = (dir, c, rows) => W(dir, `${c}/execution/size-estimate.md`, `| Requirement | Scenarios | Code touched | Estimate |\n|---|---|---|---|\n${rows.map(([n, e]) => `| ${n} | 2 | src/x.mjs | ${e} |`).join('\n')}\n`);

const PROPOSAL = (approved = 'engineer (test)') => `---\napproved_by: ${approved}\n---\n\n## Slices\n\n### Slice: add-report-totals\n- goal: Weekly totals\n- capabilities: reports\n- requirements: Report totals\n- depends_on: none\n- flag: none\n- estimate: 150\n\n### Slice: add-report-filters\n- goal: Filters for reports\n- capabilities: reports\n- requirements: Report filters\n- depends_on: add-report-totals\n- flag: none\n- estimate: 120\n\n### Slice: add-csv-export\n- goal: CSV export behind a flag\n- capabilities: export\n- requirements: CSV export\n- depends_on: none\n- flag: csv-export\n- estimate: 140\n\n### Slice: remove-csv-flag\n- goal: Remove the csv-export flag\n- capabilities: export-flags\n- depends_on: add-csv-export\n- removes_flag: csv-export\n- estimate: 20\n`;

test('split-check: asks for estimates, one line when it fits, warns (exit 0) and lints the proposal when over', () => {
  const { dir, c } = project();
  let r = run('split-check.mjs', ['add-reports'], dir);
  assert.equal(r.code, 0);
  assert.match(r.out, /no execution\/size-estimate.md yet/);
  assert.match(r.out, /\| Report filters \| \| \| \|/);
  estimate(dir, c, [['Report totals', 80], ['Report filters', 60], ['CSV export', 90]]);
  r = run('split-check.mjs', ['add-reports'], dir);
  assert.equal(r.out.trim(), 'split-check add-reports: fits (~230 of ~300 lines estimated, 3 requirements)');
  estimate(dir, c, [['Report totals', 150], ['Report filters', 120], ['CSV export', 140]]);
  r = run('split-check.mjs', ['add-reports', '--write'], dir);
  assert.equal(r.code, 0);
  assert.match(r.out, /OVER BUDGET \(warning\) - ~410 lines estimated, budget ~300/);
  assert.match(r.out, /propose slices in execution\/split-proposal.md/);
  assert.match(R(dir, `${c}/execution/split-check.md`), /\| \*\*Total\*\* \| \| \| \*\*410\*\* \|/);
  W(dir, `${c}/execution/split-proposal.md`, PROPOSAL('').replace(/### Slice: remove-csv-flag[\s\S]*$/, ''));
  r = run('split-check.mjs', ['add-reports'], dir);
  assert.match(r.out, /NOT approved yet/);
  assert.match(r.out, /✗ flag "csv-export": no cleanup slice/);
  assert.match(r.out, /Parallel-safe pairs \(no dependency, no shared capability\): add-report-totals ∥ add-csv-export, add-report-filters ∥ add-csv-export/);
});

function splitProject() {
  const p = project();
  estimate(p.dir, p.c, [['Report totals', 150], ['Report filters', 120], ['CSV export', 140]]);
  W(p.dir, `${p.c}/execution/split-proposal.md`, PROPOSAL() + '\n## Amendments\n\n- Requirement "CSV export flag" added in add-csv-export: gates the export button until remove-csv-flag\n');
  return p;
}
const addFlag = (dir) => {
  const f = 'openspec/changes/add-csv-export/specs/export/spec.md';
  W(dir, f, R(dir, f) + '\n### Requirement: CSV export flag\nThe system SHALL hide the export action while the csv-export flag is off.\n\n#### Scenario: Flag off\n- **WHEN** the flag is off\n- **THEN** no export action is shown\n');
  W(dir, 'openspec/changes/remove-csv-flag/specs/export/spec.md', '## REMOVED Requirements\n\n### Requirement: CSV export flag\n**Reason**: the export is released\n**Migration**: none\n');
};

test('split apply: refuses without approval; converts the original into a split-plan parent and creates verbatim children', () => {
  const { dir, c } = splitProject();
  W(dir, `${c}/execution/split-proposal.md`, PROPOSAL(''));
  let r = run('split.mjs', ['apply', 'add-reports'], dir);
  assert.equal(r.code, 2);
  assert.match(r.out, /approved_by:" is empty - the engineer approves/);
  W(dir, `${c}/execution/split-proposal.md`, PROPOSAL() + '\n## Amendments\n\n- Requirement "CSV export flag" added in add-csv-export: gates the export button\n');
  r = run('split.mjs', ['apply', 'add-reports'], dir);
  assert.match(r.out, /parent add-reports \(schema split-plan\); children: add-report-totals, add-report-filters, add-csv-export, remove-csv-flag/);
  assert.match(R(dir, `${c}/.openspec.yaml`), /schema: split-plan\nskip_specs: true|schema: split-plan[\s\S]*skip_specs: true/);
  assert.equal(fs.existsSync(path.join(dir, c, 'specs')), false);
  const slices = R(dir, `${c}/slices.md`);
  assert.match(slices, /- \[ \] Requirement: Report filters\n  - \[ \] Scenario: Filter by member\n  - \[ \] Scenario: Filter by tag/);
  assert.doesNotMatch(slices, /SHALL|\*\*WHEN\*\*/);
  const totals = R(dir, 'openspec/changes/add-report-totals/specs/reports/spec.md');
  assert.match(totals, /^## Purpose\n\nWeekly activity reports/);
  assert.ok(totals.includes(req('Report totals', ['Totals per day', 'Empty week']).trim()));
  assert.match(R(dir, 'openspec/changes/add-csv-export/proposal.md'), /Behind the feature flag `csv-export`/);
  assert.match(r.out, /tickets written for READY slices: tickets\/add-report-totals.md, tickets\/add-csv-export.md/);
  assert.match(R(dir, `${c}/tickets/add-csv-export.md`), /^Summary: \[add-reports\] add-csv-export - CSV export behind a flag\n[\s\S]*Labels: openspec, split-add-reports, flag-csv-export/);
  assert.equal(fs.existsSync(path.join(dir, c, 'tickets', 'add-report-filters.md')), false);
  addFlag(dir);
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /loss-check add-reports \(after split\): PASS/);
  r = run('check-handoff.mjs', ['add-reports'], dir);
  assert.match(r.out, /is a split parent/);
});

test('loss check: fails on a dropped scenario, duplicate and unsourced; an amendment makes it pass; splits need confirmation', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  addFlag(dir);
  const f = 'openspec/changes/add-report-filters/specs/reports/spec.md';
  const orig = R(dir, f);
  W(dir, f, orig.replace(/\n#### Scenario: Filter by tag[\s\S]*$/, '\n'));
  let r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /✗ Scenario "Filter by tag" \(of "Report filters"\): in no child delta and no amendment covers it/);
  const s = 'openspec/changes/add-reports/slices.md';
  W(dir, s, R(dir, s).replace('## Amendments\n\n', '## Amendments\n\n- Scenario "Filter by tag" dropped: tags ship in a later change\n'));
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Scenario "Filter by tag" -> dropped/);
  // duplicate + unsourced
  W(dir, f, orig + '\n### Requirement: Report sharing\nThe system SHALL share reports.\n\n#### Scenario: Share link\n- **WHEN** shared\n- **THEN** a link\n');
  const t = 'openspec/changes/add-report-totals/specs/reports/spec.md';
  W(dir, t, R(dir, t) + '\n' + req('Report filters', ['Filter by member']));
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /Requirement "Report filters": in more than one child/);
  assert.match(r.out, /add-report-filters: Requirement "Report sharing" is unsourced/);
  assert.match(r.out, /amended \(dropped\) but still in add-report-filters/);
  // "changed, see change <the slice holding it>" = behaviour edited in that slice's live delta: fine, still exactly once
  W(dir, f, orig.replace('\n#### Scenario: Filter by tag', '\n#### Scenario: Filter by both\n- **WHEN** both\n- **THEN** both\n\n#### Scenario: Filter by tag'));
  W(dir, t, R(dir, t).replace(/\n### Requirement: Report filters[\s\S]*$/, '\n'));
  W(dir, s, R(dir, s).replace(/- Scenario "Filter by tag" dropped.*\n/, '').replace('## Amendments\n\n', '## Amendments\n\n- Requirement "Report filters" changed, see change add-report-filters: both filters combine\n- Scenario "Filter by both" added in add-report-filters: pins it\n'));
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Requirement "Report filters" -> add-report-filters \(edited there, amendment\)/);
  W(dir, s, R(dir, s).replace('see change add-report-filters', 'see change add-report-totals'));
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /amended as changed but still in add-report-filters/);
});

test('split requirement: split_from needs a confirmed amendment', () => {
  const { dir, c } = project();
  estimate(dir, c, [['Report totals', 150], ['Report filters', 200], ['CSV export', 140]]);
  W(dir, `${c}/execution/split-proposal.md`, `---\napproved_by: engineer (test)\n---\n\n## Slices\n\n### Slice: add-reports-core\n- goal: Totals and member filter\n- capabilities: reports\n- requirements: Report totals\n- split: Report filters -> Member filter [Filter by member]\n- depends_on: none\n- flag: none\n- estimate: 200\n\n### Slice: add-reports-more\n- goal: Tag filter and export\n- capabilities: export\n- requirements: CSV export\n- split: Report filters -> Tag filter [Filter by tag]\n- depends_on: add-reports-core\n- flag: none\n- estimate: 200\n`);
  let r = run('split.mjs', ['apply', 'add-reports'], dir);
  assert.equal(r.code, 1, r.out);
  assert.match(R(dir, 'openspec/changes/add-reports-core/specs/reports/spec.md'), /### Requirement: Member filter\n<!-- split_from: Report filters -->\nThe system SHALL do report filters[\s\S]*#### Scenario: Filter by member/);
  assert.match(r.out, /needs confirmation/);
  assert.match(r.out, /- Requirement "Report filters" split into "Member filter", "Tag filter" - confirmed/);
  const s = `${c}/slices.md`;
  W(dir, s, R(dir, s).replace('## Amendments\n\n_None._', '## Amendments\n\n- Requirement "Report filters" split into "Member filter", "Tag filter" - confirmed'));
  r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Requirement "Report filters" -> split into "Member filter" \(add-reports-core\), "Tag filter" \(add-reports-more\)/);
});

const archive = (dir, id) => fs.renameSync(path.join(dir, 'openspec/changes', id), path.join(dir, 'openspec/changes/archive', `2026-10-10-${id}`));

test('next: ready when all depends_on are archived; parallel-safe only without dependency and shared capability; tickets for ready slices only', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  fs.mkdirSync(path.join(dir, 'openspec/changes/archive'), { recursive: true });
  let r = run('split.mjs', ['next', 'add-reports'], dir);
  assert.match(r.out, /0\/4 slices archived/);
  assert.match(r.out, /Ready now: add-report-totals, add-csv-export/);
  assert.match(r.out, /Parallel-safe now \(both ready, no dependency, no shared capability\): add-report-totals ∥ add-csv-export/);
  assert.match(r.out, /\| add-report-filters \| planned \| add-report-totals \| waits for add-report-totals \|/);
  // the gate on a slice uses the approved slice estimate (silent one-liner when it fits)
  r = run('split-check.mjs', ['add-report-totals'], dir);
  assert.match(r.out, /^split-check add-report-totals: fits \(~\d+ of ~300 lines, approved slice estimate in add-reports\/slices.md, 1 requirements\)\n?$/);
  archive(dir, 'add-report-totals');
  r = run('split.mjs', ['next', 'add-reports', '--write-tickets'], dir);
  assert.match(r.out, /Ready now: add-report-filters, add-csv-export/);
  assert.match(r.out, /Tickets written: tickets\/add-report-filters.md/);
  assert.match(r.out, /add-report-filters ∥ add-csv-export/);
  assert.match(R(dir, 'openspec/changes/add-reports/slices.md'), /### Slice: add-report-filters\n[\s\S]*?- ticket: tickets\/add-report-filters.md/);
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
  let v = os_('validate', '--all', '--strict');
  assert.equal(v.status, 0, v.stdout + v.stderr);
  let r = run('split.mjs', ['loss', 'add-reports', '--final'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /slice "add-report-totals" is not archived yet/);
  for (const id of ['add-report-totals', 'add-report-filters', 'add-csv-export', 'remove-csv-flag']) {
    const a = os_('archive', id, '--yes');
    assert.equal(a.status, 0, a.stdout + a.stderr);
  }
  r = run('split.mjs', ['loss', 'add-reports', '--final', '--write'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(R(dir, 'openspec/changes/add-reports/slices.md'), /- \[x\] Requirement: CSV export\n  - \[x\] Scenario: Export week/);
  const before = fs.readdirSync(path.join(dir, 'openspec/specs')).sort();
  const a = os_('archive', 'add-reports', '--skip-specs', '--yes');
  assert.equal(a.status, 0, a.stdout + a.stderr);
  assert.deepEqual(fs.readdirSync(path.join(dir, 'openspec/specs')).sort(), before);
  assert.doesNotMatch(R(dir, 'openspec/specs/export/spec.md'), /CSV export flag/);
});

test('re-split: a slice is split again into the SAME parent (no nested parents)', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  addFlag(dir);
  W(dir, 'openspec/changes/add-csv-export/execution/split-proposal.md', `---\napproved_by: engineer (test)\n---\n\n## Slices\n\n### Slice: add-csv-export-core\n- goal: CSV export\n- capabilities: export\n- requirements: CSV export\n- depends_on: none\n- flag: none\n- estimate: 100\n\n### Slice: add-csv-export-flag\n- goal: Flag for the export\n- capabilities: export-ui\n- requirements: CSV export flag\n- depends_on: add-csv-export-core\n- flag: csv-export\n- estimate: 40\n`);
  const r = run('split.mjs', ['apply', 'add-csv-export'], dir);
  assert.match(r.out, /re-split into parent add-reports; children: add-csv-export-core, add-csv-export-flag/);
  assert.equal(fs.existsSync(path.join(dir, 'openspec/changes/add-csv-export')), false);
  const s = R(dir, 'openspec/changes/add-reports/slices.md');
  assert.match(s, /### Slice: remove-csv-flag[\s\S]*- depends_on: add-csv-export-core, add-csv-export-flag/);
  assert.match(s, /- Slice "add-csv-export" re-split into add-csv-export-core, add-csv-export-flag/);
  assert.equal(fs.existsSync(path.join(dir, 'openspec/changes/add-csv-export-core/slices.md')), false);
  W(dir, 'openspec/changes/add-reports/slices.md', s.replace('added in add-csv-export:', 'added in add-csv-export-flag:'));
  const l = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.equal(l.code, 0, l.out);
});

test('spec-check: size re-estimate after planning from "Estimate: ~N lines" in tickets (warn-only)', async () => {
  const { makeFixture, CHANGE } = await import('./helpers.mjs');
  const { changeDir, dir } = makeFixture();
  const tdir = path.join(changeDir, 'execution', 'tickets');
  const files = fs.readdirSync(tdir).sort();
  fs.appendFileSync(path.join(tdir, files[0]), '\nEstimate: ~180 lines\n');
  let r = run('spec-check.mjs', [CHANGE], dir);
  assert.match(r.out, /### Size \(re-estimate after planning, warn-only\)\n\n- 1\/2 tickets \/ plan tasks carry an "Estimate: ~N lines" line; total ~180 lines/);
  fs.appendFileSync(path.join(tdir, files[1]), '\nEstimate: ~200 lines\n');
  r = run('spec-check.mjs', [CHANGE], dir);
  assert.match(r.out, /total ~380 lines[\s\S]*! over budget: consider re-splitting with \/split-check/);
  assert.equal(r.code, 0, r.out);
});

test('parallel slice branches: install.sh union merge for slices.md keeps both amendment lines; duplicate fields are flagged', () => {
  const { dir } = splitProject();
  run('split.mjs', ['apply', 'add-reports'], dir);
  const git = (...a) => { const r = spawnSync('git', a, { cwd: dir, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout; };
  const inst = spawnSync('bash', [path.join(TOOLKIT, 'install.sh'), dir, '--no-claude', '--no-cursor', '--no-opencode', '--no-set-default'], { encoding: 'utf8' });
  assert.equal(inst.status, 0, inst.stderr);
  assert.match(R(dir, '.gitattributes'), /^openspec\/changes\/\*\*\/slices\.md merge=union$/m);
  git('init', '-q', '-b', 'main'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'plan');
  const s = 'openspec/changes/add-reports/slices.md';
  const append = (line) => W(dir, s, R(dir, s).trimEnd() + `\n${line}\n`);
  git('switch', '-qc', 'a'); append('- Scenario "Filter by tag" dropped: later'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qam', 'a');
  git('switch', '-q', 'main'); git('switch', '-qc', 'b'); append('- Requirement "CSV export" changed, see change add-csv-export: columns'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qam', 'b');
  git('switch', '-q', 'main'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'merge', '-q', '--no-ff', 'a', '-m', 'a');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'merge', '-q', '--no-ff', 'b', '-m', 'b'); // no conflict
  const text = R(dir, s);
  assert.match(text, /Scenario "Filter by tag" dropped/);
  assert.match(text, /Requirement "CSV export" changed, see change add-csv-export/);
  W(dir, s, text.replace('- ticket: tickets/add-report-totals.md', '- ticket: tickets/add-report-totals.md\n- ticket: none'));
  const r = run('split.mjs', ['loss', 'add-reports'], dir);
  assert.match(r.out, /slice "add-report-totals" has "ticket:" twice \(a union merge of two branches\?\)/);
});
