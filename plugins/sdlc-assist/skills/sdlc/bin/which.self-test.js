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
put(path.join(home, '.claude', 'skills', 'sdlc-spec', 'SKILL.md'), '# a\n');
put(path.join(home, '.agents', 'skills', 'sdlc-spec', 'SKILL.md'), '# b\n');
put(path.join(home, '.claude', 'plugins', 'cache', 'official', 'superpowers', '1.0.0', 'skills', 'systematic-debugging', 'SKILL.md'), '# c\n');
put(path.join(cwd, '.claude', 'skills', 'project-skill', 'SKILL.md'), '# p\n');
put(path.join(sheets, 'analysis.md'),
  '---\nrecommends: [sdlc-spec]\nalternatives: [superpowers:systematic-debugging, debugging-strategies]\n---\n# Analysis\n');
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
check('installed includes sdlc-spec and plugin form', () => {
  const inst = out.phases.analysis.installed;
  assert.ok(inst.some(i => i.name === 'sdlc-spec'));
  const sd = inst.find(i => i.name === 'systematic-debugging');
  assert.ok(sd, 'systematic-debugging missing');
  assert.strictEqual(sd.form, 'superpowers:systematic-debugging');
});
check('missing includes debugging-strategies', () => {
  assert.ok(out.phases.analysis.missing.includes('debugging-strategies'));
  assert.ok(!out.phases.analysis.missing.includes('sdlc-spec'));
});
check('without --verbose: duplicates [] and duplicatesOmitted true', () => {
  assert.deepStrictEqual(out.duplicates, []);
  assert.strictEqual(out.duplicatesOmitted, true);
});
check('--verbose: duplicates has one entry with two paths, no omitted flag', () => {
  const o = JSON.parse(run([...base, '--verbose']).stdout);
  assert.strictEqual(o.duplicates.length, 1);
  assert.strictEqual(o.duplicates[0].name, 'sdlc-spec');
  assert.strictEqual(o.duplicates[0].paths.length, 2);
  assert.strictEqual(o.duplicatesOmitted, undefined);
});
check('unknown --phase slug => exit 1, message on stderr, nothing on stdout', () => {
  const r = run([...base, '--phase', 'shipping']);
  assert.strictEqual(r.status, 1);
  assert.ok(/unknown --phase/.test(r.stderr), r.stderr);
  assert.strictEqual(r.stdout, '');
});
check('plugin cache: only the highest version of one plugin counts (1.10.0 > 1.9.0 > sha)', () => {
  const h3 = path.join(tmp, 'home3');
  for (const ver of ['1.9.0', '1.10.0', '0a1b2c3d4e5f'])
    put(path.join(h3, '.claude', 'plugins', 'cache', 'm', 'superpowers', ver, 'skills', 'systematic-debugging', 'SKILL.md'), '# ' + ver + '\n');
  const o = JSON.parse(run(['--root', h3, '--sheets-dir', sheets, '--phase', 'analysis', '--verbose']).stdout);
  const hits = o.phases.analysis.installed.filter(i => i.name === 'systematic-debugging');
  assert.strictEqual(hits.length, 1);
  assert.ok(hits[0].path.split(path.sep).includes('1.10.0'), hits[0].path);
  assert.ok(!o.duplicates.some(d => d.name === 'systematic-debugging'), JSON.stringify(o.duplicates));
});
check('plugin cache: digit-leading SHA dir does not outrank 1.10.0, no duplicate', () => {
  const h4 = path.join(tmp, 'home4');
  for (const ver of ['1.10.0', '76c85b7366c8'])
    put(path.join(h4, '.claude', 'plugins', 'cache', 'm', 'superpowers', ver, 'skills', 'systematic-debugging', 'SKILL.md'), '# ' + ver + '\n');
  const o = JSON.parse(run(['--root', h4, '--sheets-dir', sheets, '--phase', 'analysis', '--verbose']).stdout);
  const hits = o.phases.analysis.installed.filter(i => i.name === 'systematic-debugging');
  assert.strictEqual(hits.length, 1);
  assert.ok(hits[0].path.split(path.sep).includes('1.10.0'), hits[0].path);
  assert.ok(!o.duplicates.some(d => d.name === 'systematic-debugging'), JSON.stringify(o.duplicates));
});
check('plugin cache: two digit-leading SHA dirs rank by mtime, not leading digits', () => {
  const h5 = path.join(tmp, 'home5');
  const base5 = path.join(h5, '.claude', 'plugins', 'cache', 'm', 'superpowers');
  for (const ver of ['76c85b7366c8', '1aa8f02ec832'])
    put(path.join(base5, ver, 'skills', 'systematic-debugging', 'SKILL.md'), '# ' + ver + '\n');
  fs.utimesSync(path.join(base5, '76c85b7366c8'), new Date(2020, 0, 1), new Date(2020, 0, 1));
  fs.utimesSync(path.join(base5, '1aa8f02ec832'), new Date(2024, 0, 1), new Date(2024, 0, 1));
  const o = JSON.parse(run(['--root', h5, '--sheets-dir', sheets, '--phase', 'analysis', '--verbose']).stdout);
  const hits = o.phases.analysis.installed.filter(i => i.name === 'systematic-debugging');
  assert.strictEqual(hits.length, 1);
  assert.ok(hits[0].path.split(path.sep).includes('1aa8f02ec832'), hits[0].path);
});
check('project-level .opencode/skills is scanned', () => {
  put(path.join(cwd, '.opencode', 'skills', 'nope-skill', 'SKILL.md'), '# n\n');
  const o = JSON.parse(run([...base, '--phase', 'planning']).stdout);
  fs.rmSync(path.join(cwd, '.opencode'), { recursive: true, force: true });
  assert.ok(o.phases.planning.installed.some(i => i.name === 'nope-skill'));
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
  const r = run(['--root', h2, '--sheets-dir', sheets, '--verbose']);
  assert.strictEqual(JSON.parse(r.stdout).duplicates.length, 0);
});
// TDD by presence (issue #34, Decision 5): the development sheet lists superpowers' TDD first, then the bundled one.
const devSheets = path.join(tmp, 'dev-sheets');
put(path.join(devSheets, 'development.md'),
  '---\nrecommends: [superpowers:test-driven-development, incremental-implementation, test-driven-development]\nalternatives: []\n---\n# Development\n');
function tddHome(dir, withSuperpowers) {
  const sdlcRoot = path.join(dir, '.claude', 'plugins', 'cache', 'papischolz', 'sdlc-assist', '0.18.0', 'skills');
  put(path.join(sdlcRoot, 'test-driven-development', 'SKILL.md'), '# bundled\n');
  put(path.join(sdlcRoot, 'incremental-implementation', 'SKILL.md'), '# inc\n');
  if (withSuperpowers) put(path.join(dir, '.claude', 'plugins', 'cache', 'official', 'superpowers', '7.0.2', 'skills', 'test-driven-development', 'SKILL.md'), '# sp\n');
  return dir;
}
function devPhase(dir) {
  const r = run(['--root', dir, '--sheets-dir', devSheets, '--phase', 'development']);
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout).phases.development;
}
check('superpowers installed: development names superpowers:test-driven-development first', () => {
  const p = devPhase(tddHome(path.join(tmp, 'home-sp'), true));
  assert.strictEqual(p.installed[0].form, 'superpowers:test-driven-development', JSON.stringify(p.installed));
  assert.ok(p.installed.some(i => i.form === 'sdlc-assist:incremental-implementation'));
});
check('superpowers missing: development names the bundled test-driven-development, once', () => {
  const p = devPhase(tddHome(path.join(tmp, 'home-nosp'), false));
  assert.strictEqual(p.installed[0].form, 'sdlc-assist:test-driven-development', JSON.stringify(p.installed));
  const paths = p.installed.map(i => i.path);
  assert.strictEqual(new Set(paths).size, paths.length, 'same skill listed twice: ' + JSON.stringify(p.installed));
  assert.deepStrictEqual(p.missing, []);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
