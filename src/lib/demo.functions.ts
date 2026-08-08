import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Member, policy and escalation data is no longer readable with the public key,
// and these server functions require an authenticated staff session before
// reading it with the trusted server-only client.
async function serverClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type DemoCustomer = {
  id: string;
  name: string;
  member_since: string;
  policies: { id: string; policy_type: string; status: string }[];
};

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  const supabase = await serverClient();
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name, member_since")
    .order("id");
  if (error) throw new Error(error.message);

  const { data: policies, error: policyError } = await supabase
    .from("policies")
    .select("id, customer_id, policy_type, status");
  if (policyError) throw new Error(policyError.message);

  return (customers ?? []).map((c) => ({
    ...c,
    policies: (policies ?? [])
      .filter((p) => p.customer_id === c.id)
      .map(({ id, policy_type, status }) => ({ id, policy_type, status })),
  })) satisfies DemoCustomer[];
});

export const listEscalations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("escalations")
    .select(
      "id, reference_number, customer_id, customer_name, reason_code, reason, conversation_summary, what_was_determined, what_could_not_be_determined, status, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});
