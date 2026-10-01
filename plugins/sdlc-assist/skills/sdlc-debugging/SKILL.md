---
name: sdlc-debugging
version: 0.10.0
description: Localises the cause of a bug or complaint before the short spec is written, so the spec states a cause, not a symptom. Four steps with exit criteria (reproduce, localise, explain, hand off) and no product-code changes. Use on the bug route of Requirements analysis, when sdlc classifies a request as bug or complaint, or when asked why something fails before any fix is attempted.
---

# sdlc-debugging: localise before you specify

## Overview

A bug enters Requirements analysis with a symptom. This skill turns the symptom into a cause with evidence, then hands the cause to the short spec. It writes no product code: the fix belongs to Development. Reply in the user's language.

Inputs: the request card (`Who asks`, `What happens`, `Expected`, `Where`, `Urgency`) and the `where.js` output of the `sdlc` skill. When you need stack facts (test command, recent commits), run `where.js` as the `sdlc` skill describes (locate `bin/` the same way) instead of detecting them yourself:

```
node "<sdlc bin>/where.js" --message-file "<temp file>"
```

Read `signals.testRunner.command` (the suite command, or null) and `signals.git.commits` (recent commits with paths).

Work through the four steps in order. Each has an exit criterion; do not move on until it is met or until you have written why it cannot be met.

## 1. Reproduce

Goal: one command or one manual step that shows the fault, which you can run again after every hypothesis.

How: prefer, in this order, a failing test (an existing one, or a new one that asserts `Expected` from the card), a command (`signals.testRunner.command`, a script), an HTTP request against a running instance the user already has. Adding a failing test or a diagnostic print is allowed; it is removed or kept on purpose in the hand-off.

Exit: `Reproduction: <command or step>` and its observed output. If no reproduction is possible, write `Reproduction: none — <why>; evidence used instead: <logs, screenshot, user report>` and continue with lower confidence, saying so in the hand-off.

## 2. Localise

Goal: the smallest unit that still fails: file, function, input.

How: start from `Where` on the card. Narrow with logs around the suspected path, bisection over inputs (halve the input until the fault disappears), or bisection over commits when the fault is a regression (`git bisect` only on the working tree state the user chose; never `checkout` or `reset` without the user's words in the current turn; `git log -S<term>` is read-only). Check `signals.git.commits`: if the last change to the failing path is recent, that commit is the first suspect.

Exit: `Location: <file>:<line range>` or `Location: not localisable with current evidence — <what is missing>`.

## 3. Explain

Goal: one sentence that predicts the symptom from the cause.

Rules that come first:
- If the last action before the symptom appeared was your own (an edit, a command, a config change), that action is the first suspect. Reread your own recent steps before opening any file.
- When two sources disagree (a log and a screenshot, a test and a manual run, two numbers), one of them is lying. Find which one before digging deeper; a measurement is cheaper to discard than a phantom is to chase.

How: state the cause, then try to disprove it once: change the input, the environment or the order in a way that the cause predicts should make the symptom disappear (or appear), and run the reproduction again.

Exit: `Cause: <sentence>` and `Disproof attempt: <what you changed> → <observed>, consistent with the cause`. A disproof that succeeds sends you back to Localise.

## 4. Hand off

Append two lines to the request card and carry them into the short spec:

```
Cause:         <the sentence from step 3>
Evidence:      <reproduction command or "none"; location; disproof attempt>
```

Then: state whether the diagnostic print or failing test stays (a failing test that pins the bug usually stays and becomes the first task of Development) or is removed, and remove it if so. Recommend `spec-driven-development` for the short spec with the header `Phase: analysis` / `Status: draft`, as the `sdlc` skill requires. The fix is Development's job; do not start it.

## Never

- Change product code during these steps. A diagnostic print or a failing test is the only allowed edit, and it is removed or kept deliberately.
- Declare a cause without a reproduction or without an explicit statement that none exists and what evidence replaces it.
- Run state-changing git commands (`checkout`, `reset`, `stash`, `bisect` that moves HEAD) without the user's explicit words in the current turn.
- Run the test suite as a whole unless the user asked or the reproduction is the suite itself; run the smallest failing unit.
- Invent a card line the user did not give; ask for it.

## Output

```
Reproduction: <command or none — why>
Location:     <file:lines or not localisable — what is missing>
Cause:        <sentence>
Evidence:     <disproof attempt → observed>
Diagnostic:   <kept as failing test <path> | removed>
Next:         short spec via spec-driven-development (Phase: analysis / Status: draft)
```
