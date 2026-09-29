#!/usr/bin/env node
const assert = require('assert');
const { parseHeader, hasHeaderLine, PHASES } = require('./header');
let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); console.log('  ok   ' + label); passed++; }
  catch (err) { console.log('  FAIL ' + label); console.log('       ' + err.message); failed++; }
}
console.log('parseHeader');
check('reads Phase and Status after the H1', () => {
  const r = parseHeader('# Spec\n\nPhase: development\nStatus: approved\nDate: x\n');
  assert.deepStrictEqual(r, { phase: 'development', status: 'approved' });
});
check('missing Status => draft, missing Phase => null', () => {
  assert.deepStrictEqual(parseHeader('# T\n\nsome text\n'), { phase: null, status: 'draft' });
});
check('first token only, case-insensitive, trailing text ignored', () => {
  const r = parseHeader('Phase: PLANNING (was analysis)\nStatus: Approved, by owner\n');
  assert.deepStrictEqual(r, { phase: 'planning', status: 'approved' });
});
check('skips YAML frontmatter, then scans 15 lines', () => {
  const fm = '---\ntitle: x\nPhase: testing\n---\n';
  const r = parseHeader(fm + '# T\nPhase: analysis\nStatus: closed\n');
  assert.deepStrictEqual(r, { phase: 'analysis', status: 'closed' });
});
check('ignores header lines beyond line 15', () => {
  const pad = Array(15).fill('x').join('\n');
  assert.deepStrictEqual(parseHeader(pad + '\nPhase: testing\n'), { phase: null, status: 'draft' });
});
check('a Phase: mention inside a table or code line is not at line start', () => {
  const r = parseHeader('# T\n| Phase: | x |\n`Phase: testing`\n');
  assert.deepStrictEqual(r, { phase: null, status: 'draft' });
});
check('CRLF input does not leak \\r into tokens', () => {
  const r = parseHeader('# T\r\nPhase: development\r\nStatus: approved\r\n');
  assert.deepStrictEqual(r, { phase: 'development', status: 'approved' });
});
check('unknown slug => phase null, unknown status => draft', () => {
  assert.deepStrictEqual(parseHeader('Phase: shipping\nStatus: done\n'), { phase: null, status: 'draft' });
});
check('empty text', () => { assert.deepStrictEqual(parseHeader(''), { phase: null, status: 'draft' }); });
check('bold forms **Phase:** x and **Phase**: x both parse', () => {
  assert.deepStrictEqual(parseHeader('# T\n**Phase:** development\n**Status:** approved\n'), { phase: 'development', status: 'approved' });
  assert.deepStrictEqual(parseHeader('**Phase**: testing\n__Status__: closed\n'), { phase: 'testing', status: 'closed' });
});
check('leading UTF-8 BOM is stripped (first line and frontmatter fence still parse)', () => {
  const BOM = String.fromCharCode(0xFEFF);
  assert.deepStrictEqual(parseHeader(BOM + 'Phase: testing\nStatus: approved\n'), { phase: 'testing', status: 'approved' });
  assert.deepStrictEqual(parseHeader(BOM + '---\nPhase: analysis\n---\n# T\nPhase: planning\n'), { phase: 'planning', status: 'draft' });
});
check('hasHeaderLine: true with Phase or Status line, false without', () => {
  assert.strictEqual(hasHeaderLine('# T\nStatus: draft\n'), true);
  assert.strictEqual(hasHeaderLine('# T\n**Phase:** whatever\n'), true);
  assert.strictEqual(hasHeaderLine('# Module\n\nJust text.\n'), false);
});
check('PHASES is the six slugs in cycle order', () => {
  assert.deepStrictEqual(PHASES, ['initial', 'analysis', 'planning', 'development', 'testing', 'deployment']);
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
