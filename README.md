# Sunrise Assurance — Smart Claims Initiation Agent

**Sun Life Malaysia · AI Vibe Coding Challenge**
An agentic AI prototype that helps customers determine claim eligibility, required documents, and timing across their policies — and escalates cleanly to a human specialist when it can't determine an answer with confidence, rather than guessing.

## Live demo

🔗 **[sunrise-assurance-guide.lovable.app](https://sunrise-assurance-guide.lovable.app/)**

No login required. Use the scenario buttons on the Claims assistant page, or select a member and describe a treatment freely.

**Recommended path to see the agentic behaviour in action:**
1. Open **Claims assistant**, select member **Linda Chen**
2. Click the **"Coverage boundary"** scenario (or ask about bariatric surgery coverage)
3. Watch the **Agent Tool Trace** panel (right side) — every function call and its output is shown live, so you can verify no coverage answer is invented
4. The agent will distinguish a *confirmed* exclusion from a *genuinely indeterminate* one, and hand off to a human with a reference number (e.g. `ESC-2026-1045`)
5. Check the **Escalation inbox** page to see that handoff as a real, structured record — and the **Decision log** page for the build's own working notes

## Documents in this repo

| File | What it is |
|---|---|
| `Sun_Life_Smart_Claims_BRD_PRD_v2.docx` | The primary submission document — formatted Word version of the BRD/PRD below |
| `Sun_Life_Smart_Claims_BRD_PRD_v2.md` | Source/working version of the same document — problem framing, root cause analysis, agent architecture, operating model, governance, business metrics, cost-effectiveness, and a decision log covering how and why this was built the way it was |
| `Lovable_Build_Prompt.md` | The structured prompt used to drive the actual build — included as evidence of process, not just output |

## Scope

This prototype covers **claim initiation and eligibility determination only** — not the full claims lifecycle. It does not adjudicate, price, or pay claims. All customer and policy data is synthetic.

## Architecture summary

The agent runs a six-step tool-calling flow per interaction: retrieve customer policies → resolve the treatment/condition → check eligibility per policy → determine document, timing, and submission-channel requirements → escalate to a human specialist if any step can't be resolved with confidence. Full detail in the BRD/PRD, Section 3.

## Why this design

Two live-tested cases anchor the design decisions in this repo:
- A **clean coverage case** (e.g. root canal treatment) resolves end-to-end with document checklist and timing guidance, no human touch needed
- A **coverage-boundary case** (bariatric surgery across two policies, one with an unconfirmed rider status) correctly refuses to guess, splits its findings into confirmed vs. unresolved, and escalates with full context attached — verified live, references `ESC-2026-1044` and `ESC-2026-1045`

Full reasoning behind these choices — including why Lovable was chosen after comparing outputs across four build platforms, and a correction made to an early factual claim in the BRD — is in the Decision Log section of the BRD/PRD.
