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
// git section appended in Task 8
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
