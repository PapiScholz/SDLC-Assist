const { PHASES } = require('./header');
const EVIDENCE = { NO_RULE: 'no rule matched', PLAN_STALE: 'plan belongs to a closed cycle', NO_TASKS: 'todo has no tasks',
  DEPLOY_HEADER_ONLY: 'deployment is header-only; tie goes to testing', TESTS_NOT_RUN: 'tests not run (no --run-tests)',
  NO_TODO: 'no tasks/todo.md: planning, development and testing cannot be distinguished',
  CLOSE_CYCLE: 'semver tag on HEAD: recommend closing the cycle',
  NO_PLAN_CYCLE: 'plan present but no active spec to compare against; treated as current' };
const NEW_CYCLE_TYPES = ['complaint', 'bug', 'feature'];
const phaseIndex = p => PHASES.indexOf(p);
function effectiveDate(f) {
  if (!f.tracked || f.lastCommit == null) return f.mtime;
  if (f.dirty && f.mtime != null && f.mtime > f.lastCommit) return f.mtime;
  return f.lastCommit;
}
function specStart(s) { return s.tracked && s.firstCommit != null ? s.firstCommit : s.mtime; }
function planDate(p) { return p.tracked && p.lastCommit != null ? p.lastCommit : p.mtime; }
function planIsCurrent(p, active) {
  if (!p || !p.exists) return false;
  if (!active) return true;
  return planDate(p) >= specStart(active);
}
function strip(c) { const { _raw, ...rest } = c; return rest; }
function infer(signals, request) {
  const evidence = [], warnings = [], alternatives = [];
  const cycles = signals.specs
    .map(s => ({ path: s.path, phase: s.header.phase, status: s.header.status, date: effectiveDate(s), tracked: s.tracked, dirty: s.dirty, _raw: s }))
    .sort((a, b) => b.date - a.date || (a.path < b.path ? -1 : 1));
  const active = cycles.find(c => c.status !== 'closed') || null;
  cycles.forEach(c => { c.active = c === active; });
  const approved = !!active && active.status === 'approved';
  const planCurrent = planIsCurrent(signals.plan, active && active._raw);
  if (signals.plan.exists && !planCurrent && active) evidence.push(`${EVIDENCE.PLAN_STALE}: ${signals.plan.path} last commit ${planDate(signals.plan)} < ${active.path} first commit ${specStart(active._raw)}`);
  if (signals.plan.exists && !active) evidence.push(EVIDENCE.NO_PLAN_CYCLE);
  const todo = planCurrent ? signals.todo : { ...signals.todo, open: 0, done: 0, total: 0 };   // a stale plan drags its todo along
  if (planCurrent && !signals.todo.exists) evidence.push(EVIDENCE.NO_TODO);
  const candidates = [];
  if (signals.sourceFiles.count === 0 && cycles.length === 0) candidates.push('initial');
  if (!approved) candidates.push('analysis');
  if (approved && (!planCurrent || todo.total === 0)) candidates.push('planning');
  if (planCurrent && todo.open > 0) candidates.push('development');
  if (planCurrent && todo.total > 0 && todo.open === 0) candidates.push('testing');
  candidates.sort((a, b) => phaseIndex(a) - phaseIndex(b));
  const fallback = candidates[0] || 'analysis';
  if (!candidates.length) evidence.push(EVIDENCE.NO_RULE);
  if (approved && planCurrent && todo.total === 0) evidence.push(EVIDENCE.NO_TASKS);
  const headerPhase = active && active.phase;
  const deployTie = headerPhase === 'deployment' && fallback === 'testing';   // deployment is header-only: testing is its expected fallback
  if (deployTie || (fallback === 'testing' && !headerPhase)) evidence.push(EVIDENCE.DEPLOY_HEADER_ONLY);
  evidence.push(`fallback: ${fallback} (candidates: ${candidates.join(', ') || 'none'})`);
  let inferred = fallback;
  if (active && active.phase) {
    inferred = active.phase;
    evidence.unshift(`header Phase: ${active.phase}, Status: ${active.status} (${active.path})`);
    if (active.phase !== fallback && !deployTie) { warnings.push(`header says ${active.phase} but artifacts say ${fallback}`); alternatives.push({ phase: fallback, kind: 'fallback', reason: 'header disagrees with fallback' }); }
    if (['development', 'testing', 'deployment'].includes(active.phase) && !approved) warnings.push(`header ${active.phase} without an approved spec`);
    if (active.phase === 'deployment' && signals.git.tagOnHead) evidence.push(EVIDENCE.CLOSE_CYCLE);
  }
  if (active && NEW_CYCLE_TYPES.includes(request.type)) alternatives.push({ phase: 'analysis', kind: 'new-cycle', reason: `request type ${request.type} while a cycle is active` });
  for (const c of candidates) if (c !== inferred && !alternatives.some(a => a.phase === c)) alternatives.push({ phase: c, kind: 'candidate', reason: 'fallback row also holds' });
  if (signals.tests.status === 'unknown') evidence.push(EVIDENCE.TESTS_NOT_RUN);
  if (signals.inProduction) evidence.push(`in production: tag ${signals.git.lastSemverTag.name}`);
  return { inferred, fallback, candidates, evidence, alternatives: alternatives.slice(0, 3), warnings, active: active && strip(active), cycles: cycles.map(strip) };
}
module.exports = { infer, effectiveDate, planIsCurrent, EVIDENCE };
