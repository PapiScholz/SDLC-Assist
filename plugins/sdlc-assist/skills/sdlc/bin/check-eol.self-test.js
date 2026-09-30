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
function tree(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'eol-'));
  for (const [f, c] of Object.entries(files)) {
    const p = path.join(d, f);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, c);
  }
  return d;
}
function run(d) {
  return spawnSync(process.execPath, [path.join(__dirname, 'check-eol.js'), '--root', d], { encoding: 'utf8' });
}
console.log('check-eol');
check('CRLF file exits 1 and is named', () => {
  const r = run(tree({ 'a/ok.md': 'x\n', 'a/bad.md': 'x\r\ny\r\n' }));
  assert.strictEqual(r.status, 1);
  assert.ok((r.stderr + r.stdout).includes('bad.md'));
  assert.ok(!(r.stderr + r.stdout).includes('ok.md'));
});
check('all-LF tree exits 0', () => {
  assert.strictEqual(run(tree({ 'a.md': 'x\n', 'b.json': '{}\n' })).status, 0);
});
check('binary .png with CRLF bytes is ignored', () => {
  assert.strictEqual(run(tree({ 'i.png': 'a\r\nb' })).status, 0);
});
check('extensionless file (LICENSE) is checked', () => {
  const r = run(tree({ LICENSE: 'a\r\nb\n' }));
  assert.strictEqual(r.status, 1);
  assert.ok((r.stderr + r.stdout).includes('LICENSE'));
});
check('leading UTF-8 BOM exits 1 and is named; BOM bytes mid-file are not flagged', () => {
  const BOM = String.fromCharCode(0xFEFF);
  const r = run(tree({ 'bom.md': BOM + '# x\n', 'mid.md': 'x ' + BOM + '\n' }));
  assert.strictEqual(r.status, 1);
  assert.ok((r.stderr + r.stdout).includes('BOM in bom.md'), r.stderr);
  assert.ok(!(r.stderr + r.stdout).includes('mid.md'));
});
check('excluded dirs (.git, node_modules, .superpowers, .sdlc-fixtures) are skipped', () => {
  const r = run(tree({ '.git/x.md': 'a\r\n', 'node_modules/y.js': 'a\r\n', '.superpowers/z.md': 'a\r\n', '.sdlc-fixtures/w.txt': 'a\r\n' }));
  assert.strictEqual(r.status, 0);
});
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
