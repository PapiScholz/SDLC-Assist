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
function tree(skills) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-'));
  for (const [name, content] of Object.entries(skills)) {
    fs.mkdirSync(path.join(d, 'skills', name), { recursive: true });
    fs.writeFileSync(path.join(d, 'skills', name, 'SKILL.md'), content);
  }
  return d;
}
function run(d) {
  return spawnSync(process.execPath, [path.join(__dirname, 'check-frontmatter.js'), '--root', d], { encoding: 'utf8' });
}
const out = (r) => r.stderr + r.stdout;
console.log('check-frontmatter');
check('valid skill exits 0', () => {
  assert.strictEqual(run(tree({ x: '---\nname: x\ndescription: does things\n---\nbody\n' })).status, 0);
});
check('missing description exits 1 and names the skill', () => {
  const r = run(tree({ x: '---\nname: x\n---\nbody\n' }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('description') && out(r).includes('x'));
});
check('empty description exits 1', () => {
  assert.strictEqual(run(tree({ x: '---\nname: x\ndescription:   \n---\n' })).status, 1);
});
check('name differing from folder exits 1', () => {
  const r = run(tree({ x: '---\nname: y\ndescription: d\n---\n' }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('name'));
});
check('no frontmatter block exits 1', () => {
  assert.strictEqual(run(tree({ x: '# just a title\n' })).status, 1);
});
check('missing name exits 1', () => {
  assert.strictEqual(run(tree({ x: '---\ndescription: d\n---\n' })).status, 1);
});
function treeWithPlugin(skills, pluginVersion) {
  const d = tree(skills);
  fs.mkdirSync(path.join(d, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(d, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'sdlc', version: pluginVersion }));
  return d;
}
check('own skill (sdlc-*) without version exits 1', () => {
  const r = run(tree({ 'sdlc-qa-gate': '---\nname: sdlc-qa-gate\ndescription: d\n---\n' }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('version') && out(r).includes('sdlc-qa-gate'));
});
check('vendored skill without version exits 0', () => {
  assert.strictEqual(run(tree({ 'test-driven-development': '---\nname: test-driven-development\ndescription: d\n---\n' })).status, 0);
});
check('own skill version differing from plugin.json exits 1', () => {
  const r = run(treeWithPlugin({ sdlc: '---\nname: sdlc\nversion: 0.1.1\ndescription: d\n---\n' }, '0.2.0'));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('0.1.1') && out(r).includes('0.2.0'));
});
check('own skill version equal to plugin.json exits 0', () => {
  assert.strictEqual(run(treeWithPlugin({ sdlc: '---\nname: sdlc\nversion: 0.2.0\ndescription: d\n---\n' }, '0.2.0')).status, 0);
});
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
