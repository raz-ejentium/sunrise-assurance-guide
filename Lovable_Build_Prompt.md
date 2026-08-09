# Lovable Build Prompt — Smart Claims Initiation Agent

*Internal working document — not for Sun Life submission directly. Paste into Lovable (Plan Mode recommended first) to drive the build. Include in the GitHub repo as evidence of build process.*

---

## Context (paste first, or attach the BRD/PRD file for reference)

Build a conversational agent prototype for a health insurance claim-initiation assistant. The agent helps a customer determine claim eligibility, document requirements, and timing — across potentially multiple policies — and escalates to a human when it can't determine an answer with confidence, rather than guessing.

## Step 1 — Data model (build this first)

Create a synthetic dataset, no real customer data:

- **Customers** table: customer_id, name, list of policy_ids
- **Policies** table: policy_id, customer_id, policy_type (e.g. "personal medical card", "employer group plan"), status, coverage rules (a simple list of covered treatment codes with any waiting-period or exclusion flags)
- **Treatments/conditions** reference table: treatment_code, description, whether pre-authorization is typically required
- **Document requirements** table: mapped by treatment_code + policy_type → list of required documents

Seed with 3-4 sample customers, including one test customer ("Linda") with two overlapping policies (a personal medical card and an employer group plan) — one treatment cleanly covered, one treatment near a coverage boundary (covered under one policy's rider but excluded under the other), for testing the escalation case.

## Step 2 — Build these five functions/tools

Implement as callable functions the agent can invoke mid-conversation:

1. `get_customer_policies(customer_id)` → returns all policies for that customer
2. `check_eligibility(policy_id, treatment_code)` → returns covered (true/false), waiting-period status, any exclusion notes
3. `get_document_requirements(policy_id, claim_type)` → returns required document checklist
4. `get_claim_timing_rule(policy_id, treatment_code)` → returns whether pre-authorization is required before treatment, or a post-treatment claim is acceptable
5. `escalate_to_human(reason, conversation_summary)` → generates a reference number, logs the handoff with full context attached
6. `get_submission_guidance(policy_id, claim_type)` → returns where to submit (channel: portal, app, or branch), how (method), and an estimated turnaround time once complete documents are received (e.g. "5-7 business days")

## Step 3 — Build the conversation flow

The agent should, in order:
1. Identify the customer and pull all their policies (function 1)
2. Ask what happened — condition/treatment, when, which provider — in plain language
3. Run eligibility check against all relevant policies (function 2)
4. If more than one policy could apply, determine which policy should be claimed first
5. Return document requirements, timing guidance, and submission guidance together (functions 3, 4, and 6) — document requirements are guidance on what the customer needs to prepare and bring, not documents retrieved from a customer record
6. At any point where eligibility, policy match, or coverage can't be determined with confidence — STOP and call function 5 instead of continuing to steps 4-5. Do not guess or infer an answer when the underlying data is ambiguous or missing.

## Step 4 — Build and test the escalation case explicitly

This is a required, separately-tested scenario, not an incidental edge case:
- Simulate a customer who is unsure which policy is theirs, OR describes a treatment that sits on a coverage boundary (covered under one policy, excluded under another)
- Confirm the agent does NOT produce a confident eligibility answer in this case
- Confirm the agent instead summarizes what it knows, explains what it couldn't determine, and hands off via `escalate_to_human` with a reference number shown to the customer

## Step 5 — UI

Simple chat interface. Show the conversation. When `escalate_to_human` fires, visibly display the reference number and handoff message distinctly from normal agent responses (e.g. a highlighted card), so it's obvious in a demo recording that escalation is a distinct, working code path — not a silent failure.

## Explicitly out of scope for this build

- No real customer data or live core-system integration
- No claim adjudication, payout, or post-submission tracking — this ends at "claim initiated with correct info attached"
- No authentication/login flow needed for the demo — a customer selector dropdown is sufficient

## After building — capture for the decision log

Note in a running log (for the BRD/PRD's build narrative / decision log section): which LLM/model was used for the agent's reasoning and why, any point where Lovable's generated logic diverged from this spec and how it was corrected, and any scope cut made under time pressure.
