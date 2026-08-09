# Fix: scenario presets silently do nothing

## What's happening now

Each scenario is written for a specific member (Happy path is Ravi's clean single-policy case, Coverage boundary is Linda's conflicting-policy case, and so on). Clicking a preset switches the member selector to that scenario's member — which is why picking Linda then clicking "Happy path" flips you to Ravi.

Then nothing else happens, because the preset only drops the prompt text into the composer. It never sends it. Two clicks were always required, and the second one isn't obvious.

There is also a hidden race: the chat session is keyed by the selected member, so switching member tears down and rebuilds the chat. Anything sent in the same instant as the switch would be lost.

## What changes

- Clicking a preset switches to that scenario's member, clears the thread, and immediately sends the scenario prompt — one click runs the whole scenario end to end.
- The send waits until the chat session for the new member is live, so the message can't be dropped by the member switch.
- The preset buttons state which member they run as (e.g. "Happy path — Ravi Kumar"), so the selector changing is expected rather than surprising.
- Presets are disabled while a response is streaming, so a mid-stream click can't leave the UI stuck.

## Technical notes

In `src/routes/index.tsx`, `runScenario` currently calls `setCustomerId` / `setMessages([])` / `setInput(prompt)` and stops. Replace with a pending-scenario state: set the member and stash the prompt, then an effect fires `sendMessage` once `useChat`'s `id` (`claims-${customerId}`) matches the pending scenario's member. Scenario labels get the member name resolved from the loaded customer list. No backend or agent-logic changes.
