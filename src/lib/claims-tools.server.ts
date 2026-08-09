import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EligibilityVerdict = "covered" | "not_covered" | "indeterminate";

function monthsBetween(from: string, to: Date) {
  const start = new Date(from);
  return (
    (to.getFullYear() - start.getFullYear()) * 12 +
    (to.getMonth() - start.getMonth()) -
    (to.getDate() < start.getDate() ? 1 : 0)
  );
}

export async function getCustomerPolicies(customerId: string) {
  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("id, name, email, member_since")
    .eq("id", customerId)
    .maybeSingle();

  if (customerError) throw new Error(customerError.message);
  if (!customer) {
    return {
      found: false as const,
      confidence: "low" as const,
      note: `No customer record matches "${customerId}". Identity is unresolved — do not guess.`,
      policies: [],
    };
  }

  const { data: policies, error } = await supabaseAdmin
    .from("policies")
    .select("id, policy_type, insurer_name, status, effective_date, annual_limit, currency")
    .eq("customer_id", customerId)
    .order("effective_date", { ascending: true });

  if (error) throw new Error(error.message);

  const list = policies ?? [];
  const activeCount = list.filter((p) => p.status === "active").length;

  return {
    found: true as const,
    customer,
    policies: list,
    policy_count: list.length,
    active_policy_count: activeCount,
    multiple_policies_apply: activeCount > 1,
    confidence: (list.length === 0 ? "low" : "high") as "low" | "high",
    note:
      activeCount > 1
        ? "This customer holds more than one active policy. Coverage must be checked against EVERY active policy before any answer is given."
        : list.length === 0
          ? "No policies on record for this customer."
          : "Single active policy on record.",
  };
}

export async function resolveTreatment(query: string) {
  const { data, error } = await supabaseAdmin
    .from("treatments")
    .select("treatment_code, description, category, pre_auth_typically_required");
  if (error) throw new Error(error.message);

  const needle = query.toLowerCase().trim();
  const all = data ?? [];

  const exact = all.find(
    (t) =>
      t.treatment_code.toLowerCase() === needle || t.description.toLowerCase() === needle,
  );
  if (exact) {
    return { matched: true as const, confidence: "high" as const, treatment: exact };
  }

  const synonyms: Record<string, string[]> = {
    "T-ARTH-KNEE": ["keyhole", "arthroscopy", "arthroscopic", "knee", "meniscus"],
    "T-BARIATRIC": ["bariatric", "gastric", "sleeve", "bypass", "weight", "obesity", "stomach"],
    "T-APPEND": ["appendectomy", "appendix", "appendicitis"],
    "T-CARDIAC-STENT": ["angioplasty", "stent", "coronary", "heart", "cardiac"],
    "T-MATERNITY": ["maternity", "delivery", "birth", "childbirth", "caesarean", "csection"],
    "T-DENTAL-SURG": ["dental", "tooth", "teeth", "extraction", "wisdom"],
    "T-PHYSIO": ["physiotherapy", "physio", "rehabilitation", "rehab"],
  };

  const tokens = needle.split(/[^a-z0-9]+/).filter((t) => t.length > 3);
  const scored = all
    .map((t) => {
      const haystack = `${t.description} ${t.category} ${t.treatment_code}`.toLowerCase();
      const keywords = synonyms[t.treatment_code] ?? [];
      // Keyword hits are weighted above generic description words like "surgery",
      // so a shared category term can never outrank a specific clinical match.
      const score = tokens.reduce((sum, tok) => {
        if (keywords.some((k) => k.includes(tok) || tok.includes(k))) return sum + 3;
        return haystack.includes(tok) ? sum + 1 : sum;
      }, 0);
      return { t, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  const runnerUp = scored[1];

  if (top && (!runnerUp || top.score > runnerUp.score)) {
    return {
      matched: true as const,
      confidence: (top.score >= 3 ? "high" : "medium") as "high" | "medium",
      treatment: top.t,
    };
  }

  if (scored.length > 1) {
    return {
      matched: false as const,
      confidence: "low" as const,
      candidates: scored.slice(0, 4).map((s) => s.t),
      note: "Several treatments could match this description. Ask the customer one clarifying question; if it is still ambiguous, escalate — do not pick one.",
    };
  }


  return {
    matched: false as const,
    confidence: "low" as const,
    candidates: [],
    note: "No treatment code in the reference table matches this description. This is an ESCALATION trigger (reason_code: unknown_treatment).",
  };
}

export async function checkEligibility(policyId: string, treatmentCode: string) {
  const { data: policy, error: policyError } = await supabaseAdmin
    .from("policies")
    .select("id, customer_id, policy_type, status, effective_date, annual_limit, currency")
    .eq("id", policyId)
    .maybeSingle();
  if (policyError) throw new Error(policyError.message);

  if (!policy) {
    return {
      policy_id: policyId,
      verdict: "indeterminate" as EligibilityVerdict,
      confidence: "low" as const,
      escalation_trigger: "unknown_policy",
      notes: "No such policy on record.",
    };
  }

  if (policy.status !== "active") {
    return {
      policy_id: policyId,
      policy_type: policy.policy_type,
      verdict: "indeterminate" as EligibilityVerdict,
      confidence: "low" as const,
      escalation_trigger: "policy_not_active",
      policy_status: policy.status,
      notes: `Policy status is "${policy.status}", not active. Eligibility cannot be determined from this record.`,
    };
  }

  const { data: coverage, error } = await supabaseAdmin
    .from("policy_coverage")
    .select(
      "covered, waiting_period_months, exclusion_note, requires_rider, rider_held, pre_auth_required",
    )
    .eq("policy_id", policyId)
    .eq("treatment_code", treatmentCode)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!coverage) {
    return {
      policy_id: policyId,
      policy_type: policy.policy_type,
      treatment_code: treatmentCode,
      verdict: "indeterminate" as EligibilityVerdict,
      confidence: "low" as const,
      escalation_trigger: "no_coverage_record",
      notes:
        "This treatment has no coverage entry against this policy. Absence of a record is NOT evidence of exclusion — escalate.",
    };
  }

  const monthsInForce = monthsBetween(policy.effective_date, new Date());
  const waitingPeriodSatisfied = monthsInForce >= coverage.waiting_period_months;
  const waitingPeriodEnds = (() => {
    const d = new Date(policy.effective_date);
    d.setMonth(d.getMonth() + coverage.waiting_period_months);
    return d.toISOString().slice(0, 10);
  })();

  let verdict: EligibilityVerdict = coverage.covered ? "covered" : "not_covered";
  let escalationTrigger: string | null = null;
  let confidence: "high" | "low" = "high";

  if (coverage.requires_rider && coverage.rider_held === null) {
    verdict = "indeterminate";
    confidence = "low";
    escalationTrigger = "rider_status_unknown";
  } else if (coverage.requires_rider && coverage.rider_held === false) {
    verdict = "not_covered";
  }

  if (verdict === "covered" && !waitingPeriodSatisfied) {
    verdict = "indeterminate";
    confidence = "low";
    escalationTrigger = "inside_waiting_period";
  }

  return {
    policy_id: policyId,
    policy_type: policy.policy_type,
    treatment_code: treatmentCode,
    verdict,
    confidence,
    escalation_trigger: escalationTrigger,
    covered_on_paper: coverage.covered,
    waiting_period_months: coverage.waiting_period_months,
    waiting_period_satisfied: waitingPeriodSatisfied,
    waiting_period_ends: coverage.waiting_period_months > 0 ? waitingPeriodEnds : null,
    months_in_force: monthsInForce,
    requires_rider: coverage.requires_rider,
    rider_held: coverage.rider_held,
    exclusion_note: coverage.exclusion_note,
    annual_limit: `${policy.currency} ${Number(policy.annual_limit).toLocaleString()}`,
  };
}

export async function getDocumentRequirements(policyId: string, treatmentCode: string) {
  const { data: policy, error: policyError } = await supabaseAdmin
    .from("policies")
    .select("id, policy_type")
    .eq("id", policyId)
    .maybeSingle();
  if (policyError) throw new Error(policyError.message);
  if (!policy) {
    return { found: false as const, confidence: "low" as const, note: "Unknown policy." };
  }

  const { data, error } = await supabaseAdmin
    .from("document_requirements")
    .select("documents")
    .eq("treatment_code", treatmentCode)
    .eq("policy_type", policy.policy_type)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!data) {
    return {
      found: false as const,
      confidence: "low" as const,
      policy_id: policyId,
      policy_type: policy.policy_type,
      note: "No document checklist is mapped for this treatment and policy type. Escalate rather than inventing a list.",
    };
  }

  return {
    found: true as const,
    confidence: "high" as const,
    policy_id: policyId,
    policy_type: policy.policy_type,
    treatment_code: treatmentCode,
    documents: data.documents,
  };
}

export async function getClaimTimingRule(policyId: string, treatmentCode: string) {
  const { data: policy, error: policyError } = await supabaseAdmin
    .from("policies")
    .select("id, policy_type")
    .eq("id", policyId)
    .maybeSingle();
  if (policyError) throw new Error(policyError.message);
  if (!policy) {
    return { found: false as const, confidence: "low" as const, note: "Unknown policy." };
  }

  const { data: coverage, error } = await supabaseAdmin
    .from("policy_coverage")
    .select("pre_auth_required")
    .eq("policy_id", policyId)
    .eq("treatment_code", treatmentCode)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const { data: treatment } = await supabaseAdmin
    .from("treatments")
    .select("description, pre_auth_typically_required")
    .eq("treatment_code", treatmentCode)
    .maybeSingle();

  if (!coverage) {
    return {
      found: false as const,
      confidence: "low" as const,
      note: "No timing rule recorded for this treatment on this policy. Escalate.",
    };
  }

  return {
    found: true as const,
    confidence: "high" as const,
    policy_id: policyId,
    treatment_code: treatmentCode,
    treatment: treatment?.description ?? treatmentCode,
    pre_authorisation_required: coverage.pre_auth_required,
    claim_window:
      "Post-treatment claims must be submitted within 30 days of discharge or final receipt.",
    guidance: coverage.pre_auth_required
      ? "Pre-authorisation MUST be obtained before the procedure. A post-treatment claim on this treatment risks rejection unless it was a documented emergency."
      : "No pre-authorisation needed. A post-treatment claim with the required documents is acceptable.",
  };
}

export async function escalateToHuman(input: {
  customer_id?: string | null;
  reason_code: string;
  reason: string;
  conversation_summary: string;
  what_was_determined?: string | null;
  what_could_not_be_determined?: string | null;
}) {
  const year = new Date().getFullYear();
  const { count } = await supabaseAdmin
    .from("escalations")
    .select("id", { count: "exact", head: true });
  const reference = `ESC-${year}-${String(1041 + (count ?? 0)).padStart(4, "0")}`;

  let customerName: string | null = null;
  if (input.customer_id) {
    const { data } = await supabaseAdmin
      .from("customers")
      .select("name")
      .eq("id", input.customer_id)
      .maybeSingle();
    customerName = data?.name ?? null;
  }

  const { data, error } = await supabaseAdmin
    .from("escalations")
    .insert({
      reference_number: reference,
      customer_id: input.customer_id ?? null,
      customer_name: customerName,
      reason_code: input.reason_code,
      reason: input.reason,
      conversation_summary: input.conversation_summary,
      what_was_determined: input.what_was_determined ?? null,
      what_could_not_be_determined: input.what_could_not_be_determined ?? null,
    })
    .select("reference_number, created_at")
    .single();

  if (error) throw new Error(error.message);

  return {
    escalated: true as const,
    reference_number: data.reference_number,
    logged_at: data.created_at,
    handoff_message:
      "A licensed claims specialist has the full context of this conversation and will make contact within one working day.",
    what_was_determined: input.what_was_determined ?? null,
    what_could_not_be_determined: input.what_could_not_be_determined ?? null,
    reason: input.reason,
  };
}

const SUBMISSION_CHANNELS: Record<
  string,
  { channel: "portal" | "app" | "branch"; method: string; turnaround: string }
> = {
  "employer group plan": {
    channel: "portal",
    method:
      "Submit through the Sunrise Assurance employer group portal under 'New claim', attaching scanned copies of every required document as PDF or JPG.",
    turnaround: "10-15 business days once complete documents are received.",
  },
  "personal medical card": {
    channel: "app",
    method:
      "Submit in the Sunrise Assurance mobile app under 'Claims > Start a claim', photographing each required document in good light.",
    turnaround: "5-7 business days once complete documents are received.",
  },
};

const BRANCH_FALLBACK = {
  channel: "branch" as const,
  method:
    "Submit in person at any Sunrise Assurance branch with the original documents; a claims officer will scan and lodge them for you.",
  turnaround: "10-15 business days once complete documents are received.",
};

export async function getSubmissionGuidance(policyId: string, treatmentCode: string) {
  const { data: policy, error: policyError } = await supabaseAdmin
    .from("policies")
    .select("id, policy_type, insurer_name, status")
    .eq("id", policyId)
    .maybeSingle();
  if (policyError) throw new Error(policyError.message);
  if (!policy) {
    return { found: false as const, confidence: "low" as const, note: "Unknown policy." };
  }

  const route = SUBMISSION_CHANNELS[policy.policy_type.toLowerCase()];
  if (!route) {
    return {
      found: false as const,
      confidence: "low" as const,
      policy_id: policyId,
      policy_type: policy.policy_type,
      note: "No submission route is mapped for this policy type. Escalate rather than inventing a channel or turnaround.",
    };
  }

  const { data: coverage } = await supabaseAdmin
    .from("policy_coverage")
    .select("pre_auth_required")
    .eq("policy_id", policyId)
    .eq("treatment_code", treatmentCode)
    .maybeSingle();

  return {
    found: true as const,
    confidence: "high" as const,
    policy_id: policyId,
    policy_type: policy.policy_type,
    treatment_code: treatmentCode,
    channel: route.channel,
    method: route.method,
    estimated_turnaround: route.turnaround,
    pre_auth_route: coverage?.pre_auth_required
      ? "Pre-authorisation must be lodged through the same channel at least 5 business days before the procedure; approval is usually returned within 3 business days."
      : null,
    note: "Turnaround is an estimate from the point complete documents are received, not a payment guarantee.",
  };
}
