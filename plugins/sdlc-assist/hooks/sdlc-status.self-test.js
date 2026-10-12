#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const HOOK = path.join(__dirname, 'sdlc-status.js');
let passed = 0, failed = 0; const tmps = [];
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
function tmpDir() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-hook-')); tmps.push(d); return d; }
function write(root, rel, text) { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
function git(root, args) { execFileSync('git', args, { cwd: root, stdio: 'ignore' }); }
process.on('exit', () => { for (const d of tmps) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5 }); } catch {} });
function run(stdin, cwd) { return spawnSync(process.execPath, [HOOK], { input: stdin, encoding: 'utf8', cwd }); }
function stagedRepo() {
  const root = tmpDir(); const d = 'docs/specs/2026-10-08-lms';
  write(root, d + '/spec.md', '# Spec\n\nPhase: development\nStatus: approved\n');
  write(root, d + '/plan.md', '# Plan\n\n## Etapas\n\n| # | Etapa |\n|---|---|\n| 3 | **Ingreso** [x] 2026-10-12 |\n| 4 | **Catálogo** |\n');
  write(root, d + '/tasks.md', '# Etapa 3 — Ingreso\n\n- [x] a\n');
  write(root, 'src/a.js', 'x\n');
  git(root, ['init', '-q']); git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A']);
  git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init']);
  return root;
}
console.log('sdlc-status hook');
check('staged repo: one line naming stage 4 and step 3', () => {
  const r = run(JSON.stringify({ cwd: stagedRepo(), prompt: 'seguimos' }));
  assert.strictEqual(r.status, 0); assert.match(r.stdout, /^sdlc: stage 4 "Catálogo" .*step 3\/4 plan/);
});
check('from a subdirectory of the repo: same line', () => {
  const root = stagedRepo();
  const r = run(JSON.stringify({ cwd: path.join(root, 'src'), prompt: 'x' }));
  assert.match(r.stdout, /^sdlc: stage 4 /);
});
check('not a git repo, or a repo without an active cycle: silent, exit 0', () => {
  assert.deepStrictEqual([run(JSON.stringify({ cwd: tmpDir() })).stdout, run(JSON.stringify({ cwd: tmpDir() })).status], ['', 0]);
  const root = tmpDir(); write(root, 'a.js', 'x\n'); git(root, ['init', '-q']);
  assert.strictEqual(run(JSON.stringify({ cwd: root })).stdout, '');
});
check('cwd that does not exist, or stdin that is not JSON: silent, exit 0', () => {
  const a = run(JSON.stringify({ cwd: path.join(tmpDir(), 'missing') }));
  const b = run('not json');
  assert.deepStrictEqual([a.stdout, a.status, b.status], ['', 0, 0]);
});
check('a complaint while a stage is in flight adds the new-topic note', () => {
  const r = run(JSON.stringify({ cwd: stagedRepo(), prompt: 'un cliente se queja de que el botón no anda' }));
  assert.match(r.stdout, /new topic/);
});
check('REVIEW: stdin that is not JSON prints nothing even when the process cwd is a repo with an active cycle', () => {
  const r = run('not json', stagedRepo());
  assert.deepStrictEqual([r.stdout, r.status], ['', 0]);
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
