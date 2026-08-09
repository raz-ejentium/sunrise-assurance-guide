# Remove the duplicated scenario controls

Agreed — the same four scenarios are currently offered in three places at once: the Scenario dropdown in the top bar, the "Demo scenarios" cards on the empty state, and the "Switch scenario" chip row above the composer. One of them is enough at any given moment.

## The rule

Each surface should own a different moment:

- **Before a conversation starts** — the cards are the right surface. They are the only place that explains what each scenario is about ("Bariatric surgery — two policies disagree, rider status unconfirmed") and they read as an invitation rather than a control.
- **During or after a conversation** — the top bar dropdown is the right surface. It is compact, always visible, and sits next to the member it applies to.

## Changes

1. **Delete the "Switch scenario" chip row above the composer.** It duplicates the dropdown and adds a second row of chrome directly under the chat, which is where the eye should be on the reply, not on demo controls.
2. **Hide the Scenario dropdown while the empty state is showing.** The cards already cover that moment. The dropdown fades in once the first message is sent, so the top bar stays quiet on arrival.
3. **Drop the small outcome pill next to the dropdown.** The dropdown already displays the active scenario name; the pill repeats the same word.
4. **Keep the cards as-is** — they are the one surface that carries the descriptions, and they stay reachable after a reset via "New conversation".

Net effect: one scenario control visible at a time, and the composer area gets back to being just the composer.

## Technical notes

All in `src/routes/index.tsx`:

- Remove the chip row block from `Composer` and drop its now-unused `scenarios`, `onScenario`, `activeScenarioKey`, and `labelMode` props and the corresponding call-site arguments.
- Pass a `showScenarioPicker` boolean into `SessionBar` (true when the thread has at least one message) and conditionally render the Scenario select group; remove the `activeScenario` pill.
- No backend, tool, or agent behaviour changes.
