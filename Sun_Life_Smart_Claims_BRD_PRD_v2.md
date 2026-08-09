# Smart Claims Initiation — Agentic AI Solution
### Business Requirements Document / Product Requirements Document
**Prepared for:** Sun Life Malaysia — AI Vibe Coding Challenge
**Prepared by:** Razali [Razz]

*Confidence key: ✓ Verified (sourced, linked below) · ◐ Directional (widely reported, not independently pinned to one figure) · △ Assumption (stated design estimate)*

---

## 1. Problem Statement

Consider Linda, a Sun Life customer with a personal medical card plus a separate employer group health plan. She's diagnosed with a condition requiring outpatient specialist treatment. She doesn't know: whether either policy covers this specific treatment, which policy should be claimed first, what documents she needs before her appointment, or whether she should pay upfront and claim later or seek pre-authorization. She calls the contact centre, gets partial answers, and ends up submitting to the wrong channel — creating rework for Sun Life and frustration for her. This is not a hypothetical edge case; it's the ordinary experience of claim initiation today.

This friction is well documented industry-wide. Accenture's global claims research found 74-77% of dissatisfied claimants either switched insurers or are considering it, putting an estimated $170B in premiums at risk industry-wide over five years. ✓ Locally, BNMLINK logged 222 medical and health insurance/takaful complaints in 2025 (96% resolved by insurers), and BNM has directed insurers not to delay medical claims or apply undisclosed exclusions. ✓ 222 is a small number in isolation — but BNMLINK captures only formal regulatory escalations. It's the visible tip of a much larger volume of friction that resolves through repeat calls, rework, and abandoned claims well before it ever becomes a complaint — which is the volume this solution targets.

Scope is deliberately narrow: **claim initiation and eligibility determination**, not the full claims lifecycle (adjudication, payout, and dispute resolution are out of scope).

## 2. Root Cause Analysis

The surface reading — "customers don't read their policies carefully enough" — is wrong, and leads to the wrong fix (better FAQs). Four root causes sit underneath the symptom; only two are directly solvable at the initiation stage.

**1 — Structural information asymmetry (contract complexity).** Insurance contracts are legally precise but not written for in-the-moment decisions. A 2026 empirical study (Schwarcz, Cude, Logue & Marquez Alcala, 112 *Virginia Law Review* 727) ✓ tested this in homeowners insurance and found that giving consumers the actual policy language didn't reliably improve comprehension — particularly where broad coverage was later narrowed by a specific exclusion, a structural pattern common across insurance products generally, including health. *(Note: this study's population is homeowners, not health, insurance — used here as a strong analogous finding, not a direct data point.)*
→ *Not solvable by an agent; only mitigated by translating policy terms into a case-specific answer.*

**2 — Systems and data fragmentation (the operational root cause).** Even a motivated human agent often can't give Linda a clean answer, because eligibility data lives across disconnected policy, claims, and CRM systems. ◐ Industry reporting consistently identifies data silos as a major operational drag, though no single precise figure could be independently pinned down. This is the strongest root cause: customers aren't confused because they're careless — the unified answer genuinely doesn't exist today.
→ *This is what the proposed agent directly solves — a unified access layer across policy, benefit, and document data, exposed as one conversation.*

**3 — No proactive communication design.** Guidance today is reactive — the customer must know to ask, and know who to ask. Nothing surfaces the right information automatically at a claim-triggering event.
→ *Directly addressable — the agent prompts proactively at the point of need.*

**4 — Assumption that this is a "some customers" literacy issue.** △ The comprehension research above tested general consumers, not a specific low-literacy subgroup — arguing against a "simplified mode for less sophisticated customers" as the primary design. This is a design inference, not a proven income/education correlation.
→ *Shapes design (one robust flow for everyone), not scope.*

**What this means for solution scope:** the agent directly resolves Root Causes 2 and 3. It mitigates but doesn't eliminate Root Cause 1 — it can't rewrite the contract, only translate it per-case. It resolves Root Cause 4 through a design choice, not a technical fix. Naming what this solution does *not* fix is a deliberate scope decision: a weekend build shouldn't overclaim what a production initiative would take quarters to address.

---

## 3. Solution Design — Agent Architecture

**Objective:** given a customer and a described medical event, the agent determines eligibility across all their policies, the correct claim sequence, required documents, and timing — and escalates cleanly when it can't determine any of these with confidence, rather than guessing.

### 3.1 Conversation flow (Linda's case, walked through)

1. **Identify customer & pull policies** — agent looks up Linda's record, retrieves both policies (personal medical card + employer group plan) via a policy-lookup tool call. *This is the direct fix for Root Cause 2 — one lookup instead of Linda repeating her policy numbers across systems.*
2. **Capture the claim event** — agent asks what happened (condition/treatment, when, which provider) in plain language, no policy jargon required from Linda.
3. **Run eligibility check** — agent calls an eligibility tool against both policies for the stated treatment, checking coverage, waiting periods, and any exclusions.
4. **Determine claim sequence** — if both policies could apply, the agent determines coordination-of-benefits order (which policy claims first) rather than leaving Linda to guess.
5. **Return document + timing guidance** — agent states exactly what documents are needed and whether pre-authorization is required before treatment or a post-treatment claim is acceptable.
6. **Ambiguity check** — if any step above can't be resolved with confidence, the agent stops and escalates (see 3.3) instead of producing steps 4-5 anyway.

### 3.2 Tools / function calls

| Tool | Purpose | Input | Output |
|---|---|---|---|
| `get_customer_policies` | Retrieve all policies for a customer | customer_id | list of policy IDs, types, status |
| `check_eligibility` | Determine coverage for a treatment under a policy | policy_id, treatment/condition code | covered (y/n), waiting-period status, applicable exclusions |
| `get_document_requirements` | Return required documents for a claim type | policy_id, claim_type | document checklist |
| `get_claim_timing_rule` | Determine pre-auth vs post-treatment claim rule | policy_id, treatment_code | timing requirement |
| `escalate_to_human` | Hand off with full context when confidence is low | reason, conversation summary | ticket/reference number for the customer |

△ *Assumption: these are simulated against a synthetic dataset (mock policies, treatment codes, document rules) built for this challenge — not a live core-system integration, which would be a phase-2 production concern.*

### 3.3 Ambiguity handling (the required graceful-failure case)

**Scenario built for this submission:** Linda isn't sure which policy number is hers, or describes a condition that sits near a coverage boundary (e.g., a treatment that's covered under one policy's rider but not the base plan).

**Agent behavior:** rather than guessing which policy applies or inferring coverage from incomplete information, the agent states plainly what it could and couldn't determine, summarizes what it does know, and calls `escalate_to_human` — handing the customer a reference number and a clear next step, with the full conversation context attached so she doesn't have to repeat herself to a human agent. This is the direct fix for Root Cause 3 (no proactive handoff today) without overclaiming certainty the agent doesn't have.

### 3.4 Tech stack

△ Build platform: **Lovable**, chosen for speed of iteration within the evening-only build window and familiarity from prior agent-building work. LLM backend and exact tool-calling implementation to be finalized during build — documented in the decision log with the alternatives considered and why.

---

## 4. Future Operating Model

**Today:** contact centre agents field eligibility and document questions manually — cross-referencing policy admin, claims, and CRM systems live on the call, often placing the customer on hold or promising a callback. There's no structured escalation path beyond "let me check and call you back"; every case, simple or complex, consumes the same amount of frontline time.

**Future state — what changes:**

- **Tier 1 (self-serve, agent-handled):** straightforward eligibility, document, and timing questions — the majority of initiation volume — are resolved directly by the agent, with no human touch required. This is the volume Root Cause 2 (systems fragmentation) currently forces onto the contact centre unnecessarily.
- **Tier 2 (escalated, human-handled):** ambiguous or boundary cases — the ones the agent correctly declines to guess on — route to a human claims advisor with full conversation context attached (via `escalate_to_human`). The advisor's job shifts from *information retrieval* ("let me look that up across three systems") to *judgment calls* ("this is a genuine edge case that needs a person"). This is a higher-value use of frontline time, not a reduced one.
- **New role, not a removed one — escalation quality monitoring.** △ Someone (existing team lead or a rotating claims-ops function) reviews escalated cases weekly to spot patterns: if the same ambiguous scenario escalates repeatedly, that's a signal to add it to the agent's covered scope, not a permanent manual queue. This closes the loop rather than letting Tier 2 grow unbounded over time.
- **What doesn't change:** claim adjudication, payout decisions, and dispute handling remain fully human — this solution stops at claim initiation, by design (see Section 1 scope).

**Change management note:** frontline staff should be positioned as gaining a triage/escalation-handling capability, not as being displaced by the agent — the agent absorbs repetitive lookup work, not judgment work. This framing matters operationally (staff buy-in) as much as it matters for the submission.

---

## 5. Governance

**Data privacy (PDPA).** This prototype uses only synthetic customer and policy data — no real PII at any point. For a production build, the agent's data access would need to comply with Malaysia's Personal Data Protection Act: purpose limitation (data used only for the stated claim-initiation purpose), and no retention of conversation data beyond what's needed to complete the handoff to a human where escalation occurs. △ Full consent-flow design is out of scope for this prototype and flagged as a phase-2 requirement.

**Regulatory alignment (BNM).** The agent's design directly reflects BNM's stated guidance (Section 1) that insurers must not apply exclusions not clearly disclosed in policy documents. Concretely: `check_eligibility` only returns exclusions that exist in the policy's actual coverage rules — the agent has no mechanism to infer or apply an exclusion not present in the data, which keeps the design aligned with that guidance by construction rather than by policy statement alone.

**No autonomous financial determination.** The agent informs and guides; it does not approve, deny, or pay a claim. Every ambiguous case — by design — routes to a human via `escalate_to_human` rather than the agent resolving it independently. This is the same mechanism as Section 3.3, restated here as a governance control rather than a product feature: it's the safeguard against the agent making a low-confidence call on a real customer's coverage.

**Auditability.** Each tool call (eligibility check, document lookup, timing rule, escalation) is logged with its inputs and outputs, so any customer-facing statement the agent makes can be traced back to the specific data it queried — relevant both for internal QA and for responding to a regulator or complaint inquiry about a specific case.

**Code quality / repo hygiene.** No secret or service-role credentials are committed to the repository. The Lovable-managed `.env` file (auto-synced by the platform's GitHub integration) contains only a Supabase publishable key, project ID, and project URL — credentials designed for client-side exposure and already present in the deployed app's public bundle regardless of `.env` visibility. No real customer data is committed; the synthetic dataset is clearly labeled as such in the README; repo structure separates data model, tool functions, and conversation logic so a reviewer can trace the architecture without reading through UI code.

---

## 6. Business Metrics

**What this prototype's live test actually demonstrated (not projected — observed):** running the coverage-boundary scenario against Linda Chen's two policies produced a 5-step tool trace (`get_customer_policies` → `resolve_treatment` → `check_eligibility` ×2 → `escalate_to_human`), a clause-level explanation (exclusion 8.3(b) on POL-1001; indeterminate rider status on POL-1002), and a reference number (ESC-2026-1045) — end to end, in seconds, with zero guessed answers. That single run is the proof point for the metrics below; production metrics would track it at volume.

**Metrics to track post-launch** (△ targets are illustrative estimates for this prototype, not committed figures):

| Metric | Baseline (today) | Target direction | Notes |
|---|---|---|---|
| Time to claim initiation | Multi-call, multi-day in ambiguous cases | △ Single session, most cases | Directly addresses Root Cause 2/3 |
| % resolved without human touch | △ Low — every case currently routes through a contact centre agent | △ Majority of straightforward cases self-served | Industry STP benchmarks for claims sit under 10% broadly, ~35% for top performers — a reasonable, non-overpromising target range for initiation-only scope ✓ |
| Escalation quality (not just volume) | N/A — no structured escalation exists today | Escalations carry full context, zero re-interview of customer | Demonstrated live: escalation summary included full clause-level reasoning, no follow-up questions needed |
| Repeat-escalation-reason rate | N/A | Declining, as common ambiguous patterns (e.g. `rider_status_unknown`) get fed back into agent scope | This is the operating-model feedback loop from Section 4, made visible in the Escalation inbox |
| Regulatory complaint volume (BNMLINK-tracked) | 222 MHIT complaints in 2025 ✓ | △ Directional reduction, as upstream friction is resolved before it becomes a formal complaint | Framed as a leading indicator, not a committed target — complaint drivers are multi-causal |

## 7. Cost-Effectiveness

**Observed cost driver:** the live escalation test made 5 discrete tool/reasoning calls for one customer interaction. That's the real unit to cost, not a guess.

△ **Assumption-based estimate** (labelled, not verified — no production LLM billing data exists for a prototype):
- Assume a mid-tier LLM at roughly $0.003–$0.015 per 1K tokens depending on provider/model tier, and a moderate prompt+context size per call (~1-2K tokens each given policy/customer data injected per step)
- 5 calls × ~1.5K tokens average ≈ 7.5K tokens per full interaction → rough per-interaction cost in the range of a few cents, not dollars
- At meaningful volume (e.g. thousands of initiations/month), this is a small fraction of the cost of an equivalent contact-centre call, which involves agent time, hold time, and potential repeat contact

**Cost-effectiveness argument, stated honestly:** the case for this solution isn't that AI calls are free — it's that today's cost is concentrated in *repeat human contact* (Root Cause 2/3: the customer calls, gets a partial answer, calls again). Collapsing that into one agent-assisted session, with clean escalation only for genuinely ambiguous cases, shifts cost from repeated low-value human lookup time to occasional high-value human judgment time — which is both cheaper and a better use of claims staff.

△ *What would need to happen before this becomes a defensible production cost model:* actual production token/call volume data, real LLM provider pricing at Sun Life's negotiated tier, and a measured baseline of current per-call contact-centre cost to compare against. This prototype does not have those inputs — flagged explicitly rather than inventing a precise ROI figure.

---

## 8. Decision Log

Kept as evidence of process, not just output — the brief notes judgment is being assessed, not lines of code written.

- **Platform selection:** the same build spec (Section 3) was tested across four AI build platforms (Lovable, Replit, Base44, Google AI Studio) to see how consistently the same requirements translated across tools. Lovable was selected as the primary submission: it produced the most literal fulfillment of the "no invented coverage answer" requirement via a visible Agent Tool Trace panel showing each function call and its output, plus dedicated Escalation Inbox and Decision Log pages matching the spec directly. Replit produced a noticeably more polished, warmer customer-facing UI (per-policy confidence cards, softer copy, a clean liability disclaimer) — several of these elements were ported back into the Lovable build rather than switching platforms this late, on the reasoning that demonstrated agentic transparency outweighs additional UI polish for this specific rubric.
- **Scope discipline under time constraint:** build time was limited to evenings only across four days. This forced explicit scope cuts: a single well-tested escalation scenario over multiple partially-tested ones, a synthetic dataset over any live system integration, and a lean cost-effectiveness estimate (labelled as an assumption) over a fabricated precise ROI figure.
- **Live verification, not assumed behavior:** the escalation path was tested twice against Linda Chen's coverage-boundary scenario (references ESC-2026-1044, ESC-2026-1045), confirming the agent correctly distinguished a confirmed exclusion (POL-1001, clause 8.3(b)) from a genuinely indeterminate condition (POL-1002 rider status) rather than defaulting to a single blanket "escalate" response — this was checked directly rather than assumed to work from the architecture alone.
- **Fact-checking discipline:** early drafts of the Problem Statement cited industry statistics that could not be re-verified to a primary source on a second pass (an initial "85% intend to switch" / "71% UK P&C churn" claim). These were corrected to figures independently re-confirmed via direct source checks (Accenture, BNM/Bernama) before this version, with unconfirmed figures either removed or explicitly labelled as directional/assumption rather than presented as fact.

---

## References


1. Schwarcz, D., Cude, B.J., Logue, K.D. & Marquez Alcala, G. (2026). "Read But Not Understood? An Empirical Analysis of Consumer Comprehension in Homeowners Insurance." 112 *Virginia Law Review* 727. https://virginialawreview.org/articles/read-but-not-understood-an-empirical-analysis-of-consumer-comprehension-in-homeowners-insurance/ (SSRN: https://ssrn.com/abstract=5120347)
2. Bernama, "BNMLINK Receives 222 MHIT Complaints In 2025, With 96 Pct Resolved — MoF" (22 Jan 2026): https://www.bernama.com/en/news.php/?id=2515765 — corroborated by Malay Mail: https://www.malaymail.com/news/malaysia/2026/01/23/bnmlink-received-222-health-insurance-complaints-in-2025-with-96pc-resolved-says-finance-ministry/206440
3. CodeBlue, "BNM Tells Insurers To Settle Medical Claims Promptly, Prohibits Applying Unknown Exclusions" (Dec 2025): https://codeblue.galencentre.org/2025/12/bnm-tells-insurers-to-settle-medical-claims-promptly-prohibits-applying-unknown-exclusions/
4. Accenture, "Why AI in Insurance Claims and Underwriting" via Claims Journal: https://www.claimsjournal.com/news/national/2022/08/18/312244.htm ($170B at risk); Accenture Insurance Blog: https://insuranceblog.accenture.com/getting-it-right-why-is-claims-satisfaction-so-high (74% switched/considering)
5. Data silo / systems fragmentation — directional industry reporting, no single figure independently confirmed; any specific percentage on this topic should be treated as an assumption, not a hard number to defend live.
