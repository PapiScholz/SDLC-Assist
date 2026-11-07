'use strict';
// Lines of a Markdown text outside ``` fences (column-0 triple backticks toggle), CRLF-normalised, each with its
// 1-based line number. The single fence rule of the skill: task counts, evidence and acceptance sections share it.
function unfencedEntries(text) {
  const out = [];
  let fenced = false;
  String(text).replace(/\r\n/g, '\n').split('\n').forEach((line, i) => {
    if (/^```/.test(line)) { fenced = !fenced; return; }
    if (!fenced) out.push({ n: i + 1, text: line });
  });
  return out;
}
function unfencedLines(text) { return unfencedEntries(text).map(e => e.text); }
module.exports = { unfencedLines, unfencedEntries };
