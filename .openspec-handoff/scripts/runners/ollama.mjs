#!/usr/bin/env node
// Minimal local reviewer runner: reads a prompt on stdin, sends it to a local
// Ollama server (open source, no account or API key), prints the answer.
// Usage: node ollama.mjs <model>
// Env: OLLAMA_HOST (default http://127.0.0.1:11434), OLLAMA_NUM_CTX (default 8192),
//      OLLAMA_TIMEOUT_MS (default 1800000), OLLAMA_NUM_PREDICT (output token cap, default 1500;
//      small local models can loop until the timeout without it)
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
      // stream: true - with stream:false Ollama sends no headers until the whole answer is ready,
      // and Node's fetch (undici) aborts after its 300 s headersTimeout on slow CPU reviews.
      model, prompt, stream: true,
      options: { num_ctx: Number(process.env.OLLAMA_NUM_CTX || 8192), temperature: 0.2, num_predict: Number(process.env.OLLAMA_NUM_PREDICT || 1500) },
    }),
    signal: AbortSignal.timeout(Number(process.env.OLLAMA_TIMEOUT_MS || 1800000)),
  });
} catch (e) {
  console.error(`ollama runner: cannot reach ${host} (${e.message}). Start it with: ollama serve`);
  process.exit(1);
}
if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  console.error(`ollama runner: HTTP ${res.status}: ${err.error || 'unknown error'} (pull/create the model first: ollama pull ${model})`);
  process.exit(1);
}
// NDJSON stream: {"response": "..."} chunks, the last one with done: true and the counters.
let body = {};
let response = '';
let buf = '';
const decoder = new TextDecoder();
try {
for await (const chunk of res.body) {
  buf += decoder.decode(chunk, { stream: true });
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    if (msg.error) { console.error(`ollama runner: ${msg.error}`); process.exit(1); }
    response += msg.response || '';
    if (msg.done) body = msg;
  }
}
} catch (e) {
  // Timeout or dropped stream: keep what arrived so a long review is not lost.
  console.error(`ollama runner: stream ended early (${e.name}: ${e.message}); printing the partial answer`);
  process.stdout.write(response.trim() + `\n\n<!-- ollama: ${model}, PARTIAL (stream ended early), ${((Date.now() - started) / 1000).toFixed(1)}s wall -->\n`);
  process.exit(4);
}
if (buf.trim()) { const msg = JSON.parse(buf); response += msg.response || ''; if (msg.done) body = msg; }
const promptTokens = body.prompt_eval_count ?? 0;
const numCtx = Number(process.env.OLLAMA_NUM_CTX || 8192);
// Ollama silently truncates an over-long prompt (it keeps roughly half the context), so the
// review instructions at the top are lost. ~4 chars per token is a safe lower bound for English + code.
if (promptTokens >= numCtx || prompt.length / 4 > promptTokens * 1.5) {
  console.error(`ollama runner: prompt was truncated (${prompt.length} chars, only ${promptTokens} tokens evaluated, num_ctx ${numCtx}); raise OLLAMA_NUM_CTX or shrink the diff`);
  process.exitCode = 3;
}
process.stdout.write(response.trim() + '\n');
if (body.done_reason === 'length') console.error('ollama runner: answer hit OLLAMA_NUM_PREDICT and was cut off');
process.stdout.write(`\n<!-- ollama: ${model}, prompt ${promptTokens} tokens, output ${body.eval_count ?? '?'} tokens${body.done_reason === 'length' ? ' (cut at num_predict)' : ''}, ${((Date.now() - started) / 1000).toFixed(1)}s wall -->\n`);
