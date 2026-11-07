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
check('constitution absent => exists false, path null, no sections', () => {
  assert.deepStrictEqual(collectSignals(tmpDir(), {}).constitution, { exists: false, path: null, sections: [] });
});
check('constitution: docs/constitution.md found; sections are the ## headings outside fences', () => {
  const root = tmpDir();
  write(root, 'docs/constitution.md', '# Constitution\n\n## Principles\n\n- a\n\n```markdown\n## Not a section\n```\n\n## Never\n\n## Amendments\n');
  assert.deepStrictEqual(collectSignals(root, {}).constitution, { exists: true, path: 'docs/constitution.md', sections: ['Principles', 'Never', 'Amendments'] });
});
check('constitution: root CONSTITUTION.md is the fallback; docs/ wins when both exist', () => {
  const root = tmpDir(); write(root, 'CONSTITUTION.md', '# C\n\n## Rules\n');
  assert.deepStrictEqual(collectSignals(root, {}).constitution, { exists: true, path: 'CONSTITUTION.md', sections: ['Rules'] });
  write(root, 'docs/constitution.md', '# C\n\n## Principles\n');
  assert.strictEqual(collectSignals(root, {}).constitution.path, 'docs/constitution.md');
});
check('architecture absent => exists false, path null, no sections', () => {
  assert.deepStrictEqual(collectSignals(tmpDir(), {}).architecture, { exists: false, path: null, sections: [] });
});
check('architecture: root ARCHITECTURE.md found; sections are the ## headings outside fences', () => {
  const root = tmpDir();
  write(root, 'ARCHITECTURE.md', '# Architecture\n\n## Overview\n\n```\n## Not a section\n```\n\n## Structure\n\n## Decisions\n');
  assert.deepStrictEqual(collectSignals(root, {}).architecture, { exists: true, path: 'ARCHITECTURE.md', sections: ['Overview', 'Structure', 'Decisions'] });
});
check('architecture: docs/architecture.md is the fallback; root wins when both exist', () => {
  const root = tmpDir(); write(root, 'docs/architecture.md', '# A\n\n## Structure\n');
  assert.deepStrictEqual(collectSignals(root, {}).architecture, { exists: true, path: 'docs/architecture.md', sections: ['Structure'] });
  write(root, 'ARCHITECTURE.md', '# A\n\n## Overview\n');
  assert.strictEqual(collectSignals(root, {}).architecture.path, 'ARCHITECTURE.md');
});
check('findDoc is shared: constitution and architecture resolve independently in one repo', () => {
  const root = tmpDir(); write(root, 'docs/constitution.md', '# C\n\n## Principles\n'); write(root, 'ARCHITECTURE.md', '# A\n\n## Overview\n');
  const s = collectSignals(root, {});
  assert.strictEqual(s.constitution.path, 'docs/constitution.md'); assert.strictEqual(s.architecture.path, 'ARCHITECTURE.md');
  const { findDoc } = require('./signals');
  assert.deepStrictEqual(findDoc(root, ['nope.md', 'ARCHITECTURE.md']), { exists: true, path: 'ARCHITECTURE.md', sections: ['Overview'] });
});
const HYGIENE = ['LICENSE', 'README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', '.gitignore', '.gitattributes', '.editorconfig', 'ARCHITECTURE.md'];
check('hygiene: empty dir => nine missing, none present, no license', () => {
  assert.deepStrictEqual(collectSignals(tmpDir(), {}).hygiene, { present: [], missing: HYGIENE, license: false });
});
check('hygiene: full dir => none missing, license true; order follows the closed list', () => {
  const root = tmpDir();
  for (const f of HYGIENE) write(root, f, 'x\n');
  assert.deepStrictEqual(collectSignals(root, {}).hygiene, { present: HYGIENE, missing: [], license: true });
});
check('hygiene: LICENSE.md and LICENSE.txt count as the license; docs/architecture.md counts as ARCHITECTURE.md', () => {
  const root = tmpDir(); write(root, 'LICENSE.md', 'MIT\n'); write(root, 'docs/architecture.md', '# A\n\n## Overview\n');
  const h = collectSignals(root, {}).hygiene;
  assert.strictEqual(h.license, true); assert.ok(h.present.includes('LICENSE')); assert.ok(h.present.includes('ARCHITECTURE.md'));
  assert.ok(!h.missing.includes('LICENSE') && !h.missing.includes('ARCHITECTURE.md'));
  const root2 = tmpDir(); write(root2, 'LICENSE.txt', 'MIT\n');
  assert.strictEqual(collectSignals(root2, {}).hygiene.license, true);
});
check('hygiene: a directory named like a file does not count; LICENSES/ is not a license', () => {
  const root = tmpDir(); fs.mkdirSync(path.join(root, 'README.md')); fs.mkdirSync(path.join(root, 'LICENSES'));
  const h = collectSignals(root, {}).hygiene;
  assert.ok(h.missing.includes('README.md')); assert.strictEqual(h.license, false);
});
check('adr absent => exists false, dir null, count 0, no statuses, no latest', () => {
  assert.deepStrictEqual(collectSignals(tmpDir(), {}).adr, { exists: false, dir: null, count: 0, byStatus: {}, latest: null });
});
check('adr: docs/adr/NNNN-slug.md files counted by Status; latest is the highest number', () => {
  const root = tmpDir();
  write(root, 'docs/adr/0001-x.md', '# 1. X\n\nStatus: accepted\n\n## Context\n');
  write(root, 'docs/adr/0002-y.md', '# 2. Y\n\nStatus: proposed\n');
  assert.deepStrictEqual(collectSignals(root, {}).adr, { exists: true, dir: 'docs/adr', count: 2, byStatus: { accepted: 1, proposed: 1 }, latest: { number: 2, path: 'docs/adr/0002-y.md', status: 'proposed' } });
});
check('adr: docs/decisions/ is the fallback; docs/adr/ wins when both exist', () => {
  const root = tmpDir();
  write(root, 'docs/decisions/0001-a.md', 'Status: accepted\n');
  assert.strictEqual(collectSignals(root, {}).adr.dir, 'docs/decisions');
  write(root, 'docs/adr/0001-b.md', 'Status: accepted\n');
  const a = collectSignals(root, {}).adr;
  assert.strictEqual(a.dir, 'docs/adr'); assert.strictEqual(a.count, 1); assert.strictEqual(a.latest.path, 'docs/adr/0001-b.md');
});
check('adr: a file not named NNNN-slug.md is ignored; an empty dir still exists', () => {
  const root = tmpDir();
  write(root, 'docs/adr/README.md', '# ADRs\n'); write(root, 'docs/adr/template.md', 'Status: accepted\n');
  assert.deepStrictEqual(collectSignals(root, {}).adr, { exists: true, dir: 'docs/adr', count: 0, byStatus: {}, latest: null });
});
check('adr: "Status: superseded by 0001" counts as superseded; a missing Status line counts as unknown', () => {
  const root = tmpDir();
  write(root, 'docs/adr/0001-old.md', 'Status: superseded by 0002\n');
  write(root, 'docs/adr/0002-new.md', 'Status:   Accepted  \n');
  write(root, 'docs/adr/0003-bare.md', '# No status\n');
  const a = collectSignals(root, {}).adr;
  assert.deepStrictEqual(a.byStatus, { superseded: 1, accepted: 1, unknown: 1 });
  assert.deepStrictEqual(a.latest, { number: 3, path: 'docs/adr/0003-bare.md', status: 'unknown' });
});
check('plan and todo counts', () => {
  const root = tmpDir();
  write(root, 'tasks/plan.md', '# Plan\n'); write(root, 'tasks/todo.md', '- [ ] a\n- [x] b\n- [X] c\n');
  const s = collectSignals(root, { runTests: false });
  assert.strictEqual(s.plan.exists, true); assert.strictEqual(s.plan.tracked, false);
  assert.deepStrictEqual(s.todo, { exists: true, path: 'tasks/todo.md', open: 1, done: 2, total: 3, next: 'a', withoutEvidence: 2 });
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
  assert.strictEqual(s.git.lastSemverTag.name, 'v1.2.0'); assert.ok(Number.isInteger(s.git.lastSemverTag.date) && s.git.lastSemverTag.date > 0, 'tag date'); assert.strictEqual(s.git.tagOnHead, false); assert.strictEqual(s.git.commitsAfterTag, 1);
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
  assert.deepStrictEqual(s.specs[0].todo, { exists: true, path: dir + '/tasks.md', open: 2, done: 1, total: 3, next: 'a', withoutEvidence: 1 });
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
console.log('stages signal');
check('folder cycle: stages from its plan.md, tasksStage from its tasks.md H1', () => {
  const root = tmpDir(); const d = 'docs/specs/2026-10-08-lms';
  write(root, d + '/spec.md', '# Spec\nPhase: development\nStatus: approved\n');
  write(root, d + '/plan.md', '# Plan\n\n## Etapas\n\n| # | Etapa |\n|---|---|\n| 3 | **Ingreso** [x] 2026-10-12 |\n| 4 | **Catálogo** |\n');
  write(root, d + '/tasks.md', '# Etapa 3 — Ingreso\n\n- [x] a\n');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.stages, { list: [{ number: 3, name: 'Ingreso', closed: true }, { number: 4, name: 'Catálogo', closed: false }], tasksStage: 3 });
});
check('no plan: empty stages, tasksStage null', () => {
  assert.deepStrictEqual(collectSignals(tmpDir(), { runTests: false }).stages, { list: [], tasksStage: null });
});

console.log('discovery: map folders, module-only folders, plan pair in any case (#21)');
check('MAPA.md + SPEC-*.md: one cycle whose path is the map; the SPEC files are modules; PLAN.md found', () => {
  const root = tmpDir(), d = 'docs/specs/03-fase1';
  write(root, d + '/MAPA.md', '# Mapa\nPhase: development\nStatus: approved\n'); write(root, d + '/SPEC-b.md', '# B\n'); write(root, d + '/SPEC-a.md', '# A\n');
  write(root, d + '/PLAN.md', '# P\n'); write(root, d + '/TASKS.md', '- [ ] a\n- [x] b\n');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.specs.map(x => x.path), [d + '/MAPA.md']);
  assert.deepStrictEqual([s.specs[0].layout, s.specs[0].header.phase, s.specs[0].header.status], ['folder', 'development', 'approved']);
  assert.deepStrictEqual(s.modules, [d + '/SPEC-a.md', d + '/SPEC-b.md']);
  assert.deepStrictEqual([s.specs[0].plan.exists, s.specs[0].plan.path], [true, d + '/PLAN.md']);
  assert.deepStrictEqual(s.specs[0].todo, { exists: true, path: d + '/TASKS.md', open: 1, done: 1, total: 2, next: 'a', withoutEvidence: 1 });
});
check('module-only folder: the alphabetically first SPEC-*.md is the cycle, the rest are modules', () => {
  const root = tmpDir(), d = 'docs/specs/02-cobro';
  write(root, d + '/SPEC-correos.md', '# C\n'); write(root, d + '/SPEC-archivar.md', '# A\nStatus: approved\n');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.specs.map(x => x.path), [d + '/SPEC-archivar.md']);
  assert.deepStrictEqual(s.modules, [d + '/SPEC-correos.md']);
});
check('spec.md wins over a map in the same folder; MAP.md and CAPABILITY-MAP.md are maps', () => {
  const root = tmpDir();
  write(root, 'docs/specs/a/spec.md', '# S\n'); write(root, 'docs/specs/a/MAP.md', '# M\n');
  write(root, 'docs/specs/b/capability-map.md', '# M\n');
  assert.deepStrictEqual(collectSignals(root, { runTests: false }).specs.map(x => x.path), ['docs/specs/a/spec.md', 'docs/specs/b/capability-map.md']);
});
check('uppercase SPEC.md, PLAN.md, TASKS.md carry their git dates', () => {
  const root = initRepo(), d = 'docs/specs/01-iac';
  write(root, d + '/SPEC.md', '# S\nStatus: approved\n'); write(root, d + '/PLAN.md', '# P\n'); write(root, d + '/TASKS.md', '- [x] a\n'); commit(root, 'one', T1);
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.specs.map(x => x.path), [d + '/SPEC.md']);
  assert.deepStrictEqual([s.specs[0].plan.path, s.specs[0].plan.tracked, s.specs[0].plan.lastCommit], [d + '/PLAN.md', true, S1]);
});
check('findSpecs (check-acceptance) sees the map folder by its map', () => {
  const root = tmpDir(); write(root, 'docs/specs/x/MAPA.md', '# M\n'); write(root, 'docs/specs/x/SPEC-a.md', '# A\n');
  assert.deepStrictEqual(require('./signals').findSpecs(root), ['docs/specs/x/MAPA.md']);
});

console.log('last activity');
check('folder cycle: last activity is its newest file; the one with the newer PLAN.md is active', () => {
  const root = initRepo();
  write(root, 'docs/specs/01-a/MAPA.md', '# A\nStatus: approved\n'); commit(root, 'a', T1);
  write(root, 'docs/specs/02-b/spec.md', '# B\nStatus: approved\n'); commit(root, 'b', T2);
  write(root, 'docs/specs/01-a/PLAN.md', '# P\n'); commit(root, 'plan a', T3);
  const s = collectSignals(root, { runTests: false });
  const byPath = Object.fromEntries(s.specs.map(x => [x.path, x.lastActivity]));
  assert.deepStrictEqual(byPath, { 'docs/specs/01-a/MAPA.md': S3, 'docs/specs/02-b/spec.md': S2 });
  assert.strictEqual(s.plan.path, 'docs/specs/01-a/PLAN.md');
});
check('flat spec: last activity is the spec alone, not tasks/plan.md', () => {
  const root = initRepo();
  write(root, 'docs/specs/s.md', '# S\nStatus: approved\n'); commit(root, 'one', T1);
  write(root, 'tasks/plan.md', '# P\n'); commit(root, 'two', T2);
  assert.strictEqual(collectSignals(root, { runTests: false }).specs[0].lastActivity, S1);
});

console.log('orphan specs');
check('spec-like files under docs/ outside docs/specs/ are orphans, never cycles', () => {
  const root = tmpDir();
  for (const f of ['docs/spec-x.md', 'docs/notes/specs-old.md', 'docs/a/b/my_spec.md', 'docs/specs/a.md', 'docs/inspection.md', 'docs/respect.md', 'docs/spectrum.md', 'docs/a/b/c/spec-deep.md', 'docs/spec-x.txt', 'node_modules/docs/spec.md'])
    write(root, f, '# X\n');
  write(root, 'docs/spec-h.md', '# H\nPhase: analysis\n');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.specs.map(x => x.path), ['docs/specs/a.md']);
  assert.deepStrictEqual(s.orphanSpecs.list.map(o => o.path).sort(), ['docs/a/b/my_spec.md', 'docs/notes/specs-old.md', 'docs/spec-h.md', 'docs/spec-x.md']);
  assert.strictEqual(s.orphanSpecs.total, 4);
  assert.deepStrictEqual(s.orphanSpecs.list.filter(o => o.hasHeader).map(o => o.path), ['docs/spec-h.md']);
  assert.ok(s.orphanSpecs.list.every(o => typeof o.lastActivity === 'number'));
});
check('orphans: newest first by git date, capped at 20 with the full total', () => {
  const root = initRepo();
  write(root, 'docs/spec-old.md', '# O\n'); commit(root, 'one', T1);
  write(root, 'docs/spec-new.md', '# N\n'); commit(root, 'two', T2);
  assert.deepStrictEqual(collectSignals(root, { runTests: false }).orphanSpecs.list.map(o => [o.path, o.lastActivity]), [['docs/spec-new.md', S2], ['docs/spec-old.md', S1]]);
  const many = tmpDir(); for (let i = 0; i < 25; i++) write(many, `docs/spec-${String(i).padStart(2, '0')}.md`, '# x\n');
  const o = collectSignals(many, { runTests: false }).orphanSpecs;
  assert.deepStrictEqual([o.total, o.list.length], [25, 20]);
});

console.log('activity of the active cycle');
check('a cycle untouched for 7+ days: commitsElsewhere counts later commits that touch none of its files', () => {
  const root = initRepo(), d = 'docs/specs/2020-01-x';
  write(root, d + '/spec.md', '# X\nPhase: testing\nStatus: approved\n'); write(root, d + '/plan.md', '# P\n'); commit(root, 'cycle', T1);
  for (let i = 0; i < 3; i++) { write(root, `src/f${i}.js`, String(i)); commit(root, 'src ' + i, T2); }
  write(root, 'src/g.js', 'g'); commit(root, 'src g', T3);
  const s = collectSignals(root, { runTests: false });
  assert.ok(Number.isInteger(s.now) && s.now > S3);
  assert.deepStrictEqual(s.activity, { path: d + '/spec.md', lastActivity: S1, commitsElsewhere: 4 });
});
check('no active cycle, or one touched recently: activity is null', () => {
  assert.strictEqual(collectSignals(tmpDir(), { runTests: false }).activity, null);
  const root = initRepo(); write(root, 'docs/specs/s/spec.md', '# S\n'); commit(root, 'one', new Date().toISOString());
  assert.strictEqual(collectSignals(root, { runTests: false }).activity, null);
});
console.log('feature cycles (proportional cycles)');
check('feature-only folder: feature.md is the record, plan and todo, kind feature', () => {
  const root = tmpDir(), d = 'docs/specs/2026-11-07-f';
  write(root, d + '/feature.md', '# F\nPhase: development\nStatus: approved\n\n## Tasks\n\n- [x] T1 a — evidence: x\n- [ ] T2 do b\n- [x] T3 c\n');
  write(root, 'tasks/plan.md', '# global\n'); write(root, 'tasks/todo.md', '- [ ] global\n');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.specs.map(x => [x.path, x.kind]), [[d + '/feature.md', 'feature']]);
  assert.strictEqual(s.plan.path, d + '/feature.md'); assert.strictEqual(s.plan.exists, true);
  assert.strictEqual(s.todo.path, d + '/feature.md');
  assert.deepStrictEqual([s.todo.open, s.todo.done, s.todo.next, s.todo.withoutEvidence], [1, 2, 'T2 do b', 1]);
});
check('spec.md and feature.md together: spec.md is the record with its own pair, kind spec', () => {
  const root = tmpDir(), d = 'docs/specs/2026-11-07-both';
  write(root, d + '/spec.md', '# S\nPhase: planning\nStatus: approved\n'); write(root, d + '/feature.md', '# F\n');
  write(root, d + '/tasks.md', '- [ ] a\n');
  const s = collectSignals(root, { runTests: false });
  assert.deepStrictEqual(s.specs.map(x => [x.path, x.kind]), [[d + '/spec.md', 'spec']]);
  assert.strictEqual(s.todo.path, d + '/tasks.md'); assert.strictEqual(s.plan.path, d + '/plan.md');
  assert.ok(s.notes.includes(d + '/feature.md is not read: ' + d + '/spec.md is the cycle record; move its open tasks to tasks.md'), s.notes.join(' | '));   // review #6
});
check('flat spec is kind spec', () => {
  const root = tmpDir(); write(root, 'docs/specs/a.md', '# A\nPhase: analysis\nStatus: draft\n');
  assert.strictEqual(collectSignals(root, { runTests: false }).specs[0].kind, 'spec');
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
