#!/usr/bin/env node
const assert = require('assert');
const { parseStages, stageOfTasks, isClosed } = require('./stages');
let passed = 0, failed = 0;
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
const CHECK = String.fromCodePoint(0x2705);
const TABLE = '# Plan\n\n## Etapas\n\n| # | Etapa | Entregable |\n|---|---|---|\n' +
  '| 0 | **Prueba de R2** ' + CHECK + ' 2026-10-11 | x |\n| 1 | **Diseño** [x] 2026-10-12 | y |\n| 2 | **Ingreso y roles** | z |\n\n## Salida\n\n| 9 | not a stage | w |\n';
console.log('parseStages');
check('table under a Stages/Etapas heading: number, clean name, closed by [x] or legacy marker', () => {
  assert.deepStrictEqual(parseStages(TABLE), [
    { number: 0, name: 'Prueba de R2', closed: true },
    { number: 1, name: 'Diseño', closed: true },
    { number: 2, name: 'Ingreso y roles', closed: false },
  ]);
});
check('one heading per stage; task checkboxes under a heading never close it', () => {
  const md = '# Plan\n\n### Fase 0: Línea base [x]\n- [ ] t\n\n### Fase 1: Código\n- [x] a\n- [x] b\n\n## Stage 2 — Release\n';
  assert.deepStrictEqual(parseStages(md), [
    { number: 0, name: 'Línea base', closed: true },
    { number: 1, name: 'Código', closed: false },
    { number: 2, name: 'Release', closed: false },
  ]);
});
check('CRLF parses like LF; a fenced sample table is ignored', () => {
  assert.deepStrictEqual(parseStages(TABLE.replace(/\n/g, '\r\n')), parseStages(TABLE));
  const fenced = '# Plan\n\n```markdown\n## Stages\n| 1 | **A** [x] | x |\n```\n';
  assert.deepStrictEqual(parseStages(fenced), []);
});
check('no stages, empty and non-string input', () => {
  assert.deepStrictEqual(parseStages('# Plan\n\n## Steps\n- [ ] a\n'), []);
  assert.deepStrictEqual(parseStages(''), []);
  assert.deepStrictEqual(parseStages(null), []);
});
console.log('stageOfTasks / isClosed');
check('H1 that names a stage, in four languages of the keyword', () => {
  assert.strictEqual(stageOfTasks('# Etapa 3 — Ingreso y roles\n\n- [x] a\n'), 3);
  assert.strictEqual(stageOfTasks('# Tasks for Stage 12: billing\n'), 12);
  assert.strictEqual(stageOfTasks('# Fase 2\n'), 2);
  assert.strictEqual(stageOfTasks('# Phase 4 tasks\n'), 4);
});
check('H1 without a stage, a stage only in a later heading, no H1 => null', () => {
  assert.strictEqual(stageOfTasks('# Tasks: bug hunt\n\n## Stage 2\n'), null);
  assert.strictEqual(stageOfTasks('- [ ] a\n'), null);
  assert.strictEqual(stageOfTasks(undefined), null);
});
check('isClosed: [x] in either case, legacy marker; [ ] is open', () => {
  assert.strictEqual(isClosed('**A** [X]'), true);
  assert.strictEqual(isClosed('A ' + CHECK), true);
  assert.strictEqual(isClosed('A [ ]'), false);
});
console.log('final review fixes');
check('REVIEW: a marker in a separate status column closes the stage; name stays the name cell', () => {
  assert.deepStrictEqual(parseStages('## Stages\n\n| # | Stage | Status |\n|---|---|---|\n| 1 | Diseño | [x] |\n| 2 | Código | |\n'),
    [{ number: 1, name: 'Diseño', closed: true }, { number: 2, name: 'Código', closed: false }]);
});
check('REVIEW: the stage word must lead the tasks.md H1 (optionally after "Tasks:" / "Tasks for")', () => {
  assert.strictEqual(stageOfTasks('# Tasks: finish phase 2 cleanup\n'), null);
  assert.strictEqual(stageOfTasks('# Tasks — Etapa 3\n'), 3);
  assert.strictEqual(stageOfTasks('# Tareas de la etapa 5\n'), 5);
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
