#!/usr/bin/env node
// Validates the marketplace at the repository root and the plugin it points to.
// Usage: check-manifest.js [--root <repo dir>]
// Layout: <root>/.claude-plugin/marketplace.json  ->  plugins[0].source  ->  <root>/plugins/sdlc-assist/.claude-plugin/plugin.json
const fs = require('fs');
const path = require('path');

const PLUGIN_SOURCE = './plugins/sdlc-assist';

const i = process.argv.indexOf('--root');
const root = i !== -1 && process.argv[i + 1]
  ? path.resolve(process.argv[i + 1])
  : path.resolve(__dirname, '..', '..', '..', '..', '..'); // bin -> sdlc -> skills -> sdlc-assist -> plugins -> repo

const errors = [];
function load(file, label) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (err) { errors.push(label + ': cannot read or parse (' + err.message + ')'); return null; }
}
const str = (v) => typeof v === 'string' && v.trim() !== '';

const market = load(path.join(root, '.claude-plugin', 'marketplace.json'), 'marketplace.json');
let pluginDir = path.join(root, PLUGIN_SOURCE);
if (market) {
  if (!str(market.name)) errors.push('marketplace.json: missing field name');
  if (!market.owner || !str(market.owner.name)) errors.push('marketplace.json: missing field owner.name');
  if (market.description !== undefined && !str(market.description)) errors.push('marketplace.json: field description must be a non-empty string');
  const p0 = Array.isArray(market.plugins) ? market.plugins[0] : null;
  if (!p0) errors.push('marketplace.json: field plugins must have at least one entry');
  else {
    if (p0.name !== 'sdlc-assist') errors.push('marketplace.json: field plugins[0].name must be "sdlc-assist"');
    if (p0.source !== PLUGIN_SOURCE) errors.push('marketplace.json: field plugins[0].source must be "' + PLUGIN_SOURCE + '"');
    else pluginDir = path.join(root, p0.source);
  }
}

const plugin = load(path.join(pluginDir, '.claude-plugin', 'plugin.json'), 'plugin.json');
if (plugin) {
  if (!str(plugin.name)) errors.push('plugin.json: missing field name');
  if (!str(plugin.version) || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(plugin.version)) {
    errors.push('plugin.json: field version must be semver');
  }
  if (!str(plugin.description)) errors.push('plugin.json: missing field description');
  if (!Array.isArray(plugin.skills) || !plugin.skills.includes('./skills')) {
    errors.push('plugin.json: field skills must include "./skills"');
  }
  if (plugin.icon !== undefined) errors.push('plugin.json: field icon is not read by Claude Code; the directory finds .claude-plugin/icon.svg by path');
  const p0 = market && Array.isArray(market.plugins) ? market.plugins[0] : null;
  if (p0 && str(plugin.name) && p0.name !== plugin.name) {
    errors.push('marketplace.json: field plugins[0].name must equal plugin.json name (' + plugin.name + ')');
  }
}

// Files the directory listing needs inside the plugin folder.
if (!fs.existsSync(path.join(pluginDir, '.claude-plugin', 'icon.svg'))) errors.push('plugin: missing .claude-plugin/icon.svg');
const rootLicense = path.join(root, 'LICENSE'), pluginLicense = path.join(pluginDir, 'LICENSE');
if (!fs.existsSync(pluginLicense)) errors.push('plugin: missing LICENSE');
else if (fs.existsSync(rootLicense) && !fs.readFileSync(rootLicense).equals(fs.readFileSync(pluginLicense))) {
  errors.push('plugin: LICENSE differs from the repository LICENSE');
}
if (!fs.existsSync(path.join(pluginDir, 'README.md'))) errors.push('plugin: missing README.md');

if (errors.length) {
  errors.forEach((e) => console.error('FAIL ' + e));
  process.exit(1);
}
console.log('manifests ok');
