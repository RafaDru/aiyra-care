-- 071: RLS deny-by-default on clinical and account-linkage tables in public (PostgREST).
-- AiyraCare uses Fastify API + direct Postgres (DATABASE_URL), not supabase.from() on these tables.
-- RLS on with no policies for anon/authenticated => PostgREST cannot read or write rows.
-- Supabase service_role JWT and the postgres DB role bypass RLS (API unchanged).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'patients',
    'medical_records',
    'diagnoses',
    'medications',
    'vaccines',
    'allergies',
    'exams',
    'growth_records',
    'documents',
    'app_accounts',
    'patient_memberships'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;
