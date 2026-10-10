// End to end in a fresh project: openspec init -> install.sh -> new change -> artifacts
// in schema order -> handoff -> execution -> tasks -> check-handoff -> adversarial review
// (local fake runner) -> openspec validate --strict -> openspec archive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { TOOLKIT, OPENSPEC } from './helpers.mjs';

const ID = 'add-greeting-name';
const EX = path.join(TOOLKIT, 'example', 'openspec', 'changes', ID);

test('full handoff flow in a fresh project with the real OpenSpec CLI', { skip: !fs.existsSync(OPENSPEC) && 'npm install first' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-e2e-'));
  const sh = (cmd, args, opts = {}) => {
    const r = spawnSync(cmd, args, { cwd: dir, encoding: 'utf8', ...opts });
    assert.equal(r.status, 0, `${cmd} ${args.join(' ')}\n${r.stdout}${r.stderr}`);
    return r.stdout + r.stderr;
  };
  const osx = (...a) => sh(OPENSPEC, a);
  const status = () => Object.fromEntries(JSON.parse(osx('status', '--change', ID, '--json')).artifacts.map((a) => [a.id, a.status]));
  const g = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir, encoding: 'utf8' }).trim();
  const changeDir = path.join(dir, 'openspec', 'changes', ID);
  const copy = (rel) => fs.cpSync(path.join(EX, rel), path.join(changeDir, rel), { recursive: true });

  // project with existing code + main spec
  g('init', '-q', '-b', 'main');
  osx('init', '--tools', 'none', '--no-animation', '.');
  sh('bash', [path.join(TOOLKIT, 'install.sh'), dir, '--set-default', '--tool', 'ai-hero']);
  for (const p of ['src/greet.mjs', 'src/cli.mjs', 'test/greet.test.mjs', 'openspec/specs/greeting/spec.md', 'package.json']) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.copyFileSync(path.join(TOOLKIT, 'example', p), path.join(dir, p));
  }
  // baseline code as it was before the change
  fs.writeFileSync(path.join(dir, 'src/greet.mjs'), "export function greet() {\n  return 'Hello, World!';\n}\n");
  fs.writeFileSync(path.join(dir, 'src/cli.mjs'), "#!/usr/bin/env node\nimport { greet } from './greet.mjs';\n\nconsole.log(greet());\n");
  fs.writeFileSync(path.join(dir, 'test/greet.test.mjs'), "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { greet } from '../src/greet.mjs';\n\ntest('greets the world', () => {\n  assert.equal(greet(), 'Hello, World!');\n});\n");
  g('add', '-A'); g('commit', '-qm', 'baseline');

  // planning (OpenSpec)
  assert.match(osx('new', 'change', ID), /Schema: handoff-driven/);
  assert.equal(status().proposal, 'ready');
  // proposal phase: the project default tool's design session, then proposal + delta
  assert.match(sh(process.execPath, ['.openspec-handoff/scripts/execution-tool.mjs', ID]), /ai-hero \(from \.openspec-handoff\/project\.json/);
  copy('execution/grill.md');
  copy('proposal.md'); copy('specs');
  assert.equal(status().handoff, 'ready');
  assert.equal(status().tasks, 'blocked');
  assert.equal(status().design, undefined, 'no OpenSpec design artifact');

  // handoff
  const base = g('rev-parse', 'HEAD');
  const handoff = fs.readFileSync(path.join(EX, 'handoff.md'), 'utf8')
    .replace(/^base_ref:.*$/m, `base_ref: ${base}`)
    .replace(/\n## Reviews[\s\S]*$/, '\n');
  fs.writeFileSync(path.join(changeDir, 'handoff.md'), handoff);
  sh(process.execPath, ['.openspec-handoff/scripts/check-handoff.mjs', ID]);
  assert.equal(status().tasks, 'ready');

  // execution planning (AI Hero grill-with-docs + to-tickets, redirected into the change folder) + implementation
  copy('execution/spec.md'); copy('execution/tickets');
  copy('tasks.md');
  for (const p of ['src/greet.mjs', 'src/cli.mjs', 'test/greet.test.mjs', 'test/cli.test.mjs']) {
    fs.copyFileSync(path.join(TOOLKIT, 'example', p), path.join(dir, p));
  }
  sh(process.execPath, ['--test', 'test/']);
  g('add', '-A'); g('commit', '-qm', 'implement add-greeting-name');
  assert.ok(Object.values(status()).every((s) => s === 'done'));
  const lint = JSON.parse(sh(process.execPath, ['.openspec-handoff/scripts/check-handoff.mjs', ID, '--json']));
  assert.deepEqual(lint.errors, []);
  assert.equal(lint.metrics.tickets, 2);
  assert.ok(lint.metrics.lines > 0 && lint.metrics.lines < 400);

  // adversarial review with a different model, local runner
  const cfgPath = path.join(dir, '.openspec-handoff', 'config.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  cfg.runners = { fake: { match: '*', command: [process.execPath, path.join(TOOLKIT, 'test/fixtures/fake-reviewer.mjs'), '{model}'] } };
  fs.writeFileSync(cfgPath, JSON.stringify(cfg));
  assert.match(sh(process.execPath, ['.openspec-handoff/scripts/adversarial-review.mjs', ID, '--dry-run']), /reviewer:\s+gpt-5/);
  assert.match(sh(process.execPath, ['.openspec-handoff/scripts/adversarial-review.mjs', ID]), /review written/);
  assert.equal(fs.readdirSync(path.join(changeDir, 'execution', 'reviews')).length, 1);

  // OpenSpec validation + archive
  assert.match(osx('validate', ID, '--strict'), /is valid/);
  sh(process.execPath, ['.openspec-handoff/scripts/check-handoff.mjs', ID]);
  // agents archive with /opsx:archive (agent-driven sync); the CLI archive is the scripted equivalent
  osx('archive', ID, '--yes');
  const mainSpec = fs.readFileSync(path.join(dir, 'openspec/specs/greeting/spec.md'), 'utf8');
  assert.match(mainSpec, /### Requirement: Greeting by name/);
  assert.match(mainSpec, /### Requirement: Default greeting/);
  const archived = fs.readdirSync(path.join(dir, 'openspec/changes/archive')).find((d) => d.endsWith(ID));
  assert.ok(archived, 'change archived');
  assert.ok(fs.existsSync(path.join(dir, 'openspec/changes/archive', archived, 'handoff.md')), 'handoff archived with the change');
  assert.ok(fs.existsSync(path.join(dir, 'openspec/changes/archive', archived, 'execution/tickets')), 'execution artifacts archived with the change');
});
