# Escalation inbox: summary stats + status badges

## What you'll see

At the top of the escalation inbox, above the list:

- A compact summary bar: total count plus a breakdown by trigger reason, using the same friendly reason labels already shown on the cards (e.g. "2 escalations — 2 conflicting policies"). When every escalation shares one reason, it reads as "both/all triggered by <reason>".
- Each escalation card header gets a status badge: Open, In Review, or Resolved, colour-coded (Open = warning, In Review = accent, Resolved = success).

The empty state stays as it is today — no summary bar when there are no escalations.

## Data

Escalations already carry a `status` value that defaults to "open", and the inbox already fetches it. Nothing changes in the database. Any unrecognised or missing status renders as "Open".

The badge is display-only in this change — no controls to change a status yet. Say the word if you want the specialist to be able to move a case to In Review or Resolved.

## Technical notes

- `src/routes/inbox.tsx`: add a `SummaryBar` component that derives counts from the loaded escalations with `useMemo`, grouped by `reason_code` and mapped through the existing `REASON_LABELS`, sorted by count descending.
- Add a `StatusBadge` component mapping `status` ("open" | "in_review" | "resolved", case-insensitive) to label plus semantic token classes; unknown values fall back to Open.
- Render the badge in the existing card header row, next to the reason chip; render the summary bar between the page header and the list.
- Presentation-only change: no edits to `src/lib/demo.functions.ts`, no migration.
