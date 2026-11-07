#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); console.log('  ok   ' + label); passed++; }
  catch (err) { console.log('  FAIL ' + label); console.log('       ' + err.message); failed++; }
}
const SCRIPT = path.join(__dirname, 'check-evidence.js');
const H = (status = 'approved') => '# X\n\nPhase: development\nStatus: ' + status + '\n\n';

function run(files, args = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chkev-'));
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  }
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });
  fs.rmSync(root, { recursive: true, force: true });
  return { ...r, all: (r.stdout || '') + (r.stderr || '') };
}

console.log('check-evidence');
check('a done task without evidence: path:line warning, summary, exit 0', () => {
  const r = run({ 'docs/specs/a/spec.md': H(), 'docs/specs/a/tasks.md': '# T\n\n- [x] 1 a — evidence: node t.js\n- [x] 2 b\n- [ ] 3 c\n' });
  assert.strictEqual(r.status, 0);
  assert.ok(/warn docs\/specs\/a\/tasks\.md:4 done without evidence/.test(r.all), r.all);
  assert.ok(/check-evidence: 1 task lists, 2 done tasks, 1 without evidence/.test(r.all), r.all);
});
check('--strict exits 1 when a task lacks evidence, 0 when all carry it', () => {
  assert.strictEqual(run({ 'docs/specs/a/feature.md': H() + '## Tasks\n\n- [x] T1 a\n' }, ['--strict']).status, 1);
  assert.strictEqual(run({ 'docs/specs/a/feature.md': H() + '## Tasks\n\n- [x] T1 a — Evidence: x\n' }, ['--strict']).status, 0);
});
check('feature cycle: its own file is the task list; fenced samples are ignored', () => {
  const r = run({ 'docs/specs/f/feature.md': H() + '```\n- [x] sample\n```\n\n## Tasks\n\n- [x] T1 a\n' });
  assert.ok(/feature\.md:12 done without evidence/.test(r.all), r.all);
  assert.ok(/1 task lists, 1 done tasks, 1 without evidence/.test(r.all), r.all);
});
check('closed cycles are skipped unless --all; a cycle without a task list is not counted', () => {
  const files = { 'docs/specs/a/spec.md': H('closed'), 'docs/specs/a/tasks.md': '- [x] old\n', 'docs/specs/b/spec.md': H() };
  assert.ok(/0 task lists, 0 done tasks, 0 without evidence/.test(run(files).all));
  assert.ok(/1 task lists, 1 done tasks, 1 without evidence/.test(run(files, ['--all']).all));
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
