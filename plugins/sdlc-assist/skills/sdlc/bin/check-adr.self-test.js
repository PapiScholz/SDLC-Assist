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
const SCRIPT = path.join(__dirname, 'check-adr.js');

// Fixture: a repo root with the given files ({ relPath: text }).
function run(files, args = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chkadr-'));
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  }
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });
  fs.rmSync(root, { recursive: true, force: true });
  return { ...r, all: (r.stdout || '') + (r.stderr || '') };
}
const adr = (status) => '# 1. X\n\nStatus: ' + status + '\n\n## Context\n\n## Decision\n\n## Consequences\n';

console.log('check-adr');
check('no ADR directory: summary says 0 ADRs, no warnings, exit 0', () => {
  const r = run({ 'README.md': '# x\n' });
  assert.strictEqual(r.status, 0);
  assert.match(r.all, /^check-adr: no ADR directory, 0 ADRs$/m);
  assert.ok(!/^warn /m.test(r.all));
});
check('valid set: accepted, proposed, deprecated, superseded by an existing number => no warnings', () => {
  const r = run({
    'docs/adr/0001-a.md': adr('superseded by 0003'), 'docs/adr/0002-b.md': adr('proposed'),
    'docs/adr/0003-c.md': adr('accepted'), 'docs/adr/0004-d.md': adr('Deprecated'),
  });
  assert.strictEqual(r.status, 0);
  assert.ok(!/^warn /m.test(r.all), r.all);
  assert.match(r.all, /^check-adr: docs\/adr, 4 ADRs$/m);
});
check('numbering gaps are allowed', () => {
  const r = run({ 'docs/adr/0001-a.md': adr('accepted'), 'docs/adr/0005-e.md': adr('accepted') });
  assert.ok(!/^warn /m.test(r.all), r.all); assert.match(r.all, /2 ADRs$/m);
});
check('duplicate number warns once per extra file', () => {
  const r = run({ 'docs/adr/0001-a.md': adr('accepted'), 'docs/adr/0001-b.md': adr('accepted') });
  assert.strictEqual(r.status, 0);
  assert.match(r.all, /^warn docs\/adr\/0001-b\.md: duplicate number 0001$/m);
  assert.match(r.all, /\(1 warning\)/);
});
check('invalid Status warns; missing Status warns as invalid too', () => {
  const r = run({ 'docs/adr/0001-a.md': adr('approved'), 'docs/adr/0002-b.md': '# 2. B\n\n## Context\n' });
  assert.match(r.all, /^warn docs\/adr\/0001-a\.md: invalid status "approved"$/m);
  assert.match(r.all, /^warn docs\/adr\/0002-b\.md: invalid status \(none\)$/m);
});
check('superseded by a number with no file warns', () => {
  const r = run({ 'docs/adr/0001-a.md': adr('superseded by 0009') });
  assert.match(r.all, /^warn docs\/adr\/0001-a\.md: superseded by missing 0009$/m);
});
check('Status inside a code fence is ignored (template example in a README is not a status)', () => {
  const r = run({ 'docs/adr/0001-a.md': '# 1\n\n```markdown\nStatus: bogus\n```\n\nStatus: accepted\n' });
  assert.ok(!/^warn /m.test(r.all), r.all); assert.match(r.all, /1 ADRs$/m);
});
check('files not named NNNN-slug.md are ignored', () => {
  const r = run({ 'docs/adr/README.md': 'Status: bogus\n', 'docs/adr/template.md': 'Status: bogus\n', 'docs/adr/0001-a.md': adr('accepted') });
  assert.ok(!/^warn /m.test(r.all), r.all);
  assert.match(r.all, /1 ADRs$/m);
});
check('docs/decisions/ is checked when docs/adr/ is absent', () => {
  const r = run({ 'docs/decisions/0001-a.md': adr('nope') });
  assert.match(r.all, /^warn docs\/decisions\/0001-a\.md: invalid status "nope"$/m);
  assert.match(r.all, /^check-adr: docs\/decisions, 1 ADRs/m);
});
check('--strict exits 1 with warnings and 0 without', () => {
  assert.strictEqual(run({ 'docs/adr/0001-a.md': adr('nope') }, ['--strict']).status, 1);
  assert.strictEqual(run({ 'docs/adr/0001-a.md': adr('accepted') }, ['--strict']).status, 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
