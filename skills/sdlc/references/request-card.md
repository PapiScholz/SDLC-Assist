# Request card

Five lines, plus two optional ones that `sdlc-debugging` fills on the bug route. Fill them from the complaint; the spec-driven-development flow turns the card into a short spec that carries the header (`spec-header.md`: `Phase: analysis`, `Status: draft`).

## Template

```
Who asks:      <person, role or system reporting it>
What happens:  <the observed behaviour>
Expected:      <what should happen instead>
Where:         <screen, endpoint, file, environment>
Urgency:       <blocking | this week | whenever>
Cause:         <optional; written by sdlc-debugging: the sentence that predicts the symptom>
Evidence:      <optional; written by sdlc-debugging: reproduction, location, disproof attempt>
```

## Example

```
Who asks:      Ana, shop owner
What happens:  The receipt total shows 12.5 instead of 12.50
Expected:      Two decimals, always
Where:         Checkout screen, receipt preview
Urgency:       this week
Cause:         formatTotal() drops trailing zeros because it calls Number.toString() instead of toFixed(2)
Evidence:      repro: node -e "..." prints 12.5; location src/receipt/format.js:41-44; disproof: toFixed(2) → 12.50
```

If a line cannot be filled from what the user said, ask for it; do not invent it.
