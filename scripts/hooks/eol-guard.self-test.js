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
function project() { return fs.mkdtempSync(path.join(os.tmpdir(), 'eolg-')); }
function put(d, name, content) {
  const p = path.join(d, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  return p;
}
function run(d, filePath, extraEnv) {
  const env = Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: d }, extraEnv || {});
  delete env.SDLC_HOOKS_DISABLE;
  if (extraEnv) Object.assign(env, extraEnv);
  const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: filePath } });
  return spawnSync(process.execPath, [path.join(__dirname, 'eol-guard.js')], { input, encoding: 'utf8', env });
}
console.log('eol-guard');
check('LF file exits 0', () => {
  const d = project();
  assert.strictEqual(run(d, put(d, 'a.md', 'one\ntwo\n')).status, 0);
});
check('CRLF file exits 2 and stderr has the relative path and sed -i', () => {
  const d = project();
  const r = run(d, put(d, path.join('docs', 'a.md'), 'one\r\ntwo\r\n'));
  assert.strictEqual(r.status, 2);
  assert.ok(r.stderr.includes(path.join('docs', 'a.md')), r.stderr);
  assert.ok(r.stderr.includes('sed -i'), r.stderr);
});
check('BOM plus LF exits 2 and stderr mentions BOM', () => {
  const d = project();
  const r = run(d, put(d, 'a.md', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('one\n')])));
  assert.strictEqual(r.status, 2);
  assert.ok(r.stderr.includes('BOM'), r.stderr);
});
check('png with CRLF bytes exits 0', () => {
  const d = project();
  assert.strictEqual(run(d, put(d, 'a.png', 'x\r\ny\r\n')).status, 0);
});
check('path built with path.join (backslashes on Windows) exits 2', () => {
  const d = project();
  const p = put(d, path.join('sub', 'a.md'), 'x\r\ny\r\n');
  assert.strictEqual(run(d, path.join(d, 'sub', 'a.md')).status, 2);
  assert.ok(p);
});
check('same file with forward slashes exits 2', () => {
  const d = project();
  put(d, path.join('sub', 'a.md'), 'x\r\ny\r\n');
  assert.strictEqual(run(d, (d + '/sub/a.md').split(path.sep).join('/')).status, 2);
});
check('relative path resolves against the project dir and exits 2', () => {
  const d = project();
  put(d, path.join('sub', 'a.md'), 'x\r\ny\r\n');
  assert.strictEqual(run(d, 'sub/a.md').status, 2);
});
check('missing file exits 0', () => {
  const d = project();
  assert.strictEqual(run(d, path.join(d, 'nope.md')).status, 0);
});
check('CRLF file outside the project dir exits 0', () => {
  const d = project();
  const other = project();
  assert.strictEqual(run(d, put(other, 'a.md', 'x\r\ny\r\n')).status, 0);
});
check('file with a NUL byte and CRLF exits 0', () => {
  const d = project();
  assert.strictEqual(run(d, put(d, 'a.bin', Buffer.from([0x41, 0x00, 0x0d, 0x0a, 0x42]))).status, 0);
});
check('SDLC_HOOKS_DISABLE=1 exits 0 on a CRLF file', () => {
  const d = project();
  assert.strictEqual(run(d, put(d, 'a.md', 'x\r\ny\r\n'), { SDLC_HOOKS_DISABLE: '1' }).status, 0);
});
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
