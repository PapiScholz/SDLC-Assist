# Spec: v1.7 — four plain steps, staged plans, and a router that runs on its own

Phase: development
Status: approved
Date: 2026-10-12
Owner: Ezequiel Scholz
Repo: `PapiScholz/SDLC-Assist` (in production, v0.11.1)
Parent: `docs/specs/2026-10-01-v1-6-repo-artifacts/spec.md` (v1.6, closed)

## Objective

A field report from the owner's own client project (Sr-Lievito, an LMS built in
nine stages) showed the router failing at its one job: telling the developer
where the work is and what comes next.

- The spec was approved, `plan.md` listed nine stages with stage 3 marked closed (a check emoji),
  and `tasks.md` (rewritten per stage) had 50 of 50 tasks done. The request was
  "continue with stage 4". `where.js` inferred `development` from the header,
  computed a `testing` fallback because every task was ticked, warned that the
  two disagreed, and classified the request as `unknown`. The right answer was
  "plan stage 4". Root cause, confirmed in `bin/lib/infer.js`: the model assumes
  one pass per cycle (spec → plan → tasks → development → testing → deployment),
  so "all tasks ticked" always means testing; staged plans do not exist for it.
- The confirmation question is written in the skill's vocabulary (`analysis`,
  `fallback`, `candidates`, header names). The owner, who wrote the skill, could
  not follow it and was approving every prompt without reading it.
- The skill depends on being remembered (the agent or `/sdlc`), and its
  description ("use when starting any work request") pulls it into research,
  browsing and voice sessions that are not software work, where it adds phases
  that do not apply and spends tokens.

The developer's actual workflow, in the owner's words, is four steps: (1) state
the situation, (2) the agent writes the spec and the developer approves it,
(3) the agent writes the plan and the developer approves it, (4) implement,
test and ship. A large plan splits into stages; each stage repeats steps 3
and 4. This cycle makes the router speak that workflow. Five deliverables:

1. Staged plans: `where.js` detects stages in the active cycle's `plan.md`
   and infers per stage (next stage to plan, current stage to build or test).
2. Plain steps: every inference maps to one of four steps, and `where.js
   --brief` prints one line the agent reads, for example
   `Stage 4/9 "Catálogo y contenido" · step 3 plan · next: write the stage plan`.
3. No confirmation question by default: the agent tells the developer where
   the work is in one sentence in their language and proceeds; it asks only
   when a request looks like a new topic while a stage is in flight.
4. Runs on its own in Claude Code: a plugin hook runs `where.js --brief` on
   each prompt and adds that line to the agent's context, only inside a
   repository with an active cycle; everywhere else it prints nothing.
5. Narrow trigger: the skill's description limits it to work on a code
   repository with specs, and says it is not for research, browsing or
   non-code tasks.

## Decisions

- Four steps over the six internal phases: `initial` → 1 situation, `analysis` → 2 spec, `planning` → 3 plan, `development`/`testing`/`deployment` → 4 implement (with the detail build, test or ship) — the developer sees four steps; the phases stay inside the code and the headers, so no existing spec or test changes meaning.
- A stage is closed only when its own row or heading carries the marker `[x]`; task checkboxes under a stage heading never close it — in the owner's NANDI repo the plan's per-stage checkboxes were never ticked while `tasks.md` was complete, so counting them would misfire.
- The marker is `[x]`. A check emoji (U+2705) on a stage line is read as closed too, so plans written before v0.12.0 keep working, but the skill never writes one and its sources reference it only by code point — the owner bans emoji in docs and output.
- Two stage formats are recognised, both found in the owner's repos: a table under a heading named Stages/Etapas/Phases/Fases (one row per stage, Sr-Lievito), and one heading per stage, `Stage|Etapa|Phase|Fase N` (Almacén, NANDI) — one detector, no config.
- The stage a `tasks.md` belongs to is read from its H1 (`# Etapa 3 — …`, `# Stage 3: …`); when the H1 names no stage, all-done tasks count toward the first open stage (testing it), never toward planning the next — the conservative reading never skips a test.
- Staged mode turns on only when `plan.md` lists two or more stages and either one is closed or `tasks.md` names its stage — the vendored planning template writes `### Phase 1: Foundation` headings, and a single-pass plan with those headings must keep v0.11.1 behavior with no new warning (found while planning, 2026-10-12).
- Staged inference, active spec approved and plan current: open tasks → step 4 build; all tasks done and their stage open → step 4 test that stage; their stage closed and stages remain → step 3 plan the next open stage; every stage closed → the cycle's own deployment/close rule.
- While stages are detected, the spec header's `development`/`testing`/`deployment` all read as step 4 and do not raise "header says X but artifacts say Y" — the header records the cycle, the stage records the work.
- Closing a stage writes `[x]` and the date on that stage's line in `plan.md`; the spec header is untouched until the last stage closes — this widens the skill's write scope by exactly one marker, stated in `SKILL.md` under Never.
- `--brief` is additive: the JSON output keeps every field and gains `step` and `stage`; existing consumers and self-tests stay valid.
- The hook is Claude Code only (`hooks/hooks.json` in the plugin, `UserPromptSubmit`); OpenCode, Codex and Cursor keep today's invocation by description or slash — the skill is still one portable skill, the hook is an extra.
- The hook stays silent (no output, exit 0) when the working directory is not a git repository or has no active cycle; it never blocks a prompt, and any error is swallowed — a router that can break a prompt is worse than no router.
- The hook command sets `"timeout": 5` and its script exits 0 on every path, so neither a slow repository nor a crash can block or delay a prompt beyond five seconds — exit 2 is the one code that blocks a prompt.
- Whether a prompt is project work is the agent's call, not the hook's: the injected line says it applies only when the request is about this repository's work — keyword guessing at hook time would misfire on research inside a repo.
- `[minor]` in the branch commit → v0.12.0; one plan, one PR.

## Scope

In: `plugins/sdlc-assist/skills/sdlc/bin/lib/infer.js` (staged rules, step mapping), a new `bin/lib/stages.js` and its self-test, `bin/lib/signals.js` (stage signal, `tasks.md` H1), `bin/where.js` (`--brief`), `SKILL.md` (description, protocol without the default question, close mode for a stage, Never), `references/phases/*.md` (step names), `references/entry-points.md`, `plugins/sdlc-assist/hooks/` (new), `plugin.json` (hooks entry, description), both `README.md` files, `docs/sdlc-flow.md`, `CONTRIBUTING.md` if the gate list changes, `.github/workflows/ci.yml` install-smoke (one staged scratch repo), this repository's `docs/ci-red-runs.md`.
Out: the vendored skills, `which.js`, the three own skills (`sdlc-debugging`, `sdlc-qa-gate`, `sdlc-release`) beyond step names in their references if any, request-type keywords, any config key.

## Clarifications

- 2026-10-12 — Q: Is the staged way of working specific to Sr-Lievito? A: No, it is the owner's usual way of working (owner).
- 2026-10-12 — Q: Should the skill ask the developer to confirm the phase? A: No; it informs the agent, and the agent states the step in one plain sentence and proceeds (owner).
- 2026-10-12 — Q: What happens in research, browsing, voice or non-code sessions? A: The skill stays silent; it acts only on work about a code repository with an active cycle (owner).
- 2026-10-12 — Q: Who marks a stage closed? A: The agent, when the stage is closed with the owner, by writing `[x]` and the date in `plan.md` (owner).
- 2026-10-12 — Q: Which marker closes a stage? A: `[x]`, never an emoji; the skill writes no emoji anywhere (owner).

- 2026-10-12 — Q: Can a plugin ship a `UserPromptSubmit` hook whose output reaches the agent, and how can it fail? A: Yes, per code.claude.com/docs/en/hooks (read 2026-10-12): plugins define hooks in `hooks/hooks.json`, `${CLAUDE_PLUGIN_ROOT}` is the install directory, plain stdout on exit 0 is added as context alongside the prompt (`hookSpecificOutput.additionalContext` is the structured form), exit 2 blocks the prompt, other non-zero codes do not, and the default timeout on this event is 30 s. Hence the hook never exits 2 and sets its own short timeout (agent, from the docs).

## Open Questions

(none)

## Acceptance

- WHEN the stage named in the H1 of `tasks.md` is marked closed in `plan.md` and a later stage is open, `where.js` SHALL infer step 3 for the first open stage and name it.
- WHEN the active cycle's stage has open tasks, `where.js` SHALL infer step 4 build for that stage.
- WHEN every task is done and the stage named by `tasks.md` is not marked closed, `where.js` SHALL infer step 4 test for that stage.
- IF a stage is closed and `tasks.md` names no stage and every task is done, THEN `where.js` SHALL infer step 4 test for the first open stage and add a warning that `tasks.md` names no stage.
- IF no stage is closed and `tasks.md` names no stage, THEN `where.js` SHALL infer exactly what v0.11.1 infers for the same repository.
- WHEN every stage in `plan.md` is marked closed, `where.js` SHALL apply the cycle's existing deployment and close rules.
- WHILE stages are detected, `where.js` SHALL NOT warn that the header disagrees with the artifacts when the header phase is `development`, `testing` or `deployment`.
- THE SYSTEM SHALL count a stage as closed only from an `[x]` or a legacy check emoji on the stage's own row or heading, never from task checkboxes under it.
- IF `plan.md` has no stage table and no stage headings, THEN `where.js` SHALL infer exactly what v0.11.1 infers for the same repository.
- WHEN `where.js` runs with `--brief`, it SHALL print one line with the stage (when present), the step number and name, and the next action, and nothing else.
- THE SYSTEM SHALL keep every JSON field `where.js` printed in v0.11.1 and add `step` and `stage`.
- WHEN a prompt is submitted in Claude Code inside a repository with an active cycle, the plugin hook SHALL add the `--brief` line to the agent's context.
- IF the working directory has no active cycle, THEN the hook SHALL print nothing and exit 0.
- IF `where.js` fails inside the hook, THEN the hook SHALL print nothing and exit 0.
- THE SYSTEM SHALL NOT ask the developer to confirm the phase unless the request looks like a new topic while a stage is in flight.
- WHEN close mode closes a stage that is not the last one, THE SYSTEM SHALL write `[x]` and the date on that stage's line in `plan.md` and SHALL NOT change the spec header.
- THE SYSTEM SHALL NOT write an emoji to any file or output.
- THE SYSTEM SHALL describe the skill as for work on a code repository with specs, and not for research, browsing or non-code tasks.
- WHEN `where.js` runs on the owner's repositories as of 2026-10-12, it SHALL report: Sr-Lievito, stage 4 "Catálogo y contenido", step 3; NANDI bug hunt, step 4 test; Almacén, step 2 spec.

## Verification record

Pasted command and stdout in `docs/ci-red-runs.md`: the self-tests, `scripts/gates.sh`, `where.js --brief` on the three repositories named in Acceptance, and the hook firing and staying silent in a scratch repository.
