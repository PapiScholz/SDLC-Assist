const fs = require('fs'); const path = require('path');
const { parseHeader } = require('./header'); const { countTasks } = require('./todo');
const SOURCE_EXTENSIONS = ['js','mjs','cjs','jsx','ts','tsx','py','rb','go','rs','java','kt','kts','swift','c','cc','cpp','h','hpp','cs','php','scala','sh','ps1','vue','svelte','dart','ex','exs','erl','clj','lua','r','sql'];
const EXCLUDED_DIRS = ['.git','node_modules','dist','build','out','target','vendor','.next','.nuxt','coverage','__pycache__','.venv','venv','.cache','tmp','.idea','.vscode','.pytest_cache','.tox','.turbo'];
const CONFIG_FILE = /^(?:.*\.config\.[cm]?[jt]s|\..*rc\.[cm]?js|setup\.py|conftest\.py|manage\.py|gulpfile\.js|gruntfile\.js|karma\.conf\.js|knexfile\.js)$/i;
const MAX_FILES = 5000, MAX_DEPTH = 8;
const PUBLISHED = /^##\s+\[?v?\d+\.\d+\.\d+/m;
function readText(abs) { try { return fs.readFileSync(abs, 'utf8'); } catch { return null; } }
function mtimeSec(abs) { try { return Math.floor(fs.statSync(abs).mtimeMs / 1000); } catch { return null; } }
function listDir(abs) { try { return fs.readdirSync(abs, { withFileTypes: true }); } catch { return []; } }
function findSpecs(root) {
  const out = [];
  for (const e of listDir(path.join(root, 'docs', 'specs'))) if (e.isFile() && /\.md$/i.test(e.name)) out.push('docs/specs/' + e.name);
  for (const e of listDir(root)) if (e.isFile() && (/^spec\.md$/i.test(e.name) || /^SPEC-.*\.md$/i.test(e.name))) out.push(e.name);
  return out.sort();
}
function countSourceFiles(root) {
  let count = 0; const sample = [];
  (function walk(rel, depth) {
    if (depth > MAX_DEPTH || count >= MAX_FILES) return;
    for (const e of listDir(path.join(root, rel))) {
      const childRel = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { if (!EXCLUDED_DIRS.includes(e.name)) walk(childRel, depth + 1); continue; }
      if (!e.isFile()) continue;
      const ext = path.extname(e.name).slice(1).toLowerCase();
      if (!SOURCE_EXTENSIONS.includes(ext) || CONFIG_FILE.test(e.name)) continue;
      count++; if (sample.length < 5) sample.push(childRel);
    }
  })('', 0);
  return { count, sample: sample.sort() };
}
function detectTestRunner(root) {
  const pkg = readText(path.join(root, 'package.json'));
  if (pkg) { try { const t = (JSON.parse(pkg).scripts || {}).test; if (t && !/no test specified/.test(t)) return { kind: 'npm', command: 'npm test' }; } catch {} }
  if (fs.existsSync(path.join(root, 'pyproject.toml')) || fs.existsSync(path.join(root, 'pytest.ini'))) return { kind: 'pytest', command: 'pytest' };
  if (fs.existsSync(path.join(root, 'Cargo.toml'))) return { kind: 'cargo', command: 'cargo test' };
  if (fs.existsSync(path.join(root, 'go.mod'))) return { kind: 'go', command: 'go test ./...' };
  return { kind: null, command: null };
}
function releaseWorkflow(root) {
  const dir = path.join(root, '.github', 'workflows'); const files = [];
  for (const e of listDir(dir)) if (e.isFile() && /\.ya?ml$/i.test(e.name) && (/release/i.test(e.name) || /release/i.test(readText(path.join(dir, e.name)) || ''))) files.push('.github/workflows/' + e.name);
  return { exists: files.length > 0, files: files.sort() };
}

// ---- TASK 8 FILLS THESE TWO (git logic). Stubs only; do not add git here in Task 7. ----
function collectGit(root) { // eslint-disable-line no-unused-vars
  return { isRepo: false, branch: null, commits: [], lastSemverTag: null, tagOnHead: false, commitsAfterTag: null };
}
function fileDates(root, rel) {
  return { tracked: false, firstCommit: null, lastCommit: null, dirty: false, mtime: mtimeSec(path.join(root, rel)) };
}
// ---- end Task 8 stubs ----

function collectSignals(repoRoot, opts) {
  const options = opts || {};
  const abs = fs.realpathSync.native(repoRoot);
  const root = abs.split(path.sep).join('/');
  const specs = findSpecs(abs).map(rel => ({ path: rel, header: parseHeader(readText(path.join(abs, rel))), ...fileDates(abs, rel) }));
  const planPath = 'tasks/plan.md', todoPath = 'tasks/todo.md';
  let plan = { exists: false, path: planPath };
  if (fs.existsSync(path.join(abs, planPath))) {
    const d = fileDates(abs, planPath);
    plan = { exists: true, path: planPath, tracked: d.tracked, lastCommit: d.lastCommit, dirty: d.dirty, mtime: d.mtime };
  }
  const todoText = readText(path.join(abs, todoPath));
  const todo = todoText === null
    ? { exists: false, path: todoPath, open: 0, done: 0, total: 0 }
    : { exists: true, path: todoPath, ...countTasks(todoText) };
  const clText = readText(path.join(abs, 'CHANGELOG.md'));
  const changelog = { exists: clText !== null, path: 'CHANGELOG.md', hasPublishedVersion: clText !== null && PUBLISHED.test(clText) };
  const testRunner = detectTestRunner(abs);
  const tests = { status: options.runTests && testRunner.kind === null ? 'no-runner' : 'unknown', exitCode: null, tail: [] };
  return {
    root, specs, plan, todo, git: collectGit(abs), changelog,
    releaseWorkflow: releaseWorkflow(abs), sourceFiles: countSourceFiles(abs),
    testRunner, tests, inProduction: false,
  };
}
module.exports = { collectSignals, SOURCE_EXTENSIONS, EXCLUDED_DIRS };
