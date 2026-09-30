#!/usr/bin/env node
'use strict';
// Every own skill (skills/sdlc-*/SKILL.md) carries the sections its contract names.
// A section is a level-2 or level-3 heading, optionally prefixed "N. ", outside fenced code.
// Usage: check-skill-sections.js [--root <dir>]
const fs = require('fs');
const path = require('path');
const { unfencedLines } = require('./lib/unfenced');

const CONTRACTS = {
  'sdlc-debugging': ['Reproduce', 'Localise', 'Explain', 'Hand off', 'Never'],
  'sdlc-qa-gate': ['Diff map', 'Layers', 'Report', 'Never'],
  'sdlc-release': ['Detect', 'Classify', 'Update', 'Validate', 'Commit tag push publish', 'Publish guidance', 'Never'],
};

const i = process.argv.indexOf('--root');
const root = i !== -1 && process.argv[i + 1]
  ? path.resolve(process.argv[i + 1])
  : path.resolve(__dirname, '..', '..', '..');

function headings(text) {
  const out = [];
  for (const line of unfencedLines(text)) {
    const m = /^#{2,3}\s+(?:\d+\.\s+)?(.+?)\s*$/.exec(line);
    if (m) out.push(m[1]);
  }
  return out;
}

const errors = [];
for (const [skill, sections] of Object.entries(CONTRACTS)) {
  const f = path.join(root, 'skills', skill, 'SKILL.md');
  if (!fs.existsSync(f)) { errors.push(skill + ': SKILL.md not found'); continue; }
  const have = headings(fs.readFileSync(f, 'utf8'));
  for (const s of sections) if (!have.includes(s)) errors.push(skill + ': missing section "' + s + '"');
}
if (errors.length) {
  for (const e of errors) console.error('check-skill-sections: ' + e);
  process.exit(1);
}
console.log('check-skill-sections: ' + Object.keys(CONTRACTS).length + ' skills OK');
