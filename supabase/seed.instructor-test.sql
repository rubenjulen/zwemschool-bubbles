-- =============================================================================
-- Testdata voor Iteratie 3 (instructeur-aanwezigheid).
-- VOORAF: maak een instructeur-gebruiker aan via Authentication > Add user
--   (e-mail + wachtwoord + "Auto Confirm User" aan).
-- Vervang hieronder INSTRUCTEUR_EMAIL door dat e-mailadres en draai dit in de
-- Supabase SQL Editor. Idempotent waar mogelijk; maakt een lesgroep op de
-- weekdag van VANDAAG zodat hij meteen in /vandaag verschijnt.
-- =============================================================================
do $$
declare
  v_email text := 'INSTRUCTEUR_EMAIL';   -- <-- vervang dit
  v_uid uuid;
  v_staff uuid;
  v_loc uuid := '00000000-0000-0000-0000-000000000001';
  v_lane uuid := '1a000000-0000-0000-0000-000000000001';
  v_level uuid := '10000000-0000-0000-0000-000000000001';
  v_family uuid;
  v_series uuid;
  v_dow int := extract(dow from (now() at time zone 'America/Paramaribo')::date);
begin
  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'Geen gebruiker met e-mail %. Maak die eerst via Authentication > Add user.', v_email;
  end if;

  -- Rol = instructeur (zodat /vandaag toegankelijk is).
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"instructor"}'
  where id = v_uid;

  -- Stamgegevens (idempotent) - voor het geval seed.prod.sql nog niet is gedraaid.
  insert into public.locations (id, name, latitude, longitude)
    values (v_loc, 'Hoofdbad Paramaribo', 5.852, -55.2038) on conflict (id) do nothing;
  insert into public.lanes_or_areas (id, location_id, name)
    values (v_lane, v_loc, 'Ondiep bad') on conflict (id) do nothing;
  insert into public.levels (id, name, sort_order)
    values (v_level, 'Zeepaardje', 1) on conflict (id) do nothing;

  -- Staff-profiel gekoppeld aan de gebruiker.
  insert into public.staff_profiles (user_id, full_name, role)
    values (v_uid, 'Test Instructeur', 'instructor')
  on conflict (user_id) do update set role = 'instructor'
  returning id into v_staff;

  -- Testgezin + twee leerlingen.
  insert into public.family_accounts (name) values ('Testgezin Iteratie 3') returning id into v_family;
  insert into public.students (family_id, first_name, last_name) values
    (v_family, 'Amir', 'Test'),
    (v_family, 'Noa', 'Test');

  -- Lesgroep op de weekdag van vandaag, toegewezen aan deze instructeur.
  insert into public.class_series
    (location_id, lane_or_area_id, level_id, instructor_id, name, capacity, weekday, start_time, end_time)
  values (v_loc, v_lane, v_level, v_staff, 'Testles (vandaag)', 8, v_dow, '16:00', '16:45')
  returning id into v_series;

  -- Schrijf de twee leerlingen in.
  insert into public.enrollments (student_id, class_series_id, status, start_date)
  select s.id, v_series, 'active', current_date
  from public.students s where s.family_id = v_family;

  raise notice 'Klaar. Log in als % en open /vandaag.', v_email;
end $$;
