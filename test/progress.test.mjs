// No OpenSpec tasks.md: progress is the tool's own tracking; handoff ends with next steps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHANGE, makeFixture, run } from './helpers.mjs';
import { nextSteps } from '../scripts/next-steps.mjs';

test('next-steps prints the tool sequence without running anything', () => {
  const ai = nextSteps({ id: 'x', tool: 'ai-hero', applyMode: 'implement-spec' });
  const order = ['/to-spec', 'grill.md', '/to-tickets', '/spec-check x', '/implement-spec', '/code-review', "the tool's own review step", 'CI also runs a code review on the PR', '/opsx:verify x', 'execution/verify.md', '/opsx:archive x', 'together with its code', 'Merge the PR'];
  let at = -1; for (const s of order) { const i = ai.indexOf(s, at + 1); assert.ok(i > at, `ai-hero: ${s} out of order`); at = i; }
  const sp = nextSteps({ id: 'x', tool: 'superpowers', applyMode: 'subagent-driven-development' });
  const order2 = ['writing-plans', 'brainstorm.md', 'plan-x.md', '/spec-check x', 'subagent-driven-development', 'requesting-code-review', 'CI also runs a code review on the PR', '/opsx:verify x', '/opsx:archive x', 'together with its code', 'finishing-a-development-branch'];
  at = -1; for (const s of order2) { const i = sp.indexOf(s, at + 1); assert.ok(i > at, `superpowers: ${s} out of order`); at = i; }
  for (const t of [ai, sp]) assert.doesNotMatch(t, /fresh session|self-review|code-review\.md|check-handoff|expect-complete/i);
  const { dir } = makeFixture();
  const r = run('next-steps.mjs', [CHANGE], dir);
  assert.equal(r.code, 0, r.out);
  assert.match(r.stdout, /^Next steps for add-greeting-name \(ai-hero, apply_mode: implement\)/);
});

test('next-steps: branch before implementation, what to commit, spec changes after a delta edit; superpowers: sdd-workspace, branch or worktree, why archive first', () => {
  const ai = nextSteps({ id: 'x', tool: 'ai-hero', applyMode: 'implement' });
  assert.match(ai, /git switch -c change\/x, then commit openspec\/changes\/x\/execution\/ \(branch before implementation/);
  assert.match(ai, /After any later delta edit, run \/spec-check again: it lists the requirements \/ scenarios added, changed, removed or renamed/);
  const sp = nextSteps({ id: 'x', tool: 'superpowers', applyMode: 'executing-plans' });
  assert.match(sp, /a plain branch or a worktree \(using-git-worktrees; Superpowers recommends the worktree\), either works/);
  assert.match(sp, /subagent-driven-development\/scripts\/sdd-workspace openspec\/changes\/x\/execution\/plan-x\.md/);
  assert.match(sp, /<workspace>\/progress\.md\) to openspec\/changes\/x\/execution\/progress\.md/);
  assert.match(sp, /Archive comes first because finishing merges or opens the PR/);
});
