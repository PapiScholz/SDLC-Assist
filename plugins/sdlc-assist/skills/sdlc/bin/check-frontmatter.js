#!/usr/bin/env node
'use strict';
// Every skills/*/SKILL.md needs a --- block with name (== folder) and a non-empty description; own skills (sdlc, sdlc-*) also need version equal to .claude-plugin/plugin.json.
// Usage: check-frontmatter.js [--root <dir>]
const fs = require('fs');
const path = require('path');
const i = process.argv.indexOf('--root');
const root = i !== -1 && process.argv[i + 1]
  ? path.resolve(process.argv[i + 1])
  : path.resolve(__dirname, '..', '..', '..');
const skillsDir = path.join(root, 'skills');
const pluginFile = path.join(root, '.claude-plugin', 'plugin.json');
let pluginVersion = null;
try { pluginVersion = JSON.parse(fs.readFileSync(pluginFile, 'utf8')).version || null; } catch { /* no manifest in this tree */ }
const errors = [];
const dirs = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : [];
for (const d of dirs) {
  const f = path.join(skillsDir, d, 'SKILL.md');
  if (!fs.existsSync(f)) continue;
  const text = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---(\n|$)/.exec(text);
  if (!m) { errors.push(d + ': SKILL.md has no --- frontmatter block'); continue; }
  const field = (k) => {
    const r = new RegExp('^' + k + ':[ \t]*(.*)$', 'm').exec(m[1]);
    return r ? r[1].trim() : null;
  };
  const name = field('name');
  const desc = field('description');
  if (!name) errors.push(d + ': frontmatter missing name');
  else if (name !== d) errors.push(d + ': name "' + name + '" does not match folder');
  if (!desc) errors.push(d + ': frontmatter missing description');
  if (/^sdlc(-|$)/.test(d)) {
    const version = field('version');
    if (!version) errors.push(d + ': frontmatter missing version (own skills carry the plugin version)');
    else if (pluginVersion && version !== pluginVersion) {
      errors.push(d + ': version "' + version + '" differs from plugin.json "' + pluginVersion + '"');
    }
  }
}
if (errors.length) {
  for (const e of errors) console.error('check-frontmatter: ' + e);
  process.exit(1);
}
console.log('check-frontmatter: ' + dirs.length + ' skills OK');
