#!/usr/bin/env node
// Minimal local reviewer runner: reads a prompt on stdin, sends it to a local
// Ollama server (open source, no account or API key), prints the answer.
// Usage: node ollama.mjs <model>
// Env: OLLAMA_HOST (default http://127.0.0.1:11434), OLLAMA_NUM_CTX (default 8192),
//      OLLAMA_TIMEOUT_MS (default 1800000)
const model = process.argv[2];
if (!model) { console.error('usage: ollama.mjs <model>'); process.exit(2); }
let host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
if (!/^https?:\/\//.test(host)) host = `http://${host}`;

let prompt = '';
for await (const chunk of process.stdin) prompt += chunk;

const started = Date.now();
let res;
try {
  res = await fetch(`${host}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model, prompt, stream: false,
      options: { num_ctx: Number(process.env.OLLAMA_NUM_CTX || 8192), temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(Number(process.env.OLLAMA_TIMEOUT_MS || 1800000)),
  });
} catch (e) {
  console.error(`ollama runner: cannot reach ${host} (${e.message}). Start it with: ollama serve`);
  process.exit(1);
}
const body = await res.json().catch(() => ({}));
if (!res.ok || body.error) {
  console.error(`ollama runner: HTTP ${res.status}: ${body.error || 'unknown error'} (pull/create the model first: ollama pull ${model})`);
  process.exit(1);
}
const promptTokens = body.prompt_eval_count ?? 0;
if (promptTokens >= Number(process.env.OLLAMA_NUM_CTX || 8192)) {
  console.error(`ollama runner: prompt filled the whole context (${promptTokens} tokens); raise OLLAMA_NUM_CTX`);
}
process.stdout.write(body.response.trim() + '\n');
process.stdout.write(`\n<!-- ollama: ${model}, prompt ${promptTokens} tokens, output ${body.eval_count ?? '?'} tokens, ${((Date.now() - started) / 1000).toFixed(1)}s wall -->\n`);
