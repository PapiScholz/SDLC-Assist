#!/usr/bin/env node
const assert = require('assert');
const { classifyRequest, PRECEDENCE, KEYWORDS } = require('./keywords');
let passed = 0, failed = 0;
function check(label, fn) { try { fn(); console.log('  ok   ' + label); passed++; } catch (e) { console.log('  FAIL ' + label + '\n       ' + e.message); failed++; } }
console.log('classifyRequest');
const cases = [
  ['I have an idea for X', 'idea'], ['customer complains about X', 'complaint'], ['add feature X', 'feature'],
  ['el login se rompe cuando X', 'bug'], ['the app crashes on start', 'bug'],
  ['un cliente se queja de que la app falla', 'complaint'], ['hotfix: typo in README', 'hotfix'],
  ['quiero agregar soporte para X', 'feature'], ['tengo una idea para X', 'idea'],
  ['continue', 'unknown'], ['', 'unknown'], [undefined, 'unknown'],
  ['El LOGIN SE ROMPIÓ', 'bug'], ['la función falla', 'bug'], ['address book feature', 'feature'],
  ['el cliente se queja de un typo', 'complaint'], ['please fix the export', 'bug'], ['there is an issue with login', 'bug'],
  ['something is wrong with totals', 'bug'], ['problem saving the form', 'bug'], ['hay que arreglar el login', 'bug'],
  ['no me deja entrar', 'bug'], ['el servidor se cayó', 'bug'], ['tengo un problema con el pago', 'bug'],
  ['quick fix for the header', 'hotfix'], ['prefix option for ids', 'unknown'],
  ['la API devuelve 500 desde ayer en producción', 'bug'], ['soporte para 500 usuarios', 'feature'],
  ['implementemos las propuestas de SPEC-usabilidad-pasos', 'feature'], ['implementá el módulo de balanzas', 'feature'],
  ['implementa esto', 'feature'], ['implementalo', 'feature'], ['implementen el plan', 'feature'],
  ['arrancá la implementación del panel', 'feature'], ['implementarlo hoy', 'feature'],  // issue #27 replay: voseo imperatives for removals and fixes gave no type, so no new-topic hint
  ['quitá el plan anual del Worker', 'feature'], ['eliminá el plan anual del Worker', 'feature'],
  ['sacá el aviso de CUIT', 'feature'], ['cambiá el remitente en el Worker', 'feature'],
  ['el Worker ofrece el plan anual y no debería, arreglalo', 'bug'], ['corregí el total del ticket', 'bug'],
  ['¿qué cambia con esto?', 'unknown'],
  ['hay que quitar el plan anual', 'feature'], ['hay que sacar el aviso', 'feature'], ['hay que eliminar la columna', 'feature'],
  ['hay que borrar el banner', 'feature'], ['hay que cambiar el remitente', 'feature'], ['hay que reemplazar el logo', 'feature'],
  ['el borrador del spec', 'unknown'],
];
for (const [msg, want] of cases) check(JSON.stringify(msg) + ' -> ' + want, () => assert.strictEqual(classifyRequest(msg), want));
check('precedence order is fixed (complaint first)', () => assert.deepStrictEqual(PRECEDENCE, ['complaint', 'hotfix', 'bug', 'feature', 'idea']));
check('every type has en and es lists', () => {
  for (const t of PRECEDENCE) { assert(KEYWORDS.en[t].length > 0, t + ' en'); assert(KEYWORDS.es[t].length > 0, t + ' es'); }
});
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
