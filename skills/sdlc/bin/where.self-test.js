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
check('--message-file (BOM, apostrophe, non-ASCII) and --message - (stdin) => bug', () => {
  const msg = "the login doesn't work — se rompió";
  const file = path.join(tmpDir(), 'request.txt');
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(msg, 'utf8')]));
  const r = spawnSync(process.execPath, [WHERE, '--root', tmpDir(), '--message-file', file], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.deepStrictEqual(JSON.parse(r.stdout).request, { message: msg, type: 'bug' });
  const s = spawnSync(process.execPath, [WHERE, '--root', tmpDir(), '--message', '-'], { encoding: 'utf8', input: msg });
  assert.strictEqual(s.status, 0, s.stderr); assert.strictEqual(JSON.parse(s.stdout).request.message, msg);
});
check('run from a repo subdirectory: warning tells to pass --root <toplevel>', () => {
  const root = initRepo(tmpDir()); write(root, 'pkg/a.js', 'x\n'); commit(root, 'one', T1);
  const r = runWhere(path.join(root, 'pkg'), 'continue');
  assert.strictEqual(r.signals.git.isRepo, false);
  assert(r.warnings.some(w => w.startsWith('not the repo root; run with --root ')), r.warnings.join('|'));
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
function sourceRepo() {   // git repo with two source files, one commit at T1
  const root = initRepo(tmpDir());
  write(root, 'src/index.js', 'module.exports = 1;\n'); write(root, 'src/util.js', 'module.exports = 2;\n');
  write(root, 'package.json', '{"name":"fx","version":"1.2.0"}\n');
  commit(root, 'init', T1); return root;
}
console.log('fixture 2: source, tag v1.2.0, versioned CHANGELOG, no spec');
function fixture2() { const root = sourceRepo(); write(root, 'CHANGELOG.md', '# Changelog\n\n## [1.2.0] - 2020-01-01\n- first\n'); commit(root, 'changelog', T2); git(root, ['tag', 'v1.2.0']); return root; }
check('complaint => analysis, complaint, inProduction true', () => {
  const r = runWhere(fixture2(), 'customer complains about X');
  assert.strictEqual(r.inferred, 'analysis'); assert.strictEqual(r.request.type, 'complaint');
  assert.strictEqual(r.signals.inProduction, true); assert.strictEqual(r.signals.git.lastSemverTag.name, 'v1.2.0');
  assert.strictEqual(r.signals.git.tagOnHead, true); assert.strictEqual(r.active, null);
});
check('inversion: approved spec + plan written after it => planning, not analysis', () => {
  const root = fixture2();
  write(root, 'docs/specs/2020-03-01-x.md', '# X\n\nPhase: planning\nStatus: approved\n');
  write(root, 'tasks/plan.md', '# Plan\n');
  const r = runWhere(root, 'customer complains about X');
  assert.strictEqual(r.inferred, 'planning'); assert.strictEqual(r.signals.specs[0].tracked, false);
});
console.log('fixture 6: source files, no SDD artifacts, no tags');
check('add feature => analysis, feature, not in production', () => {
  const r = runWhere(sourceRepo(), 'add feature X');
  assert.strictEqual(r.inferred, 'analysis'); assert.strictEqual(r.request.type, 'feature'); assert.strictEqual(r.signals.inProduction, false);
});
check('inversion: remove source files => initial', () => {
  const root = sourceRepo(); fs.rmSync(path.join(root, 'src'), { recursive: true, force: true });
  assert.strictEqual(runWhere(root, 'add feature X').inferred, 'initial');
});
console.log('fixture 7: source, CHANGELOG ## 0.1.0, no tags');
function fixture7() { const root = sourceRepo(); write(root, 'CHANGELOG.md', '## 0.1.0\n- x\n'); commit(root, 'changelog', T2); return root; }
check('idea => analysis, inProduction false', () => {
  const r = runWhere(fixture7(), 'I have an idea');
  assert.strictEqual(r.inferred, 'analysis'); assert.strictEqual(r.signals.inProduction, false); assert.strictEqual(r.signals.changelog.hasPublishedVersion, true);
});
check('inversion: tag v0.1.0 => inProduction true', () => {
  const root = fixture7(); git(root, ['tag', 'v0.1.0']);
  assert.strictEqual(runWhere(root, 'I have an idea').signals.inProduction, true);
});
const TODO_3_OF_7 = '# Todo\n\n- [x] a\n- [x] b\n- [x] c\n- [ ] d\n- [-] e\n- [~] f\n  - [ ] g\n';   // 4 open, 3 done
const TODO_ALL_DONE = '# Todo\n\n- [x] a\n- [x] b\n- [x] c\n- [x] d\n- [x] e\n- [x] f\n  - [X] g\n';
function specText({ phase = 'development', status = 'approved', noPhase = false } = {}) {
  return '# Login rework\n\n' + (noPhase ? '' : 'Phase: ' + phase + '\n') + 'Status: ' + status + '\nDate: 2020-02-01\n';
}
function fixture3(opts = {}) {   // spec at T2, plan+todo at T3 (plan current)
  const root = sourceRepo();
  write(root, 'docs/specs/2020-02-01-login.md', specText(opts)); commit(root, 'spec', T2);
  write(root, 'tasks/plan.md', '# Plan\n\n1. do a\n2. do b\n'); write(root, 'tasks/todo.md', opts.todo || TODO_3_OF_7); commit(root, 'plan', T3);
  return root;
}
console.log('fixture 3: header development/approved, current plan, todo 3/7');
check('continue => development, header agrees, no warning', () => {
  const r = runWhere(fixture3(), 'continue');
  assert.strictEqual(r.inferred, 'development'); assert.deepStrictEqual(r.warnings, []);
  assert.strictEqual(r.active.path, 'docs/specs/2020-02-01-login.md');
  assert.deepStrictEqual([r.signals.todo.open, r.signals.todo.done], [4, 3]);
  assert(r.evidence.some(e => /fallback: development/.test(e)));
});
check('inversion: close all tasks (uncommitted) => development, alt testing, warning', () => {
  const root = fixture3(); write(root, 'tasks/todo.md', TODO_ALL_DONE);
  const r = runWhere(root, 'continue');
  assert.strictEqual(r.inferred, 'development'); assert(hasAlt(r, 'testing', 'fallback')); assert.strictEqual(r.warnings.length, 1);
});
console.log('fixture 4: fixture 3 without Phase: line (Status: approved kept)');
check('continue => development via fallback', () => {
  const r = runWhere(fixture3({ noPhase: true }), 'continue');
  assert.strictEqual(r.inferred, 'development'); assert.strictEqual(r.active.phase, null); assert.deepStrictEqual(r.warnings, []);
});
check('inversion: close all tasks => testing', () => {
  assert.strictEqual(runWhere(fixture3({ noPhase: true, todo: TODO_ALL_DONE }), 'continue').inferred, 'testing');
});
console.log('fixture 5: fixture 3 + Spanish bug report');
check('bug with active cycle => development, alt new-cycle analysis', () => {
  const r = runWhere(fixture3(), 'el login se rompe cuando X');
  assert.strictEqual(r.inferred, 'development'); assert.strictEqual(r.request.type, 'bug'); assert(hasAlt(r, 'analysis', 'new-cycle'));
});
check('inversion: "continue" => no new-cycle alternative', () => { assert(!hasAlt(runWhere(fixture3(), 'continue'), 'analysis', 'new-cycle')); });
console.log('fixture 8: fixture 3 with stale header Phase: analysis');
check('continue => analysis (header), alt development, warning', () => {
  const r = runWhere(fixture3({ phase: 'analysis' }), 'continue');
  assert.strictEqual(r.inferred, 'analysis'); assert(hasAlt(r, 'development', 'fallback')); assert.strictEqual(r.warnings.length, 1);
});
check('inversion: fix header in place (dirty spec) => development, no warning', () => {
  const root = fixture3({ phase: 'analysis' });
  write(root, 'docs/specs/2020-02-01-login.md', specText({ phase: 'development' }));
  const r = runWhere(root, 'continue');
  assert.strictEqual(r.inferred, 'development'); assert.deepStrictEqual(r.warnings, []); assert.strictEqual(r.signals.specs[0].dirty, true);
});
console.log('fixture 9: approved spec, current plan, todo without checkbox lines');
function fixture9() {
  const root = sourceRepo();
  write(root, 'docs/specs/2020-02-01-x.md', '# X\n\nStatus: approved\n'); write(root, 'tasks/plan.md', '# Plan\n');
  write(root, 'tasks/todo.md', '# Todo\n\nNothing broken down yet.\n- plain note\n'); commit(root, 'spec+plan', T2); return root;
}
check('continue => planning, evidence "todo has no tasks"', () => {
  const r = runWhere(fixture9(), 'continue');
  assert.strictEqual(r.inferred, 'planning'); assert(r.evidence.some(e => e.includes('todo has no tasks')), r.evidence.join('|')); assert.strictEqual(r.signals.todo.total, 0);
});
check('inversion: add an open task (uncommitted) => development', () => {
  const root = fixture9(); fs.appendFileSync(path.join(root, 'tasks', 'todo.md'), '- [ ] first task\n');
  assert.strictEqual(runWhere(root, 'continue').inferred, 'development');
});
console.log('fixture 10: closed spec with old plan and todo 7/7, new draft spec');
function fixture10() {
  const root = sourceRepo();
  write(root, 'docs/specs/2020-02-01-old.md', '# Old\n\nPhase: deployment\nStatus: closed\n');
  write(root, 'tasks/plan.md', '# Old plan\n'); write(root, 'tasks/todo.md', TODO_ALL_DONE); commit(root, 'old cycle', T2);
  write(root, 'docs/specs/2020-03-01-new.md', '# New\n\nPhase: analysis\nStatus: draft\n'); commit(root, 'new spec', T3); return root;
}
check('continue => analysis, evidence "plan belongs to a closed cycle", no testing alternative, no warning', () => {
  const r = runWhere(fixture10(), 'continue');
  assert.strictEqual(r.inferred, 'analysis'); assert.strictEqual(r.active.path, 'docs/specs/2020-03-01-new.md');
  assert(r.evidence.some(e => e.includes('plan belongs to a closed cycle')), r.evidence.join('|'));
  assert(!hasAlt(r, 'testing', 'fallback') && !hasAlt(r, 'testing', 'candidate')); assert.deepStrictEqual(r.warnings, []);
});
check('inversion: approve new spec, rewrite plan/todo, commit after the spec => planning', () => {
  const root = fixture10();
  write(root, 'docs/specs/2020-03-01-new.md', '# New\n\nPhase: planning\nStatus: approved\n');
  write(root, 'tasks/plan.md', '# New plan\n'); write(root, 'tasks/todo.md', '# Todo\n'); commit(root, 'plan for new cycle', T4);
  const r = runWhere(root, 'continue');
  assert.strictEqual(r.inferred, 'planning'); assert(!r.evidence.some(e => e.includes('plan belongs to a closed cycle')));
});
console.log('--run-tests');
const hasNpm = spawnSync('npm', ['--version'], { shell: true, encoding: 'utf8' }).status === 0;
if (!hasNpm) console.log('  skip npm not on PATH');
else {
  check('npm runner detected and executed; status passed', () => {
    const root = sourceRepo();
    write(root, 'package.json', '{"name":"fx","scripts":{"test":"node -e \\"process.exit(0)\\""}}\n');
    const r = runWhere(root, 'continue', ['--run-tests']);
    assert.strictEqual(r.signals.testRunner.kind, 'npm'); assert.strictEqual(r.signals.tests.status, 'passed');
    assert(!r.evidence.some(e => e.includes('tests not run')));
  });
  check('failing script => failed with exit code', () => {
    const root = sourceRepo();
    write(root, 'package.json', '{"name":"fx","scripts":{"test":"node -e \\"process.exit(3)\\""}}\n');
    const r = runWhere(root, 'continue', ['--run-tests']);
    assert.strictEqual(r.signals.tests.status, 'failed'); assert.strictEqual(r.signals.tests.exitCode, 3);
  });
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
