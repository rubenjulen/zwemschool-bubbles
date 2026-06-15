-- =============================================================================
-- Negatieve RLS-tests (Prompt 36, SEC-5 broken access control). Draai tegen de
-- lokale database NA migraties:
--   psql "$DATABASE_URL" -f supabase/tests/rls_negative.sql
-- Het hele script draait in één transactie en doet ROLLBACK, dus er blijft
-- geen testdata achter. Bij een schending wordt een EXCEPTION geraised.
--
-- Werking: we maken testdata als superuser (postgres bypasst RLS), en
-- simuleren daarna gebruikers via `set local role` + `request.jwt.claims`.
-- =============================================================================
begin;

-- --- Testdata (als superuser) ------------------------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ouderA@test.sr'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'ouderB@test.sr'),
  ('ffffffff-0000-0000-0000-000000000003', 'finance@test.sr');

insert into public.family_accounts (id, name) values
  ('fa000000-0000-0000-0000-0000000000a1', 'Gezin A'),
  ('fa000000-0000-0000-0000-0000000000b1', 'Gezin B');

insert into public.guardians (family_id, user_id, full_name) values
  ('fa000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ouder A'),
  ('fa000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000002', 'Ouder B');

insert into public.students (id, family_id, first_name) values
  ('57000000-0000-0000-0000-0000000000a1', 'fa000000-0000-0000-0000-0000000000a1', 'Kind A'),
  ('57000000-0000-0000-0000-0000000000b1', 'fa000000-0000-0000-0000-0000000000b1', 'Kind B');

insert into public.safety_profiles (student_id, medical_notes) values
  ('57000000-0000-0000-0000-0000000000a1', 'Vertrouwelijk medisch A');

insert into public.invoices (family_id, invoice_number, amount_cents, status) values
  ('fa000000-0000-0000-0000-0000000000b1', 'INV-B-001', 5000, 'open');

-- --- Helper ------------------------------------------------------------------
create or replace function pg_temp.assert_count(p_actual int, p_expected int, p_label text)
returns void language plpgsql as $$
begin
  if p_actual <> p_expected then
    raise exception 'RLS FAIL: % -> verwacht %, kreeg %', p_label, p_expected, p_actual;
  else
    raise notice 'RLS OK: % (% rijen)', p_label, p_actual;
  end if;
end; $$;

do $$
declare c int;
begin
  -- TEST 1: Ouder A ziet alleen het eigen kind, niet dat van B.
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","app_metadata":{"role":"guardian"}}';
  select count(*) into c from public.students;
  perform pg_temp.assert_count(c, 1, 'Ouder A ziet alleen eigen leerling');

  -- TEST 2: Ouder A ziet geen facturen van gezin B.
  select count(*) into c from public.invoices;
  perform pg_temp.assert_count(c, 0, 'Ouder A ziet geen facturen van gezin B');

  -- TEST 3: Ouder A ziet eigen safety-profiel (eigen kind) wel.
  select count(*) into c from public.safety_profiles;
  perform pg_temp.assert_count(c, 1, 'Ouder A ziet eigen safety-profiel');

  reset role;

  -- TEST 4: Finance ziet GEEN medische/safety-data.
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"ffffffff-0000-0000-0000-000000000003","app_metadata":{"role":"finance_admin"}}';
  select count(*) into c from public.safety_profiles;
  perform pg_temp.assert_count(c, 0, 'Finance ziet geen safety-profielen');

  -- Finance ziet wel facturen.
  select count(*) into c from public.invoices;
  perform pg_temp.assert_count(c, 1, 'Finance ziet facturen');

  reset role;

  -- TEST 5: Anonieme gebruiker ziet niets.
  set local role anon;
  set local request.jwt.claims = '';
  select count(*) into c from public.students;
  perform pg_temp.assert_count(c, 0, 'Anoniem ziet geen leerlingen');

  reset role;

  raise notice 'Alle negatieve RLS-tests geslaagd.';
end $$;

rollback;
