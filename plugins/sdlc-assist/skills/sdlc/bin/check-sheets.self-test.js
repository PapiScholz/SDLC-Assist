#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
// Every temp dir this test makes is removed when it exits, pass or fail.
const tmpDirs = [];
function mkTmp(prefix) { const d = fs.mkdtempSync(prefix); tmpDirs.push(d); return d; }
process.on('exit', () => { for (const d of tmpDirs) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 3 }); } catch { /* best effort */ } });
const { spawnSync } = require('child_process');
const { PHASES } = require('./lib/header');
let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); console.log('  ok   ' + label); passed++; }
  catch (err) { console.log('  FAIL ' + label); console.log('       ' + err.message); failed++; }
}
const SCRIPT = path.join(__dirname, 'check-sheets.js');
const DEFAULT_KNOWN = 'sdlc-spec,sdlc-plan,incremental-implementation,test-driven-development,sdlc,sdlc-debugging,sdlc-qa-gate,sdlc-release,systematic-debugging,debugging-strategies,release-engineer,qa-push';
function sheet(slug, rec, alt) {
  return '---\nslug: ' + slug + '\ntitle: T ' + slug + '\nrecommends: [' + rec.join(', ') + ']\nalternatives: [' + alt.join(', ') + ']\ndesign: none\n---\n# T\n**Governance:** g.\n**Measure:** m.\n';
}
function tmpDir(slugs, overrides) {
  const d = mkTmp(path.join(os.tmpdir(), 'sheets-'));
  for (const s of slugs) fs.writeFileSync(path.join(d, s + '.md'), (overrides && overrides[s]) || sheet(s, ['sdlc-spec'], []));
  return d;
}
function run(dir, known) {
  const args = [SCRIPT, '--sheets-dir', dir];
  if (known) args.push('--known', known);
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
}
console.log('check-sheets');
check('missing sheet => exit 1 naming the slug', () => {
  const r = run(tmpDir(PHASES.slice(0, 5)));
  assert.strictEqual(r.status, 1);
  assert.ok((r.stdout + r.stderr).includes(PHASES[5]));
});
check('unknown skill => exit 1 "unknown skill"', () => {
  const d = tmpDir(PHASES, { deployment: sheet('deployment', ['ghost-skill'], []) });
  const r = run(d);
  assert.strictEqual(r.status, 1);
  assert.ok((r.stdout + r.stderr).includes('unknown skill'));
  assert.ok((r.stdout + r.stderr).includes('ghost-skill'));
});
check('removed vendored names are unknown (#34): spec-driven-development => exit 1', () => {
  const d = tmpDir(PHASES, { analysis: sheet('analysis', ['spec-driven-development'], []) });
  const r = run(d);
  assert.strictEqual(r.status, 1);
  assert.ok((r.stdout + r.stderr).includes('spec-driven-development'));
});
check('own sdlc-spec and sdlc-plan are known by default', () => {
  const d = tmpDir(PHASES, { planning: sheet('planning', ['sdlc-plan'], []) });
  assert.strictEqual(run(d).status, 0, run(d).stderr);
});
check('--known including it => exit 0', () => {
  const d = tmpDir(PHASES, { deployment: sheet('deployment', ['ghost-skill'], []) });
  assert.strictEqual(run(d, DEFAULT_KNOWN + ',ghost-skill').status, 0);
});
check('plugin prefix is normalised', () => {
  const d = tmpDir(PHASES, { analysis: sheet('analysis', ['sdlc-assist:sdlc-spec'], ['superpowers:systematic-debugging']) });
  assert.strictEqual(run(d).status, 0);
});
check('extra sheet => exit 1', () => {
  const d = tmpDir(PHASES);
  fs.writeFileSync(path.join(d, 'bonus.md'), sheet('bonus', [], []));
  const r = run(d);
  assert.strictEqual(r.status, 1);
  assert.ok((r.stdout + r.stderr).includes('bonus'));
});
check('slug not matching filename => exit 1', () => {
  const d = tmpDir(PHASES, { testing: sheet('wrong', [], []) });
  assert.strictEqual(run(d).status, 1);
});
check('CRLF sheets parse', () => {
  const d = tmpDir(PHASES, { testing: sheet('testing', ['sdlc-qa-gate'], ['qa-push']).replace(/\n/g, '\r\n') });
  assert.strictEqual(run(d).status, 0);
});
check('sheet without **Governance:** => exit 1 naming file and label', () => {
  const d = tmpDir(PHASES, { testing: sheet('testing', ['sdlc-qa-gate'], []).replace('**Governance:** g.\n', '') });
  const r = run(d);
  assert.strictEqual(r.status, 1);
  assert.ok((r.stdout + r.stderr).includes('testing.md: missing body line "**Governance:**"'));
});
check('label only inside a fenced block => exit 1', () => {
  const d = tmpDir(PHASES, { testing: sheet('testing', ['sdlc-qa-gate'], []).replace('**Measure:** m.\n', '```\n**Measure:** m.\n```\n') });
  const r = run(d);
  assert.strictEqual(r.status, 1);
  assert.ok((r.stdout + r.stderr).includes('testing.md: missing body line "**Measure:**"'));
});
check('lower-case **governance:** => exit 1', () => {
  const d = tmpDir(PHASES, { testing: sheet('testing', ['sdlc-qa-gate'], []).replace('**Governance:**', '**governance:**') });
  const r = run(d);
  assert.strictEqual(r.status, 1);
  assert.ok((r.stdout + r.stderr).includes('testing.md: missing body line "**Governance:**"'));
});
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
