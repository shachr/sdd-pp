import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { makeFixture, run, CHANGE, TOOLKIT } from './helpers.mjs';
import { parseVerdict } from '../scripts/adversarial-review.mjs';

test('qwen reviewer selects the ollama runner and inlines the change + diff', () => {
  const { dir } = makeFixture();
  const r = run('adversarial-review.mjs', [CHANGE, '--dry-run', '--json', '--reviewer-model', 'qwen2.5-coder:3b'], dir);
  assert.equal(r.code, 0, r.out);
  const plan = JSON.parse(r.stdout);
  assert.equal(plan.runner, 'ollama');
  assert.equal(plan.inlineContext, true);
  assert.equal(plan.argv[0], process.execPath);
  assert.match(plan.argv[1], /scripts\/runners\/ollama\.mjs$/);
  assert.match(plan.prompt, /## Inlined context/);
  assert.match(plan.prompt, /### Requirement: Greeting by name/);
  assert.match(plan.prompt, /```diff/);
});

test('same-family guard covers local models too (qwen implementer, qwen reviewer)', () => {
  const { dir } = makeFixture({ handoff: { implementation_model: 'qwen2.5-coder:7b' } });
  const r = run('adversarial-review.mjs', [CHANGE, '--dry-run', '--reviewer-model', 'qwen2.5-coder:3b'], dir);
  assert.equal(r.code, 1);
  assert.match(r.out, /both "qwen" models/);
});

test('parseVerdict only accepts a committed verdict', () => {
  assert.equal(parseVerdict('## Verdict\nAPPROVE | REQUEST_CHANGES - one sentence'), 'unparsed');
  assert.equal(parseVerdict('## Verdict\nAPPROVE - fine'), 'APPROVE');
  assert.equal(parseVerdict('## Verdict\n\nREQUEST_CHANGES - broken'), 'REQUEST_CHANGES');
});

test('runners/ollama.mjs posts the stdin prompt to the Ollama API and prints the streamed response', async () => {
  let seen;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      seen = { url: req.url, ...JSON.parse(body) };
      res.setHeader('content-type', 'application/x-ndjson');
      res.write(JSON.stringify({ response: '## Verdict\n', done: false }) + '\n');
      res.end(JSON.stringify({ response: 'APPROVE - ok', prompt_eval_count: 12, eval_count: 5, done: true }) + '\n');
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const child = spawn(process.execPath, [path.join(TOOLKIT, 'scripts/runners/ollama.mjs'), 'qwen2.5-coder:3b'], {
    env: { ...process.env, OLLAMA_HOST: `127.0.0.1:${port}` },
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stdin.end('review this');
  const code = await new Promise((r) => child.on('close', r));
  server.close();
  assert.equal(code, 0);
  assert.equal(seen.url, '/api/generate');
  assert.equal(seen.model, 'qwen2.5-coder:3b');
  assert.equal(seen.prompt, 'review this');
  assert.equal(seen.stream, true); // streaming avoids undici's 300 s headersTimeout on slow CPU reviews
  assert.match(out, /^## Verdict\nAPPROVE - ok/);
});

test('runners/ollama.mjs fails clearly when no server is running', async () => {
  const child = spawn(process.execPath, [path.join(TOOLKIT, 'scripts/runners/ollama.mjs'), 'm'], {
    env: { ...process.env, OLLAMA_HOST: '127.0.0.1:9' },
  });
  let err = '';
  child.stderr.on('data', (d) => { err += d; });
  child.stdin.end('x');
  const code = await new Promise((r) => child.on('close', r));
  assert.equal(code, 1);
  assert.match(err, /cannot reach .*ollama serve/);
});
