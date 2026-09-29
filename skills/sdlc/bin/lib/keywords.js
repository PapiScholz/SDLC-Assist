// Complaints come first: a complaint always goes through the request card, even about a typo.
const PRECEDENCE = ['complaint', 'hotfix', 'bug', 'feature', 'idea'];
const KEYWORDS = {
  en: {
    hotfix:    ['hotfix', 'hot fix', 'typo', 'quick fix', 'one-liner', 'one liner'],
    complaint: ['complain', 'complains', 'complaint', 'complaining', 'customer reports', 'customer says', 'client reports', 'user reports', 'users report'],
    bug:       ['bug', 'broken', 'breaks', 'break', 'crash', 'crashes', 'crashed', 'error', 'errors', 'fails', 'failing', 'failure', 'exception', 'regression', 'not working', "doesn't work", 'does not work', 'fix', 'issue', 'problem', 'wrong'],
    feature:   ['feature', 'add', 'implement', 'support', 'enhancement', 'new option', 'allow users'],
    idea:      ['idea', 'what if', 'propose', 'proposal', 'i would like', "i'd like", 'thinking about'],
  },
  es: {
    hotfix:    ['hotfix', 'typo', 'tipeo', 'errata', 'arreglo rapido', 'fix rapido'],
    complaint: ['queja', 'quejas', 'se queja', 'se quejan', 'reclamo', 'reclama', 'reclaman', 'cliente dice', 'cliente reporta', 'usuario reporta', 'usuarios reportan'],
    bug:       ['bug', 'se rompe', 'se rompio', 'rompe', 'roto', 'rota', 'falla', 'fallo', 'error', 'errores', 'crashea', 'excepcion', 'no funciona', 'no anda', 'regresion', 'arreglar', 'arregla', 'problema', 'no me deja', 'se cayo'],
    feature:   ['funcionalidad', 'agregar', 'agrega', 'anadir', 'implementar', 'soporte', 'nueva opcion', 'permitir'],
    idea:      ['idea', 'propongo', 'propuesta', 'me gustaria', 'que tal si', 'y si'],
  },
};
function normalise(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function toRegex(kw) {
  const esc = normalise(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp('(^|[^a-z0-9])' + esc + '(?=$|[^a-z0-9])');
}
const COMPILED = {};
for (const lang of Object.keys(KEYWORDS)) for (const t of PRECEDENCE) (COMPILED[t] = COMPILED[t] || []).push(...KEYWORDS[lang][t].map(toRegex));
function classifyRequest(message) {
  const text = normalise(message);
  if (!text.trim()) return 'unknown';
  for (const t of PRECEDENCE) if (COMPILED[t].some(re => re.test(text))) return t;
  return 'unknown';
}
module.exports = { classifyRequest, PRECEDENCE, KEYWORDS, normalise };
