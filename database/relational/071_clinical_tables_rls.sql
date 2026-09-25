-- 071: RLS deny-by-default on clinical and account-linkage tables in public (PostgREST).
-- AiyraCare uses Fastify API + direct Postgres (DATABASE_URL), not supabase.from() on these tables.
-- RLS on with no policies for anon/authenticated => PostgREST cannot read or write rows.
-- Supabase service_role JWT and the postgres DB role bypass RLS (API unchanged).
-- app_accounts / patient_memberships: skipped when absent (partial cloud schemas).

DO $$
DECLARE
  t text;
  regclass_oid oid;
  clinical_tables text[] := ARRAY[
    'patients',
    'medical_records',
    'diagnoses',
    'medications',
    'vaccines',
    'allergies',
    'exams',
    'growth_records',
    'documents'
  ];
  optional_tables text[] := ARRAY[
    'app_accounts',
    'patient_memberships'
  ];
BEGIN
  FOREACH t IN ARRAY clinical_tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
  END LOOP;

  FOREACH t IN ARRAY optional_tables
  LOOP
    regclass_oid := to_regclass('public.' || t);
    IF regclass_oid IS NULL THEN
      RAISE NOTICE '071: skipping % (table not present)', t;
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;
