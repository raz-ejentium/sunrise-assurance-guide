# Member labelling: ID first

## Decision recap

- Members are labelled **`CUST-001 · Linda Chen`** — ID first, name second, everywhere a member is named.
- The demo keeps **four members**. Each member's seeded policy data is what produces their outcome, so the scenarios can't be collapsed onto one profile without faking data:
  - Ravi Kumar — one active policy, appendectomy cleanly covered
  - Linda Chen — two policies that conflict on bariatric surgery
  - Aisha Rahman — policy too new for knee surgery (waiting period)
  - Tan Wei Ming — treatment absent from the reference table

## What changes

1. **Member selector** (session bar) — options read `CUST-001 · Linda Chen` instead of `Linda Chen · CUST-001`.
2. **Demo member cards** (empty state) — card title becomes `CUST-001 · Linda Chen`, with the ID in a monospace tone so it reads as a record reference and the name stays prominent. Outcome tag and quoted prompt are unchanged.
3. **Scenario chips** (above the composer) — read `CUST-001 · Linda Chen` followed by the outcome, e.g. `CUST-001 · Linda Chen — coverage boundary`. If that gets too long on narrow widths, the chip shows `CUST-001 · Linda Chen` only and keeps the outcome in the tooltip.

No changes to the escalation inbox, decision log, agent prompts, tools, or seeded data.

## Technical notes

- Single file: `src/routes/index.tsx` — `SessionBar` select items, `EmptyState` card header, `Composer` chip label.
- Presentation only; `customerId` remains the value driving chat sessions and tool calls.

## Verification

Load the page and confirm the selector, cards, and chips all read `CUST-XXX · Name` in that order, and that clicking a card or chip still switches member and sends the scenario prompt immediately.
