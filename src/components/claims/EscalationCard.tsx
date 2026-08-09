import { AlertTriangle, CheckCircle2, HelpCircle, Phone, RotateCcw } from "lucide-react";

export type EscalationOutput = {
  escalated: boolean;
  reference_number: string;
  logged_at: string;
  handoff_message: string;
  reason: string;
  what_was_determined: string | null;
  what_could_not_be_determined: string | null;
};

export function EscalationCard({
  data,
  onRestart,
}: {
  data: EscalationOutput;
  onRestart?: (() => void) | undefined;
}) {
  return (
    <div className="my-3 overflow-hidden rounded-lg border-2 border-warning/60 bg-card shadow-panel">
      <div className="flex items-center gap-2 border-b border-warning/40 bg-warning/10 px-4 py-2.5">
        <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden />
        <span className="label-caps text-warning">Handed off to a human specialist</span>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="label-caps text-muted-foreground">Reference</span>
          <span className="font-mono text-xl font-semibold tracking-tight text-foreground">
            {data.reference_number}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-foreground">{data.reason}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-parchment/60 p-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-success" aria-hidden />
              <span className="label-caps text-muted-foreground">Confirmed</span>
            </div>
            <p className="text-[13px] leading-relaxed text-foreground">
              {data.what_was_determined || "—"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-parchment/60 p-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <HelpCircle className="size-3.5 text-warning" aria-hidden />
              <span className="label-caps text-muted-foreground">Could not determine</span>
            </div>
            <p className="text-[13px] leading-relaxed text-foreground">
              {data.what_could_not_be_determined || "—"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 border-t border-border pt-3 text-[13px] text-muted-foreground">
          <Phone className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{data.handoff_message}</span>
        </div>

        {onRestart && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-3 text-[13px] text-muted-foreground">
            <span>Reference saved. Start a new conversation to ask about another treatment.</span>
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[12px] text-foreground transition-colors hover:border-accent"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Start a new conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
