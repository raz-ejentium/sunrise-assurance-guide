import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";

import { listEscalations } from "@/lib/demo.functions";
import { AuthGate } from "@/components/auth/AuthGate";

const escalationsQuery = queryOptions({
  queryKey: ["escalations"],
  queryFn: () => listEscalations(),
  refetchInterval: 8000,
});

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Escalation Inbox | Sunrise Assurance Claims" },
      {
        name: "description",
        content:
          "Every case the claims agent refused to guess on, queued for a human specialist with the reason, what was confirmed and what stayed unresolved.",
      },
      { property: "og:title", content: "Escalation Inbox | Sunrise Assurance Claims" },
      {
        property: "og:description",
        content:
          "The human side of the claims agent: escalated cases with full context for a specialist to pick up.",
      },
    ],
  }),
  component: InboxRoute,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-sm">No escalations found.</div>,
});

const REASON_LABELS: Record<string, string> = {
  conflicting_policies: "Conflicting policies",
  unknown_treatment: "Unknown treatment",
  ambiguous_coverage: "Ambiguous coverage",
  policy_inactive: "Policy inactive",
  customer_request: "Member asked for a human",
  out_of_scope: "Out of scope",
};

function InboxRoute() {
  return (
    <AuthGate>
      <InboxPage />
    </AuthGate>
  );
}

function InboxPage() {
  const { data: escalations = [] } = useQuery(escalationsQuery);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-8">
      <header className="border-b border-rule pb-5">
        <h1 className="font-serif text-3xl text-foreground">Escalation inbox</h1>
        <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted-foreground">
          The agent's refusals, not its failures. Each row is a case where coverage could not be
          determined from the policy data alone — handed over with everything the specialist needs
          to continue without re-interviewing the member.
        </p>
      </header>

      {escalations.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Inbox className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            No escalations yet. Run the "Coverage boundary" scenario in the assistant.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {escalations.map((item) => (
            <li
              key={item.id}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-panel"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-parchment px-4 py-3">
                <span className="font-mono text-[15px] font-semibold text-foreground">
                  {item.reference_number}
                </span>
                <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-[11px] font-medium text-warning">
                  {REASON_LABELS[item.reason_code] ?? item.reason_code}
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  {item.customer_name} · <span className="font-mono">{item.customer_id}</span>
                </span>
                <span className="ml-auto text-[11.5px] text-muted-foreground">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>

              <div className="space-y-4 px-4 py-4">
                <p className="text-[14px] leading-relaxed text-foreground">{item.reason}</p>

                {item.conversation_summary && (
                  <div>
                    <div className="label-caps mb-1 text-muted-foreground">Conversation summary</div>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {item.conversation_summary}
                    </p>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-parchment/60 p-3">
                    <div className="label-caps mb-1 text-success">Confirmed</div>
                    <p className="text-[13px] leading-relaxed text-foreground">
                      {item.what_was_determined || "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-parchment/60 p-3">
                    <div className="label-caps mb-1 text-warning">Unresolved</div>
                    <p className="text-[13px] leading-relaxed text-foreground">
                      {item.what_could_not_be_determined || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
