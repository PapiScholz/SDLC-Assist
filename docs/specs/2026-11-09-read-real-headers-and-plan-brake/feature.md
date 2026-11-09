# Feature: read real-world headers and stop implementing without a plan (issue #26)

Phase: development
Status: approved
Date: 2026-11-09
Owner: ezescholz

## Objective

In the developer's repos the router misreads where work stands (Spanish headers, module specs, tasks kept in `PLAN.md`), and the agent then implements without an approved plan. Make the router read those repos correctly and make the status line a fact the agent acts on, so it asks "do we plan first?" before writing code.

## Specs

S1. Spanish and synonym header vocabulary
   Quote: "Headers en español no se leen ... Resultado: los 4 ciclos de dopamina figuran `draft`"
   Outcome: `parseHeader` reads `Estado:`/`Fase:` as well as `Status:`/`Phase:`, with bold anywhere around the label, at line start or after a `|`/`·` separator in the header zone. Values map: `aprobada`, `aprobado`, `aprobado por ...`, `approved`, `accepted` -> approved; `implementado`, `implementada`, `implemented`, `done`, `shipped`, `cerrado`, `closed` -> closed (decision: closed, not testing); `borrador`, `draft`, `sin empezar`, `esperando revision` -> draft. Phase synonyms: `specification`/`spec` -> analysis, `plan` -> planning, `implement`/`implementation` -> development, `done`/`shipped` -> deployment.
   Check: new cases in `header.self-test.js` for each line seen in dopamina, Almacen, SGG, Memphis-molinete and Sr-Lievito fail today and pass after.

S2. The module being worked on is the one routed
   Quote: "El módulo `SPEC-*` activo dentro de un ciclo con MAPA no se ve: se rutea por el mapa, no por el módulo pedido o tocado último."
   Outcome: in a cycle with a map and `SPEC-*.md` modules, the router picks the module named in the request (slug match), else the module touched last, and reports its header; the brief line names the module.
   Check: `signals.self-test.js` / `infer.self-test.js` fixture with MAPA.md + two modules where the request names one; today it routes by MAPA.md.

S3. Tasks inside the plan count
   Quote: "Las tareas dentro de `PLAN.md` no cuentan: sin `tasks.md` -> 'no todo file' -> paso 2."
   Outcome: a folder cycle without `tasks.md` reads checkboxes from its `plan.md`; with a module picked, only the `#`/`##` sections that name its file count, and none naming it puts the module at step 3 (plan it). A separate `tasks.md` is read whole.
   Check: fixture cycle with `PLAN.md` holding open and done checkboxes and no `tasks.md`; today `todo.exists` is false and step is 2.

S4. Conjugated "implement" requests are classified
   Quote: "'implementemos' no se clasifica: sólo existe 'implementar' en infinitivo."
   Outcome: `implementemos`, `implementá`, `implementa`, `implementalo`, `implementen`, `implementación` classify as `feature`.
   Check: cases in `keywords.self-test.js`.

S5. The status line is a fact the agent cannot skip when asked to implement
   Quote: "El hook es ignorable ... y deduplica la línea por sesión, así que el aviso no se repite cuando el user pide implementar."
   Outcome: the hook drops the "(applies only when ...)" suffix in favour of factual wording; when the request classifies as `feature` and the routed work has no approved plan (or no approved spec), the line is printed even if identical to the last one and states it plainly ("no approved plan for this work").
   Check: hook test feeding the same session two prompts, the second one "implementemos X", prints the line twice; today the second is suppressed.

S6. The skill asks before implementing unplanned work
   Quote: "Falta un freno: SKILL.md no obliga a preguntar '¿planeamos?' antes de implementar trabajo sin plan aprobado."
   Outcome: SKILL.md Protocol has a step: when asked to implement and the routed work is not small and lacks an approved spec or plan, ask the developer whether to plan first before editing code; small work keeps going straight to development (ADR 0007).
   Check: manual probe in dopamina: `where.js --message-file <"implementemos las propuestas de SPEC-usabilidad-pasos"> --brief` names `SPEC-usabilidad-pasos` and says the work has no approved plan (no plan section names that file); reading SKILL.md shows the step.

S7. The router reads the owner's repos as they are, with no edits to them
   Quote: "No me traigas más problemas, solucioname la vida"
   Outcome: a plan section whose heading carries the module's H1 title belongs to it (dopamina H); a `planning` header with every task done reads as testing (Memphis-molinete); an approved status whose own text says "e implementada" is closed (Almacen, SGG); a flat spec that names its plan in the header (`Plan: docs/plans/x.md`) uses it (SGG).
   Check: new cases in `todo`, `signals`, `infer` and `header` self-tests fail on the first-round code and pass after; the 14-repo regression shows dopamina at step 4 (test), Memphis at "test the change", SGG on its open spec with its first plan task.

## Decisions

- `implementado` / `done` read as closed, not as approved-in-testing — developer's choice 2026-11-09 [ADR]
- The brake is context only (hook line + SKILL.md step); a PreToolUse `ask` hook is deferred, to be added if the agent implements without a plan once the router reads correctly; a `deny` hook is rejected because it would block small work (ADR 0007) and contradicts "never blocks" — developer's choice 2026-11-09 [ADR]
- handoff-ledger is not touched — the hook covers it.
- A plan section belongs to a module when it names the module's file or its heading carries the module's H1 title (two words or more, accents and punctuation ignored); no partial-word matching — predictable, and a miss errs toward planning (2026-11-09, second round).
- "Touched last" needs a module strictly newer than the map and than every other module — files committed together tie and pick none (2026-11-09).
- A request that names a module of the active cycle drops the new-topic hint (2026-11-09).

## Open Questions

(none)

## Tasks

- [x] T1 ADRs 0008 (header vocabulary) and 0009 (brake by context, `ask` deferred with its trigger) — evidence: `docs/adr/0008-header-vocabulary.md`, `docs/adr/0009-plan-brake-by-context.md`
- [x] T2 S1 header vocabulary, tests first — evidence: `lib/header.self-test.js` 3 FAIL on HEAD, 17 passed after (`docs/ci-red-runs.md` 2026-11-09)
- [x] T3 S4 keyword conjugations, tests first — evidence: `lib/keywords.self-test.js` 7 FAIL on HEAD, 37 passed after
- [x] T4 S3 tasks from plan.md when there is no tasks.md, tests first — evidence: `lib/todo.self-test.js`, `lib/signals.self-test.js` 1 FAIL each on HEAD, 0 after
- [x] T5 S2 active module selection, tests first — evidence: `lib/infer.self-test.js` 7 FAIL on HEAD, 59 passed after
- [x] T6 S5 hook wording and dedupe bypass, tests first — evidence: `hooks/sdlc-status.self-test.js`, `lib/brief.self-test.js` FAIL on HEAD, all passed after
- [x] T7 S6 SKILL.md step; README "never blocks" line kept accurate — evidence: SKILL.md Protocol step 4, README cycle paragraph, `references/spec-header.md`
- [x] T8 dopamina repro and the other repos, recorded in `docs/ci-red-runs.md`; `bash scripts/gates.sh` — evidence: `docs/ci-red-runs.md` 2026-11-09 entry, gates printed `all gates ok`
- [x] T9 S7 module title in plan headings — evidence: `lib/todo.self-test.js`, `lib/signals.self-test.js` FAIL before, pass after (`docs/ci-red-runs.md`, second round)
- [x] T10 S7 planning header with every task done reads as testing — evidence: `lib/infer.self-test.js` FAIL before, pass after
- [x] T11 S7 "aprobada ... e implementada" closes; flat spec's named `Plan:` is its plan — evidence: `lib/header.self-test.js`, `lib/signals.self-test.js` FAIL before, pass after; 14-repo regression in `docs/ci-red-runs.md`
