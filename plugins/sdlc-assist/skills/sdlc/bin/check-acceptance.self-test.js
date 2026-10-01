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
const SCRIPT = path.join(__dirname, 'check-acceptance.js');
const HEADER = '# Spec: x\n\nPhase: analysis\nStatus: draft\n\n';

// Fixture: a repo root with the given spec files ({ relPath: text }).
function run(files, args = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chkacc-'));
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  }
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });
  fs.rmSync(root, { recursive: true, force: true });
  return { ...r, all: (r.stdout || '') + (r.stderr || '') };
}
const spec = (acceptance, open = '(none)') =>
  HEADER + '## Objective\n\nx\n\n## Open Questions\n\n' + open + '\n\n## Acceptance\n\n' + acceptance + '\n';

console.log('check-acceptance');

check('five EARS shapes pass, summary says 0 not EARS, exit 0', () => {
  const r = run({ 'docs/specs/a.md': spec([
    '- THE SYSTEM SHALL report the field.',
    '- WHEN a folder spec exists, THE SYSTEM SHALL list it.',
    '- WHILE two cycles are active, THE ROUTER SHALL not warn.',
    '- IF a bullet matches no shape, THEN THE SYSTEM SHALL print it.',
    '- WHERE a constitution exists, `where.js` SHALL cite it.',
  ].join('\n')) });
  assert.strictEqual(r.status, 0, r.all);
  assert.ok(/1 specs?, 5 bullets, 0 not EARS/.test(r.all), r.all);
  assert.ok(!/warn/.test(r.all), r.all);
});

check('prose bullet warns with file and line, still exit 0', () => {
  const r = run({ 'docs/specs/a.md': spec('- THE SYSTEM SHALL do x.\n- the dashboard loads fast') });
  assert.strictEqual(r.status, 0, r.all);
  assert.ok(/warn docs\/specs\/a\.md:\d+ not EARS: the dashboard loads fast/.test(r.all), r.all);
  assert.ok(/2 bullets, 1 not EARS/.test(r.all), r.all);
});

check('numbered bullets and lower-case keywords are accepted', () => {
  const r = run({ 'docs/specs/a.md': spec('1. when x, the system shall y.\n2. The System SHALL z.') });
  assert.ok(/2 bullets, 0 not EARS/.test(r.all), r.all);
});

check('missing ## Acceptance warns once and counts 0 bullets', () => {
  const r = run({ 'docs/specs/a.md': HEADER + '## Objective\n\nx\n' });
  assert.strictEqual(r.status, 0, r.all);
  assert.ok(/warn docs\/specs\/a\.md: no ## Acceptance/.test(r.all), r.all);
  assert.ok(/1 specs?, 0 bullets/.test(r.all), r.all);
});

check('open questions: "(none)" is silent, a bullet warns with the count', () => {
  const quiet = run({ 'docs/specs/a.md': spec('- THE SYSTEM SHALL x.') });
  assert.ok(!/open question/.test(quiet.all), quiet.all);
  const r = run({ 'docs/specs/a.md': spec('- THE SYSTEM SHALL x.', '- Which port?\n- Who owns it?') });
  assert.strictEqual(r.status, 0, r.all);
  assert.ok(/warn docs\/specs\/a\.md: 2 open questions/.test(r.all), r.all);
});

check('--strict exits 1 when anything warned, 0 when clean', () => {
  assert.strictEqual(run({ 'docs/specs/a.md': spec('- THE SYSTEM SHALL x.') }, ['--strict']).status, 0);
  assert.strictEqual(run({ 'docs/specs/a.md': spec('- prose') }, ['--strict']).status, 1);
  assert.strictEqual(run({ 'docs/specs/a.md': spec('- THE SYSTEM SHALL x.', '- open?') }, ['--strict']).status, 1);
  assert.strictEqual(run({ 'docs/specs/a.md': HEADER }, ['--strict']).status, 1);
});

check('fenced code inside Acceptance is ignored', () => {
  const r = run({ 'docs/specs/a.md': spec('- THE SYSTEM SHALL x.\n\n```\n- not a requirement\n```') });
  assert.ok(/1 bullets, 0 not EARS/.test(r.all), r.all);
});

check('flat docs/specs/*.md, root spec.md and root SPEC-*.md are all scanned', () => {
  const r = run({
    'docs/specs/a.md': spec('- THE SYSTEM SHALL x.'),
    'spec.md': spec('- THE SYSTEM SHALL y.'),
    'SPEC-z.md': spec('- prose'),
  });
  assert.ok(/3 specs, 3 bullets, 1 not EARS/.test(r.all), r.all);
  assert.ok(/warn SPEC-z\.md:\d+ not EARS/.test(r.all), r.all);
});

check('a spec without a Phase/Status header is skipped (not a cycle)', () => {
  const r = run({ 'docs/specs/notes.md': '# Notes\n\n## Acceptance\n\n- prose\n' });
  assert.ok(/0 specs, 0 bullets/.test(r.all), r.all);
  assert.strictEqual(r.status, 0);
});

check('a closed spec is skipped unless --all', () => {
  const closed = spec('- prose').replace('Status: draft', 'Status: closed');
  assert.ok(/0 specs, 0 bullets/.test(run({ 'docs/specs/a.md': closed }).all));
  assert.ok(/1 specs?, 1 bullets, 1 not EARS/.test(run({ 'docs/specs/a.md': closed }, ['--all']).all));
});

check('multi-word subjects: THE ACCEPTANCE CHECK SHALL, the plugin directory shall', () => {
  const r = run({ 'docs/specs/a.md': spec('- IF x, THEN THE ACCEPTANCE CHECK SHALL print it.\n- WHEN y, the plugin directory shall list it.') });
  assert.ok(/2 bullets, 0 not EARS/.test(r.all), r.all);
});

check('no specs at all: summary with zeros, exit 0', () => {
  const r = run({});
  assert.strictEqual(r.status, 0, r.all);
  assert.ok(/0 specs, 0 bullets, 0 not EARS/.test(r.all), r.all);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
