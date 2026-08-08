DROP POLICY IF EXISTS "Demo reference data is publicly readable" ON public.customers;
DROP POLICY IF EXISTS "Demo reference data is publicly readable" ON public.policies;
DROP POLICY IF EXISTS "Demo reference data is publicly readable" ON public.policy_coverage;
DROP POLICY IF EXISTS "Escalations are publicly readable in the demo" ON public.escalations;

REVOKE ALL ON public.customers FROM anon, authenticated;
REVOKE ALL ON public.policies FROM anon, authenticated;
REVOKE ALL ON public.policy_coverage FROM anon, authenticated;
REVOKE ALL ON public.escalations FROM anon, authenticated;

GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.policies TO service_role;
GRANT ALL ON public.policy_coverage TO service_role;
GRANT ALL ON public.escalations TO service_role;