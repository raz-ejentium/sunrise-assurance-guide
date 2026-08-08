CREATE TABLE public.customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  member_since date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.policies (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  policy_type text NOT NULL,
  insurer_name text NOT NULL,
  status text NOT NULL,
  effective_date date NOT NULL,
  annual_limit numeric NOT NULL,
  currency text NOT NULL DEFAULT 'MYR',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.treatments (
  treatment_code text PRIMARY KEY,
  description text NOT NULL,
  category text NOT NULL,
  pre_auth_typically_required boolean NOT NULL DEFAULT false
);

CREATE TABLE public.policy_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id text NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  treatment_code text NOT NULL REFERENCES public.treatments(treatment_code) ON DELETE CASCADE,
  covered boolean NOT NULL,
  waiting_period_months integer NOT NULL DEFAULT 0,
  exclusion_note text,
  requires_rider boolean NOT NULL DEFAULT false,
  rider_held boolean,
  pre_auth_required boolean NOT NULL DEFAULT false,
  UNIQUE (policy_id, treatment_code)
);

CREATE TABLE public.document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_code text NOT NULL REFERENCES public.treatments(treatment_code) ON DELETE CASCADE,
  policy_type text NOT NULL,
  documents text[] NOT NULL,
  UNIQUE (treatment_code, policy_type)
);

CREATE TABLE public.escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE,
  customer_id text REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  reason_code text NOT NULL,
  reason text NOT NULL,
  conversation_summary text NOT NULL,
  what_was_determined text,
  what_could_not_be_determined text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE public.escalation_ref_seq START 1041;

GRANT SELECT ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
GRANT SELECT ON public.policies TO anon, authenticated;
GRANT ALL ON public.policies TO service_role;
GRANT SELECT ON public.treatments TO anon, authenticated;
GRANT ALL ON public.treatments TO service_role;
GRANT SELECT ON public.policy_coverage TO anon, authenticated;
GRANT ALL ON public.policy_coverage TO service_role;
GRANT SELECT ON public.document_requirements TO anon, authenticated;
GRANT ALL ON public.document_requirements TO service_role;
GRANT SELECT ON public.escalations TO anon, authenticated;
GRANT ALL ON public.escalations TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.escalation_ref_seq TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo reference data is publicly readable" ON public.customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo reference data is publicly readable" ON public.policies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo reference data is publicly readable" ON public.treatments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo reference data is publicly readable" ON public.policy_coverage FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo reference data is publicly readable" ON public.document_requirements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Escalations are publicly readable in the demo" ON public.escalations FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.customers (id, name, email, member_since) VALUES
  ('CUST-001', 'Linda Chen', 'linda.chen@example.com', '2021-03-14'),
  ('CUST-002', 'Ravi Kumar', 'ravi.kumar@example.com', '2019-08-01'),
  ('CUST-003', 'Aisha Rahman', 'aisha.rahman@example.com', '2026-05-20'),
  ('CUST-004', 'Tan Wei Ming', 'tan.weiming@example.com', '2018-01-09');

INSERT INTO public.policies (id, customer_id, policy_type, insurer_name, status, effective_date, annual_limit) VALUES
  ('POL-1001', 'CUST-001', 'personal medical card', 'Sunrise Assurance', 'active', '2021-03-14', 250000),
  ('POL-1002', 'CUST-001', 'employer group plan', 'Sunrise Assurance (Group)', 'active', '2023-01-01', 150000),
  ('POL-2001', 'CUST-002', 'personal medical card', 'Sunrise Assurance', 'active', '2019-08-01', 300000),
  ('POL-3001', 'CUST-003', 'personal medical card', 'Sunrise Assurance', 'active', '2026-05-20', 200000),
  ('POL-4001', 'CUST-004', 'employer group plan', 'Sunrise Assurance (Group)', 'lapsed', '2018-01-09', 100000);

INSERT INTO public.treatments (treatment_code, description, category, pre_auth_typically_required) VALUES
  ('T-ARTH-KNEE', 'Knee arthroscopy (day surgery)', 'orthopaedic surgery', true),
  ('T-BARIATRIC', 'Bariatric (weight-loss) surgery', 'metabolic surgery', true),
  ('T-APPEND', 'Emergency appendectomy', 'emergency surgery', false),
  ('T-CARDIAC-STENT', 'Coronary angioplasty with stent', 'cardiology', true),
  ('T-MATERNITY', 'Maternity delivery', 'maternity', false),
  ('T-DENTAL-SURG', 'Surgical dental extraction', 'dental', false),
  ('T-PHYSIO', 'Outpatient physiotherapy course', 'rehabilitation', false);

INSERT INTO public.policy_coverage (policy_id, treatment_code, covered, waiting_period_months, exclusion_note, requires_rider, rider_held, pre_auth_required) VALUES
  ('POL-1001', 'T-ARTH-KNEE', true, 0, NULL, false, NULL, true),
  ('POL-1001', 'T-BARIATRIC', false, 0, 'Weight-management and bariatric procedures are excluded under the personal medical card, clause 8.3(b).', false, NULL, true),
  ('POL-1001', 'T-APPEND', true, 0, NULL, false, NULL, false),
  ('POL-1001', 'T-CARDIAC-STENT', true, 0, NULL, false, NULL, true),
  ('POL-1001', 'T-PHYSIO', true, 0, 'Capped at 12 sessions per policy year.', false, NULL, false),
  ('POL-1001', 'T-DENTAL-SURG', false, 0, 'Dental treatment excluded unless caused by accident.', false, NULL, false),
  ('POL-1002', 'T-ARTH-KNEE', true, 0, NULL, false, NULL, true),
  ('POL-1002', 'T-BARIATRIC', true, 12, 'Covered only under the Metabolic Care rider; rider status on this member record is unconfirmed.', true, NULL, true),
  ('POL-1002', 'T-APPEND', true, 0, NULL, false, NULL, false),
  ('POL-1002', 'T-PHYSIO', true, 0, NULL, false, NULL, false),
  ('POL-1002', 'T-MATERNITY', true, 10, NULL, false, NULL, false),
  ('POL-2001', 'T-APPEND', true, 0, NULL, false, NULL, false),
  ('POL-2001', 'T-ARTH-KNEE', true, 0, NULL, false, NULL, true),
  ('POL-2001', 'T-CARDIAC-STENT', true, 0, NULL, false, NULL, true),
  ('POL-2001', 'T-PHYSIO', true, 0, NULL, false, NULL, false),
  ('POL-3001', 'T-ARTH-KNEE', true, 24, 'Specified surgical procedures carry a 24-month waiting period from the effective date.', false, NULL, true),
  ('POL-3001', 'T-APPEND', true, 0, NULL, false, NULL, false),
  ('POL-3001', 'T-MATERNITY', true, 10, NULL, false, NULL, false),
  ('POL-4001', 'T-APPEND', true, 0, NULL, false, NULL, false),
  ('POL-4001', 'T-ARTH-KNEE', true, 0, NULL, false, NULL, true);

INSERT INTO public.document_requirements (treatment_code, policy_type, documents) VALUES
  ('T-ARTH-KNEE', 'personal medical card', ARRAY['Completed claim form (Section A by member, Section B by treating doctor)','Pre-authorisation approval letter','Specialist referral or consultation notes','MRI or diagnostic imaging report','Itemised hospital bill and official receipts','Copy of NRIC / passport','Medical card copy (front and back)']),
  ('T-ARTH-KNEE', 'employer group plan', ARRAY['Group claim form endorsed by HR / plan administrator','Pre-authorisation approval letter','Specialist referral and diagnostic imaging report','Itemised hospital bill and official receipts','Employee ID and copy of NRIC','Medical leave certificate (if claiming disability benefit)']),
  ('T-BARIATRIC', 'employer group plan', ARRAY['Group claim form endorsed by HR / plan administrator','Metabolic Care rider endorsement certificate','Pre-authorisation approval letter (mandatory)','BMI history and 6-month supervised weight-management records','Specialist assessment confirming medical necessity','Itemised hospital bill and official receipts']),
  ('T-BARIATRIC', 'personal medical card', ARRAY['Not applicable - procedure excluded under this policy type']),
  ('T-APPEND', 'personal medical card', ARRAY['Completed claim form','Hospital discharge summary','Operative / surgical report','Itemised hospital bill and official receipts','Copy of NRIC / passport']),
  ('T-APPEND', 'employer group plan', ARRAY['Group claim form endorsed by HR / plan administrator','Hospital discharge summary','Operative / surgical report','Itemised hospital bill and official receipts','Employee ID']),
  ('T-CARDIAC-STENT', 'personal medical card', ARRAY['Completed claim form','Pre-authorisation approval letter','Angiogram report and cardiologist notes','Implant / stent device invoice','Itemised hospital bill and official receipts']),
  ('T-MATERNITY', 'employer group plan', ARRAY['Group maternity claim form','Antenatal record book','Delivery summary from hospital','Birth certificate or notification of birth','Itemised hospital bill and official receipts']),
  ('T-MATERNITY', 'personal medical card', ARRAY['Maternity claim form','Antenatal record book','Delivery summary','Itemised hospital bill and official receipts']),
  ('T-PHYSIO', 'personal medical card', ARRAY['Outpatient claim form','Doctor referral for physiotherapy','Session-by-session treatment notes','Official receipts for each session']),
  ('T-PHYSIO', 'employer group plan', ARRAY['Outpatient claim form endorsed by HR','Doctor referral for physiotherapy','Official receipts for each session']),
  ('T-DENTAL-SURG', 'personal medical card', ARRAY['Not applicable - dental treatment excluded unless accident-related']);