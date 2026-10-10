// 13 tests run the real OpenSpec CLI (devDependency @fission-ai/openspec). Without it they would only be
// skipped and the run would look green, so this test fails loudly unless skipping is explicit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPENSPEC, OPENSPEC_SKIP } from './helpers.mjs';

test('the OpenSpec CLI is installed (run npm install; or set SDD_SKIP_OPENSPEC=1 to skip the OpenSpec tests on purpose)', { skip: OPENSPEC_SKIP && process.env.SDD_SKIP_OPENSPEC === '1' && 'SDD_SKIP_OPENSPEC=1: OpenSpec tests skipped on purpose' }, () => {
  assert.equal(OPENSPEC_SKIP, false, `OpenSpec CLI not found at ${OPENSPEC}. Run \`npm install\` first (installs @fission-ai/openspec 1.14.1), or set SDD_SKIP_OPENSPEC=1 to skip the tests that need it.`);
});
