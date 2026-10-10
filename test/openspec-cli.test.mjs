// Validates the schema and example change with the real OpenSpec CLI (devDependency).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { makeFixture, OPENSPEC, CHANGE } from './helpers.mjs';

const haveCli = fs.existsSync(OPENSPEC);
const os = (args, cwd) => {
  const r = spawnSync(OPENSPEC, args, { cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', OPENSPEC_TELEMETRY: '0' } });
  return { code: r.status, out: r.stdout + r.stderr };
};

test('openspec schema validate handoff-driven', { skip: !haveCli && 'run npm install first' }, () => {
  const { dir } = makeFixture();
  const r = os(['schema', 'validate', 'handoff-driven'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Schema 'handoff-driven' is valid/);
});

test('openspec validate --strict passes for the example change', { skip: !haveCli }, () => {
  const { dir } = makeFixture();
  const r = os(['validate', CHANGE, '--strict'], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /is valid/);
});

test('openspec status walks proposal → specs → handoff (no design, no tasks artifact)', { skip: !haveCli }, () => {
  const { dir } = makeFixture();
  const r = os(['status', '--change', CHANGE, '--json'], dir);
  assert.equal(r.code, 0, r.out);
  const json = JSON.parse(r.out);
  assert.equal(json.schemaName, 'handoff-driven');
  assert.deepEqual(json.artifacts.map((a) => a.id), ['proposal', 'specs', 'handoff']);
  assert.equal(json.isComplete, true);
  assert.deepEqual(json.applyRequires, ['handoff']);
});

test('handoff is ready right after specs and is the last stage', { skip: !haveCli }, () => {
  const { dir, changeDir } = makeFixture({ keepExecution: false });
  fs.rmSync(`${changeDir}/handoff.md`);
  const json = JSON.parse(os(['status', '--change', CHANGE, '--json'], dir).out);
  const byId = Object.fromEntries(json.artifacts.map((a) => [a.id, a]));
  assert.equal(byId.handoff.status, 'ready');
  assert.equal(json.isComplete, false);
});

test('openspec instructions apply: no task tracking, points at the tool via next-steps', { skip: !haveCli }, () => {
  const { dir } = makeFixture();
  const json = JSON.parse(os(['instructions', 'apply', '--change', CHANGE, '--json'], dir).out);
  assert.equal(json.taskTrackingConfigured, false);
  assert.deepEqual(json.progress, { total: 0, complete: 0, remaining: 0 });
  assert.equal(json.state, 'ready');
  assert.match(json.instruction, /does not implement through \/opsx:apply/);
  assert.match(json.instruction, /next-steps\.mjs/);
  const list = JSON.parse(os(['list', '--json'], dir).out);
  assert.equal(list.changes.find((c) => c.name === CHANGE).status, 'no-tasks');
});

test('openspec instructions handoff carries the reference-not-duplicate rules', { skip: !haveCli }, () => {
  const { dir } = makeFixture();
  const r = os(['instructions', 'handoff', '--change', CHANGE], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /REFERENCE, DON'T DUPLICATE/);
  assert.match(r.out, /apply_mode/);
  assert.doesNotMatch(r.out, /implementation_model|reviewer_model/);
});
