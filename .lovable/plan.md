# Fix the member and policy hierarchy properly

The current header is technically split into two DOM rows, but the identical background, tight spacing, and weak divider make them read as one continuous toolbar. The fix needs to change the visual structure, not merely move the policy markup.

## Selected direction

Build the **Structural hierarchy** variant:

- Keep **Member**, the optional **Scenario** selector, and **Labels** together on the top control row.
- Give **Policies** a full-width second band beneath it with its own spacing, top rule, and restrained background contrast.
- Use the existing gold accent as a short vertical marker beside the Policies label so the child relationship is obvious.
- Keep the policy count beside the label and show each policy as a status-aware chip.
- For lapsed policies, separate the status into a compact destructive badge instead of blending the entire label together.

## Consistency details

- The second policy band will always render at the same location and with the same minimum height for every member—whether they have one, two, or three policies.
- Multiple policies will wrap within the policy band instead of changing the member row or forcing horizontal overflow on normal desktop widths.
- On narrower screens, the top controls and policy chips will wrap cleanly while preserving the two-level hierarchy.
- The scenario selector will remain in the top row only after a conversation starts; no chat behavior or scenario logic will change.
- Existing insurer typography and semantic navy, ivory, gold, border, and destructive tokens will be preserved.

## Verification

- Check **Tan Wei Ming** to confirm one lapsed policy appears in the dedicated second band.
- Check **Linda Chen** to confirm three policies use that exact same band and do not alter the member-row structure.
- Check another one-policy member to ensure the alignment is identical.
- Verify desktop and narrow viewport rendering, including wrapping, overflow, label visibility, and status contrast.

## Technical scope

- Update only the `SessionBar` presentation in `src/routes/index.tsx`.
- No backend, policy data, scenario behavior, chat flow, navigation, or other page sections will be changed.