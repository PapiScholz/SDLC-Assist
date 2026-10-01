const { unfencedLines } = require('./unfenced');
const OPEN = /^\s*(?:[-*]|\d+\.)\s+\[[ \-~]\]/;
const DONE = /^\s*(?:[-*]|\d+\.)\s+\[x\]/i;
// Checkboxes inside ``` fences are samples (a plan quoting a checklist), not tasks.
function countTasks(markdown) {
  let open = 0, done = 0;
  for (const line of unfencedLines(markdown || '')) {
    if (OPEN.test(line)) open++;
    else if (DONE.test(line)) done++;
  }
  return { open, done, total: open + done };
}
module.exports = { countTasks };
