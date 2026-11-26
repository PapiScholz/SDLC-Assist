# 0012. Cold review of spec and plan: offered, run by isolated read-only reviewers, reported in the chat

Status: proposed
Date: 2026-11-26

## Context

Issue #30: the agent that writes `spec.md`, `feature.md` or `plan.md` is the one that checks it before asking for approval. It reads with the whole conversation in mind, so undefined terms, claims about code it only remembers and decisions left to the implementer look fine to it; the developer reads with the same context. A reader with no history sees them. The idea comes from `google/elephant-goldfish-model` (EGM, Apache-2.0, commit `72d06f5`); the profiles here are written in this repository's words.

Constraints: nothing blocks (ADR 0009); paperwork is proportional to size (ADR 0007); the plugin writes nothing in the user's repository beyond three categories (`sdlc/SKILL.md`, Never). Cost: one reviewer measured at 88,780 tokens on a one-page `feature.md` (`docs/ci-red-runs.md`, 2026-11-26), against a subagent run of 153k tokens measured earlier the same day.

Options weighed (spec `docs/specs/2026-11-26-visible-cycle-single-door/spec.md`, Decisions 7 to 11):

1. Run the review on its own for medium work, offer it for large work.
2. Offer it in every size, run it only on the developer's yes.
3. EGM's five-stage pipeline with a question after each stage, a synthesizer and A/B reviewers.

## Decision

Option 2, chosen by the owner after the cost estimate ("paid only when asked"). Option 3 contradicts proportionality and doubles the cost.

- `sdlc-spec` and `sdlc-plan` offer the review in one line before each approval; nothing runs without a yes. The procedure lives in `skills/sdlc/references/cold-review.md`.
- Reviewers by size: `feature.md`, `comprehension` (paraphrase first, then gaps, with the claims about current code checked), one round. `spec.md`, `comprehension`, `design` and `code-check`. `plan.md` and `tasks.md`, `readiness` and `code-check`. For large documents: up to three rounds, stopping at the first with no Blocker or Major left open.
- In Claude Code they are plugin agents (`plugins/sdlc-assist/agents/`) with `tools: Read, Grep, Glob` and `omitClaudeMd: true`, and they get only the document, the repository root and the files to read. `check-agents.js` fails a gate run on any agent with another tool or without `omitClaudeMd`.
- Other hosts use a fresh subagent with the profile as its prompt. With no subagents, or an install without `agents/`, the agent says the review did not run; it never reviews in its own context.
- A reviewer with no report is retried once, then reported as "not run"; that round is not clean.
- Findings go to the chat only. Each is resolved as `PROPOSE FIX`, `CONTEST` (with a citation the reviewer could read), `ESCALATE` (the developer decides) or `DECLINE` (Nits only). A comprehension gap is never contested. The developer may approve with open findings.

## Consequences

About 90,000 tokens per reviewer, paid only on a yes; a large spec with three reviewers and three rounds can pass 800,000. A seeded fixture (`test-fixtures/review/`, answer key in `GAPS.md`) is how detection is checked; it is not in CI, because it needs a model. The isolation (`omitClaudeMd`, read-only tools) is documented by Claude Code and checked statically; whether a plugin agent sees `CLAUDE.md` at run time is recorded in `docs/ci-red-runs.md` when it could be run.
