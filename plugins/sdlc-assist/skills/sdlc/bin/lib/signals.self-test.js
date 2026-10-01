#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { collectSignals, SOURCE_EXTENSIONS, EXCLUDED_DIRS } = require('./signals');
let passed = 0, failed = 0; const tmps = [];
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
function tmpDir() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-signals-')); tmps.push(d); return d; }
function write(root, rel, text) { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
process.on('exit', () => { for (const d of tmps) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5 }); } catch {} });

console.log('collectSignals (no git)');
check('empty dir: nothing found, not a repo, tests unknown', () => {
  const s = collectSignals(tmpDir(), { runTests: false });
  assert.deepStrictEqual(s.specs, []);
  assert.strictEqual(s.plan.exists, false);
  assert.deepStrictEqual(s.todo, { exists: false, path: 'tasks/todo.md', open: 0, done: 0, total: 0 });
  assert.strictEqual(s.git.isRepo, false); assert.strictEqual(s.git.branch, null);
  assert.strictEqual(s.sourceFiles.count, 0);
  assert.strictEqual(s.changelog.hasPublishedVersion, false);
  assert.strictEqual(s.releaseWorkflow.exists, false);
  assert.strictEqual(s.testRunner.kind, null);
  assert.strictEqual(s.tests.status, 'unknown');
  assert.strictEqual(s.inProduction, false);
});
check('specs: docs/specs/*.md, spec.md, SPEC-*.md with headers; untracked => firstCommit null, mtime set', () => {
  const root = tmpDir();
  write(root, 'docs/specs/a.md', '# A\nPhase: planning\nStatus: approved\n');
  write(root, 'spec.md', '# B\n');
  write(root, 'SPEC-auth.md', '# C\nStatus: closed\n');
  write(root, 'docs/specs/notes.txt', 'ignored');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.specs.map(x => x.path), ['SPEC-auth.md', 'docs/specs/a.md', 'spec.md']);
  assert.deepStrictEqual(s.specs[1].header, { phase: 'planning', status: 'approved' });
  assert.deepStrictEqual(s.specs[2].header, { phase: null, status: 'draft' });
  assert.strictEqual(s.specs[1].tracked, false);
  assert.strictEqual(s.specs[1].firstCommit, null);
  assert.strictEqual(typeof s.specs[1].mtime, 'number');
});
check('folder cycle: docs/specs/<dir>/spec.md is a spec with that path and its header', () => {
  const root = tmpDir();
  write(root, 'docs/specs/2026-10-02-v1-6-x/spec.md', '# X\nPhase: planning\nStatus: approved\n');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.specs.map(x => x.path), ['docs/specs/2026-10-02-v1-6-x/spec.md']);
  assert.deepStrictEqual(s.specs[0].header, { phase: 'planning', status: 'approved' });
});
check('folder without spec.md is ignored (plan.md or notes alone are not a cycle)', () => {
  const root = tmpDir();
  write(root, 'docs/specs/orphan/plan.md', '# P\n'); write(root, 'docs/specs/orphan/notes.md', 'n\n');
  write(root, 'docs/specs/empty/.keep', '');
  assert.deepStrictEqual(collectSignals(root, { runTests: false }).specs, []);
});
check('flat spec and folder spec coexist, sorted by path', () => {
  const root = tmpDir();
  write(root, 'docs/specs/2026-09-30-flat.md', '# F\nPhase: analysis\nStatus: draft\n');
  write(root, 'docs/specs/2026-10-02-folder/spec.md', '# G\nPhase: planning\nStatus: approved\n');
  write(root, 'docs/specs/2026-10-02-folder/tasks.md', '- [ ] a\n');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.specs.map(x => x.path), ['docs/specs/2026-09-30-flat.md', 'docs/specs/2026-10-02-folder/spec.md']);
});
check('plan and todo counts', () => {
  const root = tmpDir();
  write(root, 'tasks/plan.md', '# Plan\n'); write(root, 'tasks/todo.md', '- [ ] a\n- [x] b\n- [X] c\n');
  const s = collectSignals(root, { runTests: false });
  assert.strictEqual(s.plan.exists, true); assert.strictEqual(s.plan.tracked, false);
  assert.deepStrictEqual(s.todo, { exists: true, path: 'tasks/todo.md', open: 1, done: 2, total: 3 });
});
check('sourceFiles: code extensions counted, config and excluded dirs skipped', () => {
  const root = tmpDir();
  for (const f of ['src/index.js', 'lib/x.py', 'a/b/c/main.go', 'jest.config.js', '.eslintrc.js', 'node_modules/dep/index.js', 'dist/bundle.js', 'README.md', 'package-lock.json']) write(root, f, '');
  const s = collectSignals(root, { runTests: false });
  assert.strictEqual(s.sourceFiles.count, 3);
  assert.deepStrictEqual(s.sourceFiles.sample, ['a/b/c/main.go', 'lib/x.py', 'src/index.js']);
  assert(SOURCE_EXTENSIONS.includes('ts') && EXCLUDED_DIRS.includes('node_modules'));
});
check('changelog: published version heading forms', () => {
  for (const [text, want] of [['# Changelog\n\n## [Unreleased]\n', false], ['## [Sin publicar]\n', false], ['## 0.1.0\n', true], ['## [1.2.0] - 2026-01-01\n', true], ['## v2.0.0\n', true], ['### 1.0.0\n', false]]) {
    const root = tmpDir(); write(root, 'CHANGELOG.md', text);
    assert.strictEqual(collectSignals(root, { runTests: false }).changelog.hasPublishedVersion, want, JSON.stringify(text));
  }
});
check('releaseWorkflow: name or content containing release, yml or yaml', () => {
  const root = tmpDir();
  write(root, '.github/workflows/ci.yml', 'name: CI\n'); write(root, '.github/workflows/publish.yaml', 'jobs:\n  release:\n');
  assert.deepStrictEqual(collectSignals(root, { runTests: false }).releaseWorkflow, { exists: true, files: ['.github/workflows/publish.yaml'] });
});
check('testRunner detection and precedence', () => {
  let root = tmpDir(); write(root, 'package.json', JSON.stringify({ scripts: { test: 'node t.js' } }));
  assert.deepStrictEqual(collectSignals(root, {}).testRunner, { kind: 'npm', command: 'npm test' });
  root = tmpDir(); write(root, 'package.json', JSON.stringify({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }));
  assert.strictEqual(collectSignals(root, {}).testRunner.kind, null);
  root = tmpDir(); write(root, 'pyproject.toml', ''); assert.deepStrictEqual(collectSignals(root, {}).testRunner, { kind: 'pytest', command: 'pytest' });
  root = tmpDir(); write(root, 'Cargo.toml', ''); assert.deepStrictEqual(collectSignals(root, {}).testRunner, { kind: 'cargo', command: 'cargo test' });
  root = tmpDir(); write(root, 'go.mod', ''); assert.deepStrictEqual(collectSignals(root, {}).testRunner, { kind: 'go', command: 'go test ./...' });
});
check('runTests with no runner => no-runner', () => { assert.strictEqual(collectSignals(tmpDir(), { runTests: true }).tests.status, 'no-runner'); });
const { execFileSync } = require('child_process');
function run(args, cwd, env) { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, ...env } }); }
function initRepo() {
  const d = tmpDir();
  run(['init', '--quiet', '--initial-branch=main'], d);
  run(['config', 'core.hooksPath', path.join(d, '.no-hooks')], d);
  run(['config', 'commit.gpgsign', 'false'], d); run(['config', 'core.autocrlf', 'false'], d);
  run(['config', 'user.name', 't'], d); run(['config', 'user.email', 't@t'], d);
  return d;
}
function commit(d, msg, iso) { run(['add', '-A'], d); run(['commit', '--quiet', '-m', msg], d, { GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso }); }
const T1 = '2020-01-01T00:00:00Z', T2 = '2020-02-01T00:00:00Z', T3 = '2020-03-01T00:00:00Z';
const S1 = 1577836800, S2 = 1580515200, S3 = 1583020800;

console.log('collectSignals (git)');
check('repo with commits, tag, dates, dirty, commits with paths', () => {
  const root = initRepo();
  write(root, 'src/a.js', ''); write(root, 'docs/specs/s.md', '# S\nStatus: approved\n'); commit(root, 'one', T1);
  write(root, 'tasks/plan.md', '# P\n'); write(root, 'docs/specs/s.md', '# S\nPhase: planning\nStatus: approved\n'); commit(root, 'two', T2);
  run(['tag', 'v1.2.0'], root);
  write(root, 'src/b.js', ''); commit(root, 'three', T3);
  write(root, 'tasks/plan.md', '# P edited\n');   // dirty
  write(root, 'tasks/todo.md', '- [ ] x\n');      // untracked
  const s = collectSignals(root, { runTests: false });
  assert.strictEqual(s.git.isRepo, true); assert.strictEqual(s.git.branch, 'main');
  assert.deepStrictEqual(s.git.commits.map(c => c.subject), ['three', 'two', 'one']);
  assert.deepStrictEqual(s.git.commits[1].paths, ['docs/specs/s.md', 'tasks/plan.md']);
  assert.strictEqual(s.git.commits[0].date, S3);
  assert.strictEqual(s.git.lastSemverTag.name, 'v1.2.0'); assert.strictEqual(s.git.tagOnHead, false); assert.strictEqual(s.git.commitsAfterTag, 1);
  const spec = s.specs[0];
  assert.deepStrictEqual([spec.tracked, spec.firstCommit, spec.lastCommit, spec.dirty], [true, S1, S2, false]);
  assert.deepStrictEqual([s.plan.tracked, s.plan.lastCommit, s.plan.dirty], [true, S2, true]);
  assert.strictEqual(s.todo.exists, true);
});
check('tag on HEAD and highest semver wins regardless of creation order', () => {
  const root = initRepo(); write(root, 'a.js', ''); commit(root, 'one', T1);
  run(['tag', 'v2.0.0'], root); run(['tag', 'v1.9.9'], root); run(['tag', 'not-a-version'], root);
  const s = collectSignals(root, {});
  assert.strictEqual(s.git.lastSemverTag.name, 'v2.0.0'); assert.strictEqual(s.git.tagOnHead, true); assert.strictEqual(s.git.commitsAfterTag, 0);
});
check('repo with no commits: isRepo true, branch null, no crash', () => {
  const s = collectSignals(initRepo(), {});
  assert.strictEqual(s.git.isRepo, true); assert.strictEqual(s.git.branch, null); assert.deepStrictEqual(s.git.commits, []);
});
check('a plain dir inside tmp is not a repo even if a parent is (fixture isolation)', () => {
  const s = collectSignals(tmpDir(), {});
  assert.strictEqual(s.git.isRepo, false);
});
check('inProduction: tag + changelog, tag + workflow, tag alone is false', () => {
  const r1 = initRepo(); write(r1, 'a.js', ''); write(r1, 'CHANGELOG.md', '## 1.0.0\n'); commit(r1, 'c', T1); run(['tag', 'v1.0.0'], r1);
  assert.strictEqual(collectSignals(r1, {}).inProduction, true);
  const r2 = initRepo(); write(r2, 'a.js', ''); write(r2, '.github/workflows/release.yml', 'x'); commit(r2, 'c', T1); run(['tag', 'v1.0.0'], r2);
  assert.strictEqual(collectSignals(r2, {}).inProduction, true);
  const r3 = initRepo(); write(r3, 'a.js', ''); commit(r3, 'c', T1); run(['tag', 'v1.0.0'], r3);
  assert.strictEqual(collectSignals(r3, {}).inProduction, false);
});
check('subdirectory of a repo: isRepo false, toplevel set, notes tell to pass --root', () => {
  const root = initRepo(); write(root, 'pkg/a.js', ''); commit(root, 'one', T1);
  const s = collectSignals(path.join(root, 'pkg'), {});
  const top = fs.realpathSync.native(root).split(path.sep).join('/');
  assert.strictEqual(s.git.isRepo, false); assert.strictEqual(s.git.toplevel, top);
  assert.strictEqual(s.notes.length, 1); assert(s.notes[0].includes('--root ' + top), s.notes[0]);
  const atRoot = collectSignals(root, {});
  assert.strictEqual(atRoot.git.isRepo, true); assert.strictEqual(atRoot.git.toplevel, top); assert.deepStrictEqual(atRoot.notes, []);
});
check('capability map: 3 headerless SPEC-*.md are modules, the headed one is the only cycle and active', () => {
  const root = tmpDir();
  write(root, 'SPEC-app.md', '# App\n\nPhase: planning\nStatus: approved\n');
  for (const m of ['auth', 'billing', 'ui']) write(root, `SPEC-${m}.md`, `# ${m}\n\nModule text.\n`);
  const s = collectSignals(root, {});
  assert.deepStrictEqual(s.specs.map(x => x.path), ['SPEC-app.md']);
  assert.deepStrictEqual(s.modules, ['SPEC-auth.md', 'SPEC-billing.md', 'SPEC-ui.md']);
  const { infer } = require('./infer');
  const r = infer(s, { message: '', type: 'unknown' });
  assert.strictEqual(r.active.path, 'SPEC-app.md'); assert.deepStrictEqual(r.cycles.map(c => c.path), ['SPEC-app.md']);
});
check('capability map: a headerless docs/specs/<dir>/spec.md is a draft cycle, never a module, even beside 2+ root modules', () => {
  const root = tmpDir();
  for (const m of ['auth', 'billing']) write(root, `SPEC-${m}.md`, `# ${m}\n\nModule text.\n`);
  write(root, 'docs/specs/2026-10-02-draft/spec.md', '# Draft\n\nNo header yet.\n');
  const s = collectSignals(root, {});
  assert.deepStrictEqual(s.modules, ['SPEC-auth.md', 'SPEC-billing.md']);
  assert.deepStrictEqual(s.specs.map(x => [x.path, x.layout, x.header.status]), [['docs/specs/2026-10-02-draft/spec.md', 'folder', 'draft']]);
  const { infer } = require('./infer');
  assert.strictEqual(infer(s, { message: '', type: 'unknown' }).active.path, 'docs/specs/2026-10-02-draft/spec.md');
});
check('inversion: a single headerless SPEC-*.md is still a cycle; docs/specs never become modules', () => {
  const root = tmpDir(); write(root, 'SPEC-only.md', '# Only\n'); write(root, 'docs/specs/x.md', '# X\n');
  const s = collectSignals(root, {});
  assert.deepStrictEqual(s.modules, []); assert.deepStrictEqual(s.specs.map(x => x.path), ['SPEC-only.md', 'docs/specs/x.md']);
});
check('batched dates: two specs + plan, one edited later, one dirty; rename-free porcelain parsing', () => {
  const root = initRepo();
  write(root, 'docs/specs/a.md', '# A\n'); write(root, 'docs/specs/b c.md', '# B\n'); write(root, 'tasks/plan.md', '# P\n'); commit(root, 'one', T1);
  write(root, 'docs/specs/a.md', '# A2\n'); commit(root, 'two', T2);
  write(root, 'docs/specs/b c.md', '# B dirty\n');
  const s = collectSignals(root, {});
  const a = s.specs.find(x => x.path === 'docs/specs/a.md'), b = s.specs.find(x => x.path === 'docs/specs/b c.md');
  assert.deepStrictEqual([a.firstCommit, a.lastCommit, a.dirty], [S1, S2, false]);
  assert.deepStrictEqual([b.tracked, b.firstCommit, b.lastCommit, b.dirty], [true, S1, S1, true]);
  assert.deepStrictEqual([s.plan.lastCommit, s.plan.dirty], [S1, false]);
});
check('non-ASCII spec path is tracked and listed unquoted', () => {
  const root = initRepo(); write(root, 'docs/specs/diseño.md', '# D\n'); commit(root, 'one', T1);
  const s = collectSignals(root, {});
  assert.strictEqual(s.specs[0].path, 'docs/specs/diseño.md'); assert.strictEqual(s.specs[0].tracked, true);
  assert.ok(s.git.commits[0].paths.includes('docs/specs/diseño.md'));
});
console.log('per-cycle plan and todo');
const { infer } = require('./infer');
check('folder cycle: plan.md and tasks.md beside spec.md; 2 open tasks => development', () => {
  const root = tmpDir(); const dir = 'docs/specs/2026-10-02-v1-6-x';
  write(root, dir + '/spec.md', '# X\nStatus: approved\n'); write(root, dir + '/plan.md', '# P\n'); write(root, dir + '/tasks.md', '- [ ] a\n- [ ] b\n- [x] c\n');
  write(root, 'tasks/todo.md', '- [x] legacy\n');   // global pair must not leak into a folder cycle
  const s = collectSignals(root, { runTests: false });
  assert.strictEqual(s.specs[0].layout, 'folder');
  assert.deepStrictEqual([s.specs[0].plan.exists, s.specs[0].plan.path], [true, dir + '/plan.md']);
  assert.deepStrictEqual(s.specs[0].todo, { exists: true, path: dir + '/tasks.md', open: 2, done: 1, total: 3 });
  assert.strictEqual(s.plan.path, dir + '/plan.md'); assert.strictEqual(s.todo.path, dir + '/tasks.md');
  assert.strictEqual(infer(s, { message: '', type: 'unknown' }).inferred, 'development');
});
check('folder cycle with all tasks done => testing', () => {
  const root = tmpDir(); const dir = 'docs/specs/2026-10-02-v1-6-x';
  write(root, dir + '/spec.md', '# X\nStatus: approved\n'); write(root, dir + '/plan.md', '# P\n'); write(root, dir + '/tasks.md', '- [x] a\n- [x] b\n');
  const s = collectSignals(root, { runTests: false });
  assert.strictEqual(infer(s, { message: '', type: 'unknown' }).inferred, 'testing');
});
check('folder cycle without plan.md: no plan, no fallback to tasks/plan.md', () => {
  const root = tmpDir(); const dir = 'docs/specs/2026-10-02-v1-6-x';
  write(root, dir + '/spec.md', '# X\nStatus: approved\n'); write(root, 'tasks/plan.md', '# global\n'); write(root, 'tasks/todo.md', '- [ ] g\n');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.plan, { exists: false, path: dir + '/plan.md' });
  assert.deepStrictEqual(s.todo, { exists: false, path: dir + '/tasks.md', open: 0, done: 0, total: 0 });
  assert.strictEqual(infer(s, { message: '', type: 'unknown' }).inferred, 'planning');
});
check('flat spec keeps the global pair; closed folder cycle does not steal it', () => {
  const root = tmpDir();
  write(root, 'docs/specs/2026-09-30-flat.md', '# F\nStatus: approved\n'); write(root, 'tasks/plan.md', '# P\n'); write(root, 'tasks/todo.md', '- [ ] a\n');
  write(root, 'docs/specs/2026-08-01-old/spec.md', '# Old\nPhase: deployment\nStatus: closed\n'); write(root, 'docs/specs/2026-08-01-old/tasks.md', '- [x] z\n');
  const s = collectSignals(root, { runTests: false });
  const flat = s.specs.find(x => x.layout === 'flat');
  assert.deepStrictEqual([flat.plan.path, flat.todo.path], ['tasks/plan.md', 'tasks/todo.md']);
  assert.deepStrictEqual([s.plan.path, s.todo.path, s.todo.open], ['tasks/plan.md', 'tasks/todo.md', 1]);
  const r = infer(s, { message: '', type: 'unknown' });
  assert.strictEqual(r.active.path, 'docs/specs/2026-09-30-flat.md'); assert.strictEqual(r.inferred, 'development');
});
check('two folder cycles, both planned: the newest open one is active, no warning, no stale plan', () => {
  const root = initRepo();
  for (const [d, iso] of [['docs/specs/2026-01-01-a', T1], ['docs/specs/2026-02-01-b', T2]]) {
    write(root, d + '/spec.md', '# C\nPhase: development\nStatus: approved\n'); write(root, d + '/plan.md', '# P\n'); write(root, d + '/tasks.md', '- [ ] t\n');
    commit(root, d, iso);
  }
  const s = collectSignals(root, { runTests: false });
  const r = infer(s, { message: '', type: 'unknown' });
  assert.strictEqual(r.active.path, 'docs/specs/2026-02-01-b/spec.md');
  assert.strictEqual(s.plan.path, 'docs/specs/2026-02-01-b/plan.md'); assert.strictEqual(s.plan.tracked, true);
  assert.deepStrictEqual(r.warnings, []); assert.strictEqual(r.inferred, 'development');
  assert.ok(!r.evidence.some(e => /stale|no active spec/.test(e)), r.evidence.join(' | '));
});
check('no cycle at all: global pair is reported', () => {
  const root = tmpDir(); write(root, 'tasks/plan.md', '# P\n');
  const s = collectSignals(root, { runTests: false });
  assert.strictEqual(s.plan.path, 'tasks/plan.md'); assert.strictEqual(s.plan.exists, true); assert.strictEqual(s.todo.path, 'tasks/todo.md');
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
