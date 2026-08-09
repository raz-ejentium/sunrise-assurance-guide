# Chat-first handoff ordering + stray "Box1" text

## 1. Reply first, handoff card second

Today an assistant turn renders in this order: tool chips, the escalation card, then the written reply. On a handoff the customer sees a large warning panel before any explanation, which reads backwards for a chat product.

New order inside an assistant message:

```text
Claims assistant
[tool chips]
"I have checked your policy details for..."   <- written reply
[Handed off to a human specialist card]        <- escalation card
```

Change: in the assistant message renderer, render the text blocks before the escalation cards. Nothing else about the card, its content, or the restart button changes. Tool chips stay on top as the activity indicator.

## 2. The "Box1" line

"Box1" is not text the app writes — there is no such string anywhere in the code, styles, or seed data. It is coming through as part of the model's own reply text, rendered raw by the markdown renderer between the card and the explanation.

Approach:
1. Log the raw assistant text for a handoff run and confirm exactly what the model emits (likely a stray artifact token at the start of the text part).
2. Once confirmed, fix at the source: tighten the system instruction so the reply is plain prose with no scaffolding labels, and add a small sanitiser on the rendered text that strips leading artifact tokens of that shape before markdown rendering.

If the log shows it is instead an empty/placeholder text part, the fix is to filter that part out rather than sanitise.

## Technical notes

- `src/routes/index.tsx` — `MessageBlock`: move the `blocks.map(...)` render above `escalations.map(...)`.
- `src/routes/api/chat.ts` — system prompt wording for the final customer-facing reply.
- Small text-cleanup helper applied where `ReactMarkdown` receives `block.text`.
- No backend, schema, or tool-logic changes.

## Verification

Run the "Coverage boundary" scenario end to end and confirm: explanation paragraph appears first, handoff card follows, no stray "Box1" line, restart button still works, escalation inbox still records the entry.
