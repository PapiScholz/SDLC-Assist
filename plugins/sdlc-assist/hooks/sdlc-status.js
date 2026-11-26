#!/usr/bin/env node
// Claude Code UserPromptSubmit and PreToolUse(Skill) hook: prints the router's one-line status for the agent, or nothing.
// Silent outside a git repository or without an active cycle. Exits 0 on every path: exit 2 would block the prompt.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const LIB = path.join(__dirname, '..', 'skills', 'sdlc', 'bin', 'lib');
// Malformed stdin yields null and the hook stays silent; only a valid payload without `cwd` falls back to process.cwd().
function input() { try { const j = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); return j && typeof j === 'object' ? j : null; } catch { return null; } }
// One git spawn for the repo root and the two dirs that key the git cache (issue #31). --git-common-dir may be relative.
function repo(cwd) {
  try {
    const [top, gitDir, common] = execFileSync('git', ['rev-parse', '--show-toplevel', '--absolute-git-dir', '--git-common-dir'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, timeout: 2000 }).split(/\r?\n/).map(s => s.trim());
    return top && gitDir && common ? { root: top, gitCache: { gitDir, commonDir: path.resolve(cwd, common) } } : null;
  } catch { return null; }
}
// Budget for every git query after repo(): below Claude Code's 5 s hook timeout with room for node's start.
const DEADLINE_MS = 3000;
function status(cwd, prompt) {
  const rp = repo(cwd);
  if (!rp) return null;
  const root = rp.root;
  const { collectSignals } = require(path.join(LIB, 'signals'));
  const { infer } = require(path.join(LIB, 'infer'));
  const { briefLine, unplanned } = require(path.join(LIB, 'brief'));
  const { classifyRequest } = require(path.join(LIB, 'keywords'));
  const s = collectSignals(root, { runTests: false, deadlineMs: DEADLINE_MS, gitCache: rp.gitCache });
  if (s.gitTimedOut) return null;   // a missing signal can change the step: no line beats a wrong one
  const request = { message: prompt || '', type: classifyRequest(prompt || '') };
  const r = infer(s, request);
  if (!r.active) return null;
  const view = { ...r, request, now: s.now, warnings: [...r.warnings, ...s.notes] };
  // Stated as a fact, with no opt-out suffix: the old "(applies only when ...)" let the agent skip it (issue #26).
  return { line: briefLine(view), always: unplanned(view) };
}
// Only when the line changes within a session: repeating the same status on every prompt cost context
// for nothing (96 of 96 prompts in one session carried the identical line). State: one file per
// session_id in the OS temp dir holding the last line printed. Without a session_id, print as before.
// An implement request on unplanned work prints every time: that is when the agent needs it (issue #26).
// The comparison ignores the counters that move with the clock or with any commit (issue #31): a line that differs
// only in "(N days ago)" or "untouched for N days and N commits" is the same news.
function normalize(line) {
  return line.replace(/\((?:today|\d+ days? ago)\)/g, '(·)').replace(/untouched for \d+ days and \d+ commits/g, 'untouched for · days and · commits');
}
// Session state goes in the lib's per-user dir (stateDir); a dir it refuses means no state, so the line prints.
function stateFile(name) { try { return path.join(require(path.join(LIB, 'signals')).stateDir(), name); } catch { return null; } }
function changed(sessionId, line, always) {
  if (always || typeof sessionId !== 'string' || !/^[\w-]{1,128}$/.test(sessionId)) return true;
  const file = stateFile(sessionId + '.txt'); if (!file) return true;
  const key = normalize(line);
  try { if (fs.readFileSync(file, 'utf8') === key) return false; } catch { /* first prompt of the session */ }
  try { fs.writeFileSync(file, key, { mode: 0o600 }); } catch { /* still print */ }
  return true;
}
// Issue #27: loading a family skill is the moment the agent decides how to work, so the status is re-stated
// there (PreToolUse on the Skill tool), once per session. Never a permissionDecision: it only adds context.
const FAMILY = new Set(['sdlc-spec', 'sdlc-plan', 'incremental-implementation', 'test-driven-development', 'sdlc-debugging', 'sdlc-qa-gate', 'sdlc-release']);
function firstForSkill(sessionId) {
  if (typeof sessionId !== 'string' || !/^[\w-]{1,128}$/.test(sessionId)) return true;
  const file = stateFile(sessionId + '.skill'); if (!file) return true;
  if (fs.existsSync(file)) return false;
  try { fs.writeFileSync(file, '1', { mode: 0o600 }); } catch { /* still print */ }
  return true;
}
try {
  const j = input();
  const cwd = j && typeof j.cwd === 'string' ? j.cwd : process.cwd();
  if (j && j.hook_event_name === 'PreToolUse') {
    const raw = j.tool_input && j.tool_input.skill;
    const name = typeof raw === 'string' ? raw.replace(/^sdlc-assist:/, '') : '';
    const st = FAMILY.has(name) && status(cwd, '');
    if (st && st.line && firstForSkill(j.session_id)) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: st.line } }) + '\n');
  } else {
    const st = j && status(cwd, typeof j.prompt === 'string' ? j.prompt : '');
    if (st && st.line && changed(j.session_id, st.line, st.always)) process.stdout.write(st.line + '\n');
  }
} catch { /* never surface an error into the prompt */ }
process.exitCode = 0;
