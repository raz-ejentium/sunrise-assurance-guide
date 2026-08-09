# Label and style the policies group in the session bar

Right now the member's policy chips float in the session bar with no label and no visual grouping, so they read as unrelated tags rather than "the policies belonging to this member".

## What changes

- Add a `Policies` caps label in front of the chip row, matching the existing `Member` / `Scenario` / `Labels` label styling.
- Wrap the label plus chips in a subtly tinted, rounded container with a left accent rule, so the group visually belongs to the selected member.
- Give each chip a small colored status dot: accent/gold for active policies, destructive red for lapsed or inactive ones, with the status word kept as a suffix for non-active policies.
- Keep the policy ID in mono type and the plan name in regular type, as today.
- Show a count (e.g. `3`) next to the label so it's clear at a glance how many policies the member holds.

## Technical notes

- Single-file change in `src/routes/index.tsx`, inside the `SessionBar` block that maps `activeCustomer.policies` (around lines 444-460).
- Uses existing semantic tokens only (`--muted`, `--accent`, `--border`, `--destructive`, `--card`); no new colors hardcoded.
- No data or backend changes.
