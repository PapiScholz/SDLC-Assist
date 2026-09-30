'use strict';
// Lines of a Markdown text outside ``` fences (column-0 triple backticks toggle), CRLF-normalised.
function unfencedLines(text) {
  const out = [];
  let fenced = false;
  for (const line of String(text).replace(/\r\n/g, '\n').split('\n')) {
    if (/^```/.test(line)) { fenced = !fenced; continue; }
    if (!fenced) out.push(line);
  }
  return out;
}
module.exports = { unfencedLines };
