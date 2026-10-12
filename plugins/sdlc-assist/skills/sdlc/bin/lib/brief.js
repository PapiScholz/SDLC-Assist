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
function briefLine(r) {
  const parts = [];
  if (r.stage) parts.push(`stage ${r.stage.number} "${r.stage.name}" (${r.stage.closed}/${r.stage.total} closed)`);
  parts.push(`step ${r.step.number}/4 ${r.step.name}${r.step.detail ? ' (' + r.step.detail + ')' : ''}`);
  parts.push('next: ' + nextAction(r));
  if ((r.alternatives || []).some(a => a.kind === 'new-cycle')) parts.push('this request may be a new topic: ask whether to keep it apart');
  if ((r.warnings || []).length) parts.push('note: ' + r.warnings[0]);
  return 'sdlc: ' + parts.join(' · ');
}
module.exports = { briefLine, nextAction };
