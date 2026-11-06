const { shortName } = require('./confidence');
// One line for the agent: where the work is (stage, step) and what comes next. The agent says it to the developer
// in their own language; this line is never shown verbatim as a question.
function nextAction(r) {
  const staged = !!r.stage;
  switch (r.inferred) {
    case 'initial': return 'write the first spec from the situation';
    case 'analysis': return r.active ? `finish ${r.active.path} and get it approved` : 'write the spec for this request';
    case 'planning': return staged ? 'write the plan for this stage' : 'write the plan';
    case 'development': return 'implement the open tasks';
    case 'testing': return staged ? 'test this stage, then mark it [x] in plan.md' : 'test the change';
    default: return 'ship and close the cycle';
  }
}
// Stage names, paths and warnings come from the analysed repo and reach the agent's context through the hook:
// strip control characters, drop quotes from names and cap the length, so repo text cannot pass as a long instruction.
function safe(text, max) {
  const s = String(text).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}
function age(now, date) {
  if (now == null || date == null) return '';
  const days = Math.floor(Math.max(0, now - date) / 86400);
  return days === 0 ? ' (today)' : days === 1 ? ' (1 day ago)' : ` (${days} days ago)`;
}
// The line names the cycle it talks about. With low confidence it gives no step and no next action: only why the
// pick is in doubt and where to look (SKILL.md, Protocol).
function briefLine(r) {
  const parts = [];
  if (r.active) parts.push(`cycle ${safe(shortName(r.active.path), 60)}${age(r.now, r.active.date)}`);
  const conf = r.confidence;
  if (conf && conf.level === 'low' && conf.reasons.length) {
    parts.push('not sure this is the current work: ' + safe(conf.reasons[0].detail, 160), 'run /sdlc for the detail');
    return 'sdlc: ' + parts.join(' · ');
  }
  if (r.stage) parts.push(`stage ${r.stage.number} "${safe(String(r.stage.name).replace(/"/g, "'"), 60)}" (${r.stage.closed}/${r.stage.total} closed)`);
  parts.push(`step ${r.step.number}/4 ${r.step.name}${r.step.detail ? ' (' + r.step.detail + ')' : ''}`);
  parts.push('next: ' + safe(nextAction(r), 160));
  if ((r.alternatives || []).some(a => a.kind === 'new-cycle')) parts.push('this request may be a new topic: ask whether to keep it apart');
  if ((r.warnings || []).length) parts.push('note: ' + safe(r.warnings[0], 120));
  return 'sdlc: ' + parts.join(' · ');
}
module.exports = { briefLine, nextAction };
