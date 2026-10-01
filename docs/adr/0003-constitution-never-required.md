# 0003. Cross-cycle artifacts are detected and cited, never required and never written by the router

Status: accepted
Date: 2026-10-01

## Context

Spec Kit starts every project with a constitution. Requiring one would block `analysis` on repositories that adopt the router mid-life, and writing one for them would put product rules in the agent's hands. Spec: `docs/specs/2026-09-30-v1-5-sdd-alignment.md`, plan 4. Implemented in `b087643`.

## Decision

`docs/constitution.md` (or root `CONSTITUTION.md`) is a signal: `signals.constitution` with `exists`, `path`, `sections`. The phase sheets cite it only in the phases that act on it; when it does not exist the router says nothing. The router never writes it; a template ships and the author writes the file. The same rule applies to every later cross-cycle artifact (ADRs in v1.6, `ARCHITECTURE.md`, hygiene files).

## Consequences

A repository without a constitution behaves exactly as before. Each new artifact costs one read-only signal, one template and a few sheet lines, and no new config key. "Never nag" is enforced by `check-sheets` keeping each mention in its phase, and by the install-smoke fixture asserting the signal is absent on an empty repo.
