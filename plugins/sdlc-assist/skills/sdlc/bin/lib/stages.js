// Stages of a staged plan. A stage is closed only by a marker on its own row or heading: `[x]`, or the legacy
// check emoji (read, never written). Task checkboxes under a stage never close it. Two formats: a table under a
// heading named Stages/Etapas/Phases/Fases (one row per stage), or one heading per stage (`### Fase 1: ...`).
const { unfencedLines } = require('./unfenced');
const CHECK = String.fromCodePoint(0x2705);
const WORD = '(?:stage|etapa|phase|fase)';
const SEP = '[\\s:.\\-–—]';
const TABLE_TITLE = new RegExp('^#{2,4}\\s+' + WORD + 's?\\s*$', 'i');
const STAGE_HEADING = new RegExp('^#{1,4}\\s+' + WORD + '\\s+(\\d+)\\b' + SEP + '*(.*)$', 'i');
const ROW = /^\|\s*(\d+)\s*\|([^|]*)\|(.*)$/;
// The stage word leads the H1, optionally after "Tasks:", "Tasks for", "Tareas de la"; "# Tasks: finish phase 2" names none.
const TASKS_H1 = new RegExp('^#\\s+(?:(?:tasks?|tareas?)(?:\\s+(?:for|of|de\\s+la|del|de)|\\s*[:\\-–—]))?\\s*' + WORD + '\\s+(\\d+)\\b', 'i');
const DATE = /\b\d{4}-\d{2}-\d{2}\b/g;
const EDGE = new RegExp('^' + SEP + '+|' + SEP + '+$', 'g');
function isClosed(text) { return /\[x\]/i.test(text) || String(text).includes(CHECK); }
function clean(text) {
  return text.replace(/\*\*/g, '').replace(/\[x\]/gi, '').split(CHECK).join('').replace(DATE, '').replace(EDGE, '').trim();
}
function lines(markdown) { return unfencedLines(typeof markdown === 'string' ? markdown.replace(/\r\n/g, '\n') : ''); }
function parseStages(markdown) {
  const ls = lines(markdown);
  const t = ls.findIndex(l => TABLE_TITLE.test(l));
  if (t !== -1) {
    const out = [];
    for (const l of ls.slice(t + 1)) {
      if (/^#/.test(l)) break;
      const m = ROW.exec(l);
      if (m) out.push({ number: Number(m[1]), name: clean(m[2]), closed: isClosed(m[2] + m[3]) });   // marker anywhere on the row
    }
    if (out.length) return out;
  }
  return ls.map(l => STAGE_HEADING.exec(l)).filter(Boolean)
    .map(m => ({ number: Number(m[1]), name: clean(m[2]), closed: isClosed(m[2]) }));
}
function stageOfTasks(markdown) {
  const h1 = lines(markdown).find(l => /^#\s/.test(l));
  const m = h1 && TASKS_H1.exec(h1);
  return m ? Number(m[1]) : null;
}
module.exports = { parseStages, stageOfTasks, isClosed };
