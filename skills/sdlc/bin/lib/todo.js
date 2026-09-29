const OPEN = /^\s*(?:[-*]|\d+\.)\s+\[[ \-~]\]/gm;
const DONE = /^\s*(?:[-*]|\d+\.)\s+\[x\]/gim;
function countTasks(markdown) {
  const text = String(markdown || '');
  const open = (text.match(OPEN) || []).length;
  const done = (text.match(DONE) || []).length;
  return { open, done, total: open + done };
}
module.exports = { countTasks };
