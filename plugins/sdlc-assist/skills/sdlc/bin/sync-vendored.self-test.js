const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const script = path.join(__dirname, 'sync-vendored.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
// fake upstream: a dir with skills/<name>/SKILL.md, used via --upstream-dir (test hook)
const NAME = 'incremental-implementation';
const up = path.join(tmp, 'up'); const local = path.join(tmp, 'local');
fs.mkdirSync(path.join(up, 'skills', NAME), { recursive: true });
fs.writeFileSync(path.join(up, 'skills', NAME, 'SKILL.md'), '---\nname: x\ndescription: y\n---\nBODY\n');
fs.writeFileSync(path.join(up, 'LICENSE'), 'MIT\n');
function run(args) {
  try { return { code: 0, out: execFileSync('node', [script, ...args, '--upstream-dir', up, '--skills-dir', local, '--names', NAME], { encoding: 'utf8', stdio: 'pipe' }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; }
}
assert.strictEqual(run(['--check']).code, 1, 'missing local copy is drift');
assert.strictEqual(run(['--fix']).code, 0);
assert.ok(fs.existsSync(path.join(local, NAME, 'VENDORED.md')));
assert.ok(fs.existsSync(path.join(local, NAME, 'LICENSE')));
assert.strictEqual(run(['--check']).code, 0, 'after fix: in sync');
fs.appendFileSync(path.join(local, NAME, 'SKILL.md'), 'drift\n');
assert.strictEqual(run(['--check']).code, 1, 'edited line is drift');
fs.writeFileSync(path.join(local, NAME, 'VENDORED.md'), 'changed\n');
// VENDORED.md and LICENSE are excluded from comparison: restore SKILL.md and expect 0
run(['--fix']);
assert.strictEqual(run(['--check']).code, 0);
// LICENSE or VENDORED.md missing => exit 1 naming the file
for (const f of ['LICENSE', 'VENDORED.md']) {
  fs.rmSync(path.join(local, NAME, f));
  const r = run(['--check']);
  assert.strictEqual(r.code, 1, f + ' missing must fail');
  assert.ok(r.out.includes('missing: skills/' + NAME + '/' + f), r.out);
  run(['--fix']);
  assert.strictEqual(run(['--check']).code, 0, 'restored ' + f);
}
// A vendored copy left behind after its name leaves the list (issue #34) => exit 1 naming the folder
fs.mkdirSync(path.join(local, 'old-vendored-skill'), { recursive: true });
fs.writeFileSync(path.join(local, 'old-vendored-skill', 'VENDORED.md'), 'old\n');
let r = run(['--check']);
assert.strictEqual(r.code, 1, 'leftover vendored folder must fail');
assert.ok(r.out.includes('not in the vendored list: skills/old-vendored-skill'), r.out);
fs.rmSync(path.join(local, 'old-vendored-skill'), { recursive: true });
// An own skill (no VENDORED.md) beside the vendored ones is not a leftover
fs.mkdirSync(path.join(local, 'sdlc-spec'), { recursive: true });
fs.writeFileSync(path.join(local, 'sdlc-spec', 'SKILL.md'), 'own\n');
r = run(['--check']);
assert.strictEqual(r.code, 0, 'own skill is not a leftover: ' + r.out);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('sync-vendored self-test OK');
