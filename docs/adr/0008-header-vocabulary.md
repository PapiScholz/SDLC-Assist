# 0008. Spec headers are read in English and Spanish, with the synonyms real repos use

Status: accepted
Date: 2026-11-09

## Context

Issue #26: in the owner's repos the router read every cycle as `draft` and sent the agent back to "finish the map" while the work was approved and half built. The parser knew only `Phase:`/`Status:` at line start with the six slugs. The specs it met say `Estado: **aprobada**`, `**Estado:** Aprobado por el user`, `> **Estado:** implementado`, `Estado: **borrador, esperando revisión**`, mid-sentence `... . Estado: **aprobada**`, `Phase: done`, `Phase: plan`, `Phase: specification`, `Status: implemented`, `Status: accepted` (surveyed in dopamina, Almacen, SGG, almacen-landing, Memphis-molinete and Sr-Lievito). Spec: `docs/specs/2026-11-09-read-real-headers-and-plan-brake/feature.md`.

## Decision

- Labels: `Phase`/`Fase` and `Status`/`Estado`, with bold or underscore markers around them, at line start (also inside a `>` quote), after a `·`/`•` field separator, or after a sentence end (`.` or `;` and a space). Never inside a table cell or a code span.
- Values are matched on the first word, accents removed. Status: `aprobada`, `aprobado`, `approved`, `accepted` are approved; `implementado`, `implementada`, `implemented`, `done`, `shipped`, `cerrado`, `cerrada`, `terminado`, `terminada`, `closed` are closed; `borrador`, `draft`, `sin` (empezar), `esperando`, `pendiente` are draft. Phase: `specification`, `spec`, `especificacion`, `analisis` read as analysis; `plan`, `planificacion` as planning; `implement`, `implementation`, `desarrollo`, `implementacion` as development; `pruebas` as testing; `done` and `shipped` as deployment and also close the cycle.
- `implementado` and `done` mean closed, not "approved and in testing" (owner's choice, 2026-11-09).
- An unrecognised value is skipped, so a later header line can still set the field. Writing stays English: the skill writes `Phase:`/`Status:` with the six slugs.

## Consequences

The owner's cycles route from their real state with no migration. The first word sets the status, with one exception: an approved status whose own text (the rest of the line up to the next `·` field, then the following header lines up to a blank line) says `implementado`/`implementada`, `implemented`, `shipped`, `cerrado` or `terminado`, not right after `no`/`sin`/`not`/`without`/`falta`/`todavía`, is closed (`aprobada (...) e implementada`). A header that now parses can lag the artifacts: a `planning` header whose tasks are all done reads as testing, with a warning that `sdlc close` updates it; with tasks still open the header keeps its reading. A flat spec that names its plan in the header (`Plan: docs/plans/x.md`, a link, or the path on the next line) takes that file as plan and task list.
