// The developer's view of the active cycle (issue #35, where.js --status): a short fenced block computed from the
// repository, so it holds whether or not the agent reports. It shows file state, not intent: "next" is the first open
// task, not what the agent is doing. Repo text goes through safe(), like the hook line.
const { safe } = require('./brief');
const base = p => String(p).split('/').pop();
const dir = p => String(p).replace(/[^/]+$/, '');
function row(label, value) { return (label + '      ').slice(0, 7) + safe(value, 160); }
// Stage n of m: the router's staged view when it found one, else the first open stage of a plan with two or more
// stages (a plan the router reads as single-pass still has stages the developer wants to see).
function stageOf(r, s) {
  if (r.stage) return r.stage;
  const list = (s.stages && s.stages.list) || [];
  const open = list.find(x => !x.closed);
  return list.length >= 2 && open ? { number: open.number, name: open.name, total: list.length } : null;
}
function statusBlock(r) {
  const s = r.signals;
  // Timed out first: a git that did not answer also reads as "not a repository".
  if (s.gitTimedOut) return 'sdlc status: incomplete, git did not answer in time; run it again';
  if (!s.git || !s.git.isRepo) return 'sdlc status: not a git repository, so no cycle to show';
  if (!r.active) return 'sdlc status: no active cycle in this repository (no open spec under docs/specs)';
  const spec = s.specs.find(x => x.path === r.active.path) || { header: {} };
  const h = spec.header || {};
  const feature = r.active.kind === 'feature';
  const todo = s.todo || {};
  const done = todo.exists ? `${todo.done} of ${todo.total} done` : null;
  const lines = [
    row('cycle', dir(r.active.path)),
    row('spec', `${base(r.active.path)} · Phase: ${h.phase || 'none'} · Status: ${h.status || 'draft'}`),
    row('plan', feature ? `tasks in ${base(r.active.path)}, ${done || '0 of 0 done'}`
      : `${base((s.plan && s.plan.path) || 'plan.md')}: ${s.plan && s.plan.exists ? 'yes' : 'no'} · ${base(todo.path || 'tasks.md')}: ${todo.exists ? 'yes, ' + done : 'no'}`),
  ];
  const st = stageOf(r, s);
  if (st) lines.push(row('stage', `${st.number} of ${st.total}, ${st.name}`));
  lines.push(row('step', `${r.step.number}/4 ${r.step.name}`));
  if (r.nextTask) lines.push(row('next', r.nextTask));
  if (r.confidence && r.confidence.level === 'low' && r.confidence.reasons[0]) lines.push(row('doubt', r.confidence.reasons[0].detail || r.confidence.reasons[0].kind));
  else if (r.warnings && r.warnings.length) lines.push(row('note', r.warnings.join('; ')));
  return ['```', ...lines, '```'].join('\n');
}
module.exports = { statusBlock };
