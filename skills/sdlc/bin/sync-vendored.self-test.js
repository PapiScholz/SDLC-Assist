const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const script = path.join(__dirname, 'sync-vendored.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
// fake upstream: a dir with skills/<name>/SKILL.md, used via --upstream-dir (test hook)
const up = path.join(tmp, 'up'); const local = path.join(tmp, 'local');
for (const name of ['spec-driven-development']) {
  fs.mkdirSync(path.join(up, 'skills', name), { recursive: true });
  fs.writeFileSync(path.join(up, 'skills', name, 'SKILL.md'), '---\nname: x\ndescription: y\n---\nBODY\n');
  fs.writeFileSync(path.join(up, 'LICENSE'), 'MIT\n');
}
function run(args) {
  try { return { code: 0, out: execFileSync('node', [script, ...args, '--upstream-dir', up, '--skills-dir', local, '--names', 'spec-driven-development'], { encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; }
}
assert.strictEqual(run(['--check']).code, 1, 'missing local copy is drift');
assert.strictEqual(run(['--fix']).code, 0);
assert.ok(fs.existsSync(path.join(local, 'spec-driven-development', 'VENDORED.md')));
assert.ok(fs.existsSync(path.join(local, 'spec-driven-development', 'LICENSE')));
assert.strictEqual(run(['--check']).code, 0, 'after fix: in sync');
fs.appendFileSync(path.join(local, 'spec-driven-development', 'SKILL.md'), 'drift\n');
assert.strictEqual(run(['--check']).code, 1, 'edited line is drift');
fs.writeFileSync(path.join(local, 'spec-driven-development', 'VENDORED.md'), 'changed\n');
// VENDORED.md and LICENSE are excluded from comparison: restore SKILL.md and expect 0
run(['--fix']);
assert.strictEqual(run(['--check']).code, 0);
// LICENSE or VENDORED.md missing => exit 1 naming the file
for (const f of ['LICENSE', 'VENDORED.md']) {
  fs.rmSync(path.join(local, 'spec-driven-development', f));
  const r = run(['--check']);
  assert.strictEqual(r.code, 1, f + ' missing must fail');
  assert.ok(r.out.includes('missing: skills/spec-driven-development/' + f), r.out);
  run(['--fix']);
  assert.strictEqual(run(['--check']).code, 0, 'restored ' + f);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log('sync-vendored self-test OK');
