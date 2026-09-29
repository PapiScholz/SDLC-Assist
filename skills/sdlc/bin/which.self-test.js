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
function put(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'which-'));
const home = path.join(tmp, 'home');
const cwd = path.join(tmp, 'proj');
const sheets = path.join(tmp, 'sheets');
fs.mkdirSync(cwd, { recursive: true });
put(path.join(home, '.claude', 'skills', 'spec-driven-development', 'SKILL.md'), '# a\n');
put(path.join(home, '.agents', 'skills', 'spec-driven-development', 'SKILL.md'), '# b\n');
put(path.join(home, '.claude', 'plugins', 'cache', 'official', 'superpowers', '1.0.0', 'skills', 'systematic-debugging', 'SKILL.md'), '# c\n');
put(path.join(cwd, '.claude', 'skills', 'project-skill', 'SKILL.md'), '# p\n');
put(path.join(sheets, 'analysis.md'),
  '---\nrecommends: [spec-driven-development]\nalternatives: [superpowers:systematic-debugging, debugging-strategies]\n---\n# Analysis\n');
put(path.join(sheets, 'planning.md'),
  '---\nrecommends:\n  - project-skill\n  - nope-skill\nalternatives:\n---\n# Planning\r\n');

function run(args, opts) {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'which.js'), ...args], { cwd, encoding: 'utf8', ...opts });
  return r;
}
const base = ['--root', home, '--sheets-dir', sheets];
const res = run(base);
let out = null;
try { out = JSON.parse(res.stdout); } catch (e) { /* asserted below */ }

console.log('which.js');
check('exit 0 and JSON on stdout', () => { assert.strictEqual(res.status, 0, res.stderr); assert.ok(out, 'no JSON: ' + res.stdout); });
check('installed includes spec-driven-development and plugin form', () => {
  const inst = out.phases.analysis.installed;
  assert.ok(inst.some(i => i.name === 'spec-driven-development'));
  const sd = inst.find(i => i.name === 'systematic-debugging');
  assert.ok(sd, 'systematic-debugging missing');
  assert.strictEqual(sd.form, 'superpowers:systematic-debugging');
});
check('missing includes debugging-strategies', () => {
  assert.ok(out.phases.analysis.missing.includes('debugging-strategies'));
  assert.ok(!out.phases.analysis.missing.includes('spec-driven-development'));
});
check('duplicates has one entry with two paths', () => {
  assert.strictEqual(out.duplicates.length, 1);
  assert.strictEqual(out.duplicates[0].name, 'spec-driven-development');
  assert.strictEqual(out.duplicates[0].paths.length, 2);
});
check('list form parsed, project-level dir scanned', () => {
  const p = out.phases.planning;
  assert.deepStrictEqual(p.recommends, ['project-skill', 'nope-skill']);
  assert.ok(p.installed.some(i => i.name === 'project-skill'));
  assert.deepStrictEqual(p.missing, ['nope-skill']);
  assert.deepStrictEqual(p.alternatives, []);
});
check('--phase filters to one phase', () => {
  const r = run([...base, '--phase', 'planning']);
  const o = JSON.parse(r.stdout);
  assert.deepStrictEqual(Object.keys(o.phases), ['planning']);
});
check('--verbose prints table to stderr, JSON still on stdout', () => {
  const r = run([...base, '--verbose']);
  assert.ok(r.stderr.includes('analysis'));
  JSON.parse(r.stdout);
});
check('missing sheets dir => empty phases, exit 0', () => {
  const r = run(['--root', home, '--sheets-dir', path.join(tmp, 'nope')]);
  assert.strictEqual(r.status, 0);
  assert.deepStrictEqual(JSON.parse(r.stdout).phases, {});
});
check('same real path via symlink is not a duplicate', () => {
  const h2 = path.join(tmp, 'home2');
  put(path.join(h2, '.claude', 'skills', 'x-skill', 'SKILL.md'), '# x\n');
  fs.mkdirSync(path.join(h2, '.agents'), { recursive: true });
  try { fs.symlinkSync(path.join(h2, '.claude', 'skills'), path.join(h2, '.agents', 'skills'), 'junction'); }
  catch (e) { return; }
  const r = run(['--root', h2, '--sheets-dir', sheets]);
  assert.strictEqual(JSON.parse(r.stdout).duplicates.length, 0);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
