#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const HOOK = path.join(__dirname, 'sdlc-status.js');
let passed = 0, failed = 0; const tmps = [];
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
function tmpDir() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-hook-')); tmps.push(d); return d; }
function write(root, rel, text) { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); }
// Fixture repos never run the developer's global git hooks (a post-commit hook per fixture commit opens a console
// window on Windows); a hooks path that does not exist disables them.
const NO_HOOKS = ['-c', 'core.hooksPath=' + path.join(os.tmpdir(), 'sdlc-hook-self-test-no-hooks')];
function git(root, args) { execFileSync('git', [...NO_HOOKS, ...args], { cwd: root, stdio: 'ignore' }); }
process.on('exit', () => { for (const d of tmps) try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5 }); } catch {} });
function run(stdin, cwd) { return spawnSync(process.execPath, [HOOK], { input: stdin, encoding: 'utf8', cwd }); }
function stagedRepo() {
  const root = tmpDir(); const d = 'docs/specs/2026-10-08-lms';
  write(root, d + '/spec.md', '# Spec\n\nPhase: development\nStatus: approved\n');
  write(root, d + '/plan.md', '# Plan\n\n## Etapas\n\n| # | Etapa |\n|---|---|\n| 3 | **Ingreso** [x] 2026-10-12 |\n| 4 | **Catálogo** |\n');
  write(root, d + '/tasks.md', '# Etapa 3 — Ingreso\n\n- [x] a\n');
  write(root, 'src/a.js', 'x\n');
  git(root, ['init', '-q']); git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A']);
  git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init']);
  return root;
}
console.log('sdlc-status hook');
check('staged repo: one line naming stage 4 and step 3', () => {
  const r = run(JSON.stringify({ cwd: stagedRepo(), prompt: 'seguimos' }));
  assert.strictEqual(r.status, 0); assert.match(r.stdout, /^sdlc: cycle 2026-10-08-lms \(today\) · stage 4 "Catálogo" .*step 3\/4 plan/);
});
check('from a subdirectory of the repo: same line', () => {
  const root = stagedRepo();
  const r = run(JSON.stringify({ cwd: path.join(root, 'src'), prompt: 'x' }));
  assert.match(r.stdout, /^sdlc: cycle 2026-10-08-lms \(today\) · stage 4 /);
});
check('not a git repo, or a repo without an active cycle: silent, exit 0', () => {
  assert.deepStrictEqual([run(JSON.stringify({ cwd: tmpDir() })).stdout, run(JSON.stringify({ cwd: tmpDir() })).status], ['', 0]);
  const root = tmpDir(); write(root, 'a.js', 'x\n'); git(root, ['init', '-q']);
  assert.strictEqual(run(JSON.stringify({ cwd: root })).stdout, '');
});
check('cwd that does not exist, or stdin that is not JSON: silent, exit 0', () => {
  const a = run(JSON.stringify({ cwd: path.join(tmpDir(), 'missing') }));
  const b = run('not json');
  assert.deepStrictEqual([a.stdout, a.status, b.status], ['', 0, 0]);
});
check('a complaint while a stage is in flight adds the new-topic note', () => {
  const r = run(JSON.stringify({ cwd: stagedRepo(), prompt: 'un cliente se queja de que el botón no anda' }));
  assert.match(r.stdout, /new topic/);
});
check('REVIEW: stdin that is not JSON prints nothing even when the process cwd is a repo with an active cycle', () => {
  const r = run('not json', stagedRepo());
  assert.deepStrictEqual([r.stdout, r.status], ['', 0]);
});
check('same session, same status: printed once, then silent until it changes', () => {
  const root = stagedRepo(); const sid = 'selftest-' + process.pid + '-' + Date.now();
  const a = run(JSON.stringify({ cwd: root, prompt: 'seguimos', session_id: sid }));
  const b = run(JSON.stringify({ cwd: root, prompt: 'seguimos', session_id: sid }));
  const c = run(JSON.stringify({ cwd: root, prompt: 'un cliente se queja de que el botón no anda', session_id: sid }));
  const d = run(JSON.stringify({ cwd: root, prompt: 'seguimos', session_id: 'otra-' + sid }));
  assert.match(a.stdout, /^sdlc: cycle 2026-10-08-lms \(today\) · stage 4 /); assert.strictEqual(b.stdout, '');
  assert.match(c.stdout, /new topic/); assert.match(d.stdout, /^sdlc: cycle 2026-10-08-lms \(today\) · stage 4 /);
  assert.deepStrictEqual([a.status, b.status, c.status, d.status], [0, 0, 0, 0]);
});
check('issue #26: an implement request on unplanned work repeats the line every time, as a fact with no opt-out suffix', () => {
  const root = tmpDir(); write(root, 'docs/specs/2026-11-09-x/spec.md', '# S\n\nEstado: **borrador**\n'); write(root, 'src/a.js', 'x\n');
  git(root, ['init', '-q']); git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A']); git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init']);
  const sid = 'selftest26-' + process.pid + '-' + Date.now();
  const a = run(JSON.stringify({ cwd: root, prompt: 'implementemos esto', session_id: sid }));
  const b = run(JSON.stringify({ cwd: root, prompt: 'implementemos esto', session_id: sid }));
  const c = run(JSON.stringify({ cwd: root, prompt: 'seguimos', session_id: sid }));
  for (const r of [a, b]) { assert.match(r.stdout, /no approved plan: the developer decides whether to plan first/); assert.doesNotMatch(r.stdout, /applies only/); }
  assert.match(c.stdout, /^sdlc: /);   // the line changed (no implement note), so it prints once more
});
const GIT_ID = [...NO_HOOKS, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false'];
function commitAt(root, msg, when) {
  const iso = new Date(when * 1000).toISOString();
  execFileSync('git', [...GIT_ID, 'add', '-A'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', [...GIT_ID, 'commit', '-qm', msg], { cwd: root, stdio: 'ignore', env: { ...process.env, GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso } });
}
const NOW = Math.floor(Date.now() / 1000), DAY = 86400;
check('#21 fixture: the map folder touched last is the cycle, not the finished 01-', () => {
  const root = tmpDir(); git(root, ['init', '-q']);
  write(root, 'docs/specs/01-iac/SPEC.md', '# S\nStatus: approved\n'); write(root, 'docs/specs/01-iac/PLAN.md', '# P\n'); write(root, 'src/a.js', 'x\n');
  commitAt(root, 'one', NOW - 5 * DAY);
  const d = 'docs/specs/03-fase1-servicio';
  write(root, d + '/MAPA.md', '# M\nPhase: development\nStatus: approved\n'); write(root, d + '/SPEC-anulacion.md', '# A\n'); write(root, d + '/SPEC-balanzas.md', '# B\n');
  write(root, d + '/PLAN.md', '# P\n'); write(root, d + '/tasks.md', '- [ ] a\n');
  commitAt(root, 'three', NOW - 3600);
  const r = run(JSON.stringify({ cwd: root, prompt: 'seguimos' }));
  assert.strictEqual(r.status, 0); assert.match(r.stdout, /^sdlc: cycle 03-fase1-servicio \(today\) · step 4\/4 implement/);
  assert.ok(!/01-iac/.test(r.stdout), r.stdout);
});
check('macritex fixture: abandoned cycle plus a newer orphan => low line, orphan first, no next', () => {
  const root = tmpDir(); git(root, ['init', '-q']); const d = 'docs/specs/2026-10-05-sesion-y-menu';
  write(root, d + '/spec.md', '# S\nPhase: testing\nStatus: approved\n'); write(root, d + '/plan.md', '# P\n'); write(root, d + '/tasks.md', '- [x] a\n- [ ] b\n');
  commitAt(root, 'cycle', NOW - 12 * DAY);
  for (let i = 0; i < 30; i++) { write(root, `src/f${i}.js`, String(i)); commitAt(root, 'src ' + i, NOW - 11 * DAY + i * 3600); }
  write(root, 'docs/spec-new.md', '# New spec\n');
  const r = run(JSON.stringify({ cwd: root, prompt: 'seguimos' }));
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /^sdlc: cycle 2026-10-05-sesion-y-menu \(12 days ago\) · not sure this is the current work: newer spec outside docs\/specs\/: docs\/spec-new\.md · run \/sdlc for the detail/);
  assert.ok(!/next:|step \d/.test(r.stdout), r.stdout);
});
check('macritex fixture without the orphan: low line with the stale reason', () => {
  const root = tmpDir(); git(root, ['init', '-q']); const d = 'docs/specs/2026-10-05-x';
  write(root, d + '/spec.md', '# S\nPhase: testing\nStatus: approved\n'); write(root, d + '/tasks.md', '- [x] a\n');
  commitAt(root, 'cycle', NOW - 12 * DAY);
  for (let i = 0; i < 12; i++) { write(root, `src/f${i}.js`, String(i)); commitAt(root, 'src ' + i, NOW - 10 * DAY + i * 3600); }
  const r = run(JSON.stringify({ cwd: root, prompt: 'x' }));
  assert.match(r.stdout, /not sure this is the current work: 2026-10-05-x untouched for 12 days and 12 commits · run \/sdlc/);
});
check('feature cycle in development: the line names the first open task', () => {
  const root = tmpDir(); const d = 'docs/specs/2026-11-07-export';
  write(root, d + '/feature.md', '# Feature\n\nPhase: development\nStatus: approved\n\n## Tasks\n\n- [x] T1 parse — evidence: node t.js\n- [ ] T2 write the CSV\n');
  write(root, 'src/a.js', 'x\n');
  git(root, ['init', '-q']); git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'add', '-A']);
  git(root, ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init']);
  const r = run(JSON.stringify({ cwd: root, prompt: 'seguimos' }));
  assert.match(r.stdout, /^sdlc: cycle 2026-11-07-export \(today\) · step 4\/4 implement \(build\) · next: T2 write the CSV$/m);
});
// Issue #27: PreToolUse on the Skill tool re-states the status when a family skill loads, once per session.
const skillStates = [];
function skillSid() { const s = 'selftest27-' + process.pid + '-' + Date.now() + '-' + skillStates.length; skillStates.push(path.join(os.tmpdir(), 'sdlc-assist-status', s + '.skill')); return s; }
process.on('exit', () => { for (const f of skillStates) try { fs.rmSync(f, { force: true }); } catch {} });
function pre(root, skill, sid) { return run(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: { skill }, cwd: root, session_id: sid })); }
check('issue #27: family skill in a cycle prints one PreToolUse JSON line starting with sdlc:, once per session', () => {
  const root = stagedRepo(); const sid = skillSid();
  const a = pre(root, 'planning-and-task-breakdown', sid); const b = pre(root, 'planning-and-task-breakdown', sid);
  assert.strictEqual(a.status, 0); assert.strictEqual(a.stdout.trim().split('\n').length, 1);
  const o = JSON.parse(a.stdout);
  assert.strictEqual(o.hookSpecificOutput.hookEventName, 'PreToolUse'); assert.match(o.hookSpecificOutput.additionalContext, /^sdlc: /);
  assert.deepStrictEqual([b.stdout, b.status], ['', 0]);
  assert.ok(!/permissionDecision/.test(a.stdout));
});
check('issue #27: the sdlc-assist: prefix is stripped', () => {
  const r = pre(stagedRepo(), 'sdlc-assist:spec-driven-development', skillSid());
  assert.match(JSON.parse(r.stdout).hookSpecificOutput.additionalContext, /^sdlc: /);
});
check('issue #27: sdlc and non-family skills print nothing', () => {
  const root = stagedRepo();
  for (const s of ['sdlc', 'sdlc-assist:sdlc', 'brainstorming', 'superpowers:test-driven-development']) { const r = pre(root, s, skillSid()); assert.deepStrictEqual([r.stdout, r.status], ['', 0]); }
});
check('issue #27: PreToolUse with malformed stdin, no skill, or no repo prints nothing, exit 0', () => {
  const a = run('not json'); const b = run(JSON.stringify({ hook_event_name: 'PreToolUse', cwd: stagedRepo() })); const c = pre(tmpDir(), 'sdlc-release', skillSid());
  assert.deepStrictEqual([a.stdout, b.stdout, c.stdout, a.status, b.status, c.status], ['', '', '', 0, 0, 0]);
});
check('issue #27: without a session_id the line prints every time', () => {
  const root = stagedRepo();
  assert.match(pre(root, 'sdlc-qa-gate', undefined).stdout, /^\{/); assert.match(pre(root, 'sdlc-qa-gate', undefined).stdout, /^\{/);
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
