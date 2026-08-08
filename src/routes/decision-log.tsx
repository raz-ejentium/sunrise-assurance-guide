import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/decision-log")({
  head: () => ({
    meta: [
      { title: "Build Decision Log | Sunrise Assurance Claims" },
      {
        name: "description",
        content:
          "How the claims-initiation agent was built: model choice, tool boundaries, escalation triggers, data design and the trade-offs behind each decision.",
      },
      { property: "og:title", content: "Build Decision Log | Sunrise Assurance Claims" },
      {
        property: "og:description",
        content:
          "Model choice, tool boundaries, escalation triggers and known limitations of the claims agent prototype.",
      },
    ],
  }),
  component: DecisionLog,
});

type Entry = {
  title: string;
  decision: string;
  why: string;
  tradeoff: string;
};

const SECTIONS: { heading: string; entries: Entry[] }[] = [
  {
    heading: "Agent design",
    entries: [
      {
        title: "Tool-calling LLM, not a scripted flow",
        decision:
          "A single model turn loop with six typed tools; the model never sees the coverage tables directly, only tool results.",
        why: "Members describe treatment in their own words ('keyhole surgery on my knee', 'stomach op'). A decision tree collapses on that variance; a model plus deterministic tools keeps language flexible while keeping facts fixed.",
        tradeoff:
          "Slightly slower and non-deterministic in phrasing. Mitigated by making every coverage fact come from a tool, so the wording can vary but the verdict cannot.",
      },
      {
        title: "Eligibility is computed in code, never by the model",
        decision:
          "check_eligibility resolves waiting periods, riders, exclusions and policy status in TypeScript and returns a verdict enum.",
        why: "A model asked to reason over dates and clauses will occasionally get a waiting period wrong, and a wrong 'you're covered' is the most expensive failure this product can have.",
        tradeoff:
          "New coverage rules require a code change rather than a prompt change. Correct trade for a claims surface.",
      },
      {
        title: "Escalation is a tool, not a fallback",
        decision:
          "escalate_to_human writes a real row with a reference number and requires the model to state what it did and did not determine.",
        why: "Escalation framed as failure gets avoided by models. Framed as a first-class action with a satisfying output, it gets used — and it forces the model to separate what it knows from what it doesn't.",
        tradeoff: "The agent escalates a little more often than strictly necessary.",
      },
    ],
  },
  {
    heading: "Escalation triggers",
    entries: [
      {
        title: "Hard triggers, not confidence scores",
        decision:
          "Escalate when: two policies return conflicting verdicts, the treatment doesn't resolve to a known code, coverage is marked ambiguous, the relevant policy is lapsed or suspended, or the member asks for a person.",
        why: "Self-reported model confidence is not calibrated and cannot be audited. Enumerated triggers can be tested, reviewed by compliance and explained to a member.",
        tradeoff:
          "A genuinely novel edge case outside the five triggers may still get an answer. The prompt adds a catch-all instruction to prefer handoff when unsure.",
      },
      {
        title: "Coordination of benefits is always human",
        decision:
          "When more than one active policy could cover the same treatment, the agent presents both and escalates rather than picking one.",
        why: "Choosing the claim path affects a member's excess, no-claims position and future premium. That is an advisory decision, not a lookup.",
        tradeoff: "Fewer fully-automated resolutions in the multi-policy demo path — by design.",
      },
    ],
  },
  {
    heading: "Model and platform",
    entries: [
      {
        title: "google/gemini-3.6-flash via the Lovable AI Gateway",
        decision: "Latest-generation Flash model, streamed, with tool calling enabled.",
        why: "The reasoning here is shallow but the tool orchestration is multi-step and latency matters in a live chat. Flash-class is the right point on that curve, and the gateway keeps keys server-side with no user setup.",
        tradeoff:
          "A frontier model would phrase edge cases a touch better. Since verdicts come from code, the gain would be cosmetic and the latency cost real.",
      },
      {
        title: "Postgres reference tables, not prompt-embedded fixtures",
        decision:
          "Customers, policies, treatments, coverage, document requirements and escalations live in real tables read by the tools.",
        why: "It proves the pattern an insurer would actually deploy — the agent queries a system of record — and it makes escalations durable and reviewable in the inbox.",
        tradeoff: "More setup than JSON fixtures; worth it for the escalation trail.",
      },
    ],
  },
  {
    heading: "Known limitations",
    entries: [
      {
        title: "No adjudication, pricing or payment",
        decision:
          "The agent determines eligibility and next steps only; it never states an amount payable.",
        why: "Initiation is the scoped problem. Quoting a settlement figure creates a reliance the prototype cannot honour.",
        tradeoff: "Members still don't learn what they'll get back in this flow.",
      },
      {
        title: "No identity verification",
        decision: "The member is selected from a picker rather than authenticated.",
        why: "The demo is about reasoning quality and handoff, not auth plumbing.",
        tradeoff: "Not deployable as-is; a production build gates every tool call behind the session identity.",
      },
      {
        title: "Treatment resolution is lexical",
        decision: "Free-text treatment is matched to codes by token overlap over a synonym list.",
        why: "Transparent and debuggable at demo scale, and unmatched terms escalate rather than mis-resolve.",
        tradeoff: "Embedding search would generalise better; the failure mode chosen here is safe, not clever.",
      },
    ],
  },
];

function DecisionLog() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-8">
      <header className="border-b border-rule pb-5">
        <h1 className="font-serif text-3xl text-foreground">Build decision log</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
          What was decided, why, and what it costs. Written for a reviewer who wants to know whether
          the judgement behind this build holds up — not just whether the demo runs.
        </p>
      </header>

      <div className="mt-10 space-y-12">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="label-caps text-accent-foreground">{section.heading}</h2>
            <div className="mt-4 space-y-6">
              {section.entries.map((entry) => (
                <article
                  key={entry.title}
                  className="rounded-lg border border-border bg-card p-5 shadow-panel"
                >
                  <h3 className="font-serif text-[19px] leading-snug text-foreground">
                    {entry.title}
                  </h3>
                  <dl className="mt-3 space-y-3">
                    {(
                      [
                        ["Decision", entry.decision],
                        ["Why", entry.why],
                        ["Trade-off", entry.tradeoff],
                      ] as const
                    ).map(([label, body]) => (
                      <div key={label} className="grid gap-1 sm:grid-cols-[86px_minmax(0,1fr)]">
                        <dt className="label-caps pt-0.5 text-muted-foreground">{label}</dt>
                        <dd className="text-[14px] leading-relaxed text-foreground">{body}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
