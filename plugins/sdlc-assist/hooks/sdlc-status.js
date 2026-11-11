#!/usr/bin/env node
// Claude Code UserPromptSubmit and PreToolUse(Skill) hook: prints the router's one-line status for the agent, or nothing.
// Silent outside a git repository or without an active cycle. Exits 0 on every path: exit 2 would block the prompt.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const LIB = path.join(__dirname, '..', 'skills', 'sdlc', 'bin', 'lib');
// Malformed stdin yields null and the hook stays silent; only a valid payload without `cwd` falls back to process.cwd().
function input() { try { const j = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); return j && typeof j === 'object' ? j : null; } catch { return null; } }
function toplevel(cwd) {
  try { return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 2000 }).trim() || null; }
  catch { return null; }
}
function status(cwd, prompt) {
  const root = toplevel(cwd);
  if (!root) return null;
  const { collectSignals } = require(path.join(LIB, 'signals'));
  const { infer } = require(path.join(LIB, 'infer'));
  const { briefLine, unplanned } = require(path.join(LIB, 'brief'));
  const { classifyRequest } = require(path.join(LIB, 'keywords'));
  const s = collectSignals(root, { runTests: false });
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
function changed(sessionId, line, always) {
  if (always || typeof sessionId !== 'string' || !/^[\w-]{1,128}$/.test(sessionId)) return true;
  const file = path.join(require('os').tmpdir(), 'sdlc-assist-status', sessionId + '.txt');
  try { if (fs.readFileSync(file, 'utf8') === line) return false; } catch { /* first prompt of the session */ }
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, line); } catch { /* still print */ }
  return true;
}
// Issue #27: loading a family skill is the moment the agent decides how to work, so the status is re-stated
// there (PreToolUse on the Skill tool), once per session. Never a permissionDecision: it only adds context.
const FAMILY = new Set(['spec-driven-development', 'planning-and-task-breakdown', 'incremental-implementation', 'test-driven-development', 'context-engineering', 'sdlc-debugging', 'sdlc-qa-gate', 'sdlc-release']);
function firstForSkill(sessionId) {
  if (typeof sessionId !== 'string' || !/^[\w-]{1,128}$/.test(sessionId)) return true;
  const file = path.join(require('os').tmpdir(), 'sdlc-assist-status', sessionId + '.skill');
  if (fs.existsSync(file)) return false;
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, '1'); } catch { /* still print */ }
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
