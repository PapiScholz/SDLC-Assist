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
const CONTRACTS = {
  'sdlc-debugging': ['Reproduce', 'Localise', 'Explain', 'Hand off', 'Never'],
  'sdlc-qa-gate': ['Diff map', 'Layers', 'Report', 'Never'],
  'sdlc-release': ['Detect', 'Classify', 'Update', 'Validate', 'Commit tag push publish', 'Publish guidance', 'Never'],
};
function body(sections, prefix) {
  return '---\nname: x\n---\n# T\n' + sections.map((s, i) => (prefix ? '## ' + (i + 1) + '. ' + s : '## ' + s) + '\n\ntext\n').join('');
}
function tree(overrides) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sections-'));
  for (const [name, sections] of Object.entries(CONTRACTS)) {
    const content = overrides && name in overrides ? overrides[name] : body(sections, false);
    if (content === null) continue;
    fs.mkdirSync(path.join(d, 'skills', name), { recursive: true });
    fs.writeFileSync(path.join(d, 'skills', name, 'SKILL.md'), content);
  }
  return d;
}
function run(d) {
  return spawnSync(process.execPath, [path.join(__dirname, 'check-skill-sections.js'), '--root', d], { encoding: 'utf8' });
}
const out = (r) => r.stderr + r.stdout;
console.log('check-skill-sections');
check('all contracts present exits 0 and counts 3 skills', () => {
  const r = run(tree());
  assert.strictEqual(r.status, 0, out(r));
  assert.ok(r.stdout.includes('3 skills OK'));
});
check('missing section exits 1 and names skill and section', () => {
  const r = run(tree({ 'sdlc-qa-gate': body(['Diff map', 'Layers', 'Never'], false) }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('sdlc-qa-gate') && out(r).includes('"Report"'));
});
check('numbered headings (## 1. Reproduce) satisfy the contract', () => {
  const r = run(tree({ 'sdlc-debugging': body(CONTRACTS['sdlc-debugging'], true) }));
  assert.strictEqual(r.status, 0, out(r));
});
check('level-3 headings satisfy the contract', () => {
  const r = run(tree({ 'sdlc-release': body(CONTRACTS['sdlc-release'], false).replace(/^## /gm, '### ') }));
  assert.strictEqual(r.status, 0, out(r));
});
check('a heading inside a fenced block does not count', () => {
  const b = body(['Detect', 'Classify', 'Update', 'Validate', 'Commit tag push publish', 'Never'], false)
    + '```\n## Publish guidance\n```\n';
  const r = run(tree({ 'sdlc-release': b }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('"Publish guidance"'));
});
check('missing skill directory exits 1', () => {
  const r = run(tree({ 'sdlc-debugging': null }));
  assert.strictEqual(r.status, 1);
  assert.ok(out(r).includes('sdlc-debugging') && out(r).includes('not found'));
});
check('CRLF file is read correctly', () => {
  const r = run(tree({ 'sdlc-qa-gate': body(CONTRACTS['sdlc-qa-gate'], false).replace(/\n/g, '\r\n') }));
  assert.strictEqual(r.status, 0, out(r));
});
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
