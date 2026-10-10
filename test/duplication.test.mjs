// Stronger reference-not-duplicate lint: forbidden sections, SHALL, paraphrase detection.
// Tuned on real output of the first agent-driven flows (test/fixtures/paraphrase/*-v1-*):
// those restated the delta and must fail; the clean rewrites must pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { paraphraseFindings, FORBIDDEN_SECTIONS, restatingSections } from '../scripts/lib/change.mjs';
import { makeFixture, run, CHANGE } from './helpers.mjs';

const fx = (f) => fs.readFileSync(new URL(`./fixtures/paraphrase/${f}`, import.meta.url), 'utf8');
const errors = (md, delta) => paraphraseFindings(fx(md), fx(delta)).filter((p) => p.level === 'error');

test('v1 to-spec output is flagged: restating User Stories / Problem Statement / Solution sections', () => {
  assert.ok(FORBIDDEN_SECTIONS.test(fx('truncation-v1-to-spec.md')));
  assert.ok(paraphraseFindings(fx('truncation-v1-to-spec.md'), fx('truncation-delta.md')).length >= 1, 'word-boundary rule restated (warning)');
});

test('v1 ticket that re-describes the behaviour fails as a paraphrase', () => {
  const e = errors('truncation-v1-ticket-01.md', 'truncation-delta.md');
  assert.equal(e.length, 1);
  assert.match(e[0].raw, /What to build/);
});

test('v1 plan task title that restates a requirement fails as a paraphrase', () => {
  const e = errors('word-count-v1-plan.md', 'word-count-delta.md');
  assert.ok(e.some((p) => /### Task 1: countWords counts whitespace-separated words/.test(p.raw)));
});

test('clean ticket and clean plan (names + links, test code in fences) pass with no findings', () => {
  assert.deepEqual(paraphraseFindings(fx('truncation-clean-ticket.md'), fx('truncation-delta.md')), []);
  assert.deepEqual(paraphraseFindings(fx('word-count-clean-plan.md'), fx('word-count-delta.md')), []);
  assert.ok(!FORBIDDEN_SECTIONS.test(fx('truncation-clean-ticket.md')) && !FORBIDDEN_SECTIONS.test(fx('word-count-clean-plan.md')));
});

test('citing a requirement or scenario by its full name is never a paraphrase', () => {
  const md = '- [ ] Scenario "Hyphens and apostrophes stay inside a word" passes\n- Requirement "Only tokens with a letter or digit count" is covered by Task 1';
  assert.deepEqual(paraphraseFindings(md, fx('word-count-delta.md')), []);
});

const write = (changeDir, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(changeDir, rel)), { recursive: true });
  fs.writeFileSync(path.join(changeDir, rel), `> Source of truth: [proposal](../proposal.md)\n\n${text}\n`);
};

const PARA = '**What to build:** when the user passes a name argument the greet command prints Hello with the name, whitespace removed, and a newline, exiting with status 0.';

test('check-handoff: paraphrased ticket line is an advisory warning with file:line', () => {
  const { dir, changeDir } = makeFixture();
  write(changeDir, 'execution/tickets/03-x.md', PARA);
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /! execution\/tickets\/03-x\.md:3: likely paraphrases requirement "Greeting by name"/);
});

test('check-handoff: strictDuplication turns paraphrases and restating sections into errors', () => {
  const { dir, changeDir } = makeFixture();
  write(changeDir, 'execution/tickets/03-x.md', PARA);
  write(changeDir, 'execution/spec.md', '## User Stories\n\n1. As a user I want a greeting.');
  const cfg = path.join(dir, 'strict.json');
  fs.writeFileSync(cfg, JSON.stringify({ ...JSON.parse(fs.readFileSync(new URL('../config/handoff-review.json', import.meta.url))), strictDuplication: true }));
  const r = run('check-handoff.mjs', [CHANGE, '--config', cfg], dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /✗ execution\/tickets\/03-x\.md:3: likely paraphrases/);
  assert.match(r.out, /✗ execution\/spec\.md:3: section "## User Stories" has no link/);
});

test('to-spec sections are fine when they reference the proposal/delta; restating ones warn; SHALL is an error', () => {
  const ref = '## Problem Statement\n\nSee [proposal](../proposal.md#why).\n\n## User Stories\n\nThe scenarios of the [delta](../specs/greeting/spec.md) are the stories.\n\n## Implementation Decisions\n\n- one module';
  assert.deepEqual(restatingSections(ref), []);
  assert.deepEqual(restatingSections('# Spec\n\n## User Stories\n\n1. As a user I want a greeting.\n').map((s) => s.line), [3]);
  const { dir, changeDir } = makeFixture();
  write(changeDir, 'execution/spec.md', ref.replace('greeting/spec.md', 'greeting/spec.md') + '\n\nThe tool SHALL be friendly.');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /normative SHALL sentence/);
  assert.doesNotMatch(r.out, /User Stories/);
});

test('check-handoff: OpenSpec design.md is rejected (design belongs to the tool); to-spec output is allowed', () => {
  const { dir, changeDir } = makeFixture();
  fs.writeFileSync(path.join(changeDir, 'design.md'), '# Design\n');
  write(changeDir, 'execution/spec.md', '# Spec\n');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /design\.md in the change folder: design is owned by the execution tool/);
  assert.doesNotMatch(r.out, /execution\/spec\.md/);
});

test('check-handoff: review outputs and verify.md may discuss requirements', () => {
  const { dir, changeDir } = makeFixture();
  write(changeDir, 'execution/verify.md', '### Requirement: Greeting by name\nWhen the greet command receives a name argument it SHALL print Hello, <name>!');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
});

test('check-handoff: execution/verify.md is saved verbatim (no Source of truth line needed)', () => {
  const { dir, changeDir } = makeFixture();
  fs.writeFileSync(path.join(changeDir, 'execution/verify.md'), '## Verification Report: add-greeting-name\n\nAll checks passed. Ready for archive.\n');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.doesNotMatch(r.out, /verify\.md: must start/);
});
