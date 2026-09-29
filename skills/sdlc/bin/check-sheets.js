#!/usr/bin/env node
// Validates references/phases/*.md: one sheet per phase, no extras, and every
// recommended/alternative skill is a known name (plugin prefix stripped).
const fs = require('fs');
const path = require('path');
const { PHASES } = require('./lib/header');

// sdlc-debugging, sdlc-qa-gate and sdlc-release are not shipped in v1: they stay known because the spec names them as the v1.1 skills the sheets recommend.
const DEFAULT_KNOWN = [
  'spec-driven-development', 'planning-and-task-breakdown', 'incremental-implementation',
  'test-driven-development', 'context-engineering',
  'sdlc', 'sdlc-debugging', 'sdlc-qa-gate', 'sdlc-release',
  'systematic-debugging', 'debugging-strategies', 'release-engineer', 'qa-push',
];

function normalise(name) {
  const i = name.lastIndexOf(':');
  return (i >= 0 ? name.slice(i + 1) : name).trim();
}

function parseList(v) {
  const m = /^\[(.*)\]$/.exec(v.trim());
  if (!m) return null;
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---(\n|$)/.exec(text.replace(/\r\n/g, '\n'));
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

function main(argv) {
  let dir = path.join(__dirname, '..', 'references', 'phases');
  let known = DEFAULT_KNOWN;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--sheets-dir') dir = argv[++i];
    else if (argv[i] === '--known') known = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
  }
  const errors = [];
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
  for (const slug of PHASES) {
    if (!files.includes(slug + '.md')) errors.push('missing sheet: ' + slug);
  }
  for (const f of files) {
    const slug = f.slice(0, -3);
    if (!PHASES.includes(slug)) { errors.push('extra sheet: ' + f); continue; }
    const fm = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (!fm) { errors.push(f + ': no frontmatter'); continue; }
    if (fm.slug !== slug) errors.push(f + ': slug "' + fm.slug + '" does not match filename');
    if (!fm.title) errors.push(f + ': missing title');
    if (!fm.design) errors.push(f + ': missing design');
    for (const key of ['recommends', 'alternatives']) {
      const list = fm[key] === undefined ? null : parseList(fm[key]);
      if (!list) { errors.push(f + ': ' + key + ' must be a [list]'); continue; }
      for (const name of list) {
        if (!known.includes(normalise(name))) errors.push(f + ': unknown skill "' + name + '" in ' + key);
      }
    }
  }
  if (errors.length) {
    for (const e of errors) console.error('check-sheets: ' + e);
    return 1;
  }
  console.log('check-sheets: ' + PHASES.length + ' sheets OK');
  return 0;
}

process.exit(main(process.argv.slice(2)));
