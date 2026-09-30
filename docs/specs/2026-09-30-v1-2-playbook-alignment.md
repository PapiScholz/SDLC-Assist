# Spec: v1.2 — playbook alignment (`intent.md`, governance and measures, maintain entry point, single gate target, versioned hooks)

Phase: deployment
Status: approved
Intent: docs/intents/2026-09-30-playbook-alignment.md
Date: 2026-09-30
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.2.0)
Parent: `docs/specs/2026-09-30-v1-1-own-skills.md` (v1.1, closed)
Reference: https://claude.com/blog/the-ai-native-sdlc-playbook (section "Plays", `#sd-c2`, and stages 1 to 6)

## Objective

Bring the `sdlc` router in line with the playbook's "Plays" section where that
is cheap and portable, and give this repo the two process pieces the playbook
asks for that it still lacks. Five deliverables:

1. `intent.md` as the artifact that opens a cycle (Plan stage), beside the
   request card.
2. Every phase sheet carries a `Governance:` and a `Measure:` line, so each
   sheet has the five parts a play is made of.
3. A `maintain` entry point: what enters from production (an alert, a scan
   finding, a support ticket) becomes an `intent.md` and re-enters at
   analysis. No detection, no metrics, no automation: that is the user's
   infrastructure.
4. One verification target for this repo, `scripts/gates.sh`, that runs the
   whole gate loop; CONTRIBUTING, README, CLAUDE.md and CI call it instead of
   carrying their own copy.
5. Versioned hooks in `.claude/settings.json`: the git-authorization guard
   and the EOL guard travel with the repo, so a second contributor gets the
   same protection the owner has from a global hook today.

Users: the same as v1. Docs in English; the skill replies in the user's
language.

Success looks like: a user who read the playbook finds its vocabulary in the
skill (`intent.md`, stages with governance and measures, a maintain entry),
and a contributor to this repo runs one command for every gate and is stopped
by the same hooks the owner is.

## Out of scope, deliberately

The playbook's automation plays stay documented as "what the user builds on
top", not implemented here: the Maintain loop with control bands and tiered
responses, evals in CI, AI review in the PR loop (`REVIEW.md`), subagent
definitions in `.claude/agents/`, recurring security scans. Codex and Cursor
native command files stay in the backlog (formats still unverified).

## Design decisions

- **`intent.md` is an entry artifact, not a phase.** It lives at
  `docs/intents/<date>-<slug>.md` (path configurable by convention only),
  carries no `Phase:` header, and is consumed by the spec: the spec's header
  gains an optional `Intent:` line pointing at it. `where.js` does not parse
  intents; `infer.js` is untouched. A committed intent with no spec that
  names it is a warning in the question template ("intent without spec"),
  produced by the agent from a read-only `git ls-files docs/intents`, not by
  the scripts.
- **The request card stays.** A complaint still goes through the five-line
  card; the card becomes the body of the short spec as in v1. `intent.md` is
  for ideas and features (the originator's words, before analysis). The
  entry-points table gains the column "artifact" saying which one applies.
- **Governance and Measure lines are prose, two lines per sheet.**
  Governance names the evidence the phase leaves in git (who approved what,
  where); Measure names one leading and one lagging indicator readable from
  git history or CI, in the playbook's wording where it exists (time from
  intent commit to spec commit; spec commits after the first plan commit;
  share of changes merged from the first pass; first-pass CI success rate).
  `check-sheets.js` gains a check that both lines exist in every sheet.
- **`maintain` is a sheet under `references/entry-points.md`, not a slug.**
  `PHASES` in `header.js` stays at six. The sheet says: enters when a signal
  from production arrives (alert, scan finding, ticket, breached band);
  produces an `intent.md` with the four sections the playbook names
  (anomaly and evidence, proposed outcome, affected systems, open
  questions); next: analysis as a new cycle. `which.js` needs no change.
- **`scripts/gates.sh` is the single target.** Bash, exits non-zero on the
  first failure, prints one line per gate; takes `--quick` to skip
  `sync-vendored --check` (network) for local loops. CI's `test` job runs
  it; CONTRIBUTING, README and CLAUDE.md name only that command and keep the
  list of gates as documentation of what it runs. `check-eol` and the
  self-tests are unchanged.
- **Hooks are the smallest set that enforces what the docs already say.**
  `.claude/settings.json` (versioned) declares two hooks, both Node
  scripts (no bash on the host, so they run on Windows too): (a) a
  PreToolUse hook matching `Bash|PowerShell` for git authorization: block
  `git commit|push|push --force|reset --hard|tag -d|branch -D` unless the
  user's last message names the verb for that op; `git add` stays allowed;
  the script is a port of the owner's global guard, generic, no project
  names, reads the transcript tail-first and fails closed when it cannot;
  (b) a PostToolUse hook matching `Write|Edit` as EOL guard: check the
  written file and fail the tool call on CRLF or BOM. Both scripts live in
  `scripts/hooks/` as `.js` with a `.self-test.js` each. Hooks are Claude
  Code only; other hosts keep relying on CI, and the README says so.
- **Same safety regime as v1.** Nothing installed, no state-changing git
  without the user's words in the current turn, no release without request.

## Changes by file

- `skills/sdlc/references/intent.md` (new): the template (Who, Problem in the
  originator's words, Desired outcome, Constraints, Open questions) and the
  rule "the originator corrects it; the agent does not rewrite it".
- `skills/sdlc/references/spec-header.md`: optional `Intent: <path>` line.
- `skills/sdlc/references/entry-points.md`: column "artifact" (`intent.md`
  for ideas and features, request card for complaints and bugs, none for
  hotfix); new row `Production signal | maintain | writes intent.md, then
  analysis`.
- `skills/sdlc/references/maintain.md` (new): the maintain entry sheet.
- `skills/sdlc/references/phases/*.md` (six files): `**Governance:**` and
  `**Measure:**` lines after `**Warns when:**`.
- `skills/sdlc/SKILL.md`: step 6 reads the intent when the spec names one;
  the question template's Warnings line covers "intent without spec";
  entry rules mention `maintain`.
- `skills/sdlc/bin/check-sheets.js` + self-test: the two new lines are
  mandatory; red run recorded.
- `scripts/gates.sh` (new) with `--quick`; `.github/workflows/ci.yml` calls
  it; `CONTRIBUTING.md`, `README.md`, `CLAUDE.md` point at it.
- `.claude/settings.json` (new, versioned), `scripts/hooks/git-authorization.js`,
  `scripts/hooks/eol-guard.js`, each with a `.self-test.js`; `.claude/handoff.md`
  added to `.gitignore` (it is session state, not repo state).
- `README.md`: a "Playbook mapping" table (six stages → phases and entry
  points, and which plays are out of scope on purpose); install notes for
  the hooks.
- `CHANGELOG.md`: `## [Unreleased]` entry; the closing commit carries
  `[minor]` (v0.3.0).

## Testing strategy

- `check-sheets.self-test.js`: a sheet without `Governance:` or `Measure:`
  exits 1 naming the sheet and the line; red run on a copy recorded in
  `docs/ci-red-runs.md`.
- `scripts/gates.sh`: exits 0 on the repo; a seeded CRLF file in a copy makes
  it exit non-zero at `check-eol` (red run recorded); `--quick` skips
  `sync-vendored` and says so in its output.
- Hooks: each script has a self-test that feeds it a synthetic tool call
  (JSON on stdin as Claude Code sends it) and asserts block or allow:
  `git commit` with a last message "commiteá" allows, "dale" blocks; a Write
  producing CRLF blocks. CI runs the hook self-tests on Ubuntu (bash) and
  the `settings.json` is validated as JSON.
- Dogfood on this repo: open this very cycle from an `intent.md` written
  first (`docs/intents/2026-09-30-playbook-alignment.md`), so the intent →
  spec → plan chain is exercised once and recorded; run the agent-side
  check the router prescribes (`git ls-files docs/intents` plus a grep for
  `Intent:` in `docs/specs/`; `where.js` itself does not emit it) and
  confirm the "intent without spec" warning appears before the spec exists
  and disappears after.
- Reference scenarios (fresh temp home): (1) idea on existing code → the
  agent asks for or writes `intent.md`, then the spec names it; (2)
  production alert described by the user → `maintain` sheet → `intent.md`
  → analysis; (3) contributor clone → `bash scripts/gates.sh` exits 0 and
  a `git push` without the verb is blocked by the versioned hook.

## Boundaries

- Always: reply in the user's language; keep `intent.md` in the
  originator's words; state what a hook blocked and why.
- Ask first: creating `docs/intents/` in a user's repo the first time;
  writing an `intent.md` on the user's behalf from a production signal.
- Never: parse intents in the scripts (they stay agent-side); add a seventh
  phase slug; run any git state change from a hook or a gate; install the
  hooks in the user's global settings.

## Success criteria

- Six sheets pass the extended `check-sheets`; `scripts/gates.sh` is the
  only gate command named in docs and CI; CI green on Ubuntu and Windows.
- The three reference scenarios pass; the dogfood chain
  intent → spec → plan is recorded.
- A fresh clone blocks an unauthorized `git push` in Claude Code with the
  versioned hook alone.
- README maps the playbook's six stages to the skill and lists the plays
  left out on purpose.

## Open questions

- Path of intents in user repos: `docs/intents/` by convention, or next to
  `docs/specs/`? Proposal: `docs/intents/`, documented, not enforced.
- Whether the git-authorization hook should accept a per-repo allowlist of
  verbs (Spanish and English). Proposal: yes, a small list in the script,
  overridable by an env var.
