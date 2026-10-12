#!/usr/bin/env node
// Claude Code UserPromptSubmit hook: prints the router's one-line status for the agent, or nothing.
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
  if (!root) return '';
  const { collectSignals } = require(path.join(LIB, 'signals'));
  const { infer } = require(path.join(LIB, 'infer'));
  const { briefLine } = require(path.join(LIB, 'brief'));
  const { classifyRequest } = require(path.join(LIB, 'keywords'));
  const s = collectSignals(root, { runTests: false });
  const r = infer(s, { message: prompt || '', type: classifyRequest(prompt || '') });
  if (!r.active) return '';
  return briefLine({ ...r, warnings: [...r.warnings, ...s.notes] }) + " (applies only when the request is about this repository's work)";
}
try {
  const j = input();
  const line = j && status(typeof j.cwd === 'string' ? j.cwd : process.cwd(), typeof j.prompt === 'string' ? j.prompt : '');
  if (line) process.stdout.write(line + '\n');
} catch { /* never surface an error into the prompt */ }
process.exitCode = 0;
