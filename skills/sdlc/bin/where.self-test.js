#!/usr/bin/env node
// Fixture harness for where.js: temp git repos, one block per spec-table row, each with its inversion.
const assert = require('assert'); const crypto = require('crypto');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const WHERE = path.join(__dirname, 'where.js');
const T1 = '2020-01-01T00:00:00Z', T2 = '2020-02-01T00:00:00Z', T3 = '2020-03-01T00:00:00Z', T4 = '2020-04-01T00:00:00Z';
let passed = 0, failed = 0; const tmps = [];
process.on('exit', () => { for (const d of tmps) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5 }); } catch {} });
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
function tmpDir() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-where-')); tmps.push(d); return d; }
function write(root, rel, text) { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
function git(root, args, env) { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, ...env } }); }
function initRepo(root) {
  git(root, ['init', '--quiet', '--initial-branch=main']);
  git(root, ['config', 'core.hooksPath', path.join(root, '.no-hooks')]);
  git(root, ['config', 'commit.gpgsign', 'false']); git(root, ['config', 'core.autocrlf', 'false']);
  return root;
}
function commit(root, msg, iso) {
  git(root, ['add', '-A']);
  git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--quiet', '--allow-empty', '-m', msg], { GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso });
}
function snapshot(root) {   // everything except .git/ (git status may rewrite .git/index)
  const out = [];
  (function walk(rel) {
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.name === '.git') continue;
      if (e.isDirectory()) walk(r); else out.push(r + ':' + crypto.createHash('sha1').update(fs.readFileSync(path.join(root, r))).digest('hex'));
    }
  })('');
  return out.join('\n');
}
function runWhere(root, message, extra = []) {
  const before = snapshot(root);
  const r = spawnSync(process.execPath, [WHERE, '--root', root, '--message', message, ...extra], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, 'where.js exit ' + r.status + '\n' + r.stderr);
  assert.strictEqual(snapshot(root), before, 'where.js modified the fixture');
  return JSON.parse(r.stdout);
}
const hasAlt = (r, phase, kind) => r.alternatives.some(a => a.phase === phase && a.kind === kind);

console.log('cli');
check('exit 2 with stderr message when --root is not a directory', () => {
  const r = spawnSync(process.execPath, [WHERE, '--root', path.join(os.tmpdir(), 'sdlc-missing-' + Date.now())], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2); assert(/root/i.test(r.stderr));
});
check('output has the documented top-level keys, in order; JSON valid with Windows paths', () => {
  const r = runWhere(tmpDir(), 'hi');
  assert.deepStrictEqual(Object.keys(r), ['signals', 'cycles', 'active', 'inferred', 'evidence', 'alternatives', 'warnings', 'request']);
  assert.deepStrictEqual(r.request, { message: 'hi', type: 'unknown' });
  assert(!r.signals.root.includes('\\'));
});
check('--root accepts forward and back slashes', () => {
  const d = tmpDir();
  const a = spawnSync(process.execPath, [WHERE, '--root', d.split(path.sep).join('/')], { encoding: 'utf8' });
  const b = spawnSync(process.execPath, [WHERE, '--root', d], { encoding: 'utf8' });
  assert.strictEqual(a.status, 0); assert.strictEqual(b.status, 0);
  assert.strictEqual(JSON.parse(a.stdout).signals.root, JSON.parse(b.stdout).signals.root);
});
check('--message= form and missing --message', () => {
  const r = spawnSync(process.execPath, [WHERE, '--root', tmpDir(), '--message=add feature X'], { encoding: 'utf8' });
  assert.strictEqual(JSON.parse(r.stdout).request.type, 'feature');
  const r2 = spawnSync(process.execPath, [WHERE, '--root', tmpDir()], { encoding: 'utf8' });
  assert.deepStrictEqual(JSON.parse(r2.stdout).request, { message: '', type: 'unknown' });
});
console.log('fixture 1: empty dir, no git');
check('idea => initial', () => {
  const r = runWhere(tmpDir(), 'I have an idea for X');
  assert.strictEqual(r.inferred, 'initial'); assert.strictEqual(r.request.type, 'idea'); assert.strictEqual(r.signals.git.isRepo, false);
});
check('inversion: add a source file => analysis', () => {
  const root = tmpDir(); write(root, 'src/index.js', 'x\n');
  assert.strictEqual(runWhere(root, 'I have an idea for X').inferred, 'analysis');
});
// fixtures 2..10 and --run-tests appended in Tasks 11-14
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
