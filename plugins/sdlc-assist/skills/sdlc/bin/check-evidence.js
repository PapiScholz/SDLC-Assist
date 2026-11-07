#!/usr/bin/env node
'use strict';
// Reports, for every open cycle's task list, the done tasks (`- [x]`) whose line carries no proof.
// Convention: `- [x] T3 <text> — evidence: <command, test or file that proves it>`. Warns and exits 0;
// `--strict` exits 1 when anything warned. Closed cycles (Status: closed) are records and are skipped unless --all.
// Usage: check-evidence.js [--root <repo dir>] [--strict] [--all]
// The task list is the one the router reads: tasks.md beside spec.md, feature.md itself for a feature cycle,
// tasks/todo.md for a flat spec. Discovery is the router's (findSpecs, folderCycle) without its git pass.
const fs = require('fs');
const path = require('path');
const { findSpecs, folderCycle } = require('./lib/signals');
const { parseHeader } = require('./lib/header');
const { countTasks, withoutEvidence } = require('./lib/todo');

const argv = process.argv.slice(2);
const i = argv.indexOf('--root');
const root = i !== -1 && argv[i + 1] ? path.resolve(argv[i + 1]) : process.cwd();
const strict = argv.includes('--strict');
const all = argv.includes('--all');
const read = (rel) => { try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return null; } };

let lists = 0, done = 0, missing = 0;
const seen = new Set();
for (const rel of findSpecs(root)) {
  const spec = read(rel);
  if (spec === null || (!all && parseHeader(spec).status === 'closed')) continue;
  const parts = rel.split('/');
  const todo = parts.length === 4 && parts[0] === 'docs' && parts[1] === 'specs' ? folderCycle(root, parts[2]).todo : 'tasks/todo.md';
  if (seen.has(todo)) continue;   // flat cycles share tasks/todo.md: read it once
  seen.add(todo);
  const text = todo === rel ? spec : read(todo);
  if (text === null) continue;
  lists++; done += countTasks(text).done;
  for (const n of withoutEvidence(text)) { console.log('warn ' + todo + ':' + n + ' done without evidence'); missing++; }
}
console.log('check-evidence: ' + lists + ' task lists, ' + done + ' done tasks, ' + missing + ' without evidence');
process.exit(strict && missing ? 1 : 0);
