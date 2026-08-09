# Per-member scenario sets

Today the four demo scenarios are hard-wired to CUST-001 · Linda Chen, so switching member in the top bar changes the policy chips but not the scenarios — and running any scenario silently snaps you back to Linda. Each member gets their own scenario list, driven by the coverage data actually seeded for them.

## Scenario sets

CUST-001 · Linda Chen — 3 policies (personal medical card, employer group plan, dental care plan)
- Happy path — coronary angioplasty, covered outright by the personal card
- Coverage boundary — bariatric surgery, two policies disagree and rider status is unconfirmed
- Waiting period — surgical dental extraction, only the dental plan covers it and it is still in waiting
- Unknown treatment — cornea transplant, absent from the treatment reference

CUST-002 · Ravi Kumar — 1 policy (personal medical card)
- Happy path — emergency appendectomy, covered with no waiting period
- Single-policy limit — bariatric surgery, no coverage row on his only policy, so the agent cannot confirm and escalates
- Unknown treatment — cornea transplant

CUST-003 · Aisha Rahman — 1 policy (personal medical card)
- Waiting period — knee arthroscopy, 24-month waiting from effective date
- Maternity timing — maternity delivery, 10-month waiting period
- Happy path — emergency appendectomy
- Not on schedule — coronary angioplasty, absent from her policy schedule

CUST-004 · Tan Wei Ming — 1 policy (employer group plan, lapsed)
- Lapsed policy — emergency appendectomy on a plan no longer in force
- Lapsed at time of treatment — knee arthroscopy, same lapsed plan

## Behaviour

- Switching member in the top bar swaps the scenario cards on the empty state and the options in the scenario dropdown.
- Selecting a member mid-conversation resets the thread so the transcript always matches the member on screen.
- Running a scenario no longer changes the member — each scenario belongs to the member already selected.
- The empty-state heading names the current member and their scenario count instead of the fixed "all scenarios run as the same member" copy.
- Label mode (ID / Name / Both) keeps working across cards, dropdown, and headings.

## Technical notes

- Change confined to `src/routes/index.tsx`: replace the flat `SCENARIOS` array with a map keyed by customer id, derive the visible list from the selected `customerId`, drop the `DEMO_CUSTOMER_ID` pinning and the member-switching side effect in the scenario runner.
- No database or backend changes; every scenario is produced by rows already seeded in `policies` and `policy_coverage`.
- Verify each member's scenarios end-to-end in the preview after the change.
