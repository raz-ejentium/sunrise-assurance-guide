import { useState } from "react";
import { ChevronRight, Terminal } from "lucide-react";

export type TraceEntry = {
  id: string;
  name: string;
  state: string;
  input: unknown;
  output: unknown;
};

const TOOL_LABELS: Record<string, string> = {
  get_customer_policies: "Fetching policies",
  resolve_treatment: "Resolving treatment code",
  check_eligibility: "Checking eligibility",
  get_document_requirements: "Fetching document checklist",
  get_claim_timing_rule: "Checking timing rule",
  get_submission_guidance: "Fetching submission guidance",
  escalate_to_human: "Escalating to human",
};

function StateDot({ state }: { state: string }) {
  const cls =
    state === "output-available"
      ? "bg-success"
      : state === "output-error"
        ? "bg-destructive"
        : "bg-accent animate-pulse";
  return <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${cls}`} aria-hidden />;
}

function TraceRow({ entry, index }: { entry: TraceEntry; index: number }) {
  const [open, setOpen] = useState(false);
  const verdict =
    entry.output && typeof entry.output === "object" && "verdict" in entry.output
      ? String((entry.output as Record<string, unknown>)["verdict"])
      : null;

  return (
    <li className="border-b border-border/70 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-secondary/60"
      >
        <StateDot state={entry.state} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="truncate font-mono text-[11px] font-medium text-foreground">
              {entry.name}
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {TOOL_LABELS[entry.name] ?? "Tool call"}
            {verdict ? ` · ${verdict}` : ""}
          </span>
        </span>
        <ChevronRight
          className={`mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-border/70 bg-parchment/70 px-3 py-2.5">
          <div>
            <div className="label-caps mb-1 text-muted-foreground">Arguments</div>
            <pre className="overflow-x-auto rounded border border-border bg-card p-2 font-mono text-[10px] leading-relaxed text-foreground">
              {JSON.stringify(entry.input, null, 2)}
            </pre>
          </div>
          <div>
            <div className="label-caps mb-1 text-muted-foreground">Returned</div>
            <pre className="max-h-64 overflow-auto rounded border border-border bg-card p-2 font-mono text-[10px] leading-relaxed text-foreground">
              {entry.output === undefined ? "…" : JSON.stringify(entry.output, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </li>
  );
}

export function TracePanel({ entries }: { entries: TraceEntry[] }) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-sidebar">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Terminal className="size-3.5 text-muted-foreground" aria-hidden />
        <h2 className="label-caps text-muted-foreground">Agent tool trace</h2>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {entries.length}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="px-4 py-6 text-[12px] leading-relaxed text-muted-foreground">
          Every function the agent invokes appears here with its arguments and returned payload —
          so you can verify no coverage answer was invented.
        </p>
      ) : (
        <ol className="min-h-0 flex-1 overflow-y-auto">
          {entries.map((entry, i) => (
            <TraceRow key={entry.id} entry={entry} index={i} />
          ))}
        </ol>
      )}
    </aside>
  );
}
