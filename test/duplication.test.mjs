// Stronger reference-not-duplicate lint: forbidden sections, SHALL, paraphrase detection.
// Tuned on real output of the first agent-driven flows (test/fixtures/paraphrase/*-v1-*):
// those restated the delta and must fail; the clean rewrites must pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { paraphraseFindings, FORBIDDEN_SECTIONS } from '../scripts/lib/change.mjs';
import { makeFixture, run, CHANGE } from './helpers.mjs';

const fx = (f) => fs.readFileSync(new URL(`./fixtures/paraphrase/${f}`, import.meta.url), 'utf8');
const errors = (md, delta) => paraphraseFindings(fx(md), fx(delta)).filter((p) => p.level === 'error');

test('v1 to-spec output fails: forbidden User Stories / Problem Statement / Solution sections', () => {
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

test('check-handoff: paraphrased ticket line is an error with file:line', () => {
  const { dir, changeDir } = makeFixture();
  write(changeDir, 'execution/tickets/03-x.md', '**What to build:** when the user passes a name argument the greet command prints Hello with the name, whitespace removed, and a newline, exiting with status 0.');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /execution\/tickets\/03-x\.md:3: paraphrases requirement "Greeting by name"/);
});

test('check-handoff: forbidden sections and SHALL sentences are errors', () => {
  const { dir, changeDir } = makeFixture();
  write(changeDir, 'execution/design.md', '## User Stories\n\n1. As a user I want a greeting.\n\nThe tool SHALL be friendly.');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /section "## User Stories" restates behaviour/);
  assert.match(r.out, /normative SHALL sentence/);
});

test('check-handoff: OpenSpec design.md and to-spec output are rejected (design belongs to the tool)', () => {
  const { dir, changeDir } = makeFixture();
  fs.writeFileSync(path.join(changeDir, 'design.md'), '# Design\n');
  write(changeDir, 'execution/spec.md', '# Spec\n');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /design\.md in the change folder: design is owned by the execution tool/);
  assert.match(r.out, /execution\/spec\.md \(to-spec output\)/);
});

test('check-handoff: review outputs and verify.md may discuss requirements', () => {
  const { dir, changeDir } = makeFixture();
  write(changeDir, 'execution/verify.md', '### Requirement: Greeting by name\nWhen the greet command receives a name argument it SHALL print Hello, <name>!');
  const r = run('check-handoff.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
});
