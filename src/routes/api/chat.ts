import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";

import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are the Smart Claims Initiation Assistant for Sunrise Assurance, a health insurer.

Your job is to help a member work out (a) whether a treatment is likely claimable, (b) which policy to claim under, (c) what documents they need, and (d) whether pre-authorisation is required. You end at "claim initiated with the correct information attached". You never adjudicate, approve, price, or pay a claim.

## The single most important rule

You have NO knowledge of this insurer's policies. Every statement you make about coverage, exclusions, waiting periods, documents, or timing MUST come from a tool result in this conversation. If a tool did not tell you, you do not know it. Never reason from general insurance knowledge, never fill gaps with plausible-sounding rules, and never soften an unknown into a "probably".

## Mandatory escalation triggers

You MUST call escalate_to_human, and MUST NOT give a coverage verdict, when ANY of these occur:

1. Two or more of the member's policies return conflicting verdicts for the same treatment (e.g. covered under one, excluded under another).
2. resolve_treatment does not return a confident single match.
3. The member cannot confirm which policy is theirs, or their identity is ambiguous.
4. check_eligibility returns verdict "indeterminate" or any non-null escalation_trigger.
5. Coverage depends on a rider whose status is unknown (rider_held is null).
6. A policy's status is anything other than active.
7. get_document_requirements, get_claim_timing_rule or get_submission_guidance returns found: false.

When you escalate: stop the eligibility line of reasoning entirely, state plainly what you WERE able to confirm, state what you could NOT determine and why, then call escalate_to_human with a full conversation_summary. Present the reference number to the member. Do not offer a guess alongside the escalation.

## Normal flow

1. The member's identity is supplied to you at the start of the conversation. Call get_customer_policies immediately as your first action.
2. Ask in plain language what happened: the condition or treatment, the date, and the provider or hospital. Ask for anything missing before checking eligibility.
3. Call resolve_treatment to map their description to a treatment code.
4. Call check_eligibility for EVERY active policy — never just the first one.
5. If more than one policy covers it, recommend which to claim first and show your reasoning: prefer the policy with the higher remaining annual limit and no waiting period; an employer group plan is usually claimed first with the personal card used for any shortfall. Say this is a recommendation for the member to confirm.
6. Call get_document_requirements, get_claim_timing_rule AND get_submission_guidance for the recommended policy, and present all three together in a single response with these headings: "Documents to prepare", "Timing", "Where and how to submit".
7. The document list is guidance on what the member needs to gather and prepare before submitting — it is NOT a record of documents already held or received by us. Say so plainly (e.g. "You'll need to prepare the following — we don't have any of these on file yet"). Never imply a document is already submitted, verified, or on file.
8. Under "Where and how to submit", state the channel, the method, and the estimated turnaround exactly as returned by the tool, and make clear the turnaround starts once complete documents are received and is an estimate, not a payment guarantee.
9. Close by telling them what to do next.

## Tone and format

Calm, precise, and plain-spoken — like a good claims officer, not a chatbot. No emoji. Use short paragraphs and markdown bullet lists for checklists. Never use hedging filler like "I think" or "typically" about this insurer's rules. Keep answers under about 200 words unless presenting a document checklist.`;

type ChatRequestBody = { messages?: unknown; customerId?: unknown; customerName?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { DEMO_OPEN_ACCESS } = await import("@/lib/demo-mode");
        if (!DEMO_OPEN_ACCESS) {
          const { verifyBearerToken } = await import("@/lib/auth.server");
          const caller = await verifyBearerToken(request);
          if (!caller) {
            return new Response("Unauthorized", { status: 401 });
          }
        }


        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const customerId = typeof body.customerId === "string" ? body.customerId : null;
        const customerName = typeof body.customerName === "string" ? body.customerName : null;

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const claims = await import("@/lib/claims-tools.server");

        const tools = {
          get_customer_policies: tool({
            description:
              "Return every policy held by a customer, with type, insurer, status, effective date and annual limit. Always call this first.",
            inputSchema: z.object({
              customer_id: z.string().describe("The customer identifier, e.g. CUST-001"),
            }),
            execute: async ({ customer_id }) => claims.getCustomerPolicies(customer_id),
          }),
          resolve_treatment: tool({
            description:
              "Map a member's plain-language description of their condition or procedure to a known treatment_code. Returns matched:false when ambiguous or unknown — that is an escalation trigger.",
            inputSchema: z.object({
              description: z
                .string()
                .describe("What the member said, e.g. 'keyhole surgery on my knee'"),
            }),
            execute: async ({ description }) => claims.resolveTreatment(description),
          }),
          check_eligibility: tool({
            description:
              "Check whether a treatment is covered under one specific policy. Returns a verdict of covered / not_covered / indeterminate plus waiting-period status, rider status and exclusion notes. Call once per active policy.",
            inputSchema: z.object({
              policy_id: z.string(),
              treatment_code: z.string(),
            }),
            execute: async ({ policy_id, treatment_code }) =>
              claims.checkEligibility(policy_id, treatment_code),
          }),
          get_document_requirements: tool({
            description:
              "Return the required document checklist for a treatment under a specific policy.",
            inputSchema: z.object({
              policy_id: z.string(),
              treatment_code: z.string(),
            }),
            execute: async ({ policy_id, treatment_code }) =>
              claims.getDocumentRequirements(policy_id, treatment_code),
          }),
          get_claim_timing_rule: tool({
            description:
              "Return whether pre-authorisation is required before treatment, or whether a post-treatment claim is acceptable, plus the submission window.",
            inputSchema: z.object({
              policy_id: z.string(),
              treatment_code: z.string(),
            }),
            execute: async ({ policy_id, treatment_code }) =>
              claims.getClaimTimingRule(policy_id, treatment_code),
          }),
          get_submission_guidance: tool({
            description:
              "Return where and how to submit the claim (channel: portal, app or branch), the submission method, and an estimated turnaround time. Always call alongside get_document_requirements and get_claim_timing_rule.",
            inputSchema: z.object({
              policy_id: z.string(),
              treatment_code: z.string(),
            }),
            execute: async ({ policy_id, treatment_code }) =>
              claims.getSubmissionGuidance(policy_id, treatment_code),
          }),
          escalate_to_human: tool({
            description:
              "Hand off to a human claims specialist. Logs the full context and returns a reference number. Call this instead of answering whenever eligibility, policy match, or coverage cannot be determined with confidence.",
            inputSchema: z.object({
              reason_code: z
                .string()
                .describe(
                  "One of: conflicting_policy_coverage, unknown_treatment, ambiguous_identity, inside_waiting_period, rider_status_unknown, policy_not_active, missing_reference_data, customer_request",
                ),
              reason: z.string().describe("One sentence on why a human is needed."),
              conversation_summary: z
                .string()
                .describe("Full context for the specialist: who, what happened, what was checked."),
              what_was_determined: z.string().describe("What you confirmed from tool results."),
              what_could_not_be_determined: z
                .string()
                .describe("Exactly what remains unresolved and why."),
            }),
            execute: async (input) =>
              claims.escalateToHuman({ ...input, customer_id: customerId }),
          }),
        };

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(key, initialRunId);

        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system:
            SYSTEM_PROMPT +
            (customerId
              ? `\n\n## Current session\n\nThe member on this session is ${customerName ?? "unknown"} (customer_id: ${customerId}). Call get_customer_policies with this id before anything else.`
              : "\n\n## Current session\n\nNo member has been selected. Ask the user to choose one from the selector."),
          messages: await convertToModelMessages(messages as UIMessage[]),
          tools,
          stopWhen: stepCountIs(50),
          // Gemini ties tool calls to encrypted "thought signatures" that the
          // OpenAI-compatible wire format cannot round-trip, so with reasoning
          // enabled the model returns an empty step (finish_reason no_content)
          // once a couple of tool results are in the history and the run stalls.
          providerOptions: { lovable: { reasoning_effort: "none" } },

          onError: ({ error }) => {
            console.error("[claims-agent] stream error", error);
          },
        });


        const response = result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          headers: getLovableAiGatewayResponseHeaders(undefined, {
            ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
          }),
        });

        return withLovableAiGatewayRunIdHeader(response, gateway);
      },
    },
  },
});
