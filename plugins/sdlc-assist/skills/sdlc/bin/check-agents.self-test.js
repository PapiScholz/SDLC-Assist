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
const GOOD = '---\nname: comprehension\ndescription: d\ntools: Read, Grep, Glob\nmodel: inherit\nomitClaudeMd: true\n---\nbody\n';
function tree(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-'));
  fs.mkdirSync(path.join(d, 'agents'));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(d, 'agents', name), text);
  return d;
}
function run(d) {
  return spawnSync(process.execPath, [path.join(__dirname, 'check-agents.js'), '--root', d], { encoding: 'utf8' });
}
const out = (r) => r.stderr + r.stdout;
console.log('check-agents');
check('read-only agent with omitClaudeMd exits 0 and counts it', () => {
  const r = run(tree({ 'comprehension.md': GOOD }));
  assert.strictEqual(r.status, 0, out(r));
  assert.ok(r.stdout.includes('1 agents OK'), out(r));
});
check('a write tool (Edit) exits 1 naming agent and tool', () => {
  const r = run(tree({ 'x.md': GOOD.replace('name: comprehension', 'name: x').replace('Read, Grep, Glob', 'Read, Grep, Glob, Edit') }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('x.md') && out(r).includes('Edit'), out(r));
});
check('no tools line (inherits every tool) exits 1', () => {
  const r = run(tree({ 'x.md': GOOD.replace('tools: Read, Grep, Glob\n', '') }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('tools'), out(r));
});
check('omitClaudeMd missing or false exits 1', () => {
  for (const t of [GOOD.replace('omitClaudeMd: true\n', ''), GOOD.replace('omitClaudeMd: true', 'omitClaudeMd: false')]) {
    const r = run(tree({ 'x.md': t }));
    assert.strictEqual(r.status, 1);
    assert.ok(out(r).includes('omitClaudeMd'), out(r));
  }
});
check('YAML list form of tools is read', () => {
  const r = run(tree({ 'y.md': GOOD.replace('tools: Read, Grep, Glob', 'tools:\n  - Read\n  - Bash') }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('Bash'), out(r));
});
check('name differing from the file name exits 1', () => {
  const r = run(tree({ 'other.md': GOOD }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('other.md'), out(r));
});
check('CRLF file is read correctly', () => {
  const r = run(tree({ 'comprehension.md': GOOD.replace(/\n/g, '\r\n') }));
  assert.strictEqual(r.status, 0, out(r));
});
check('no agents directory exits 1', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-'));
  assert.strictEqual(run(d).status, 1);
});
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
