# One customer, many scenarios

## What changes for you

The demo stops jumping between four people. Every scenario runs as **CUST-001 · Linda Chen**, and you pick the situation from a scenario dropdown next to the member. The member selector stays for manual exploration, but nothing in the demo flow changes identity behind your back.

## 1. One profile that can produce all four outcomes

Linda's seeded data today supports three of the four outcomes. It does not support a waiting-period breach — every waiting period on her policies is already satisfied. One data addition fixes that:

- New policy **POL-1003** on CUST-001, personal medical card, active, effective ~3 months ago.
- It covers **surgical dental extraction (T-DENTAL-SURG)** with a 24-month waiting period. No other policy of hers covers dental surgery (POL-1001 excludes it), so the only covering policy is inside its waiting period — a genuine waiting-period outcome, not a staged one.
- Matching document-requirement rows added for any treatment/policy-type pair that lacks them.

Resulting scenario set, all on CUST-001:

| Scenario | Question | Why the outcome happens |
|---|---|---|
| Happy path | Coronary angioplasty with stent | Covered only by POL-1001, in force since 2021, no waiting period |
| Coverage boundary | Bariatric surgery | POL-1001 excludes it; POL-1002 covers it only under a rider whose status is unconfirmed → escalation |
| Waiting period | Surgical dental extraction | Only POL-1003 covers it, 24-month wait not yet met → escalation |
| Unknown treatment | Cornea transplant | Not in the treatment reference table → escalation |

## 2. Scenario dropdown

A "Scenario" dropdown sits beside the member in the session bar:

- Selecting a scenario clears the thread, sends that scenario's question immediately, and keeps the customer as Linda.
- The current outcome tag (Happy path / Coverage boundary / Waiting period / Unknown treatment) shows next to the dropdown so the expected result is visible while the agent works.
- Disabled while a response is streaming.

The empty-state cards and composer chips stay, now all showing the same member and differing only by scenario.

## 3. Label display toggle

A small three-way toggle (ID · Name · Both) in the session bar controls how members are written everywhere — selector, cards, chips, and the policy strip:

```text
ID     CUST-001
Name   Linda Chen
Both   CUST-001 · Linda Chen
```

Default is **Both**, in your preferred order: ID first, name second. The choice persists in the browser so it survives a reload. The outcome always stays a separate tag/suffix, never merged into the member label.

## Technical notes

- Migration adds POL-1003, its `policy_coverage` rows, and any missing `document_requirements` rows. Existing customers and policies are untouched, so the other three members remain selectable and working.
- `src/routes/index.tsx`: `SCENARIOS` all point at `CUST-001` and gain a `treatment` label; `SessionBar` gains the scenario `Select` and the label-mode toggle; a small `formatMember(mode, id, name)` helper feeds `SessionBar`, `EmptyState`, and `Composer`.
- Label mode kept in component state, mirrored to `localStorage`, read in `useEffect` to avoid hydration mismatch.
- No changes to the agent prompt, tools, escalation inbox, or decision log.

## Verification

Run all four scenarios end to end from the dropdown: confirm the member never changes, each produces its intended outcome (one clean coverage answer, three escalations that land in the inbox), and that switching the label toggle rewrites every member label consistently.
