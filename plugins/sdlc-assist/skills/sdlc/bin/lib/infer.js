const { PHASES } = require('./header');
const { stepOf } = require('./steps');
const { assessConfidence, shortName } = require('./confidence');
// What the agent should do about each reason that lowers the confidence; `released` keeps its own warning.
const REASON_HINT = {
  orphan: d => `${d}: if that is the current work, move it to docs/specs/<date>-<slug>/spec.md with a header`,
  stale: d => `${d}: is it still the current work? if not, run sdlc close or open a new cycle`,
  contested: d => `${d}: ask which cycle is the current one`,
};
const EVIDENCE = { NO_RULE: 'no rule matched', PLAN_STALE: 'plan belongs to a closed cycle', NO_TASKS: 'todo has no tasks',
  DEPLOY_HEADER_ONLY: 'deployment is header-only; tie goes to testing', TESTS_NOT_RUN: 'tests not run (no --run-tests)',
  NO_TODO: 'no todo file: planning, development and testing cannot be distinguished',
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
  if (active.layout === 'folder') return true;   // the plan beside spec.md belongs to that cycle by construction
  return planDate(p) >= specStart(active);
}
function strip(c) { const { _raw, ...rest } = c; return rest; }
// Newest last activity first (every file of a folder cycle, the spec alone for a flat one: ADR 0006); the active
// cycle is the first one not closed. On a tie the larger path wins, so a newer date-prefixed slug beats an older one.
// Shared with signals.js, which resolves the active cycle's plan/todo pair with the same ranking.
function rankCycles(specs) {
  return specs
    .map(s => ({ path: s.path, kind: s.kind || 'spec', phase: s.header.phase, status: s.header.status, date: s.lastActivity != null ? s.lastActivity : effectiveDate(s), tracked: s.tracked, dirty: s.dirty, _raw: s }))
    .sort((a, b) => b.date - a.date || (a.path < b.path ? 1 : a.path > b.path ? -1 : 0));
}
function pickActive(specs) { const c = rankCycles(specs).find(c => c.status !== 'closed'); return c ? c._raw : null; }
// Staged mode: 2+ stages and an explicit signal (a closed stage, or tasks.md naming its stage). Without that signal a
// plan with `### Phase 1:` headings is a single-pass plan and keeps v0.11.1 behavior. Returns null outside staged mode.
function stagedView(stages, eligible, todo) {
  const list = (stages && stages.list) || [];
  const tasksStage = stages ? stages.tasksStage : null;
  if (!eligible || list.length < 2 || (!list.some(s => s.closed) && tasksStage == null)) return null;
  const firstOpen = list.find(s => !s.closed) || null;
  const own = tasksStage == null ? null : list.find(s => s.number === tasksStage) || null;
  const view = { total: list.length, closed: list.filter(s => s.closed).length, current: null, phase: null, warning: null };
  if (!firstOpen) return view;
  if (todo.open > 0) return { ...view, current: own || firstOpen, phase: 'development' };
  if (todo.total === 0 || (own && own.closed)) return { ...view, current: firstOpen, phase: 'planning' };
  return { ...view, current: own || firstOpen, phase: 'testing',
    warning: own ? null : `tasks.md names no stage: its finished tasks are counted toward stage ${firstOpen.number}` };
}
function infer(signals, request) {
  const evidence = [], warnings = [], alternatives = [];
  const cycles = rankCycles(signals.specs);
  const active = cycles.find(c => c.status !== 'closed') || null;
  cycles.forEach(c => { c.active = c === active; });
  const approved = !!active && active.status === 'approved';
  const planCurrent = planIsCurrent(signals.plan, active && active._raw);
  if (signals.plan.exists && !planCurrent && active) evidence.push(`${EVIDENCE.PLAN_STALE}: ${signals.plan.path} last commit ${planDate(signals.plan)} < ${active.path} first commit ${specStart(active._raw)}`);
  if (signals.plan.exists && !active) evidence.push(EVIDENCE.NO_PLAN_CYCLE);
  const todo = planCurrent ? signals.todo : { ...signals.todo, open: 0, done: 0, total: 0 };   // a stale plan drags its todo along
  if (planCurrent && !signals.todo.exists) evidence.push(`${EVIDENCE.NO_TODO} (${signals.todo.path})`);
  const candidates = [];
  if (signals.sourceFiles.count === 0 && cycles.length === 0) candidates.push('initial');
  if (!approved) candidates.push('analysis');
  if (approved && (!planCurrent || todo.total === 0)) candidates.push('planning');
  if (planCurrent && todo.open > 0) candidates.push('development');
  if (planCurrent && todo.total > 0 && todo.open === 0) candidates.push('testing');
  candidates.sort((a, b) => phaseIndex(a) - phaseIndex(b));
  const st = stagedView(signals.stages, approved && planCurrent, todo);
  const fallback = (st && st.phase) || candidates[0] || 'analysis';
  if (st && st.current) evidence.push(`stage ${st.current.number} "${st.current.name}" (${st.closed}/${st.total} closed)`);
  if (st && st.warning) warnings.push(st.warning);
  if (!candidates.length) evidence.push(EVIDENCE.NO_RULE);
  if (approved && planCurrent && todo.total === 0) evidence.push(EVIDENCE.NO_TASKS);
  // The phase the header is read as. A feature cycle folds its plan into feature.md's tasks: a `planning` header
  // with tasks already written is read from the artifacts (development or testing); with no task yet it stays
  // planning (add the tasks). The header itself is never rewritten: `active`, `cycles` and the evidence keep it.
  let headerPhase = active && active.phase;
  if (active && active.kind === 'feature' && headerPhase === 'planning' && ['development', 'testing'].includes(fallback)) {
    headerPhase = fallback;
    warnings.push('feature cycles have no planning step: read as development');
  }
  const deployTie = headerPhase === 'deployment' && fallback === 'testing';   // deployment is header-only: testing is its expected fallback
  if (deployTie || (fallback === 'testing' && !headerPhase)) evidence.push(EVIDENCE.DEPLOY_HEADER_ONLY);
  evidence.push(`fallback: ${fallback} (candidates: ${candidates.join(', ') || 'none'})`);
  // While stages are detected the header records the cycle, not the work: no disagreement warning for dev/test/deploy.
  const stagedHeader = !!(st && ['development', 'testing', 'deployment'].includes(headerPhase));
  const stageWins = stagedHeader && !!st.phase;
  let inferred = fallback, released = null;
  if (active && active.phase) {
    inferred = stageWins ? fallback : headerPhase;
    evidence.unshift(`header Phase: ${active.phase}, Status: ${active.status} (${active.path})`);
    if (headerPhase !== fallback && !deployTie && !stagedHeader) { warnings.push(`header says ${active.phase} but artifacts say ${fallback}`); alternatives.push({ phase: fallback, kind: 'fallback', reason: 'header disagrees with fallback' }); }
    if (['development', 'testing', 'deployment'].includes(active.phase) && !approved) warnings.push(`header ${active.phase} without an approved spec`);
    if (active.phase === 'deployment' && signals.git.tagOnHead) evidence.push(EVIDENCE.CLOSE_CYCLE);
    // A release cut after the cycle opened: the cycle may have shipped without a close. First, so --brief shows it.
    const tag = signals.git.lastSemverTag, start = active._raw.tracked ? active._raw.firstCommit : null;
    if (['development', 'testing', 'deployment'].includes(active.phase) && tag && tag.date && start != null && tag.date > start) {
      released = `release ${tag.name} came out after this cycle started: if it shipped, run sdlc close`;
      warnings.unshift(released);
      evidence.push(`release ${tag.name} (${tag.date}) is newer than ${active.path} first commit (${start})`);
    }
  }
  // Confidence in the pick; its reasons go first in `warnings`, in order, ahead of the release one already there.
  const confidence = assessConfidence({ active, cycles, orphanSpecs: signals.orphanSpecs, activity: signals.activity, now: signals.now, released });
  for (const r of confidence.reasons.slice().reverse()) if (REASON_HINT[r.kind]) warnings.unshift(`cycle ${shortName(active.path)}: ${REASON_HINT[r.kind](r.detail)}`);
  if (active && NEW_CYCLE_TYPES.includes(request.type)) alternatives.push({ phase: 'analysis', kind: 'new-cycle', reason: `request type ${request.type} while a cycle is active` });
  for (const c of candidates) if (c !== inferred && !alternatives.some(a => a.phase === c)) alternatives.push({ phase: c, kind: 'candidate', reason: 'fallback row also holds' });
  if (signals.tests.status === 'unknown') evidence.push(EVIDENCE.TESTS_NOT_RUN);
  if (signals.inProduction) evidence.push(`in production: tag ${signals.git.lastSemverTag.name}`);
  return { inferred, fallback, candidates, evidence, alternatives: alternatives.slice(0, 3), warnings, confidence, active: active && strip(active), cycles: cycles.map(strip),
    step: stepOf(inferred), nextTask: (planCurrent && todo.next) || null,
    stage: st && st.current ? { number: st.current.number, name: st.current.name, closed: st.closed, total: st.total } : null,
  };
}
module.exports = { infer, effectiveDate, planIsCurrent, rankCycles, pickActive, stagedView, EVIDENCE };
