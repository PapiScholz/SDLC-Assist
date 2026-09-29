'use strict';
const path = require('path');

function candidateDirs(home, cwd) {
  return [
    path.join(home, '.agents', 'skills'), path.join(home, '.claude', 'skills'),
    path.join(home, '.config', 'opencode', 'skills'), path.join(home, '.codex', 'skills'),
    path.join(home, '.cursor', 'skills'), path.join(cwd, '.agents', 'skills'),
    path.join(cwd, '.claude', 'skills'), path.join(cwd, '.codex', 'skills'), path.join(cwd, '.cursor', 'skills'),
  ];
}

function subdirs(fs, dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() || e.isSymbolicLink()).map(e => e.name);
  } catch { return []; }
}

// plugin caches: <home>/.claude/plugins/cache/<market>/<plugin>/<ver>/skills/<name>/SKILL.md
function pluginSkillDirs(home, fs) {
  const out = [];
  const cache = path.join(home, '.claude', 'plugins', 'cache');
  for (const market of subdirs(fs, cache))
    for (const plugin of subdirs(fs, path.join(cache, market)))
      for (const ver of subdirs(fs, path.join(cache, market, plugin)))
        for (const name of subdirs(fs, path.join(cache, market, plugin, ver, 'skills'))) {
          const dir = path.join(cache, market, plugin, ver, 'skills', name);
          if (fs.existsSync(path.join(dir, 'SKILL.md'))) out.push({ dir, name, form: `${plugin}:${name}` });
        }
  return out;
}

function normalizeName(s) { return s.includes(':') ? s.split(':').pop() : s; }

module.exports = { candidateDirs, pluginSkillDirs, subdirs, normalizeName };
