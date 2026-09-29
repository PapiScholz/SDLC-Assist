#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { candidateDirs, pluginSkillDirs, subdirs, normalizeName } = require('./lib/skilldirs');

function parseList(v) {
  return v.replace(/^\[|\]$/g, '').split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

// Frontmatter lists: `key: [a, b]` and `key:` followed by `- item` lines.
function parseFrontmatter(text) {
  const m = text.replace(/\r\n?/g, '\n').match(/^---\n([\s\S]*?)\n---(\n|$)/);
  const out = {};
  if (!m) return out;
  let key = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      out[key] = kv[2].trim() ? parseList(kv[2].trim()) : [];
      continue;
    }
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && key) out[key].push(item[1].trim().replace(/^['"]|['"]$/g, ''));
  }
  return out;
}

function parseArgs(argv) {
  const a = { verbose: false, root: null, phase: null, sheetsDir: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--verbose') a.verbose = true;
    else if (argv[i] === '--root') a.root = argv[++i];
    else if (argv[i] === '--phase') a.phase = argv[++i];
    else if (argv[i] === '--sheets-dir') a.sheetsDir = argv[++i];
  }
  return a;
}

function scan(home, cwd) {
  const found = []; // {name, path (real), form}
  const seen = new Set();
  const add = (name, dir, form) => {
    let real; try { real = fs.realpathSync(dir); } catch { return; }
    if (seen.has(real)) return;
    seen.add(real);
    found.push({ name, path: real, form });
  };
  for (const base of candidateDirs(home, cwd))
    for (const d of subdirs(fs, base)) {
      const dir = path.join(base, d);
      if (fs.existsSync(path.join(dir, 'SKILL.md'))) add(normalizeName(d), dir, normalizeName(d));
    }
  for (const p of pluginSkillDirs(home, fs)) add(p.name, p.dir, p.form);
  return found;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const home = args.root || os.homedir();
  const sheetsDir = args.sheetsDir || path.join(__dirname, '..', 'references', 'phases');
  const found = scan(home, process.cwd());
  const byName = new Map();
  for (const f of found) { if (!byName.has(f.name)) byName.set(f.name, []); byName.get(f.name).push(f); }

  const phases = {};
  let files = [];
  try { files = fs.readdirSync(sheetsDir).filter(f => f.endsWith('.md')).sort(); } catch { files = []; }
  for (const f of files) {
    const slug = f.slice(0, -3);
    if (args.phase && slug !== args.phase) continue;
    const fm = parseFrontmatter(fs.readFileSync(path.join(sheetsDir, f), 'utf8'));
    const recommends = fm.recommends || [];
    const alternatives = fm.alternatives || [];
    const installed = [], missing = [], done = new Set();
    for (const raw of [...recommends, ...alternatives]) {
      const name = normalizeName(raw);
      if (done.has(raw)) continue;
      done.add(raw);
      const hits = byName.get(name);
      if (hits) {
        const pick = raw.includes(':') ? (hits.find(h => h.form === raw) || hits[0]) : hits[0];
        installed.push({ name, path: pick.path, form: pick.form });
      } else missing.push(raw);
    }
    phases[slug] = { recommends, alternatives, installed, missing };
  }
  const duplicates = [];
  for (const [name, list] of byName) if (list.length > 1) duplicates.push({ name, paths: list.map(l => l.path) });

  process.stdout.write(JSON.stringify({ phases, duplicates }, null, 2) + '\n');
  if (args.verbose) {
    const lines = ['phase\tinstalled\tmissing'];
    for (const [slug, p] of Object.entries(phases))
      lines.push(`${slug}\t${p.installed.map(i => i.form).join(', ') || '-'}\t${p.missing.join(', ') || '-'}`);
    for (const d of duplicates) lines.push(`duplicate\t${d.name}\t${d.paths.join(' | ')}`);
    process.stderr.write(lines.join('\n') + '\n');
  }
}

try { main(); process.exit(0); }
catch (err) { process.stderr.write('which.js: ' + (err && err.stack || err) + '\n'); process.exit(2); }
