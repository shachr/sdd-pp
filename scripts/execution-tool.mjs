#!/usr/bin/env node
// execution-tool: setup-phase tool selection.
//   node execution-tool.mjs --default <ai-hero|superpowers>     set the project default (.openspec-handoff/project.json)
//   node execution-tool.mjs <change>                            show the change's tool, where it came from, and its session file (writes nothing)
//   node execution-tool.mjs <change> --set <ai-hero|superpowers> record the change's tool: starts the session file
//                                                                (execution/grill.md or execution/brainstorm.md) with `tool:` front matter;
//                                                                a slice's stub links the parent's session and has "## Overrides: None"
// Switching tools after the design session ran means redoing the session (.openspec-handoff/switching-tools.md); --set refuses then.
// A session file that is still only the stub counts as not started: --set replaces it.
// Exit: 0 ok, 1 refused / not set, 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findParentOf } from './lib/split.mjs';
import { findProjectRoot, loadChange, resolveTool, projectToolConfigPath, SESSION_FILES, SESSION_SKILLS, TOOLS, UsageError, sessionFiles, isStub } from './lib/change.mjs';

function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    root: { type: 'string' }, default: { type: 'string' }, set: { type: 'string' }, json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } } });
  const usage = 'usage: execution-tool --default <tool> | execution-tool <change> [--set <tool>] [--json]';
  if (values.help) { console.log(usage); return 0; }
  const root = values.root ? path.resolve(values.root) : findProjectRoot();
  if (!root) throw new UsageError('no openspec/ directory found above the current directory (use --root)');
  for (const t of [values.default, values.set].filter(Boolean)) if (!TOOLS.includes(t)) throw new UsageError(`tool must be one of ${TOOLS.join(', ')}`);
  if (values.default) {
    const f = projectToolConfigPath(root);
    const cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify({ ...cur, defaultTool: values.default }, null, 2) + '\n');
    console.log(`project default execution tool: ${values.default} (${path.relative(root, f).split(path.sep).join('/')})`);
    console.log(`Commit: git add .openspec-handoff/project.json && git commit -m "setup: default execution tool ${values.default}"`);
    if (!positionals.length) return 0;
  }
  if (positionals.length !== 1) { console.error(usage); return 2; }
  let change = loadChange(root, positionals[0]);
  let created = null; let replaced = false;
  if (values.set) {
    const other = sessionFiles(change).filter((s) => s.fileTool !== values.set && (s.tool || s.fileTool) !== values.set);
    if (change.handoff?.tool && change.handoff.tool !== values.set) {
      console.error(`refused: handoff.md already hands this change to ${change.handoff.tool}. Switching tools means redoing the design session and the handoff - see .openspec-handoff/switching-tools.md.`);
      return 1;
    }
    const started = other.filter((s) => !isStub(change.read(s.file)));
    if (!started.length) for (const s of other) { fs.rmSync(path.join(change.dir, s.file)); replaced = true; console.log(`replaced the unused ${s.file} stub (no design session in it yet)`); }
    else if (other.length) {
      console.error(`refused: ${other.map((s) => s.file).join(', ')} already holds a ${other[0].fileTool} design session. Switching tools means redoing the session - see .openspec-handoff/switching-tools.md.`);
      return 1;
    }
    created = startSession(root, change, values.set);
    change = loadChange(root, positionals[0]);
  }
  const r = resolveTool(change);
  const started = sessionFiles(change).some((s) => !isStub(change.read(s.file)));
  const out = { change: change.id, tool: r.tool, source: r.source, projectDefault: r.projectDefault,
    override: Boolean(r.tool && r.projectDefault && r.tool !== r.projectDefault),
    sessionFile: r.tool ? SESSION_FILES[r.tool] : null, sessionSkill: r.tool ? SESSION_SKILLS[r.tool] : null, sessionStarted: started };
  if (values.json) console.log(JSON.stringify(out, null, 2));
  else if (!r.tool) console.log(`${change.id}: no execution tool set - run with --default <tool> (project) or --set <tool> (this change)`);
  else {
    console.log(`${change.id}: ${r.tool} (from ${r.source}${out.override ? `; overrides project default ${r.projectDefault}` : ''}) -> design session: ${out.sessionSkill} -> ${out.sessionFile}${created ? ' (created)' : started ? '' : ' (not started)'}`);
    // a replaced stub's deletion must be staged too: -A on the execution folder
    if (created) console.log(`Commit with the change: git add ${replaced ? `-A openspec/changes/${change.id}/execution` : `openspec/changes/${change.id}/${created}`} && git commit -m "tool(${change.id}): ${r.tool}"`);
  }
  return r.tool ? 0 : 1;
}

/** Start the design session file for a tool (front matter + links line), if it does not exist yet.
 *  A slice's stub links the parent's session file and starts "## Overrides" with None. */
function startSession(root, change, tool) {
  const f = path.join(change.dir, SESSION_FILES[tool]);
  if (fs.existsSync(f)) return null;
  const parent = findParentOf(root, change.id);
  const slice = parent && parent.id !== change.id;
  const caps = [...new Set(change.deltas.map((d) => d.split('/')[1]))].sort();
  const prop = change.read('proposal.md') || '';
  const sn = /^## Split notes\s*\n([\s\S]*?)(?=\n## |$)/m.exec(prop);
  const notes = sn ? sn[1].split(/\r?\n/).filter((l) => /^- \S/.test(l)).map((l) => l.slice(2).trim()) : [];
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, [
    '---', `tool: ${tool}`, `session: ${SESSION_SKILLS[tool]}`, '---', '',
    ...(slice ? [`> Parent session: [../../${parent.id}/${SESSION_FILES[tool]}](../../${parent.id}/${SESSION_FILES[tool]}) - read it first; this session is narrowed to the slice.`, ''] : []),
    `> Links: [proposal](../proposal.md) · specs: ${caps.length ? caps.map((c) => `[${c}](../specs/${c}/spec.md)`).join(', ') : '../specs/<capability>/spec.md'}`, '',
    `# ${SESSION_SKILLS[tool]} session: ${change.id}`, '',
    // a slice's deliberate differences (its split notes) are the first candidates for overriding parent decisions
    ...(slice ? ['## Overrides', '', ...(notes.length ? notes.map((n) => `- split note: ${n} - TODO: which parent decision this overrides (delete the line if none)`) : ['None']), ''] : []),
  ].join('\n'));
  return SESSION_FILES[tool];
}

export { isStub };

try { process.exit(main()); } catch (e) { console.error(`execution-tool: ${e.message}`); process.exit(e instanceof UsageError ? 2 : 1); }
