const PHASES = ['initial', 'analysis', 'planning', 'development', 'testing', 'deployment'];
const STATUSES = ['draft', 'approved', 'closed'];
const HEADER_LINES = 15;
// A label (English or Spanish) where a header field can start: at line start (optionally inside a `>` quote),
// after a `·`/`•` field separator, or after a sentence end (`.`/`;` and a space). Never inside a table cell or
// a code span. Group 1: the label; group 2: the first one or two words of the value, bold markers skipped.
const FIELD_RE = /(?:^\s*(?:>\s*)?|[·•]\s*|[.;]\s+)[*_]{0,2}(phase|fase|status|estado)[*_]{0,2}\s*:\s*[*_]{0,2}\s*([\p{L}-]+(?:\s+[\p{L}-]+)?)/giu;
// Value vocabulary, matched on the first word after accents are removed (ADR 0008).
const PHASE_WORDS = {
  initial: 'initial', analysis: 'analysis', analisis: 'analysis', specification: 'analysis', spec: 'analysis', especificacion: 'analysis',
  planning: 'planning', plan: 'planning', planificacion: 'planning',
  development: 'development', implement: 'development', implementation: 'development', desarrollo: 'development', implementacion: 'development',
  testing: 'testing', pruebas: 'testing',
  deployment: 'deployment', done: 'deployment', shipped: 'deployment',
};
const CLOSING_PHASES = new Set(['done', 'shipped']);   // a phase that says the work is over also closes it
const STATUS_WORDS = {
  draft: 'draft', borrador: 'draft', sin: 'draft', esperando: 'draft', pendiente: 'draft',
  approved: 'approved', accepted: 'approved', aprobada: 'approved', aprobado: 'approved',
  closed: 'closed', done: 'closed', implemented: 'closed', shipped: 'closed', implementado: 'closed', implementada: 'closed',
  cerrado: 'closed', cerrada: 'closed', terminado: 'closed', terminada: 'closed',
};
function stripFrontmatter(lines) {
  if ((lines[0] || '').trim() !== '---') return lines;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  return end > 0 ? lines.slice(end + 1) : lines;
}
function headerLines(text) {   // a leading UTF-8 BOM would hide a frontmatter fence or a first-line header
  return stripFrontmatter(String(text || '').replace(/^﻿/, '').split(/\r?\n/)).slice(0, HEADER_LINES);
}
function firstWord(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/)[0]; }
function fields(line) {
  const out = [];
  for (const m of line.matchAll(FIELD_RE)) {
    const rest = line.slice(m.index + m[0].length).split(/[·•]/)[0];   // the field's text runs to the next separator
    out.push({ kind: /^(phase|fase)$/i.test(m[1]) ? 'phase' : 'status', word: firstWord(m[2]), rest });
  }
  return out;
}
// "aprobada (...) e implementada": an approved status whose own text says the work was done is closed (ADR 0008).
// A negation right before the word ("no implementado", "todavía no implementada") keeps it approved; the infinitive
// ("sin implementar") never matches.
const DONE_WORDS = /(?:^|[^a-z])(?:(no|sin|not|without|falta|todavia)\s+)?(?:implementad[oa]s?|implemented|shipped|cerrad[oa]s?|terminad[oa]s?)(?=$|[^a-z])/g;
function saysDone(text) {
  const t = String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return [...t.matchAll(DONE_WORDS)].some(m => !m[1]);
}
// The status field's text: the rest of its line, then the next header lines up to a blank line or another field
// (a leading `>` of a quoted header is dropped).
function statusText(lines, i, rest) {
  const parts = [rest];
  for (let j = i + 1; j < lines.length; j++) {
    const l = lines[j].replace(/^\s*>\s?/, '');
    if (!l.trim() || fields(lines[j]).length) break;
    parts.push(l);
  }
  return parts.join(' ');
}
// The first recognised value of each field wins; an unrecognised value is skipped so a later line can still set it.
function parseHeader(text) {
  let phase = null, status = null, closes = false;
  const lines = headerLines(text);
  lines.forEach((line, i) => { for (const f of fields(line)) {
    if (f.kind === 'phase' && phase === null && PHASE_WORDS[f.word]) { phase = PHASE_WORDS[f.word]; closes = CLOSING_PHASES.has(f.word); }
    if (f.kind === 'status' && status === null && STATUS_WORDS[f.word]) {
      status = STATUS_WORDS[f.word];
      if (status === 'approved' && saysDone(statusText(lines, i, f.rest))) status = 'closed';
    }
  } });
  if (closes) status = 'closed';
  return { phase, status: status || 'draft' };
}
// True when the header zone has a Phase/Status field at all (any value, either language).
function hasHeaderLine(text) { return headerLines(text).some(l => fields(l).length > 0); }
module.exports = { parseHeader, hasHeaderLine, PHASES, STATUSES };
