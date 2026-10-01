#!/usr/bin/env node
'use strict';
// Reports ADR files (docs/adr/, or docs/decisions/ when docs/adr/ is absent) whose number is duplicated, whose
// `Status:` is not one of proposed | accepted | deprecated | superseded by NNNN, or whose `superseded by` names a
// number with no file. Gaps in numbering are fine: an ADR is deprecated or superseded, never deleted.
// Warns and exits 0; `--strict` exits 1 when anything warned.
// Usage: check-adr.js [--root <repo dir>] [--strict]
const fs = require('fs');
const path = require('path');
const { unfencedLines } = require('./lib/unfenced');

const argv = process.argv.slice(2);
const i = argv.indexOf('--root');
const root = i !== -1 && argv[i + 1] ? path.resolve(argv[i + 1]) : process.cwd();
const strict = argv.includes('--strict');

const ADR_DIRS = ['docs/adr', 'docs/decisions'];
const ADR_FILE = /^(\d{4})-[^/\\]+\.md$/i;
const STATUS = /^(proposed|accepted|deprecated|superseded by (\d{4}))$/i;

let warned = 0;
function warn(msg) { console.log('warn ' + msg); warned++; }

const dir = ADR_DIRS.find((rel) => { try { return fs.statSync(path.join(root, rel)).isDirectory(); } catch { return false; } });
if (!dir) {
  console.log('check-adr: no ADR directory, 0 ADRs');
  process.exit(0);
}

const files = fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .filter((e) => e.isFile() && ADR_FILE.test(e.name)).map((e) => e.name).sort();
const numbers = new Set(files.map((f) => ADR_FILE.exec(f)[1]));
const seen = new Set();
for (const name of files) {
  const rel = dir + '/' + name, number = ADR_FILE.exec(name)[1];
  if (seen.has(number)) warn(rel + ': duplicate number ' + number); else seen.add(number);
  let text = '';
  try { text = fs.readFileSync(path.join(root, rel), 'utf8'); } catch { /* unreadable: reported as no status */ }
  const line = unfencedLines(text).map((l) => /^Status:\s*(.+?)\s*$/i.exec(l)).find(Boolean);
  if (!line) { warn(rel + ': invalid status (none)'); continue; }
  const m = STATUS.exec(line[1]);
  if (!m) { warn(rel + ': invalid status "' + line[1] + '"'); continue; }
  if (m[2] && !numbers.has(m[2])) warn(rel + ': superseded by missing ' + m[2]);
}
console.log('check-adr: ' + dir + ', ' + files.length + ' ADRs' + (warned ? ' (' + warned + ' warning' + (warned === 1 ? '' : 's') + ')' : ''));
process.exit(strict && warned ? 1 : 0);
