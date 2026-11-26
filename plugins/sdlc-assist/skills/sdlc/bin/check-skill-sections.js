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
  'sdlc-spec': ['Size', 'Where it goes', 'Clarify', 'Acceptance', 'Approval', 'Never'],
  'sdlc-plan': ['Where it goes', 'Stages', 'Tasks', 'Approval', 'Never'],
};
// The first line of text after the frontmatter (headings skipped) routes through the sdlc router (issue #35): an
// agent that opens the file by any route reads it before anything else.
function firstTextLine(text) {
  const ls = unfencedLines(text);
  let i = 0;
  if (ls[0] === '---') { i = ls.indexOf('---', 1) + 1; if (i === 0) return ''; }
  for (; i < ls.length; i++) if (ls[i].trim() && !/^#/.test(ls[i])) return ls[i].trim();
  return '';
}

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
  const text = fs.readFileSync(f, 'utf8');
  const have = headings(text);
  for (const s of sections) if (!have.includes(s)) errors.push(skill + ': missing section "' + s + '"');
  if (!firstTextLine(text).startsWith('Route first')) errors.push(skill + ': first line of text is not "Route first: ..."');
}
if (errors.length) {
  for (const e of errors) console.error('check-skill-sections: ' + e);
  process.exit(1);
}
console.log('check-skill-sections: ' + Object.keys(CONTRACTS).length + ' skills OK');
