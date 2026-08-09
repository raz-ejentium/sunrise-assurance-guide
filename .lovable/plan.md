# Restarting after a handoff

Right now, once the assistant hands you to a human specialist, the thread just sits there. The only ways to clear it are switching to a different member in the dropdown or clicking a scenario preset (which also switches member). There is no plain "start over" control, so a demo run ends in a dead end.

## What to add

**1. A "New conversation" control in the session bar**

- Small button at the right of the session bar (next to the "Synthetic data" note), visible whenever there is at least one message.
- Clears the thread, clears the composer, keeps the currently selected member, and refocuses the input.
- Disabled while a response is streaming.

**2. A follow-up prompt on the escalation card**

- Below the handoff message, add a line: "Reference saved. Start a new conversation to ask about another treatment." with an inline "Start a new conversation" button.
- Same action as the session-bar button, so the reset is reachable exactly where the conversation ends.

**3. Keep the reference visible**

- The escalation stays in the Escalation inbox with its reference number, so clearing the chat loses nothing.

## Technical notes

- `src/routes/index.tsx`: add a `resetConversation` callback (`setMessages([])`, `setInput("")`, clear `pending`, reset `sentRunRef`, focus input). Pass it to `SessionBar` and down to `MessageBlock` → `EscalationCard`.
- `src/components/claims/EscalationCard.tsx`: accept an optional `onRestart` prop and render the footer button when provided.
- Trace panel entries derive from `messages`, so clearing the thread also clears the trace — intended.
- Presentation-only change; no backend, tool, or agent-prompt changes.
