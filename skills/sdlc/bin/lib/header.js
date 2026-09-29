const PHASES = ['initial', 'analysis', 'planning', 'development', 'testing', 'deployment'];
const STATUSES = ['draft', 'approved', 'closed'];
const HEADER_LINES = 15;
const PHASE_RE = /^[*_]{0,2}Phase[*_]{0,2}:[*_]{0,2}\s*[*_]{0,2}([A-Za-z-]+)/i;
const STATUS_RE = /^[*_]{0,2}Status[*_]{0,2}:[*_]{0,2}\s*[*_]{0,2}([A-Za-z-]+)/i;
function stripFrontmatter(lines) {
  if ((lines[0] || '').trim() !== '---') return lines;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  return end > 0 ? lines.slice(end + 1) : lines;
}
function parseHeader(text) {
  const lines = stripFrontmatter(String(text || '').split(/\r?\n/)).slice(0, HEADER_LINES);
  let phase = null, status = null;
  for (const line of lines) {
    let m = PHASE_RE.exec(line);  if (m && phase === null) phase = m[1].toLowerCase();
    m = STATUS_RE.exec(line);     if (m && status === null) status = m[1].toLowerCase();
  }
  return { phase: PHASES.includes(phase) ? phase : null, status: STATUSES.includes(status) ? status : 'draft' };
}
module.exports = { parseHeader, PHASES, STATUSES };
