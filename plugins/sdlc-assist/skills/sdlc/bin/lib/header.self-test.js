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
  assert.deepStrictEqual(parseHeader('Phase: shipping\nStatus: pondering\n'), { phase: null, status: 'draft' });
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
check('Spanish labels and values seen in real repos (ADR 0008)', () => {
  const cases = [
    ['# Mapa\n\nEstado: **aprobado** (2026-11-07).\n', 'approved'],                                       // dopamina map
    ['# M\n\nParte 2.9, segunda etapa. Metodo: x. Estado: **aprobada** (2026-11-09).\n', 'approved'],     // mid-line, after a sentence
    ['# S\n\nEstado: **borrador, esperando revisión** (2026-10-29).\n', 'draft'],
    ['# S\n**Fecha:** 2026-10-20 · **Estado:** Aprobado por el user (2026-10-20) · **Reemplaza a:** x\n', 'approved'], // field separators
    ['# S\n**Estado**: implementado 2026-09-14 (rama feat/x).\n', 'closed'],
    ['# S\n> **Estado:** implementado (2026-10-17), en `main` sin publicar.\n', 'closed'],                // blockquote
    ['# S\nEstado: **implementada** (2026-09-29).\n', 'closed'],
    ['# P\nEstado: **sin empezar**\n', 'draft'],
    ['# S\nStatus: accepted\n', 'approved'],
    ['# S\nStatus: implemented — v1.2.0\n', 'closed'],
  ];
  for (const [text, status] of cases) assert.strictEqual(parseHeader(text).status, status, text);
});
check('phase synonyms; done/shipped close the cycle', () => {
  assert.deepStrictEqual(parseHeader('Phase: specification\nStatus: approved (el user)\n'), { phase: 'analysis', status: 'approved' });
  assert.deepStrictEqual(parseHeader('Phase: plan\nStatus: approved\n'), { phase: 'planning', status: 'approved' });
  assert.deepStrictEqual(parseHeader('Fase: implementación\n'), { phase: 'development', status: 'draft' });
  assert.deepStrictEqual(parseHeader('Phase: done\nStatus: approved\n'), { phase: 'deployment', status: 'closed' });
  assert.deepStrictEqual(parseHeader('Phase: shipped\nStatus: implemented\n'), { phase: 'deployment', status: 'closed' });
});
check('an unrecognised value is skipped; a later field still sets it', () => {
  assert.deepStrictEqual(parseHeader('Estado: **bloques A y B listos**\nStatus: approved\n'), { phase: null, status: 'approved' });
});
check('"aprobada ... e implementada" closes; a negated or infinitive mention does not (Almacen, SGG)', () => {
  const st = t => parseHeader(t).status;
  assert.strictEqual(st('# S\n\nEstado: **aprobada** (2026-11-03) e implementada en la rama `x` (plan\n`docs/p.md`).\n'), 'closed');
  assert.strictEqual(st('# S\n\n> **Estado:** aprobado por el owner (2026-10-18, variante A) e\n> implementado el mismo día.\n> **Origen:** x\n'), 'closed');
  assert.strictEqual(st('# S\n\n> **Estado:** aprobado por el owner (2026-10-18), sin implementar. Plan: x\n'), 'approved');
  assert.strictEqual(st('# S\nEstado: aprobada, todavía no implementada.\n'), 'approved');
  assert.strictEqual(st('# S\nFecha: x · Estado: **aprobada** · Nota: lo implementado antes queda\n'), 'approved', 'stops at the next field');
  assert.strictEqual(st('# S\nEstado: aprobada.\n\nLo implementado en v1 se mantiene.\n'), 'approved', 'stops at a blank line');
});
check('hasHeaderLine sees Estado/Fase too', () => {
  assert.strictEqual(hasHeaderLine('# T\nEstado: **aprobada**\n'), true);
});
check('PHASES is the six slugs in cycle order', () => {
  assert.deepStrictEqual(PHASES, ['initial', 'analysis', 'planning', 'development', 'testing', 'deployment']);
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
