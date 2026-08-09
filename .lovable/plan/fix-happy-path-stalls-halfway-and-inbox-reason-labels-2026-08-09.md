# Fix: Happy path stalls halfway, and inbox reason labels

## What I tested

I ran the Happy path prompt straight against the chat endpoint. It completed the full run end to end: policies, treatment match, eligibility, documents, timing, submission guidance, and a complete written answer. So the agent and its tools are fine.

## Why it stalls in the UI

Your last click sent the **same message twice, two seconds apart**. The gateway log shows one of those two runs being cancelled mid-flight (HTTP 499) while the other finished. Both share one chat session, so the cancelled one is what you see on screen: it stops right after "Resolved treatment code" and never writes an answer.

The cause is the scenario preset. It stashes a "pending scenario" and sends it from an effect; in development that effect fires twice, producing two overlapping streams for the same conversation. The second start aborts the first, and the aborted stream is the one left rendered.

## Why the escalation inbox didn't update

That part is working as designed. Happy path is Ravi's clean single-policy case — the agent can determine coverage, so it must not escalate, and nothing is written to the inbox. The inbox does receive rows: there are five in there already, the most recent from an earlier run today, and the page polls every 8 seconds.

The scenarios that do produce a new inbox row are Coverage boundary (Linda), Waiting period (Aisha) and Unknown treatment (Tan Wei Ming).

One real issue there: the inbox translates reason codes into friendly labels using a list that no longer matches the codes the agent actually emits (it expects `conflicting_policies`, the agent sends `conflicting_policy_coverage`, `rider_status_unknown`, `inside_waiting_period`, and so on). So rows show a raw snake_case code instead of a readable label, both on the card and in the summary bar.

## What changes

- A scenario preset sends exactly once, no matter how many times the effect re-runs. Duplicate/overlapping runs for the same conversation are prevented.
- The same guard covers a rapid double-click on a preset.
- The inbox reason labels are aligned to the codes the agent actually produces, so cards and the summary bar read in plain English. Any unrecognised code falls back to a de-underscored, capitalised version rather than raw text.
- After the change I'll run all four scenarios end to end and confirm Happy path completes with a full answer and that the three escalating scenarios each add a row to the inbox.

## Technical notes

- `src/routes/index.tsx`: replace the `pending` → `useEffect` → `sendMessage` handoff with a send guarded by a ref keyed on the scenario run (e.g. `sentRef.current === runKey` short-circuit), so a double-invoked effect can't start a second stream. Keep the existing behaviour of waiting until `customerId` matches the scenario before sending.
- `src/routes/inbox.tsx`: extend `REASON_LABELS` to the emitted codes (`conflicting_policy_coverage`, `unknown_treatment`, `ambiguous_identity`, `inside_waiting_period`, `rider_status_unknown`, `policy_not_active`, `missing_reference_data`, `customer_request`) and add a humanising fallback.
- No agent, tool, prompt, or database changes.
