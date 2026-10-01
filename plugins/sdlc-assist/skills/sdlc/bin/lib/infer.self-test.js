#!/usr/bin/env node
const assert = require('assert');
const { infer, effectiveDate, planIsCurrent, EVIDENCE } = require('./infer');
let passed = 0, failed = 0;
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
function sig(o = {}) {
  return { root: '/r', specs: [], plan: { exists: false, path: 'tasks/plan.md' },
    todo: { exists: false, path: 'tasks/todo.md', open: 0, done: 0, total: 0 },
    git: { isRepo: false, branch: null, commits: [], lastSemverTag: null, tagOnHead: false, commitsAfterTag: null },
    changelog: { exists: false, path: 'CHANGELOG.md', hasPublishedVersion: false },
    releaseWorkflow: { exists: false, files: [] }, sourceFiles: { count: 0, sample: [] },
    testRunner: { kind: null, command: null }, tests: { status: 'unknown', exitCode: null, tail: [] }, inProduction: false, ...o };
}
const spec = (path, phase, status, d = {}) => ({ path, header: { phase, status }, tracked: true, firstCommit: 100, lastCommit: 200, dirty: false, mtime: 250, ...d });
const plan = (d = {}) => ({ exists: true, path: 'tasks/plan.md', tracked: true, lastCommit: 200, dirty: false, mtime: 250, ...d });
const todo = (open, done, path = 'tasks/todo.md') => ({ exists: true, path, open, done, total: open + done });
const req = type => ({ message: '', type });
const src = { count: 1, sample: [] };
const hasAlt = (r, phase, kind) => r.alternatives.some(a => a.phase === phase && a.kind === kind);

console.log('effectiveDate / planIsCurrent');
check('tracked clean => lastCommit; untracked => mtime; dirty and newer => mtime', () => {
  assert.strictEqual(effectiveDate({ tracked: true, lastCommit: 200, dirty: false, mtime: 250 }), 200);
  assert.strictEqual(effectiveDate({ tracked: false, lastCommit: null, dirty: false, mtime: 250 }), 250);
  assert.strictEqual(effectiveDate({ tracked: true, lastCommit: 200, dirty: true, mtime: 250 }), 250);
  assert.strictEqual(effectiveDate({ tracked: true, lastCommit: 200, dirty: true, mtime: 150 }), 200);
});
check('plan current iff plan lastCommit >= spec firstCommit (mtime when untracked)', () => {
  const s = spec('a.md', null, 'approved', { firstCommit: 100 });
  assert.strictEqual(planIsCurrent(plan({ lastCommit: 100 }), s), true);
  assert.strictEqual(planIsCurrent(plan({ lastCommit: 99 }), s), false);
  assert.strictEqual(planIsCurrent(plan({ tracked: false, lastCommit: null, mtime: 500 }), s), true);
  assert.strictEqual(planIsCurrent({ exists: false }, s), false);
  assert.strictEqual(planIsCurrent(plan(), null), true);
});
console.log('fallback rows');
check('1 empty: initial (analysis also candidate, earliest wins)', () => {
  const r = infer(sig(), req('idea'));
  assert.strictEqual(r.inferred, 'initial'); assert.deepStrictEqual(r.candidates, ['initial', 'analysis']); assert.strictEqual(r.active, null);
});
check('1 inv: source file => analysis', () => { assert.strictEqual(infer(sig({ sourceFiles: src }), req('idea')).inferred, 'analysis'); });
check('6: source, no artifacts => analysis; draft spec => analysis', () => {
  assert.strictEqual(infer(sig({ sourceFiles: src }), req('feature')).inferred, 'analysis');
  assert.strictEqual(infer(sig({ sourceFiles: src, specs: [spec('s.md', null, 'draft')] }), req('feature')).inferred, 'analysis');
});
check('9: approved spec, current plan, todo without tasks => planning + NO_TASKS', () => {
  const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', null, 'approved')], plan: plan(), todo: todo(0, 0) }), req('unknown'));
  assert.strictEqual(r.inferred, 'planning'); assert(r.evidence.some(e => e.includes(EVIDENCE.NO_TASKS)), r.evidence.join('|'));
});
check('approved spec, no plan => planning', () => {
  assert.strictEqual(infer(sig({ sourceFiles: src, specs: [spec('s.md', null, 'approved')] }), req('unknown')).inferred, 'planning');
});
check('4: approved, current plan, todo 4 open 3 done, no Phase => development, no warning', () => {
  const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', null, 'approved')], plan: plan(), todo: todo(4, 3) }), req('unknown'));
  assert.strictEqual(r.inferred, 'development'); assert.deepStrictEqual(r.warnings, []);
});
check('4 inv: all closed => testing', () => {
  assert.strictEqual(infer(sig({ sourceFiles: src, specs: [spec('s.md', null, 'approved')], plan: plan(), todo: todo(0, 7) }), req('unknown')).inferred, 'testing');
});
check('testing with tag on HEAD: evidence says deployment is header-only', () => {
  const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', null, 'approved')], plan: plan(), todo: todo(0, 7),
    git: { isRepo: true, branch: 'main', commits: [], lastSemverTag: { name: 'v1.0.0', sha: 'x' }, tagOnHead: true, commitsAfterTag: 0 } }), req('unknown'));
  assert.strictEqual(r.inferred, 'testing'); assert(r.evidence.some(e => e.includes(EVIDENCE.DEPLOY_HEADER_ONLY)));
});
console.log('header rules');
check('3: header development agrees => no warning, fallback in result', () => {
  const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', 'development', 'approved')], plan: plan(), todo: todo(4, 3) }), req('unknown'));
  assert.strictEqual(r.inferred, 'development'); assert.strictEqual(r.fallback, 'development'); assert.deepStrictEqual(r.warnings, []); assert.strictEqual(r.active.path, 's.md');
});
check('3 inv: header development, all closed => development, alt testing (fallback), one warning', () => {
  const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', 'development', 'approved')], plan: plan(), todo: todo(0, 7) }), req('unknown'));
  assert.strictEqual(r.inferred, 'development'); assert.strictEqual(r.fallback, 'testing'); assert(hasAlt(r, 'testing', 'fallback')); assert.strictEqual(r.warnings.length, 1);
});
check('8: stale header analysis => analysis, alt development, warning; fixed header => clean', () => {
  const base = { sourceFiles: src, plan: plan(), todo: todo(4, 3) };
  const r = infer(sig({ ...base, specs: [spec('s.md', 'analysis', 'approved')] }), req('unknown'));
  assert.strictEqual(r.inferred, 'analysis'); assert(hasAlt(r, 'development', 'fallback')); assert.strictEqual(r.warnings.length, 1);
  const ok = infer(sig({ ...base, specs: [spec('s.md', 'development', 'approved')] }), req('unknown'));
  assert.deepStrictEqual(ok.warnings, []); assert(!hasAlt(ok, 'development', 'fallback'));
});
check('header development without approved spec => extra warning', () => {
  const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', 'development', 'draft')], plan: plan(), todo: todo(4, 3) }), req('unknown'));
  assert.strictEqual(r.inferred, 'development'); assert(r.warnings.some(w => /without an approved spec/.test(w)));
});
check('header deployment + tag on HEAD => evidence recommends closing', () => {
  const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', 'deployment', 'approved')], plan: plan(), todo: todo(0, 7),
    git: { isRepo: true, branch: 'main', commits: [], lastSemverTag: { name: 'v1.0.0', sha: 'x' }, tagOnHead: true, commitsAfterTag: 0 } }), req('unknown'));
  assert.strictEqual(r.inferred, 'deployment'); assert(r.evidence.some(e => e.includes(EVIDENCE.CLOSE_CYCLE)));
});
check('header deployment, all tasks done => no warning, no fallback alt, DEPLOY_HEADER_ONLY (no tag needed)', () => {
  const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', 'deployment', 'approved')], plan: plan(), todo: todo(0, 7) }), req('unknown'));
  assert.strictEqual(r.inferred, 'deployment'); assert.strictEqual(r.fallback, 'testing');
  assert.deepStrictEqual(r.warnings, []); assert(!r.alternatives.some(a => a.kind === 'fallback'), JSON.stringify(r.alternatives));
  assert(r.evidence.some(e => e.includes(EVIDENCE.DEPLOY_HEADER_ONLY)), r.evidence.join('|'));
});
check('inversion: header deployment with one open task => warning names development', () => {
  const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', 'deployment', 'approved')], plan: plan(), todo: todo(1, 6) }), req('unknown'));
  assert.strictEqual(r.inferred, 'deployment'); assert.strictEqual(r.warnings.length, 1); assert(/development/.test(r.warnings[0]), r.warnings[0]);
  assert(hasAlt(r, 'development', 'fallback')); assert(!r.evidence.some(e => e.includes(EVIDENCE.DEPLOY_HEADER_ONLY)));
});
console.log('cycle selection');
check('active = most recent non-closed spec by effective date', () => {
  const r = infer(sig({ sourceFiles: src, specs: [
    spec('old.md', 'deployment', 'closed', { firstCommit: 10, lastCommit: 20, mtime: 20 }),
    spec('a.md', null, 'approved', { firstCommit: 100, lastCommit: 100, mtime: 100 }),
    spec('b.md', null, 'draft', { firstCommit: 150, lastCommit: 160, mtime: 160 }) ] }), req('unknown'));
  assert.strictEqual(r.active.path, 'b.md'); assert.deepStrictEqual(r.cycles.map(c => c.path), ['b.md', 'a.md', 'old.md']); assert.strictEqual(r.cycles[2].active, false);
});
check('untracked spec ranks by mtime', () => {
  const r = infer(sig({ sourceFiles: src, specs: [
    spec('a.md', null, 'approved', { firstCommit: 100, lastCommit: 100, mtime: 100 }),
    spec('new.md', null, 'draft', { tracked: false, firstCommit: null, lastCommit: null, mtime: 900 }) ] }), req('unknown'));
  assert.strictEqual(r.active.path, 'new.md');
});
check('10: closed spec, old plan 7/7, new draft spec => analysis + PLAN_STALE, no testing candidate', () => {
  const r = infer(sig({ sourceFiles: src, specs: [
    spec('old.md', null, 'closed', { firstCommit: 10, lastCommit: 20, mtime: 20 }),
    spec('new.md', null, 'draft', { firstCommit: 300, lastCommit: 300, mtime: 300 }) ], plan: plan({ lastCommit: 50 }), todo: todo(0, 7) }), req('unknown'));
  assert.strictEqual(r.inferred, 'analysis'); assert(r.evidence.some(e => e.includes(EVIDENCE.PLAN_STALE)), r.evidence.join('|')); assert(!r.candidates.includes('testing'));
});
check('10 inv: new spec approved, plan committed after it, todo reset => planning', () => {
  const r = infer(sig({ sourceFiles: src, specs: [
    spec('old.md', null, 'closed', { firstCommit: 10, lastCommit: 20, mtime: 20 }),
    spec('new.md', null, 'approved', { firstCommit: 300, lastCommit: 300, mtime: 300 }) ], plan: plan({ lastCommit: 400 }), todo: todo(0, 0) }), req('unknown'));
  assert.strictEqual(r.inferred, 'planning'); assert(!r.evidence.some(e => e.includes(EVIDENCE.PLAN_STALE)));
});
check('dirty tracked spec newer than a committed one becomes active (through infer)', () => {
  const specs = dirty => [
    spec('committed.md', null, 'approved', { firstCommit: 100, lastCommit: 500, dirty: false, mtime: 500 }),
    spec('edited.md', null, 'draft', { firstCommit: 50, lastCommit: 100, dirty, mtime: 900 }) ];
  assert.strictEqual(infer(sig({ sourceFiles: src, specs: specs(true) }), req('unknown')).active.path, 'edited.md');
  assert.strictEqual(infer(sig({ sourceFiles: src, specs: specs(false) }), req('unknown')).active.path, 'committed.md');
});
console.log('request rule (a) and misc evidence');
check('5: bug/complaint/feature with active cycle => alt new-cycle; unknown/hotfix => none', () => {
  const s = sig({ sourceFiles: src, specs: [spec('s.md', 'development', 'approved')], plan: plan(), todo: todo(4, 3) });
  for (const t of ['bug', 'complaint', 'feature']) assert(hasAlt(infer(s, req(t)), 'analysis', 'new-cycle'), t);
  for (const t of ['unknown', 'hotfix']) assert(!hasAlt(infer(s, req(t)), 'analysis', 'new-cycle'), t);
});
check('2: no spec, in production, complaint => analysis, no new-cycle alt', () => {
  const r = infer(sig({ sourceFiles: { count: 5, sample: [] }, inProduction: true, git: { isRepo: true, branch: 'main', commits: [], lastSemverTag: { name: 'v1.2.0', sha: 'x' }, tagOnHead: true, commitsAfterTag: 0 } }), req('complaint'));
  assert.strictEqual(r.inferred, 'analysis'); assert(!hasAlt(r, 'analysis', 'new-cycle')); assert(r.evidence.some(e => /in production/.test(e)));
});
check('tests unknown and missing todo are stated in evidence', () => {
  const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', null, 'approved')], plan: plan() }), req('unknown'));
  assert(r.evidence.some(e => e.includes(EVIDENCE.TESTS_NOT_RUN))); assert(r.evidence.some(e => e.includes(EVIDENCE.NO_TODO + ' (tasks/todo.md)')), r.evidence.join('|'));
});
check('missing todo evidence names the resolved path of a folder cycle', () => {
  const dir = 'docs/specs/2026-10-02-x';
  const s = spec(dir + '/spec.md', null, 'approved', { layout: 'folder', plan: plan({ path: dir + '/plan.md' }), todo: { exists: false, path: dir + '/tasks.md', open: 0, done: 0, total: 0 } });
  const r = infer(sig({ sourceFiles: src, specs: [s], plan: s.plan, todo: s.todo }), req('unknown'));
  assert(r.evidence.some(e => e === EVIDENCE.NO_TODO + ' (' + dir + '/tasks.md)'), r.evidence.join('|'));
  assert.strictEqual(r.inferred, 'planning');
});
check('folder cycle: plan beside the spec is current even if its last commit predates the spec first commit', () => {
  const s = spec('docs/specs/d/spec.md', null, 'approved', { layout: 'folder', firstCommit: 300 });
  assert.strictEqual(planIsCurrent(plan({ path: 'docs/specs/d/plan.md', lastCommit: 100 }), s), true);
  const flat = spec('docs/specs/f.md', null, 'approved', { layout: 'flat', firstCommit: 300 });
  assert.strictEqual(planIsCurrent(plan({ lastCommit: 100 }), flat), false);
  const r = infer(sig({ sourceFiles: src, specs: [s], plan: plan({ path: 'docs/specs/d/plan.md', lastCommit: 100 }), todo: todo(1, 0, 'docs/specs/d/tasks.md') }), req('unknown'));
  assert(!r.evidence.some(e => e.includes(EVIDENCE.PLAN_STALE)), r.evidence.join('|')); assert.strictEqual(r.inferred, 'development');
});
check('plan present, no specs => NO_PLAN_CYCLE evidence; no plan => none', () => {
  const r = infer(sig({ sourceFiles: src, plan: plan(), todo: todo(2, 1) }), req('unknown'));
  assert(r.evidence.some(e => e.includes(EVIDENCE.NO_PLAN_CYCLE)), r.evidence.join('|'));
  assert(!infer(sig({ sourceFiles: src }), req('unknown')).evidence.some(e => e.includes(EVIDENCE.NO_PLAN_CYCLE)));
});
check('alternatives capped at 3: max reachable case hits the cap, sweep never exceeds it', () => {
  const max = infer(sig({ sourceFiles: src, specs: [spec('s.md', 'deployment', 'draft')], plan: plan(), todo: todo(2, 1) }), req('bug'));
  assert.deepStrictEqual(max.alternatives.map(a => a.kind), ['fallback', 'new-cycle', 'candidate'], JSON.stringify(max.alternatives));
  for (const phase of [null, 'analysis', 'planning', 'development', 'testing', 'deployment'])
    for (const status of ['draft', 'approved'])
      for (const t of [todo(0, 0), todo(2, 1), todo(0, 3)])
        for (const type of ['bug', 'unknown']) {
          const r = infer(sig({ sourceFiles: src, specs: [spec('s.md', phase, status)], plan: plan(), todo: t }), req(type));
          assert(r.alternatives.length <= 3, JSON.stringify(r.alternatives));
        }
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
