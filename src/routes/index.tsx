import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery, queryOptions } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { listCustomers, type DemoCustomer } from "@/lib/demo.functions";
import { AuthGate } from "@/components/auth/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { EscalationCard, type EscalationOutput } from "@/components/claims/EscalationCard";
import { TracePanel, type TraceEntry } from "@/components/claims/TracePanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const customersQuery = queryOptions({
  queryKey: ["customers"],
  queryFn: () => listCustomers(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Claims Initiation Assistant | Sunrise Assurance" },
      {
        name: "description",
        content:
          "A conversational claims-initiation agent that checks eligibility across every policy, lists required documents and timing, and escalates to a human instead of guessing.",
      },
      { property: "og:title", content: "Claims Initiation Assistant | Sunrise Assurance" },
      {
        property: "og:description",
        content:
          "Check eligibility across multiple health policies, get your document checklist, and see a live agent tool trace.",
      },
    ],
  }),
  component: ClaimsAssistantPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-sm">No demo data found.</div>,
});

type Scenario = {
  key: string;
  label: string;
  hint: string;
  customerId: string;
  prompt: string;
  memberName?: string;
};


const SCENARIOS: Scenario[] = [
  {
    key: "happy",
    label: "Happy path",
    hint: "Single policy, clean coverage",
    customerId: "CUST-002",
    prompt:
      "I had an emergency appendectomy at Gleneagles last Tuesday. What do I need to do to claim?",
  },
  {
    key: "boundary",
    label: "Coverage boundary",
    hint: "Two policies conflict — must escalate",
    customerId: "CUST-001",
    prompt:
      "My doctor has recommended bariatric surgery for me. I have two policies and I'm not sure which one covers it. Am I covered?",
  },
  {
    key: "waiting",
    label: "Waiting period",
    hint: "Policy too new for the procedure",
    customerId: "CUST-003",
    prompt: "I need keyhole surgery on my knee next month. Can I claim for it?",
  },
  {
    key: "unknown",
    label: "Unknown treatment",
    hint: "Not in the reference table",
    customerId: "CUST-004",
    prompt: "I'm booked in for a cornea transplant. Is that something I can claim?",
  },
];

function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith("tool-");
}

function ClaimsAssistantPage() {
  return (
    <AuthGate>
      <ClaimsAssistant />
    </AuthGate>
  );
}

function ClaimsAssistant() {
  const { data: customers = [] } = useQuery(customersQuery);
  const [customerId, setCustomerId] = useState<string>(customers[0]?.id ?? "");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!customerId && customers.length > 0) setCustomerId(customers[0]!.id);
  }, [customerId, customers]);

  const activeCustomer = customers.find((c) => c.id === customerId);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: () => ({
          customerId,
          customerName: customers.find((c) => c.id === customerId)?.name ?? null,
        }),
      }),
    [customerId, customers],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: `claims-${customerId}`,
    transport,
    onError: (error) => toast.error(error.message || "The assistant could not respond."),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading, customerId]);

  const trace: TraceEntry[] = useMemo(() => {
    const entries: TraceEntry[] = [];
    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolPart(part)) continue;
        const p = part as unknown as {
          type: string;
          toolCallId: string;
          state: string;
          input: unknown;
          output: unknown;
        };
        entries.push({
          id: p.toolCallId,
          name: p.type.replace(/^tool-/, ""),
          state: p.state,
          input: p.input,
          output: p.output,
        });
      }
    }
    return entries;
  }, [messages]);

  const submit = useCallback(
    (text: string) => {
      const value = text.trim();
      if (!value || isLoading) return;
      setInput("");
      void sendMessage({ text: value });
    },
    [isLoading, sendMessage],
  );

  const [pending, setPending] = useState<
    { runId: string; customerId: string; prompt: string } | null
  >(null);
  const sentRunRef = useRef<string | null>(null);

  const runScenario = useCallback(
    (scenario: Scenario) => {
      if (isLoading) return;
      setInput("");
      setCustomerId(scenario.customerId);
      setMessages([]);
      setPending({
        runId: `${scenario.key}-${Date.now()}`,
        customerId: scenario.customerId,
        prompt: scenario.prompt,
      });
    },
    [isLoading, setMessages],
  );

  // Send only once the chat session has been rebuilt for the scenario's member,
  // otherwise the member switch tears down the instance and drops the message.
  // The ref guard keeps a re-run of this effect from starting a second stream,
  // which would abort the first and leave a half-finished conversation.
  useEffect(() => {
    if (!pending || pending.customerId !== customerId) return;
    if (sentRunRef.current === pending.runId) return;
    sentRunRef.current = pending.runId;
    const prompt = pending.prompt;
    setPending(null);
    void sendMessage({ text: prompt });
  }, [pending, customerId, sendMessage]);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setInput("");
    setPending(null);
    sentRunRef.current = null;
    inputRef.current?.focus();
  }, [setMessages]);


  const scenarios: Scenario[] = useMemo(
    () =>
      SCENARIOS.map((scenario) => {
        const memberName = customers.find((c) => c.id === scenario.customerId)?.name;
        return memberName ? { ...scenario, memberName } : scenario;
      }),
    [customers],
  );

  return (
    <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="flex min-h-0 flex-col border-r border-border">
        <SessionBar
          customers={customers}
          customerId={customerId}
          onCustomerChange={(id) => {
            setCustomerId(id);
            setInput("");
          }}
          activeCustomer={activeCustomer}
          onReset={resetConversation}
          canReset={messages.length > 0}
          resetDisabled={isLoading}
        />

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <EmptyState scenarios={scenarios} onRun={runScenario} disabled={isLoading} />
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <MessageBlock key={message.id} message={message} onRestart={resetConversation} />
                ))}
                {status === "submitted" && <Thinking />}
              </div>
            )}
          </div>
        </div>

        <Composer
          ref={inputRef}
          value={input}
          onChange={setInput}
          onSubmit={() => submit(input)}
          isLoading={isLoading}
          scenarios={scenarios}
          onScenario={runScenario}
        />
      </section>


      <div className="hidden min-h-0 lg:block">
        <TracePanel entries={trace} />
      </div>
    </main>
  );
}

function SessionBar({
  customers,
  customerId,
  onCustomerChange,
  activeCustomer,
  onReset,
  canReset,
  resetDisabled,
}: {
  customers: DemoCustomer[];
  customerId: string;
  onCustomerChange: (id: string) => void;
  activeCustomer: DemoCustomer | undefined;
  onReset: () => void;
  canReset: boolean;
  resetDisabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-parchment px-4 py-3 sm:px-8">
      <div className="flex items-center gap-2.5">
        <span className="label-caps text-muted-foreground">Member</span>
        <Select value={customerId} onValueChange={onCustomerChange}>
          <SelectTrigger className="h-8 w-[210px] bg-card text-[13px]">
            <SelectValue placeholder="Select a member" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name} · {customer.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeCustomer && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeCustomer.policies.map((policy) => (
            <span
              key={policy.id}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
                policy.status === "active"
                  ? "border-border bg-card text-foreground"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              <span className="font-mono">{policy.id}</span> · {policy.policy_type}
              {policy.status !== "active" && ` · ${policy.status}`}
            </span>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        {canReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={resetDisabled}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            New conversation
          </button>
        )}
        <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground md:flex">
          <ShieldCheck className="size-3.5" aria-hidden />
          Synthetic data · no adjudication
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  scenarios,
  onRun,
  disabled,
}: {
  scenarios: Scenario[];
  onRun: (scenario: Scenario) => void;
  disabled: boolean;
}) {
  return (
    <div className="py-8">
      <h1 className="font-serif text-3xl leading-tight text-foreground">
        Let's work out what you can claim.
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Tell me what treatment you had or are planning, when it happened, and where. I'll check
        every policy on your record, tell you which one to claim under, and list exactly what you
        need to submit. If I can't determine something with confidence, I hand you to a human
        rather than guess.
      </p>

      <div className="mt-8">
        <div className="label-caps mb-3 text-muted-foreground">Demo scenarios</div>
        <p className="mb-3 text-[12px] text-muted-foreground">
          Each scenario runs as the member it was written for, and switches the selector to them.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {scenarios.map((scenario) => (
            <button
              key={scenario.key}
              type="button"
              disabled={disabled}
              onClick={() => onRun(scenario)}
              className="group rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:border-accent hover:bg-card/80 disabled:opacity-50"
            >
              <div className="text-[13px] font-semibold text-foreground">
                {scenario.label}
                {scenario.memberName ? (
                  <span className="font-normal text-muted-foreground"> — {scenario.memberName}</span>
                ) : null}
              </div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">{scenario.hint}</div>
              <div className="mt-2 line-clamp-2 text-[12px] italic leading-snug text-muted-foreground/80">
                "{scenario.prompt}"
              </div>
            </button>
          ))}

        </div>
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      Checking your policies…
    </div>
  );
}

function ToolChip({ name, state }: { name: string; state: string }) {
  const labels: Record<string, string> = {
    get_customer_policies: "Retrieved policies",
    resolve_treatment: "Resolved treatment code",
    check_eligibility: "Checked eligibility",
    get_document_requirements: "Retrieved document checklist",
    get_claim_timing_rule: "Checked timing rule",
    get_submission_guidance: "Retrieved submission guidance",
    escalate_to_human: "Escalated to human",
  };
  const done = state === "output-available";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/70 px-2.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
      <span
        className={`size-1.5 rounded-full ${done ? "bg-success" : "animate-pulse bg-accent"}`}
        aria-hidden
      />
      {labels[name] ?? name}
    </span>
  );
}

function MessageBlock({ message, onRestart }: { message: UIMessage; onRestart?: () => void }) {
  if (message.role === "user") {
    const text = message.parts
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("")
      .trim();
    if (!text) return null;
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-br-sm bg-primary px-4 py-2.5 text-[14px] leading-relaxed text-primary-foreground shadow-raised">
          {text}
        </div>
      </div>
    );
  }

  const chips: { id: string; name: string; state: string }[] = [];
  const escalations: EscalationOutput[] = [];
  const blocks: { key: string; text: string }[] = [];

  message.parts.forEach((part, index) => {
    if (part.type === "text") {
      if (part.text.trim()) blocks.push({ key: `t-${index}`, text: part.text });
      return;
    }
    if (!isToolPart(part)) return;
    const p = part as unknown as {
      type: string;
      toolCallId: string;
      state: string;
      output: unknown;
    };
    const name = p.type.replace(/^tool-/, "");
    chips.push({ id: p.toolCallId, name, state: p.state });
    if (name === "escalate_to_human" && p.state === "output-available" && p.output) {
      escalations.push(p.output as EscalationOutput);
    }
  });

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="label-caps text-muted-foreground">Claims assistant</span>
        <span className="hairline h-px flex-1" aria-hidden />
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <ToolChip key={chip.id} name={chip.name} state={chip.state} />
          ))}
        </div>
      )}

      {escalations.map((escalation) => (
        <EscalationCard
          key={escalation.reference_number}
          data={escalation}
          onRestart={onRestart}
        />
      ))}

      {blocks.map((block) => (
        <div key={block.key} className="prose-claims max-w-none text-[14.5px] text-foreground">
          <ReactMarkdown>{block.text}</ReactMarkdown>
        </div>
      ))}
    </div>
  );
}

function Composer({
  ref,
  value,
  onChange,
  onSubmit,
  isLoading,
  scenarios,
  onScenario,
}: {
  ref: React.Ref<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  scenarios: Scenario[];
  onScenario: (scenario: Scenario) => void;
}) {
  return (
    <div className="border-t border-border bg-parchment px-4 py-3 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="label-caps mr-1 text-muted-foreground">Scenarios</span>
          {scenarios.map((scenario) => (
            <button
              key={scenario.key}
              type="button"
              disabled={isLoading}
              title={
                scenario.memberName ? `Runs as ${scenario.memberName}` : "Runs as its demo member"
              }
              onClick={() => onScenario(scenario)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
            >
              {scenario.label}
              {scenario.memberName ? ` — ${scenario.memberName}` : ""}
            </button>
          ))}

        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="flex items-end gap-2 rounded-lg border border-border bg-card p-2 shadow-raised focus-within:border-accent"
        >
          <textarea
            ref={ref}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            rows={2}
            placeholder="Describe what happened — the treatment, when, and which hospital…"
            className="max-h-40 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            aria-label="Send message"
            className="mb-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ArrowUp className="size-4" aria-hidden />
            )}
          </button>
        </form>

        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Prototype on synthetic data. Eligibility guidance only — no claim is adjudicated, priced
          or paid here.
        </p>
      </div>
    </div>
  );
}
