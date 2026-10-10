#!/usr/bin/env node
// execution-tool: setup-phase tool selection.
//   node execution-tool.mjs --default <ai-hero|superpowers>     set the project default (.openspec-handoff/project.json)
//   node execution-tool.mjs <change>                            print the change's tool, where it came from, and its session file
//   node execution-tool.mjs <change> --set <ai-hero|superpowers> record a per-change override: starts the session file
//                                                                (execution/grill.md or execution/brainstorm.md) with `tool:` front matter
// Switching tools after the design session ran means redoing the session (.openspec-handoff/switching-tools.md); --set refuses then.
// Exit: 0 ok, 1 refused / not set, 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { findProjectRoot, loadChange, resolveTool, projectToolConfigPath, SESSION_FILES, SESSION_SKILLS, TOOLS, UsageError, sessionFiles } from './lib/change.mjs';

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
    console.log(`project default execution tool: ${values.default} (${path.relative(root, f)})`);
    if (!positionals.length) return 0;
  }
  if (positionals.length !== 1) { console.error(usage); return 2; }
  let change = loadChange(root, positionals[0]);
  if (values.set) {
    const other = sessionFiles(change).filter((s) => s.fileTool !== values.set && (s.tool || s.fileTool) !== values.set);
    if (change.handoff?.tool && change.handoff.tool !== values.set) {
      console.error(`refused: handoff.md already hands this change to ${change.handoff.tool}. Switching tools means redoing the design session and the handoff - see .openspec-handoff/switching-tools.md.`);
      return 1;
    }
    if (other.length) {
      console.error(`refused: ${other.map((s) => s.file).join(', ')} already holds a ${other[0].fileTool} design session. Switching tools means redoing the session - see .openspec-handoff/switching-tools.md.`);
      return 1;
    }
    const f = path.join(change.dir, SESSION_FILES[values.set]);
    if (!fs.existsSync(f)) {
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, `---\ntool: ${values.set}\nsession: ${SESSION_SKILLS[values.set]}\n---\n\n> Source of truth: [proposal](../proposal.md) · specs: ../specs/<capability>/spec.md\n\n# ${SESSION_SKILLS[values.set]} session: ${change.id}\n`);
    }
    change = loadChange(root, positionals[0]);
  }
  const r = resolveTool(change);
  const out = { change: change.id, tool: r.tool, source: r.source, projectDefault: r.projectDefault,
    override: Boolean(r.tool && r.projectDefault && r.tool !== r.projectDefault),
    sessionFile: r.tool ? SESSION_FILES[r.tool] : null, sessionSkill: r.tool ? SESSION_SKILLS[r.tool] : null };
  if (values.json) console.log(JSON.stringify(out, null, 2));
  else if (!r.tool) console.log(`${change.id}: no execution tool set - run with --default <tool> (project) or --set <tool> (this change)`);
  else console.log(`${change.id}: ${r.tool} (from ${r.source}${out.override ? `; overrides project default ${r.projectDefault}` : ''}) -> design session: ${out.sessionSkill} -> ${out.sessionFile}`);
  return r.tool ? 0 : 1;
}

try { process.exit(main()); } catch (e) { console.error(`execution-tool: ${e.message}`); process.exit(e instanceof UsageError ? 2 : 1); }
