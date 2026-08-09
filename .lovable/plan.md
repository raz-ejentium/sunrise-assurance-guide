# Fix the session bar: stable two-row layout

## The problem

Everything in the session bar — Member, Scenario, Labels, Policies, the "synthetic data" note — sits in one wrapping row. Where the policy group lands is therefore an accident of how long the content happens to be: Linda's three policies overflow and drop to a second line, Ravi's single policy stays inline. The layout changes shape as you switch member, which reads as a bug.

## The fix

Split the session bar into two deliberate rows with a hairline between them.

```text
┌───────────────────────────────────────────────────────────────┐
│ MEMBER [CUST-001 · Linda Chen ▾]   SCENARIO [▾]   LABELS[ID|Name|Both]   ⛨ Synthetic data │
├───────────────────────────────────────────────────────────────┤
│ POLICIES 3   ● POL-1001 personal medical card   ● POL-1002 …  │
└───────────────────────────────────────────────────────────────┘
```

- **Row 1 — controls.** Member, Scenario (still only when a conversation exists), Labels, with the "Synthetic data · no adjudication" note pushed right. No policies here.
- **Row 2 — policies.** Always its own full-width row, always directly under the member it belongs to, whether there is one policy or five. Same position for every member.

## Detail work while we're in here

- The policy row loses the boxed container and instead uses the row itself as the group: a `POLICIES n` caps label on the left, a thin accent rule marking the row start, chips flowing after it. Less nesting, less visual noise than a bordered box inside a bordered bar.
- Chips get consistent internal rhythm: status dot, mono policy ID, plan name in regular type, status suffix only when not active. Lapsed chips keep the destructive tint so Tan Wei Ming's lapsed plan is obvious at a glance.
- Vertical spacing evened out so the bar has the same height whether the scenario picker is showing or not (avoids the page jumping when the first message is sent).
- On narrow widths the policy chips scroll horizontally rather than stacking into an ever-taller bar.

## Technical notes

- Single file: `src/routes/index.tsx`, the `SessionBar` component (lines ~452-567). Change the outer `div` from one wrapping flex row into a `flex-col` with two child rows.
- Presentation only — no changes to data, scenarios, chat, or backend.

## Verification

Switch through all four members in the preview and confirm the policies row stays in the same place and the bar keeps a stable height, with and without an active conversation.
