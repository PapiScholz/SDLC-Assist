#!/usr/bin/env node
'use strict';
// Reports, for every cycle spec, the `## Acceptance` bullets that follow none of the five EARS shapes and
// the bullets left under `## Open Questions`. Warns and exits 0; `--strict` exits 1 when anything warned.
// Usage: check-acceptance.js [--root <repo dir>] [--strict] [--all]
// Closed cycles (Status: closed) are records and are skipped unless --all is given.
// Shapes (keywords case-insensitive; "THE SYSTEM" may be any named component, e.g. `where.js` or THE ROUTER):
//   THE SYSTEM SHALL …                 ubiquitous
//   WHEN <trigger>, THE SYSTEM SHALL … event-driven
//   WHILE <state>, THE SYSTEM SHALL …  state-driven
//   IF <condition>, THEN THE SYSTEM SHALL …   unwanted behavior
//   WHERE <feature>, THE SYSTEM SHALL …       optional feature
const fs = require('fs');
const path = require('path');
const { hasHeaderLine, parseHeader } = require('./lib/header');
const { unfencedEntries } = require('./lib/unfenced');

const argv = process.argv.slice(2);
const i = argv.indexOf('--root');
const root = i !== -1 && argv[i + 1] ? path.resolve(argv[i + 1]) : process.cwd();
const strict = argv.includes('--strict');
const all = argv.includes('--all');

// One discovery for the whole skill: flat docs/specs/*.md, folder docs/specs/<dir>/spec.md, root spec.md and SPEC-*.md.
const { findSpecs } = require('./lib/signals');

const SUBJECT = '(?:the(?:\\s+\\S+){1,3}?|`[^`]+`|[A-Z][A-Za-z0-9_.-]*)';   // THE SYSTEM, THE ACCEPTANCE CHECK, `where.js`, WHERE.JS
const SHALL = SUBJECT + '\\s+shall\\b';
const SHAPES = [
  new RegExp('^' + SHALL, 'i'),
  new RegExp('^when\\b[^,]*,\\s*' + SHALL, 'i'),
  new RegExp('^while\\b[^,]*,\\s*' + SHALL, 'i'),
  new RegExp('^if\\b[^,]*,\\s*then\\s+' + SHALL, 'i'),
  new RegExp('^where\\b[^,]*,\\s*' + SHALL, 'i'),
];
const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
function isEars(text) { return SHAPES.some((re) => re.test(text)); }

// Lines of one `## <name>` section, outside fences, with their 1-based line numbers. null when the section is absent.
// The fence rule is the skill's single one (lib/unfenced.js); a heading inside a fence is a sample, not a section.
function section(text, name) {
  const lines = unfencedEntries(text);
  const start = lines.findIndex((l) => new RegExp('^##\\s+' + name + '\\s*$', 'i').test(l.text));
  if (start === -1) return null;
  const out = [];
  for (const l of lines.slice(start + 1)) {
    if (/^##\s/.test(l.text)) break;
    out.push(l);
  }
  return out;
}
function bullets(sec) {
  return sec.map(({ n, text }) => { const m = BULLET.exec(text); return m ? { n, text: m[1].trim() } : null; }).filter(Boolean);
}

let specs = 0, total = 0, notEars = 0, warned = 0;
function warn(msg) { console.log('warn ' + msg); warned++; }

// A feature cycle (feature.md) states its requirements under `## Specs` as numbered entries, each with three
// lines: `Quote:` (the developer's exact words), `Outcome:` (observable behavior) and `Check:` (a command or test
// that fails before the change). Each entry counts as one bullet; a missing field warns at the entry's line.
// A field counts on the entry line or below it, plain, bulleted or bold (`Quote:`, `- Quote:`, `**Quote:**`,
// `**Quote**:`). A section with text but no `S<n>.` entry warns: it was written in a shape this check cannot read.
const ENTRY = /^\s*S(\d+)[.)]\s/;
const FIELDS = ['Quote', 'Outcome', 'Check'].map((f) => ({ name: f, re: new RegExp('(?:^|[^A-Za-z])' + f + '(?:\\*\\*|__)?\\s*:', 'i') }));
function checkFeatureSpecs(rel, text) {
  const sec = section(text, 'Specs');
  if (sec === null) { warn(rel + ': no ## Specs'); return; }
  const entries = [];
  for (const { n, text: l } of sec) {
    const m = ENTRY.exec(l);
    if (m) entries.push({ id: 'S' + m[1], n, lines: [l.slice(m[0].length)] });
    else if (entries.length) entries[entries.length - 1].lines.push(l);
  }
  if (!entries.length && sec.some((l) => l.text.trim())) { warn(rel + ': no S# entries under ## Specs (write them as "S1. <name>")'); return; }
  for (const e of entries) {
    total++;
    for (const f of FIELDS) if (!e.lines.some((l) => f.re.test(l))) warn(rel + ':' + e.n + ' ' + e.id + ' missing ' + f.name);
  }
}

for (const rel of findSpecs(root)) {
  let text;
  try { text = fs.readFileSync(path.join(root, rel), 'utf8'); } catch { continue; }
  if (!hasHeaderLine(text)) continue;   // notes and module specs are not cycles
  if (!all && parseHeader(text).status === 'closed') continue;
  specs++;
  // findSpecs returns feature.md only as a feature cycle's record (spec.md wins when both exist).
  if (/(^|\/)feature\.md$/i.test(rel)) checkFeatureSpecs(rel, text);
  else {
    const acc = section(text, 'Acceptance');
    if (acc === null) warn(rel + ': no ## Acceptance');
    else for (const b of bullets(acc)) {
      total++;
      if (!isEars(b.text)) { notEars++; warn(rel + ':' + b.n + ' not EARS: ' + b.text.slice(0, 60)); }
    }
  }
  const open = section(text, 'Open Questions');
  if (open !== null) {
    const qs = bullets(open).filter((b) => !/^\(none\)$/i.test(b.text));
    const prose = open.filter(({ text: t }) => t.trim() && !BULLET.test(t) && !/^\(none\)$/i.test(t.trim()));
    const count = qs.length + prose.length;
    if (count) warn(rel + ': ' + count + ' open question' + (count === 1 ? '' : 's'));
  }
}
console.log('check-acceptance: ' + specs + ' specs, ' + total + ' bullets, ' + notEars + ' not EARS' + (warned ? ' (' + warned + ' warnings)' : ''));
process.exit(strict && warned ? 1 : 0);
