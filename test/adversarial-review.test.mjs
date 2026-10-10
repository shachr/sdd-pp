import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeFixture, setHandoff, run, CHANGE, TOOLKIT } from './helpers.mjs';
import { selectReviewer } from '../scripts/adversarial-review.mjs';

const baseConfig = JSON.parse(fs.readFileSync(path.join(TOOLKIT, 'config/handoff-review.json'), 'utf8'));

/** Fixture whose config uses the fake reviewer runner for every model. */
function fixtureWithFakeRunner(handoff = {}) {
  const fx = makeFixture({ handoff });
  const cfg = structuredClone(baseConfig);
  cfg.runners = { fake: { match: '*', command: [process.execPath, path.join(TOOLKIT, 'test/fixtures/fake-reviewer.mjs'), '{model}'], promptVia: 'stdin' } };
  fs.writeFileSync(path.join(fx.dir, '.openspec-handoff', 'config.json'), JSON.stringify(cfg));
  return fx;
}
const reviewsDir = (changeDir) => path.join(changeDir, 'execution', 'reviews');

test('dry run: ai-hero → code-review, claude-sonnet-4-5 → gpt-5, writes nothing', () => {
  const { dir, changeDir } = makeFixture();
  const before = fs.readFileSync(path.join(changeDir, 'handoff.md'), 'utf8');
  const r = run('adversarial-review.mjs', [CHANGE, '--dry-run'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /dry run - nothing written, nothing run/);
  assert.match(r.out, /ai-hero -> review skill: code-review/);
  assert.match(r.out, /reviewer:\s+gpt-5\s+\[config\.reviewerFor\["claude-sonnet-4-5"\]\]/);
  assert.match(r.out, /runner:\s+codex: codex exec --model gpt-5/);
  assert.match(r.out, /You are \*\*gpt-5\*\*, reviewing work implemented by a different model \(\*\*claude-sonnet-4-5\*\*/);
  assert.match(r.out, /openspec\/changes\/add-greeting-name\/specs\/greeting\/spec\.md/);
  assert.ok(!fs.existsSync(reviewsDir(changeDir)));
  assert.equal(fs.readFileSync(path.join(changeDir, 'handoff.md'), 'utf8'), before);
});

test('dry run: superpowers → requesting-code-review; gpt-5-codex → claude-opus-4-1 via claude runner', () => {
  const { dir } = makeFixture({ handoff: { tool: 'superpowers', implementation_model: 'gpt-5-codex' } });
  const r = run('adversarial-review.mjs', [CHANGE, '--dry-run', '--json'], dir);
  assert.equal(r.code, 0, r.out);
  const plan = JSON.parse(r.stdout);
  assert.equal(plan.skill, 'requesting-code-review');
  assert.equal(plan.reviewerModel, 'claude-opus-4-1');
  assert.equal(plan.runner, 'claude');
  assert.deepEqual(plan.argv.slice(0, 4), ['claude', '-p', '--model', 'claude-opus-4-1']);
  assert.match(plan.prompt, /code-reviewer\.md template/);
});

test('same model as implementer fails with exit 1', () => {
  const { dir } = makeFixture();
  const r = run('adversarial-review.mjs', [CHANGE, '--dry-run', '--reviewer-model', 'claude-sonnet-4-5'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /needs a different model/);
});

test('same model with a provider prefix / date suffix is still the same model', () => {
  const { dir } = makeFixture();
  const r = run('adversarial-review.mjs', [CHANGE, '--dry-run', '--reviewer-model', 'anthropic/claude-sonnet-4-5-20250929'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /needs a different model/);
});

test('same family is rejected unless --allow-same-family', () => {
  const { dir } = makeFixture();
  let r = run('adversarial-review.mjs', [CHANGE, '--dry-run', '--reviewer-model', 'claude-opus-4-1'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /both "claude" models/);
  r = run('adversarial-review.mjs', [CHANGE, '--dry-run', '--reviewer-model', 'claude-opus-4-1', '--allow-same-family'], dir);
  assert.equal(r.code, 0, r.out);
});

test('reviewer_model pinned in handoff.md wins over the config mapping', () => {
  const { dir } = makeFixture({ handoff: { reviewer_model: 'gemini-2.5-pro' } });
  const r = run('adversarial-review.mjs', [CHANGE, '--dry-run', '--json'], dir);
  const plan = JSON.parse(r.stdout);
  assert.equal(plan.reviewerModel, 'gemini-2.5-pro');
  assert.equal(plan.reviewerSource, 'handoff.md reviewer_model');
  assert.equal(plan.runner, 'cursor-agent');
  assert.equal(plan.promptVia, 'arg');
});

test('unknown implementation model falls back to defaultReviewer', () => {
  const r = selectReviewer({ handoff: { implementation_model: 'grok-4' }, config: baseConfig });
  assert.equal(r.model, 'claude-opus-4-1');
  assert.equal(r.source, 'config.defaultReviewer');
});

test('missing handoff.md is a usage error (exit 2)', () => {
  const { dir, changeDir } = makeFixture();
  fs.rmSync(path.join(changeDir, 'handoff.md'));
  const r = run('adversarial-review.mjs', [CHANGE, '--dry-run'], dir);
  assert.equal(r.code, 2);
  assert.match(r.out, /handoff\.md is missing/);
});

test('real run with a local runner writes the review and links it from handoff.md', () => {
  const { dir, changeDir } = fixtureWithFakeRunner();
  const r = run('adversarial-review.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
  const files = fs.readdirSync(reviewsDir(changeDir));
  assert.equal(files.length, 1);
  assert.match(files[0], /^\d{8}-\d{6}-gpt-5\.md$/);
  const review = fs.readFileSync(path.join(reviewsDir(changeDir), files[0]), 'utf8');
  assert.match(review, /fake reviewer gpt-5 read: # Adversarial review: add-greeting-name/);
  assert.match(review, /\| reviewer_model \| gpt-5/);
  assert.match(review, /\| status \| completed/);
  assert.match(fs.readFileSync(path.join(changeDir, 'handoff.md'), 'utf8'), /## Reviews\n\n- gpt-5 via code-review: \[execution\/reviews\//);
  // the review keeps the change lint-clean
  assert.equal(run('check-handoff.mjs', [CHANGE], dir).code, 0);
});

test('runner failure is recorded and exits 1', () => {
  const { dir, changeDir } = fixtureWithFakeRunner();
  process.env.FAKE_REVIEWER_FAIL = '1';
  try {
    const r = run('adversarial-review.mjs', [CHANGE], dir);
    assert.equal(r.code, 1);
    const [file] = fs.readdirSync(reviewsDir(changeDir));
    assert.match(fs.readFileSync(path.join(reviewsDir(changeDir), file), 'utf8'), /FAILED \(exit 3\)[\s\S]*boom/);
    assert.doesNotMatch(fs.readFileSync(path.join(changeDir, 'handoff.md'), 'utf8'), /## Reviews/);
  } finally { delete process.env.FAKE_REVIEWER_FAIL; }
});

test('missing runner binary suggests --emit-prompt; --emit-prompt writes the prompt file', () => {
  const { dir, changeDir } = makeFixture();
  const cfg = structuredClone(baseConfig);
  cfg.runners.codex.command[0] = 'definitely-not-installed-cli';
  fs.writeFileSync(path.join(dir, '.openspec-handoff', 'config.json'), JSON.stringify(cfg));
  let r = run('adversarial-review.mjs', [CHANGE], dir);
  assert.equal(r.code, 2);
  assert.match(r.out, /needs "definitely-not-installed-cli" on PATH.*--emit-prompt/);
  r = run('adversarial-review.mjs', [CHANGE, '--emit-prompt'], dir);
  assert.equal(r.code, 0, r.out);
  const [file] = fs.readdirSync(reviewsDir(changeDir));
  assert.match(file, /-gpt-5\.prompt\.md$/);
});
