#!/usr/bin/env node
// Collects repo signals and infers the SDLC phase. Prints one JSON object to stdout.
//   node bin/where.js --message "<request>" [--run-tests] [--root <dir>]
// Exit 0 on success (warnings included); exit 2 on unexpected error, message on stderr.
// Read-only: the only child processes are git queries and, with --run-tests, the test runner.
const fs = require('fs');
const { collectSignals } = require('./lib/signals');
const { infer } = require('./lib/infer');
const { classifyRequest } = require('./lib/keywords');
function parseArgs(argv) {
  const args = { message: '', runTests: false, root: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--message') { args.message = argv[++i] || ''; continue; }
    if (a.startsWith('--message=')) { args.message = a.slice(10); continue; }
    if (a === '--run-tests') { args.runTests = true; continue; }
    if (a === '--root') { args.root = argv[++i]; continue; }
    if (a.startsWith('--root=')) { args.root = a.slice(7); continue; }
    throw new Error('unknown argument: ' + a);
  }
  return args;
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.root || !fs.existsSync(args.root) || !fs.statSync(args.root).isDirectory()) throw new Error('--root is not a directory: ' + args.root);
  const signals = collectSignals(args.root, { runTests: args.runTests });
  const request = { message: args.message, type: classifyRequest(args.message) };
  const r = infer(signals, request);
  const out = { signals, cycles: r.cycles, active: r.active, inferred: r.inferred, evidence: r.evidence, alternatives: r.alternatives, warnings: r.warnings, request };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  return 0;
}
if (require.main === module) {
  try { process.exitCode = main(); }
  catch (err) { process.stderr.write('where.js: ' + (err && err.message || err) + '\n'); process.exitCode = 2; }
}
module.exports = { parseArgs, main };
