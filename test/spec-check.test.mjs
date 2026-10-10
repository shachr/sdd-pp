// /spec-check: the only plan-vs-spec check (requirement links, coverage; the agent review is in the command).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeFixture, run, setHandoff, CHANGE } from './helpers.mjs';

const ex = (changeDir, f) => path.join(changeDir, 'execution', f);
const replaceIn = (file, a, b) => fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(a, b));

test('spec-check: the example change passes and maps every requirement to stories and tickets', () => {
  const { dir, changeDir } = makeFixture();
  const r = run('spec-check.mjs', [CHANGE, '--write'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /\| Greeting by name \| story 1<br>01: greet\(\) - name parameter<br>02: CLI - argv wiring \| ✓ Name given/);
  assert.match(r.out, /\| Blank name falls back to default \| story 2<br>01: greet\(\) - name parameter \| ✓ Whitespace-only name/);
  assert.match(r.out, /^PENDING: mechanical checks pass\. The agent review decides: write PASS if Missing, Invented and Contradicted are all "none", otherwise GAPS/m);
  assert.match(r.out, /### Agent review\n\n<!-- [^\n]*Missing, Invented, Contradicted, Restated \(advisory\)/);
  assert.ok(fs.existsSync(ex(changeDir, 'spec-check.md')));
});

test('spec-check: a requirement nobody names is missing; an invented one is unknown', () => {
  const { dir, changeDir } = makeFixture();
  for (const f of ['spec.md', 'tickets/01-greet-accepts-a-name.md']) {
    replaceIn(ex(changeDir, f), /"Requirement: Blank name falls back to default"/, '"Requirement: Shout the name"');
  }
  const r = run('spec-check.mjs', [CHANGE], dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /- Requirement "Blank name falls back to default" - no story \/ ticket \/ plan task names it/);
  assert.match(r.out, /execution\/tickets\/01-greet-accepts-a-name\.md:1 ticket "01: greet\(\) - name parameter" names requirement "Shout the name"/);
  assert.match(r.out, /^GAPS: \d+ mechanical finding/m);
});

test('requirement-link rule: a story or ticket that names no requirement is a gap', () => {
  const { dir, changeDir } = makeFixture();
  replaceIn(ex(changeDir, 'spec.md'), /## Implementation Decisions/, '3. As a CLI user, I want colours.\n\n## Implementation Decisions');
  const s = run('spec-check.mjs', [CHANGE], dir);
  assert.equal(s.code, 1);
  assert.match(s.out, /Added without source[\s\S]*execution\/spec\.md:\d+ user story "story 3" names no delta requirement/);
});

test('requirement-link rule: plan tasks need a Covers line naming a delta requirement; unknown scenarios fail', () => {
  const { dir, changeDir } = makeFixture();
  setHandoff(dir, { tool: 'superpowers', apply_mode: 'executing-plans' });
  fs.rmSync(ex(changeDir, 'tickets'), { recursive: true });
  fs.rmSync(ex(changeDir, 'spec.md'));
  fs.writeFileSync(ex(changeDir, `plan-${CHANGE}.md`), [
    '# Plan', '', '**Spec:** [proposal](../proposal.md) · [delta](../specs/greeting/spec.md)', '',
    '### Task 1: greet(name)', '', '**Covers:** "Requirement: Greeting by name", "Requirement: Blank name falls back to default"', '',
    'Tests: Scenario "Name given", Scenario "Name with surrounding spaces", Scenario "Whitespace-only name"', '',
    '### Task 2: CLI wiring', '', 'Wire argv; Scenario "Name typed twice".', '',
  ].join('\n'));
  const r = run('spec-check.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /plan task "Task 2: CLI wiring" names no delta requirement/);
  assert.match(r.out, /plan task "Task 2: CLI wiring" names scenario "Name typed twice"/);
});

test('spec changes since the last accepted PASS: listed on every run until PASS is accepted; --accept guards; added / changed / renamed / removed with citing units (done marked)', () => {
  const { dir, changeDir } = makeFixture();
  const delta = path.join(changeDir, 'specs', 'greeting', 'spec.md');
  const report = ex(changeDir, 'spec-check.md');
  const snapFile = ex(changeDir, '.spec-check.json');
  const setPass = (d = report) => fs.writeFileSync(d, fs.readFileSync(d, 'utf8').replace(/^PENDING: .*$/m, 'PASS'));
  let r = run('spec-check.mjs', [CHANGE, '--write'], dir);
  assert.match(r.out, /### Spec changes since the last check \(report-only\)\n\n- none: no accepted baseline yet - on PASS, \/spec-check accepts it/);
  assert.equal(fs.existsSync(snapFile), false, '--write never records the baseline');
  r = run('spec-check.mjs', [CHANGE, '--accept'], dir);
  assert.equal(r.code, 1); assert.match(r.out, /Result is "PENDING: .*", not exactly PASS - baseline unchanged/);
  setPass();
  r = run('spec-check.mjs', [CHANGE, '--accept'], dir);
  assert.equal(r.code, 0, r.out); assert.match(r.out, /PASS accepted - baseline execution\/\.spec-check\.json/);
  assert.match(fs.readFileSync(report, 'utf8'), /^PASS$/m, '--accept does not rewrite the report');
  const snap = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
  assert.match(snap.accepted_at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/, 'local time with offset');
  assert.match(snap.requirements['Greeting by name'].scenarios['Name given'], /^[0-9a-f]{12}$/);
  r = run('spec-check.mjs', [CHANGE, '--write'], dir);
  assert.match(r.out, /### Spec changes since the last check \(report-only; baseline accepted [^)]+[+-]\d\d:\d\d\)\n\n- none\n/);
  // edit the delta after planning: change a scenario, rename a requirement (same content), add a scenario
  replaceIn(delta, '- **THEN** the output is `Hello, Ada!`\n\n#### Scenario: Name with', '- **THEN** the output is `Hello, Ada!!`\n\n#### Scenario: Name with');
  replaceIn(delta, '### Requirement: Blank name falls back to default', '### Requirement: Blank name uses the default');
  fs.appendFileSync(delta, '\n#### Scenario: Empty name\n- **WHEN** the user runs `greet ""`\n- **THEN** the output is `Hello, World!`\n');
  for (let k = 0; k < 3; k++) {
    r = run('spec-check.mjs', [CHANGE, '--write'], dir);
    assert.equal(r.code, 1, 'the stale citation of the old name is a mechanical gap; the change list itself is report-only');
    assert.match(r.out, /- renamed: Requirement "Blank name uses the default" \(was "Blank name falls back to default"\) - cited by: story 2; 01: greet\(\) - name parameter \[done\]/);
    assert.match(r.out, /- added: Scenario "Empty name" \(of "Blank name uses the default"\) - cited by: story 2; 01: greet\(\) - name parameter \[done\]/);
    assert.match(r.out, /- changed: Scenario "Name given" \(of "Greeting by name"\) - cited by: story 1; 01: greet\(\) - name parameter \[done\]; 02: CLI - argv wiring \[done\]/);
    assert.match(r.out, /Hint: re-plan ONLY new work for the changes above with the tool's planning \(to-spec \+ to-tickets\) - no open unit cites them\. Done units are never touched \(01: greet\(\) - name parameter; 02: CLI - argv wiring\): a change that affects done work becomes a new ticket\. Where a planned decision changed, note "superseded by delta edit: <reason>"/);
    assert.match(fs.readFileSync(report, 'utf8'), /- renamed: Requirement "Blank name uses the default"/, 'the saved report keeps the list');
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(snapFile, 'utf8')), snap, 'baseline unchanged until accepted');
  setPass();
  r = run('spec-check.mjs', [CHANGE, '--accept'], dir);
  assert.equal(r.code, 1); assert.match(r.out, /mechanical finding\(s\) - fix them/);
  // removal, with no mechanical gap: listed (report-only, PENDING) until a PASS is accepted, then gone
  const { dir: d2, changeDir: c2 } = makeFixture();
  const rep2 = ex(c2, 'spec-check.md'), snap2 = ex(c2, '.spec-check.json');
  run('spec-check.mjs', [CHANGE, '--write'], d2); setPass(rep2);
  assert.equal(run('spec-check.mjs', [CHANGE, '--accept'], d2).code, 0);
  const s2 = JSON.parse(fs.readFileSync(snap2, 'utf8'));
  s2.requirements['Old requirement'] = { delta: 'specs/greeting/spec.md', hash: '000000000000', scenarios: {} };
  fs.writeFileSync(snap2, JSON.stringify(s2));
  for (let k = 0; k < 2; k++) {
    r = run('spec-check.mjs', [CHANGE, '--write'], d2);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /- removed: Requirement "Old requirement" - cited by: nothing yet/);
    assert.match(r.out, /^PENDING: mechanical checks pass/m);
  }
  // a delta edit after the saved PASS: --accept refuses
  setPass(rep2);
  const d2delta = path.join(c2, 'specs', 'greeting', 'spec.md');
  const before = fs.readFileSync(d2delta, 'utf8');
  replaceIn(d2delta, '- **THEN** the output is `Hello, Ada!`\n', '- **THEN** the output is `Hello, Ada!!`\n');
  r = run('spec-check.mjs', [CHANGE, '--accept'], d2);
  assert.equal(r.code, 1); assert.match(r.out, /the delta changed since the saved report/);
  fs.writeFileSync(d2delta, before);
  r = run('spec-check.mjs', [CHANGE, '--accept'], d2);
  assert.equal(r.code, 0, r.out);
  r = run('spec-check.mjs', [CHANGE, '--write'], d2);
  assert.match(r.out, /### Spec changes since the last check \(report-only; baseline accepted [^)]+\)\n\n- none\n/);
});
