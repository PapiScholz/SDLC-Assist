// How sure the router is that the active cycle is the current work. Pure: every input comes from signals and the
// ranked cycles. Two levels; `low` as soon as one reason holds. Reasons, in this order:
//   orphan     a spec outside docs/specs/ is newer than the cycle's last activity (the router cannot follow it)
//   stale      the cycle is untouched for STALE_DAYS and STALE_COMMITS later commits touched none of its files
//   contested  another open cycle's last activity is within CONTESTED_SECONDS of the active one's
//   released   a release came out after the cycle started (the sentence infer already builds)
// Confidence never changes the inference: it says whether to trust the pick.
const STALE_DAYS = 7, STALE_COMMITS = 10, CONTESTED_SECONDS = 86400, DAY = 86400;
// Folder cycles are named by their folder, flat specs by their path.
function shortName(p) { const m = /^docs\/specs\/([^/]+)\/[^/]+$/.exec(String(p)); return m ? m[1] : String(p); }
function assessConfidence({ active, cycles, orphanSpecs, activity, now, released }) {
  if (!active) return { level: 'high', reasons: [] };
  const reasons = [], last = active.date, name = shortName(active.path);
  const newest = orphanSpecs && orphanSpecs.list && orphanSpecs.list[0];
  if (newest && newest.lastActivity != null && last != null && newest.lastActivity > last)
    reasons.push({ kind: 'orphan', detail: `newer spec outside docs/specs/: ${newest.path}` });
  if (activity && activity.path === active.path && now != null && last != null
    && now - last >= STALE_DAYS * DAY && activity.commitsElsewhere >= STALE_COMMITS)
    reasons.push({ kind: 'stale', detail: `${name} untouched for ${Math.floor((now - last) / DAY)} days and ${activity.commitsElsewhere} commits` });
  const rival = (cycles || []).find(c => c.path !== active.path && c.status !== 'closed' && c.date != null && last != null && Math.abs(c.date - last) <= CONTESTED_SECONDS);
  if (rival) reasons.push({ kind: 'contested', detail: `${shortName(rival.path)} is also open and was touched within a day of ${name}` });
  if (released) reasons.push({ kind: 'released', detail: released });
  return { level: reasons.length ? 'low' : 'high', reasons };
}
module.exports = { assessConfidence, shortName, STALE_DAYS, STALE_COMMITS, CONTESTED_SECONDS };
