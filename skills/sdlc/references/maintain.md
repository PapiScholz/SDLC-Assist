# Maintain (entry point)

Not a phase: nothing in `where.js` infers it. It is how work re-enters the loop from production.

**Enters when:** a signal arrives from a running system: an alert, a breached metric band, a security scan finding, a support ticket raised by monitoring, a post-mortem action. A person reporting a problem is a complaint: it takes the request card (`request-card.md`), not this sheet.
**Produces:** an `intent.md` (`intent.md` template) with four extra lines in "Problem": anomaly and evidence, proposed outcome, affected systems, open questions; the service owner triages it (fix now, schedule, dismiss with reason).
**Do now:** ask the user for the signal's evidence (metric, log line, finding id, ticket); write the intent in their words after they confirm; recommend a new cycle in analysis. A bounded fix that meets the hotfix threshold may go straight to development and say so.
**Next phase:** analysis, as a new cycle (`entry-points.md`).
**Warns when:** the signal is acted on without an intent (no audit trail), or a fix ships without a regression test for the incident class.
**Governance:** the intent is the audit record (author, timestamp, revision history in git); dismissals carry a reason; fixes go through the normal PR gate.
**Measure:** leading: time from signal to committed intent; lagging: share of intents that become merged fixes, and repeat incidents of the same class.

Out of scope for this skill, documented as the user's infrastructure: control bands, tiered automatic responses, scheduled scans, evals per incident.
