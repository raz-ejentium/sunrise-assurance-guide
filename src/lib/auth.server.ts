import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

export type VerifiedCaller = { userId: string; email: string | null };

/**
 * Verifies the `Authorization: Bearer <jwt>` header on an incoming request.
 * Returns null when the caller is not an authenticated user.
 */
export async function verifyBearerToken(request: Request): Promise<VerifiedCaller | null> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  if (!token || token.split(".").length !== 3) return null;

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;

  const supabase = createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;

  const email = typeof data.claims["email"] === "string" ? (data.claims["email"] as string) : null;
  return { userId: data.claims.sub, email };
}
