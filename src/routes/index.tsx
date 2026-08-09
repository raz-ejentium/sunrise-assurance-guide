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

// The demo runs as a single member; every scenario is produced by this
// member's own seeded policy data rather than by swapping identities.
const DEMO_CUSTOMER_ID = "CUST-001";

type LabelMode = "id" | "name" | "both";

const LABEL_MODES: { value: LabelMode; label: string }[] = [
  { value: "id", label: "ID" },
  { value: "name", label: "Name" },
  { value: "both", label: "Both" },
];

const LABEL_MODE_STORAGE_KEY = "claims-demo-label-mode";

function formatMember(mode: LabelMode, id: string, name?: string) {
  if (mode === "id" || !name) return id;
  if (mode === "name") return name;
  return `${id} · ${name}`;
}

// Each member has their own scenario set, driven by the coverage rows actually
// seeded for their policies.
const SCENARIOS_BY_CUSTOMER: Record<string, Scenario[]> = {
  "CUST-001": [
    {
      key: "happy",
      label: "Happy path",
      hint: "Angioplasty — covered outright by the personal medical card",
      customerId: "CUST-001",
      prompt:
        "I had a coronary angioplasty with a stent fitted at Gleneagles last Tuesday. What do I need to do to claim?",
    },
    {
      key: "boundary",
      label: "Coverage boundary",
      hint: "Bariatric surgery — two policies disagree, rider status unconfirmed",
      customerId: "CUST-001",
      prompt:
        "My doctor has recommended bariatric surgery for me. I have two policies and I'm not sure which one covers it. Am I covered?",
    },
    {
      key: "waiting",
      label: "Waiting period",
      hint: "Dental surgery — only the new dental plan covers it, and it's still in waiting",
      customerId: "CUST-001",
      prompt:
        "I need a surgical extraction of an impacted wisdom tooth next month. Can I claim for it?",
    },
    {
      key: "unknown",
      label: "Unknown treatment",
      hint: "Cornea transplant — absent from the treatment reference table",
      customerId: "CUST-001",
      prompt: "I'm booked in for a cornea transplant. Is that something I can claim?",
    },
  ],
  "CUST-002": [
    {
      key: "happy",
      label: "Happy path",
      hint: "Emergency appendectomy — covered with no waiting period",
      customerId: "CUST-002",
      prompt:
        "I had an emergency appendectomy at Sunway Medical Centre last week. How do I claim for it?",
    },
    {
      key: "single-policy",
      label: "Single-policy limit",
      hint: "Bariatric surgery — nothing on his only policy schedule, so it can't be confirmed",
      customerId: "CUST-002",
      prompt: "I'm considering bariatric surgery. Does my policy cover that?",
    },
    {
      key: "unknown",
      label: "Unknown treatment",
      hint: "Cornea transplant — absent from the treatment reference table",
      customerId: "CUST-002",
      prompt: "I'm booked in for a cornea transplant. Is that something I can claim?",
    },
  ],
  "CUST-003": [
    {
      key: "waiting",
      label: "Waiting period",
      hint: "Knee arthroscopy — 24-month waiting period from the effective date",
      customerId: "CUST-003",
      prompt:
        "My surgeon has scheduled a knee arthroscopy for me next month. Can I claim for it?",
    },
    {
      key: "maternity",
      label: "Maternity timing",
      hint: "Maternity delivery — 10-month waiting period on the personal card",
      customerId: "CUST-003",
      prompt: "I'm pregnant and due in four months. Will my delivery be covered?",
    },
    {
      key: "happy",
      label: "Happy path",
      hint: "Emergency appendectomy — covered with no waiting period",
      customerId: "CUST-003",
      prompt: "I had an emergency appendectomy last Friday. What do I need to do to claim?",
    },
    {
      key: "off-schedule",
      label: "Not on schedule",
      hint: "Angioplasty — absent from her policy schedule",
      customerId: "CUST-003",
      prompt:
        "I've been told I may need a coronary angioplasty with a stent. Is that covered on my plan?",
    },
  ],
  "CUST-004": [
    {
      key: "lapsed",
      label: "Lapsed policy",
      hint: "Appendectomy — the employer group plan is no longer in force",
      customerId: "CUST-004",
      prompt: "I had an emergency appendectomy last month. Can I still claim under my group plan?",
    },
    {
      key: "lapsed-planned",
      label: "Lapsed at treatment",
      hint: "Knee arthroscopy — planned treatment on a lapsed plan",
      customerId: "CUST-004",
      prompt: "I have a knee arthroscopy booked for next month. Am I covered for it?",
    },
  ],
};



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
  const [customerId, setCustomerId] = useState<string>(DEMO_CUSTOMER_ID);
  const [input, setInput] = useState("");
  const [labelMode, setLabelMode] = useState<LabelMode>("both");
  const [activeScenarioKey, setActiveScenarioKey] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Read after hydration so server and client render the same first pass.
  useEffect(() => {
    const stored = window.localStorage.getItem(LABEL_MODE_STORAGE_KEY);
    if (stored === "id" || stored === "name" || stored === "both") setLabelMode(stored);
  }, []);

  const changeLabelMode = useCallback((mode: LabelMode) => {
    setLabelMode(mode);
    window.localStorage.setItem(LABEL_MODE_STORAGE_KEY, mode);
  }, []);

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
      setActiveScenarioKey(scenario.key);
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
    setActiveScenarioKey("");
    sentRunRef.current = null;
    inputRef.current?.focus();
  }, [setMessages]);


  const scenarios: Scenario[] = useMemo(() => {
    const list = SCENARIOS_BY_CUSTOMER[customerId] ?? [];
    const memberName = customers.find((c) => c.id === customerId)?.name;
    return memberName ? list.map((scenario) => ({ ...scenario, memberName })) : list;
  }, [customers, customerId]);


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
          labelMode={labelMode}
          onLabelModeChange={changeLabelMode}
          scenarios={scenarios}
          activeScenarioKey={activeScenarioKey}
          onScenario={runScenario}
          scenarioDisabled={isLoading}
          showScenarioPicker={messages.length > 0}
        />


        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {messages.length === 0 ? (
              <EmptyState
                scenarios={scenarios}
                onRun={runScenario}
                disabled={isLoading}
                labelMode={labelMode}
              />
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
  labelMode,
  onLabelModeChange,
  scenarios,
  activeScenarioKey,
  onScenario,
  scenarioDisabled,
  showScenarioPicker,
}: {
  customers: DemoCustomer[];
  customerId: string;
  onCustomerChange: (id: string) => void;
  activeCustomer: DemoCustomer | undefined;
  onReset: () => void;
  canReset: boolean;
  resetDisabled: boolean;
  labelMode: LabelMode;
  onLabelModeChange: (mode: LabelMode) => void;
  scenarios: Scenario[];
  activeScenarioKey: string;
  onScenario: (scenario: Scenario) => void;
  scenarioDisabled: boolean;
  showScenarioPicker: boolean;
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
                {labelMode === "name" ? (
                  customer.name
                ) : (
                  <>
                    <span className="font-mono">{customer.id}</span>
                    {labelMode === "both" && ` · ${customer.name}`}
                  </>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showScenarioPicker && (
        <div className="flex items-center gap-2.5">
          <span className="label-caps text-muted-foreground">Scenario</span>
          <Select
            value={activeScenarioKey}
            onValueChange={(key) => {
              const scenario = scenarios.find((s) => s.key === key);
              if (scenario) onScenario(scenario);
            }}
            disabled={scenarioDisabled}
          >
            <SelectTrigger className="h-8 w-[190px] bg-card text-[13px]">
              <SelectValue placeholder="Choose a scenario" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((scenario) => (
                <SelectItem key={scenario.key} value={scenario.key}>
                  {scenario.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}



      <div className="flex items-center gap-1.5">
        <span className="label-caps text-muted-foreground">Labels</span>
        <div className="flex overflow-hidden rounded-full border border-border bg-card">
          {LABEL_MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              aria-pressed={labelMode === mode.value}
              onClick={() => onLabelModeChange(mode.value)}
              className={`px-2.5 py-1 text-[11px] transition-colors ${
                labelMode === mode.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>


      {activeCustomer && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 border-l-2 border-l-accent bg-muted/40 py-1 pl-2.5 pr-3">
          <span className="label-caps text-muted-foreground">
            Policies
            <span className="ml-1 font-mono text-[10px] text-accent">
              {activeCustomer.policies.length}
            </span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {activeCustomer.policies.map((policy) => (
              <span
                key={policy.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${
                  policy.status === "active"
                    ? "border-border bg-card text-foreground"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full ${
                    policy.status === "active" ? "bg-accent" : "bg-destructive"
                  }`}
                />
                <span className="font-mono">{policy.id}</span> · {policy.policy_type}
                {policy.status !== "active" && ` · ${policy.status}`}
              </span>
            ))}
          </div>
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
  labelMode,
}: {
  scenarios: Scenario[];
  onRun: (scenario: Scenario) => void;
  disabled: boolean;
  labelMode: LabelMode;
}) {
  const member = scenarios[0];
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
          All scenarios run as the same member
          {member ? ` — ${formatMember(labelMode, member.customerId, member.memberName)}` : ""}. Her
          three policies produce a different outcome depending on what she asks about. Picking one
          starts a fresh conversation and sends that question.
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
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold text-foreground">
                  {labelMode === "name" ? (
                    scenario.memberName
                  ) : (
                    <>
                      <span className="font-mono font-normal text-muted-foreground">
                        {scenario.customerId}
                      </span>
                      {labelMode === "both" && scenario.memberName
                        ? ` · ${scenario.memberName}`
                        : ""}
                    </>
                  )}
                </span>
                <span className="shrink-0 rounded-full border border-border bg-parchment px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-muted-foreground">
                  {scenario.label}
                </span>
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">{scenario.hint}</div>

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

// Model output occasionally carries stray scaffolding artifacts (e.g. a lone
// "Box1" line) that are not meant for the customer. Strip them before render.
function cleanAssistantText(text: string) {
  return text
    .split("\n")
    .filter((line) => !/^\s*\**\[?\s*(box|block|section|card|panel)\s*\d+\s*\]?\**\s*:?\s*$/i.test(line))
    .join("\n")
    .trim();
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
      if (cleanAssistantText(part.text)) blocks.push({ key: `t-${index}`, text: part.text });
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

      {blocks.map((block) => (
        <div key={block.key} className="prose-claims max-w-none text-[14.5px] text-foreground">
          <ReactMarkdown>{cleanAssistantText(block.text)}</ReactMarkdown>
        </div>
      ))}

      {escalations.map((escalation) => (
        <EscalationCard
          key={escalation.reference_number}
          data={escalation}
          onRestart={onRestart}
        />
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
}: {
  ref: React.Ref<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="border-t border-border bg-parchment px-4 py-3 sm:px-8">
      <div className="mx-auto max-w-3xl">




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
