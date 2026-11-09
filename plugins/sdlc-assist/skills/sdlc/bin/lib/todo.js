const { unfencedLines, unfencedEntries } = require('./unfenced');
const OPEN = /^\s*(?:[-*]|\d+\.)\s+\[[ \-~]\]\s*(.*?)\s*$/;   // group 1: the task text
const DONE = /^\s*(?:[-*]|\d+\.)\s+\[x\]/i;
// The proof of a done task: `evidence:` after a separator (em or en dash, `-`, `--`, `;` or `|`) and something
// after it. `evidence:` inside the task's own words, or with nothing after it, is not a proof.
const EVIDENCE = /(?:—|–|--?|;|\|)\s*evidence:\s*\S/i;
// Checkboxes inside ``` fences are samples (a plan quoting a checklist), not tasks.
function countTasks(markdown) {
  let open = 0, done = 0;
  for (const line of unfencedLines(markdown || '')) {
    if (OPEN.test(line)) open++;
    else if (DONE.test(line)) done++;
  }
  return { open, done, total: open + done };
}
// The next task to work on: text of the first open checkbox that has text, marker stripped; null when none.
function firstOpen(markdown) {
  for (const line of unfencedLines(markdown || '')) { const m = OPEN.exec(line); if (m && m[1]) return m[1]; }
  return null;
}
// Done tasks without a proof (1-based line numbers, fences skipped). The convention is
// `- [x] T3 <text> — evidence: <command, test or file>`; missing evidence warns and never blocks.
function withoutEvidence(markdown) {
  return unfencedEntries(markdown || '').filter(e => DONE.test(e.text) && !EVIDENCE.test(e.text)).map(e => e.n);
}
// Words of a title, lowercase, accents and punctuation gone: "Spec: Usabilidad, segunda vuelta" -> "spec usabilidad segunda vuelta".
function words(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
// A module's own title from its H1: no `#`, no `Spec:`/`Spec —` prefix, nothing from the first parenthesis on.
// Under two words it is too generic to match a plan heading, so it yields ''.
function moduleTitle(h1) {
  const t = words(String(h1 || '').replace(/^#+\s*/, '').replace(/^spec\s*[:—–-]\s*/i, '').replace(/\(.*$/, ''));
  return t.split(' ').length >= 2 ? t : '';
}
// The tasks of the plan sections that belong to a module: the section names its file (a link or a mention of
// `SPEC-x.md`, any case) or its heading carries the module's title. A section is a `#` or `##` heading and
// everything under it up to the next such heading. Null when no section belongs to it: no plan for that module yet.
function sectionTasks(markdown, fileName, title) {
  const name = String(fileName).toLowerCase(), own = moduleTitle(title), sections = [];
  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (/^#{1,2}\s/.test(line) || !sections.length) sections.push([]);
    sections[sections.length - 1].push(line);
  }
  const mine = s => s.join('\n').toLowerCase().includes(name) || (!!own && /^#{1,2}\s/.test(s[0]) && (' ' + words(s[0]) + ' ').includes(' ' + own + ' '));
  const ownText = sections.filter(mine).map(s => s.join('\n')).join('\n');
  return ownText ? { ...countTasks(ownText), next: firstOpen(ownText) } : null;
}
module.exports = { countTasks, firstOpen, withoutEvidence, sectionTasks };
