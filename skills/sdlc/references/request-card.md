# Request card

Five lines. Fill them from the complaint; the spec-driven-development flow turns the card into a short spec that carries the header (`spec-header.md`: `Phase: analysis`, `Status: draft`).

## Template

```
Who asks:      <person, role or system reporting it>
What happens:  <the observed behaviour>
Expected:      <what should happen instead>
Where:         <screen, endpoint, file, environment>
Urgency:       <blocking | this week | whenever>
```

## Example

```
Who asks:      Ana, shop owner
What happens:  The receipt total shows 12.5 instead of 12.50
Expected:      Two decimals, always
Where:         Checkout screen, receipt preview
Urgency:       this week
```

If a line cannot be filled from what the user said, ask for it; do not invent it.
