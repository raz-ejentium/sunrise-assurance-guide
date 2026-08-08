# Smart Claims Initiation Agent — Build Plan

A conversational claim-initiation assistant for health insurance, with a real LLM agent that calls backed-by-database tools, and refuses to guess — escalating to a human instead.

## What gets built

### 1. Backend data (Lovable Cloud)

Six tables, all synthetic, seeded via migration:

- `customers` — id, name, email, member_since
- `policies` — id, customer_id, policy_type, insurer_name, status, effective_date, annual_limit, currency
- `treatments` — treatment_code, description, category, pre_auth_typically_required
- `policy_coverage` — policy_id + treatment_code, covered flag, waiting_period_months, exclusion_note, requires_rider, rider_held
- `document_requirements` — treatment_code + policy_type, ordered list of required documents
- `escalations` — reference_number, customer_id, reason_code, reason, conversation_summary, what_was_determined, what_could_not_be_determined, status, created_at

Seeded customers:
- **Linda Chen** — two overlapping policies (personal medical card + employer group plan). Knee arthroscopy is cleanly covered under both. Bariatric surgery is covered under the group plan's rider but explicitly excluded on the personal card → the boundary case.
- **Ravi Kumar** — single policy, clean happy path.
- **Aisha Rahman** — policy still inside a waiting period.
- **Tan Wei Ming** — lapsed policy, plus an unknown-treatment case.

All tables get explicit GRANTs and RLS. Demo has no login, so reference data is anon-readable; escalations are written server-side only.

### 2. The five agent tools

Implemented as real AI SDK tools executed server-side against the database:

1. `get_customer_policies(customer_id)`
2. `check_eligibility(policy_id, treatment_code)` — covered, waiting-period status, exclusions, rider status
3. `get_document_requirements(policy_id, claim_type)`
4. `get_claim_timing_rule(policy_id, treatment_code)` — pre-auth vs post-treatment
5. `escalate_to_human(reason_code, reason, conversation_summary, determined, undetermined)` — writes a row, returns `ESC-YYYY-NNNN`

Every tool returns a `confidence` signal, not just data — so ambiguity is data, not vibes.

### 3. Hard-coded escalation triggers (the gap in the original spec)

The agent is instructed it may NEVER state coverage from its own knowledge — only from tool output. It MUST call `escalate_to_human` when any of these fire:

- Two or more policies return conflicting eligibility for the same treatment
- The treatment described doesn't map to a known `treatment_code`
- The customer can't confirm which policy is theirs
- A policy is inside a waiting period whose end date can't be resolved
- Coverage depends on a rider whose status is unknown
- Policy status is anything other than active
- The customer's identity is ambiguous

These are also enforced in code: if the model tries to give a verdict on a treatment where the tool returned conflicting results and no escalation was called, the server appends a forced escalation. Belt and braces, so the demo can't silently fail.

### 4. Conversation flow

Identify customer → gather what happened (condition, date, provider) → run eligibility across all policies → if multiple apply, produce a coordination-of-benefits recommendation with visible rationale → return documents + timing together → or stop and escalate.

### 5. UI — institutional insurer aesthetic

Deep navy, warm ivory, muted gold accent, serif display headings over a clean sans for body. Conservative, high-trust, document-like. Not a purple gradient chatbot.

Four surfaces:

- **`/` — Claims assistant.** Customer selector dropdown, chat thread, streaming responses, markdown rendering. Escalation renders as a distinct bordered handoff card with the reference number, what was determined, what wasn't, and next steps — visually unmistakable in a recording. Policy eligibility results render as structured cards, not prose.
- **Right-hand agent trace panel.** Live log of every tool invocation: name, arguments, returned payload, latency. Collapsible. This is what proves it's an agent.
- **`/inbox` — Ops escalation queue.** Table of handoffs with reference number, customer, reason, timestamp, and expandable full conversation context. Makes the reference number real.
- **`/decision-log` — Build decision log.** Model choice and rationale, spec divergences, scope cuts. Pre-populated and editable.

Scenario preset buttons above the composer: *Happy path*, *Coverage boundary (escalates)*, *Waiting period*, *Unknown treatment* — each loads a customer and a seeded opening message so the demo is reproducible in one click.

## Technical notes

- Agent runs on `google/gemini-3.6-flash` via the Lovable AI Gateway with the AI SDK — fast enough for live demo, strong tool-calling, and reasoning is visible. Streaming chat route at `src/routes/api/chat.ts` with `stopWhen: stepCountIs(50)`.
- Tool execute functions live in a server-only module and query Cloud with a server-side client; the chat route composes them.
- Tool calls are streamed to the client as message parts and rendered in the trace panel directly from `message.parts`.
- Conversation is in-memory per session; escalations persist to the database (that's the auditable artifact that matters).
- No auth, per the spec's out-of-scope list.

## Out of scope (unchanged from the brief)

No real customer data, no adjudication or payout, no post-submission tracking, no login.

## What I'd flag before you demo this

The single most fragile thing in a live demo is an LLM that decides to be helpful and answers the boundary case anyway. The code-level escalation enforcement above is the mitigation — but I'd still recommend recording the boundary scenario first.
