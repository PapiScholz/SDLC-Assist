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

const argv = process.argv.slice(2);
const i = argv.indexOf('--root');
const root = i !== -1 && argv[i + 1] ? path.resolve(argv[i + 1]) : process.cwd();
const strict = argv.includes('--strict');
const all = argv.includes('--all');

function listDir(abs) { try { return fs.readdirSync(abs, { withFileTypes: true }); } catch { return []; } }
// Same discovery as lib/signals.js findSpecs (kept in step by the self-test that scans the three locations).
function findSpecs(dir) {
  const out = [];
  for (const e of listDir(path.join(dir, 'docs', 'specs'))) if (e.isFile() && /\.md$/i.test(e.name)) out.push('docs/specs/' + e.name);
  for (const e of listDir(dir)) if (e.isFile() && (/^spec\.md$/i.test(e.name) || /^SPEC-.*\.md$/i.test(e.name))) out.push(e.name);
  return out.sort();
}

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
function section(text, name) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => new RegExp('^##\\s+' + name + '\\s*$', 'i').test(l));
  if (start === -1) return null;
  const out = [];
  let fenced = false;
  for (let n = start + 1; n < lines.length; n++) {
    const l = lines[n];
    if (/^```/.test(l)) { fenced = !fenced; continue; }
    if (fenced) continue;
    if (/^##\s/.test(l)) break;
    out.push({ n: n + 1, text: l });
  }
  return out;
}
function bullets(sec) {
  return sec.map(({ n, text }) => { const m = BULLET.exec(text); return m ? { n, text: m[1].trim() } : null; }).filter(Boolean);
}

let specs = 0, total = 0, notEars = 0, warned = 0;
function warn(msg) { console.log('warn ' + msg); warned++; }

for (const rel of findSpecs(root)) {
  let text;
  try { text = fs.readFileSync(path.join(root, rel), 'utf8'); } catch { continue; }
  if (!hasHeaderLine(text)) continue;   // notes and module specs are not cycles
  if (!all && parseHeader(text).status === 'closed') continue;
  specs++;
  const acc = section(text, 'Acceptance');
  if (acc === null) warn(rel + ': no ## Acceptance');
  else {
    for (const b of bullets(acc)) {
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
