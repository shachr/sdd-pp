#!/usr/bin/env node
// Stand-in for a reviewer CLI: echoes the model it was asked to be and proves it got the prompt on stdin.
const model = process.argv[2];
let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  if (process.env.FAKE_REVIEWER_FAIL) { console.error('boom'); process.exit(3); }
  const firstLine = input.split('\n')[0];
  console.log(`## Verdict\nAPPROVE - fake reviewer ${model} read: ${firstLine}\n\n## Findings\n### Critical\n- none`);
});
