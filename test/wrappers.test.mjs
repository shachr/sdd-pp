import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC, CHANGE, makeFixture, setHandoff, run, initCli, OPENSPEC_SKIP } from './helpers.mjs';
import { parseFrontMatter } from '../scripts/lib/change.mjs';

test('every skill has front matter whose name matches its folder', () => {
  for (const name of fs.readdirSync(path.join(TOOLKIT, 'skills'))) {
    const { data, body } = parseFrontMatter(fs.readFileSync(path.join(TOOLKIT, 'skills', name, 'SKILL.md'), 'utf8'));
    assert.equal(data.name, name);
    assert.ok(data.description.length > 40, `${name} needs a description`);
    assert.ok(body.includes('execution/') || name === 'openspec-handoff', `${name} must point outputs at execution/`);
  }
});

test('wrappers name the real upstream skills', () => {
  const ai = fs.readFileSync(path.join(TOOLKIT, 'skills/openspec-handoff-ai-hero/SKILL.md'), 'utf8');
  for (const s of ['grill-with-docs', 'to-spec', 'to-tickets', 'implement', 'tdd', 'code-review']) assert.match(ai, new RegExp('`' + s + '`'));
  const sp = fs.readFileSync(path.join(TOOLKIT, 'skills/openspec-handoff-superpowers/SKILL.md'), 'utf8');
  for (const s of ['brainstorming', 'writing-plans', 'subagent-driven-development', 'executing-plans', 'requesting-code-review']) assert.match(sp, new RegExp('`' + s + '`'));
});

test('sdd-pp init installs schema, scripts, skills and commands into an openspec project', { skip: OPENSPEC_SKIP }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-install-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  let r = spawnSync(OPENSPEC, ['init', '--tools', 'none', '--no-animation', '.'], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  r = initCli(dir, '--set-default');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const f of [
    'openspec/schemas/handoff-driven/schema.yaml', '.openspec-handoff/scripts/spec-check.mjs',
    '.openspec-handoff/config.json', '.openspec-handoff/small-changes.md',
    '.claude/skills/openspec-handoff-ai-hero/SKILL.md', '.cursor/skills/openspec-handoff-superpowers/SKILL.md',
    '.claude/commands/sdd-handoff.md', '.cursor/commands/sdd-handoff.md',
  ]) assert.ok(fs.existsSync(path.join(dir, f)), `missing ${f}`);
  assert.match(fs.readFileSync(path.join(dir, 'openspec/config.yaml'), 'utf8'), /^schema: handoff-driven/m);
  r = spawnSync(OPENSPEC, ['new', 'change', 'demo'], { cwd: dir, encoding: 'utf8' });
  assert.match(r.stdout + r.stderr, /Schema: handoff-driven/);
});

test('superpowers: execution/plan-<id>.md passes /sdd-spec-check with two plan tasks', () => {
  const { dir, changeDir } = makeFixture();
  setHandoff(dir, { tool: 'superpowers', apply_mode: 'executing-plans' });
  fs.rmSync(path.join(changeDir, 'execution', 'tickets'), { recursive: true });
  fs.rmSync(path.join(changeDir, 'execution', 'grill.md'));
  fs.rmSync(path.join(changeDir, 'execution', 'spec.md'));
  fs.writeFileSync(path.join(changeDir, 'execution', 'brainstorm.md'), '---\ntool: superpowers\nsession: brainstorming\n---\n\n> Source of truth: [proposal](../proposal.md)\n');
  fs.writeFileSync(path.join(changeDir, 'execution', `plan-${CHANGE}.md`), [
    '# Greeting by name Implementation Plan', '',
    '**Spec:** [proposal](../proposal.md) · [specs/greeting/spec.md](../specs/greeting/spec.md) · [brainstorm](brainstorm.md)', '',
    '### Task 1: greet(name)', '', '**Covers:** "Requirement: Greeting by name", "Requirement: Blank name falls back to default"', '',
    'Tests: Scenario "Name given", Scenario "Name with surrounding spaces", Scenario "Whitespace-only name"', '',
    '### Task 2: CLI wiring', '', '**Covers:** "Requirement: Greeting by name"', '',
  ].join('\n'));
  const r = run('spec-check.mjs', [CHANGE, '--json'], dir);
  assert.equal(r.code, 0, r.out);
  const json = JSON.parse(r.stdout);
  assert.equal(json.units, 2);
  assert.deepEqual([...json.missing, ...json.unknown, ...json.unsourced], []);
});

test('fixtures are real copies: writing a fixture config never touches the toolkit config', () => {
  const { dir } = makeFixture();
  const f = path.join(dir, '.openspec-handoff', 'config.json');
  assert.equal(fs.lstatSync(f).isSymbolicLink(), false);
});

test('wrappers and templates: spec changes after a delta edit, flag requirement belongs to the slices, harness optional, budget ~300', () => {
  const read = (p) => fs.readFileSync(path.join(TOOLKIT, p), 'utf8');
  for (const w of ['openspec-handoff-ai-hero', 'openspec-handoff-superpowers']) {
    const s = read(`skills/${w}/SKILL.md`);
    assert.match(s, /\*\*One order after any delta edit\*\*/);
    assert.match(s, /1\. Edit the delta, then `openspec validate <id> --strict`\.\n2\. `\/sdd-spec-check <id>`: .*The list stays on every run until a PASS is accepted/);
    assert.match(s, /3\. Re-plan ONLY the open units the report names .*Done units are never touched; a change that affects done work becomes a new (ticket|plan task)\. .*`superseded by delta edit: <reason>`.*the design session file stays as-is/);
    assert.match(s, /4\. `\/sdd-spec-check <id>` until PASS; the command then accepts it .*commit `execution\/\.spec-check\.json`/);
    assert.match(s, /`openspec list` \/ `openspec status` do not see/);
    assert.match(s, /\*\*Ignore OpenSpec's apply prompts\.\*\*.*follow `\/sdd-change-status <id>`/);
    assert.match(s, /\*\*No sub-agents in the harness\?\*\*/);
    // B8: the wrappers agree with the script - show writes nothing, --set starts the session file
    assert.match(s, /`\/sdd-tool <id>` only shows the tool and writes nothing; `--set (ai-hero|superpowers)` starts `execution\/(grill|brainstorm)\.md`/);
    assert.doesNotMatch(s, /`\/sdd-tool <id>` creates/);
    assert.match(s, /`base_ref` in `handoff\.md`/);
  }
  const schema = read('schemas/handoff-driven/schema.yaml');
  assert.match(schema, /`\/sdd-tool <change>` only SHOWS the tool\s+and writes nothing; `--set` starts the session file/);
  assert.doesNotMatch(schema, /`\/sdd-tool <change>` starts the session file/);
  // verify: our instruction overrides OpenSpec verify's "Task Completion: not applicable"
  assert.match(schema, /This overrides verify's own "Task Completion: not applicable"/);
  assert.match(read('skills/openspec-handoff-ai-hero/SKILL.md'), /integration branch is `change\/<id>`; each ticket's `Status: done` \+ checkboxes go in the ticket-branch commit/);
  for (const h of ['claude', 'cursor', 'opencode']) {
    const c = read(`commands/${h}/sdd-spec-check.md`);
    assert.match(c, /8\. \*\*Accept PASS\*\* .*spec-check\.mjs <change-id> --accept/);
    assert.match(c, /the one order: \(delta edited, `openspec validate <change-id> --strict` passed\) -> re-plan ONLY the open units the report names/);
  }
  assert.match(read('README.md'), /Ignore OpenSpec's apply prompts/);
  for (const h of ['claude', 'cursor', 'opencode']) assert.match(read(`commands/${h}/sdd-split-check.md`), /The flag requirement is never in the original delta: the flagged slice adds it/);
  assert.match(read('schemas/split-plan/schema.yaml') + read('schemas/handoff-driven/schema.yaml'), /A feature flag is not part of the\s+original delta/);
  assert.match(read('schemas/handoff-driven/templates/handoff.md'), /harness: <optional: claude-code \| cursor \| codex \| opencode \| other>/);
  assert.match(read('schemas/handoff-driven/templates/handoff.md'), /<n> expected \(planning not run yet; budget 8\)/);
  assert.match(read('schemas/handoff-driven/templates/proposal.md'), /~300 changed lines of code \+ tests[\s\S]*split gate \(\/sdd-split-check/);
  assert.doesNotMatch(read('schemas/handoff-driven/templates/proposal.md'), /400/);
});
