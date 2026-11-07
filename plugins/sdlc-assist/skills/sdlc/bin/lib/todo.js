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
module.exports = { countTasks, firstOpen, withoutEvidence };
