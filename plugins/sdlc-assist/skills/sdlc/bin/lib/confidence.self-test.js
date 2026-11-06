#!/usr/bin/env node
const assert = require('assert');
const { assessConfidence, shortName, STALE_DAYS, STALE_COMMITS, CONTESTED_SECONDS } = require('./confidence');
let passed = 0, failed = 0;
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
const DAY = 86400, NOW = 1000 * DAY;
const cyc = (path, date, status = 'approved') => ({ path, date, status });
const A = cyc('docs/specs/2026-10-05-x/spec.md', NOW - DAY);
const base = { active: A, cycles: [A], orphanSpecs: { total: 0, list: [] }, activity: null, now: NOW, released: null };
const kinds = r => r.reasons.map(x => x.kind);

console.log('assessConfidence');
check('constants: 7 days, 10 commits, 24 hours', () => {
  assert.deepStrictEqual([STALE_DAYS, STALE_COMMITS, CONTESTED_SECONDS], [7, 10, DAY]);
});
check('no active cycle: high, no reasons', () => {
  assert.deepStrictEqual(assessConfidence({ ...base, active: null, cycles: [] }), { level: 'high', reasons: [] });
});
check('no reason holds: high', () => {
  assert.deepStrictEqual(assessConfidence(base), { level: 'high', reasons: [] });
});
check('orphan newer than the cycle: low, names the file', () => {
  const r = assessConfidence({ ...base, orphanSpecs: { total: 1, list: [{ path: 'docs/spec-new.md', lastActivity: NOW, hasHeader: false }] } });
  assert.strictEqual(r.level, 'low'); assert.deepStrictEqual(kinds(r), ['orphan']); assert.match(r.reasons[0].detail, /docs\/spec-new\.md/);
});
check('orphan older than the cycle: no reason', () => {
  assert.strictEqual(assessConfidence({ ...base, orphanSpecs: { total: 1, list: [{ path: 'docs/spec-old.md', lastActivity: NOW - 9 * DAY }] } }).level, 'high');
});
const old = cyc('docs/specs/2026-10-05-x/spec.md', NOW - 12 * DAY);
const act = n => ({ path: old.path, lastActivity: old.date, commitsElsewhere: n });
check('stale: 12 days and 30 commits elsewhere => low with days and commits', () => {
  const r = assessConfidence({ ...base, active: old, cycles: [old], activity: act(30) });
  assert.deepStrictEqual(kinds(r), ['stale']); assert.match(r.reasons[0].detail, /12 days/); assert.match(r.reasons[0].detail, /30 commits/);
});
check('not stale: 12 days with 9 commits, or 6 days with 30', () => {
  assert.strictEqual(assessConfidence({ ...base, active: old, cycles: [old], activity: act(9) }).level, 'high');
  const recent = cyc(old.path, NOW - 6 * DAY);
  assert.strictEqual(assessConfidence({ ...base, active: recent, cycles: [recent], activity: { path: old.path, lastActivity: recent.date, commitsElsewhere: 30 } }).level, 'high');
});
check('stale activity of another path is ignored', () => {
  assert.strictEqual(assessConfidence({ ...base, active: old, cycles: [old], activity: { ...act(30), path: 'docs/specs/other/spec.md' } }).level, 'high');
});
check('contested: another open cycle within 24 h => low; 25 h or closed => no', () => {
  const near = cyc('docs/specs/b/spec.md', A.date - 23 * 3600), far = cyc('docs/specs/c/spec.md', A.date - 25 * 3600), shut = cyc('docs/specs/d/spec.md', A.date, 'closed');
  const r = assessConfidence({ ...base, cycles: [A, near] });
  assert.deepStrictEqual(kinds(r), ['contested']); assert.match(r.reasons[0].detail, /\bb\b/);
  assert.strictEqual(assessConfidence({ ...base, cycles: [A, far, shut] }).level, 'high');
});
check('released: the given sentence becomes a reason', () => {
  assert.deepStrictEqual(assessConfidence({ ...base, released: 'release v1 came out' }).reasons, [{ kind: 'released', detail: 'release v1 came out' }]);
});
check('several reasons keep the order orphan, stale, contested, released', () => {
  const near = cyc('docs/specs/b/spec.md', old.date);
  const r = assessConfidence({ active: old, cycles: [old, near], activity: act(30), now: NOW, released: 'r',
    orphanSpecs: { total: 1, list: [{ path: 'docs/spec-n.md', lastActivity: NOW }] } });
  assert.deepStrictEqual(kinds(r), ['orphan', 'stale', 'contested', 'released']);
});
check('shortName: folder name for a folder cycle, the path for a flat spec', () => {
  assert.strictEqual(shortName('docs/specs/03-fase1/MAPA.md'), '03-fase1');
  assert.strictEqual(shortName('docs/specs/a.md'), 'docs/specs/a.md');
  assert.strictEqual(shortName('SPEC-auth.md'), 'SPEC-auth.md');
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
