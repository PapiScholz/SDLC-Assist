#!/usr/bin/env node
'use strict';
// Every plugin agent (agents/*.md) is a cold reviewer: read-only tools and no CLAUDE.md (ADR 0012).
// A missing `tools` line inherits every tool, so it fails too.
// Usage: check-agents.js [--root <plugin dir>] [--require a,b,...]
// Without --root it checks this plugin and requires the four reviewers `references/cold-review.md` names.
const fs = require('fs');
const path = require('path');
const ALLOWED = ['Read', 'Grep', 'Glob'];
const i = process.argv.indexOf('--root');
const root = i !== -1 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : path.resolve(__dirname, '..', '..', '..');
const r = process.argv.indexOf('--require');
const REQUIRED = r !== -1 && process.argv[r + 1] ? process.argv[r + 1].split(',').map(s => s.trim()).filter(Boolean)
  : i === -1 ? ['comprehension', 'code-check', 'design', 'readiness'] : [];

function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---(\n|$)/.exec(text.replace(/\r\n/g, '\n'));
  const out = {};
  if (!m) return out;
  let key = null;
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) { key = kv[1]; out[key] = kv[2].trim(); continue; }
    const item = /^\s*-\s+(.+)$/.exec(line);
    if (item && key) out[key] = (out[key] ? out[key] + ', ' : '') + item[1].trim();
  }
  return out;
}

const dir = path.join(root, 'agents');
const errors = [];
let files = [];
try { files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort(); }
catch { errors.push('no agents directory at ' + dir); }
if (!errors.length && !files.length) errors.push('no agent (.md) in ' + dir);
for (const n of REQUIRED) if (!files.includes(n + '.md')) errors.push(n + '.md: missing (cold-review.md launches it)');
for (const f of files) {
  const fm = frontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (fm.name !== f.slice(0, -3)) errors.push(f + ': name "' + (fm.name || '') + '" differs from the file name');
  if (!fm.tools) errors.push(f + ': no tools line (the agent would inherit every tool)');
  else for (const t of fm.tools.replace(/^\[|\]$/g, '').split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean))
    if (!ALLOWED.includes(t)) errors.push(f + ': tool "' + t + '" is not read-only (allowed: ' + ALLOWED.join(', ') + ')');
  if (fm.omitClaudeMd !== 'true') errors.push(f + ': omitClaudeMd is not true');
}
if (errors.length) {
  for (const e of errors) console.error('check-agents: ' + e);
  process.exit(1);
}
console.log('check-agents: ' + files.length + ' agents OK');
