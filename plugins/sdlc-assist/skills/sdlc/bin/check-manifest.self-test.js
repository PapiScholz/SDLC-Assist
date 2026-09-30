#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); console.log('  ok   ' + label); passed++; }
  catch (err) { console.log('  FAIL ' + label); console.log('       ' + err.message); failed++; }
}
const SCRIPT = path.join(__dirname, 'check-manifest.js');
const SOURCE = './plugins/sdlc-assist';
const plugin = () => ({
  name: 'sdlc-assist', version: '0.1.0', description: 'd', skills: ['./skills'], commands: ['./commands'],
});
const market = () => ({
  name: 'm', owner: { name: 'o' }, plugins: [{ name: 'sdlc-assist', source: SOURCE, description: 'd' }],
});
// Fixture: a repo root with marketplace.json, LICENSE, and the plugin folder with plugin.json, icon.svg, LICENSE, README.md.
function run(p, m, opts = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chkman-'));
  const pdir = path.join(root, 'plugins', 'sdlc-assist');
  fs.mkdirSync(path.join(root, '.claude-plugin'));
  fs.mkdirSync(path.join(pdir, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'LICENSE'), 'MIT\n');
  if (!opts.noLicense) fs.writeFileSync(path.join(pdir, 'LICENSE'), opts.license || 'MIT\n');
  if (!opts.noIcon) fs.writeFileSync(path.join(pdir, '.claude-plugin', 'icon.svg'), '<svg/>');
  if (!opts.noReadme) fs.writeFileSync(path.join(pdir, 'README.md'), '# p\n');
  if (p) fs.writeFileSync(path.join(pdir, '.claude-plugin', 'plugin.json'), typeof p === 'string' ? p : JSON.stringify(p));
  if (m) fs.writeFileSync(path.join(root, '.claude-plugin', 'marketplace.json'), typeof m === 'string' ? m : JSON.stringify(m));
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
  fs.rmSync(root, { recursive: true, force: true });
  return r;
}
console.log('check-manifest');
check('valid pair => exit 0', () => {
  const r = run(plugin(), market());
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
});
check('marketplace top-level description accepted; empty or non-string => exit 1', () => {
  const m = market(); m.description = 'Skills by X.';
  assert.strictEqual(run(plugin(), m).status, 0);
  m.description = '';
  const r = run(plugin(), m);
  assert.strictEqual(r.status, 1); assert.ok(/description/.test(r.stdout + r.stderr));
  m.description = 3; assert.strictEqual(run(plugin(), m).status, 1);
});
check('plugin.json without name => exit 1 naming the field', () => {
  const p = plugin(); delete p.name;
  const r = run(p, market());
  assert.strictEqual(r.status, 1);
  assert.ok(/name/.test(r.stdout + r.stderr));
});
check('non-semver version => exit 1', () => {
  const p = plugin(); p.version = 'one';
  assert.strictEqual(run(p, market()).status, 1);
});
check('skills lacking ./skills => exit 1', () => {
  const p = plugin(); p.skills = ['./other'];
  assert.strictEqual(run(p, market()).status, 1);
});
check('marketplace source "./" (plugin at the repo root) => exit 1 naming the expected source', () => {
  const m = market(); m.plugins[0].source = './';
  const r = run(plugin(), m);
  assert.strictEqual(r.status, 1);
  assert.ok(/source must be "\.\/plugins\/sdlc-assist"/.test(r.stdout + r.stderr), r.stdout + r.stderr);
});
check('plugin.json icon field => exit 1 (directory reads .claude-plugin/icon.svg by path)', () => {
  const p = plugin(); p.icon = './icon.svg';
  const r = run(p, market());
  assert.strictEqual(r.status, 1);
  assert.ok(/icon/.test(r.stdout + r.stderr));
});
check('missing icon.svg, LICENSE or README.md inside the plugin => exit 1 naming the file', () => {
  for (const [opt, re] of [['noIcon', /icon\.svg/], ['noLicense', /LICENSE/], ['noReadme', /README\.md/]]) {
    const r = run(plugin(), market(), { [opt]: true });
    assert.strictEqual(r.status, 1, opt);
    assert.ok(re.test(r.stdout + r.stderr), opt + ': ' + r.stdout + r.stderr);
  }
});
check('plugin LICENSE that differs from the root LICENSE => exit 1', () => {
  const r = run(plugin(), market(), { license: 'Apache\n' });
  assert.strictEqual(r.status, 1);
  assert.ok(/LICENSE differs/.test(r.stdout + r.stderr));
});
check('marketplace missing owner.name => exit 1', () => {
  const m = market(); delete m.owner.name;
  assert.strictEqual(run(plugin(), m).status, 1);
});
check('marketplace plugin name not sdlc-assist => exit 1', () => {
  const m = market(); m.plugins[0].name = 'other';
  assert.strictEqual(run(plugin(), m).status, 1);
});
check('old plugin id "sdlc" in both manifests => exit 1 naming sdlc-assist', () => {
  const p = plugin(); p.name = 'sdlc';
  const m = market(); m.plugins[0].name = 'sdlc';
  const r = run(p, m);
  assert.strictEqual(r.status, 1);
  assert.ok(/sdlc-assist/.test(r.stdout + r.stderr));
});
check('plugin.json name and marketplace plugin name disagree => exit 1 naming both', () => {
  const p = plugin(); p.name = 'sdlc-assist-x';
  const r = run(p, market());
  assert.strictEqual(r.status, 1);
  assert.ok(/must equal plugin.json name/.test(r.stdout + r.stderr));
});
check('invalid JSON => exit 1', () => {
  assert.strictEqual(run('{nope', market()).status, 1);
});
check('missing marketplace.json => exit 1', () => {
  assert.strictEqual(run(plugin(), null).status, 1);
});
check('missing plugin.json => exit 1', () => {
  assert.strictEqual(run(null, market()).status, 1);
});
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
