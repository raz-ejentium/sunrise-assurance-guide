# Make demo scenarios member-led

## Why the pairing exists

Each scenario is tied to a member because that member's seeded data is what produces the outcome:

- Ravi Kumar — one active policy that cleanly covers an appendectomy
- Linda Chen — two policies that conflict on bariatric surgery
- Aisha Rahman — a policy too new for knee surgery (waiting period)
- Tan Wei Ming — asks about a treatment absent from the reference table

"Happy path" cannot run as Linda, because her data can only produce a conflict. Today the UI hides that, so the pairing looks arbitrary.

## 1. Cards lead with the member

Rewrite each scenario card so the member is the headline and the outcome is the supporting detail:

```text
Ravi Kumar
One active policy — appendectomy is cleanly covered
"I had an emergency appendectomy at Gleneagles last Tuesday..."
```

- Member name becomes the card title; the outcome label ("Happy path", "Coverage boundary", "Waiting period", "Unknown treatment") moves to a small tag on the card.
- Panel intro line changes to explain the coupling in one sentence: each member holds different synthetic policy data, so each one demonstrates a different outcome.

## 2. Give the chip row a clear purpose

The chip row above the composer stays, but is reframed as a mid-conversation switcher rather than a second copy of the cards:

- Label changes from "Scenarios" to "Switch member scenario".
- Chips read as member-first too ("Ravi Kumar · clean coverage"), matching the cards.
- The chip for the member currently selected is shown as active, so the row reads as "where you are / where you can jump to" instead of an unexplained duplicate.

## Technical notes

- `src/routes/index.tsx`: `SCENARIOS` entries gain the member name as the primary label with the outcome as a tag; `EmptyState` card markup and `Composer` chip markup updated accordingly.
- No changes to prompts, seeded data, tools, or the agent.

## Verification

Load the page, confirm the cards read member-first with an outcome tag, the chip row is labelled and marks the active member, and clicking either still switches member and sends the scenario prompt immediately.
