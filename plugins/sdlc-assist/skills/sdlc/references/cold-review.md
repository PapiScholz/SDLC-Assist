# Cold review

Before asking the developer to approve a cycle document, reviewers that were not in the conversation read it and report what a new reader cannot follow, what the code contradicts and what the plan leaves undecided. The author reads its own document with the whole conversation in mind and does not see those gaps; the developer reads with the same context. ADR 0012.

## The offer

Offer it in one line, in the developer's language, right before asking for approval, every time a document is ready for approval: "Before you approve: do you want a cold review? N reviewers read it without our conversation, about 12,000 tokens each for a one-page document, more for a longer one." Small work has no document and no offer. The figure is the `comprehension` plugin agent measured twice on a one-page `feature.md` (11,091 and 11,483 tokens, `docs/ci-red-runs.md`, 2026-11-26); `design`, `code-check` and `readiness`, and any reviewer on a long `spec.md` or plan, have not been measured and cost more as the document and the files it cites grow. A general-purpose subagent on another host loads more context: about 90,000 tokens for the same review.

Run nothing until the developer says yes. A no, or no answer, is a no: ask for approval as usual. Never run it on your own initiative, and never say a review ran when it did not.

## Who reviews what

| Document | Reviewers | Rounds |
|---|---|---|
| `feature.md` (medium) | `comprehension` (it also checks the claims about current code) | one |
| `spec.md` (large) | `comprehension`, `design`, `code-check` when the spec describes current code | up to three |
| `plan.md` + `tasks.md` (large) | `readiness`, `code-check` | up to three |

## How to run them

- **Claude Code:** the plugin agents `sdlc-assist:comprehension`, `sdlc-assist:code-check`, `sdlc-assist:design`, `sdlc-assist:readiness`. They read only (`Read`, `Grep`, `Glob`) and start without the user's or project's `CLAUDE.md`: `omitClaudeMd` needs Claude Code v2.1.271 or later, and an older version ignores it and loads `CLAUDE.md`. Check `claude --version` when you can; on an older version, or when you cannot tell, say the reviewers may have read `CLAUDE.md`. Launch the round's reviewers in parallel.
- **Other hosts with subagents:** a fresh general-purpose subagent per reviewer, its prompt being the body of the plugin's `agents/<name>.md`; tell it not to write. An install through the skills CLI copies skills only, not `agents/`: when those files are not on disk, say the review is not available on this install.
- **No subagents:** say the review did not run and ask for approval as usual. Never review in the same context: that is not a cold review.

Each reviewer's prompt holds only: the document path(s), the repository root, the files it may read (the document, the spec for a plan, and the files the document cites), and "review it". Never the conversation, a summary of it, the author's intent or a previous round's findings. A new reviewer each round. A URL is not passed: save the page to a file and pass the path.

A reviewer that returns no `REVIEW` report is retried once; if it fails again, report it as "not run", never as no findings. A round with a reviewer not run is not clean.

## Resolving the findings

Show the developer the comprehension paraphrase, then each Blocker and Major with your resolution; Nits as one line with their count. Resolve each finding as one of:

- `PROPOSE FIX`: the change you would make to the document.
- `CONTEST`: the reviewer is wrong and the proof is written where it could read it; cite the file and symbol, or the line of the document. "It was intended" is not proof.
- `ESCALATE`: the reviewer is wrong, but what proves it is not written anywhere (a verbal decision, a team habit). The developer decides.
- `DECLINE`: Nits only.

A comprehension gap is never contested: a new reader could not follow it, so context is missing. Do not change a severity without a `CONTEST`. Do not add text only to satisfy a reviewer; add it when a human reader needs it, otherwise `ESCALATE`.

Apply the fixes the developer accepts. For large documents, run another round with new reviewers; stop at the first round with no Blocker or Major left unresolved, or after three rounds, and say which. A finding settled by a `CONTEST` or an accepted risk is not reopened; a fixed finding that comes back in the same place is.

## Never

- Write the review, its findings or a report file into the repository. Findings live in the chat; only the accepted fixes change the document.
- Block the approval: the developer may approve with open findings, and the agent says which stay open.
