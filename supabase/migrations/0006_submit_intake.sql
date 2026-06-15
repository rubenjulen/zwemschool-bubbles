-- =============================================================================
-- Atomaire intake (FR-2). Vervangt de losse server-side inserts door één
-- functie: een functieaanroep is één transactie, dus bij een fout halverwege
-- wordt ALLES teruggedraaid (geen half-gevuld gezin). SECURITY DEFINER, maar
-- het gezin wordt voor auth.uid() aangemaakt, dus de caller is altijd eigenaar.
-- =============================================================================
create or replace function public.submit_intake(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid;
  v_family uuid;
  v_student uuid;
  v_version text;
  v_key text;
  v_consents jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Niet ingelogd';
  end if;

  -- 1. Gezin + hoofdouder (idempotent, koppelt aan auth.uid()).
  v_family := public.onboard_family(
    coalesce(p -> 'family' ->> 'familyName', ''),
    p -> 'family' ->> 'guardianName',
    p -> 'family' ->> 'phone'
  );

  -- 2. Leerling.
  insert into public.students (family_id, first_name, last_name, date_of_birth)
  values (
    v_family,
    p -> 'student' ->> 'firstName',
    nullif(p -> 'student' ->> 'lastName', ''),
    nullif(p -> 'student' ->> 'dateOfBirth', '')::date
  )
  returning id into v_student;

  -- 3. Safety-profiel.
  insert into public.safety_profiles
    (student_id, medical_notes, allergies, water_anxiety, general_notes)
  values (
    v_student,
    nullif(p -> 'safety' ->> 'medicalNotes', ''),
    nullif(p -> 'safety' ->> 'allergies', ''),
    nullif(p -> 'safety' ->> 'waterAnxiety', ''),
    nullif(p -> 'safety' ->> 'generalNotes', '')
  );

  -- 4. Noodcontact.
  insert into public.emergency_contacts (family_id, student_id, name, phone_e164, relationship)
  values (
    v_family,
    v_student,
    p -> 'emergency' ->> 'name',
    p -> 'emergency' ->> 'phone',
    nullif(p -> 'emergency' ->> 'relationship', '')
  );

  -- 5. Consents (versie/datum/kanaal per type) - PR-2, FR-2.3/2.4.
  v_version := coalesce(p ->> 'consentVersion', 'onbekend');
  v_consents := coalesce(p -> 'consents', '{}'::jsonb);
  for v_key in select jsonb_object_keys(v_consents) loop
    insert into public.consent_records (family_id, consent_type, version, granted, channel)
    values (v_family, v_key, v_version, (v_consents ->> v_key)::boolean, 'app');
  end loop;

  return v_student;
end;
$$;

revoke all on function public.submit_intake(jsonb) from public;
grant execute on function public.submit_intake(jsonb) to authenticated;
