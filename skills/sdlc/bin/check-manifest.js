#!/usr/bin/env node
// Validates .claude-plugin/plugin.json and marketplace.json. Usage: check-manifest.js [--root <dir>]
const fs = require('fs');
const path = require('path');

const i = process.argv.indexOf('--root');
const root = i !== -1 && process.argv[i + 1]
  ? path.resolve(process.argv[i + 1])
  : path.join(__dirname, '..', '..', '..');

const errors = [];
function load(name) {
  const file = path.join(root, '.claude-plugin', name);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (err) { errors.push(name + ': cannot read or parse (' + err.message + ')'); return null; }
}
const str = (v) => typeof v === 'string' && v.trim() !== '';

const plugin = load('plugin.json');
if (plugin) {
  if (!str(plugin.name)) errors.push('plugin.json: missing field name');
  if (!str(plugin.version) || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(plugin.version)) {
    errors.push('plugin.json: field version must be semver');
  }
  if (!str(plugin.description)) errors.push('plugin.json: missing field description');
  if (!Array.isArray(plugin.skills) || !plugin.skills.includes('./skills')) {
    errors.push('plugin.json: field skills must include "./skills"');
  }
}

const market = load('marketplace.json');
if (market) {
  if (!str(market.name)) errors.push('marketplace.json: missing field name');
  if (!market.owner || !str(market.owner.name)) errors.push('marketplace.json: missing field owner.name');
  if (market.description !== undefined && !str(market.description)) errors.push('marketplace.json: field description must be a non-empty string');
  const p0 = Array.isArray(market.plugins) ? market.plugins[0] : null;
  if (!p0) errors.push('marketplace.json: field plugins must have at least one entry');
  else {
    if (p0.name !== 'sdlc-assist') errors.push('marketplace.json: field plugins[0].name must be "sdlc-assist"');
    if (plugin && p0.name !== plugin.name) errors.push('marketplace.json: field plugins[0].name must equal plugin.json name (' + plugin.name + ')');
    if (p0.source !== './') errors.push('marketplace.json: field plugins[0].source must be "./"');
  }
}

if (errors.length) {
  errors.forEach((e) => console.error('FAIL ' + e));
  process.exit(1);
}
console.log('manifests ok');
