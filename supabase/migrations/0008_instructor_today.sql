-- =============================================================================
-- Iteratie 3 - instructeur: dagrooster + aanwezigheid (FR-6).
-- Twee SECURITY DEFINER-RPC's met eigen autorisatiecheck. Het wegschrijven van
-- aanwezigheid gebeurt via de RLS-policy attendance_instructor_write (direct
-- upsert vanuit de app), dus daar is geen RPC voor nodig.
-- =============================================================================

-- Lessen van vandaag voor de ingelogde instructeur. Maakt ontbrekende
-- lesdata voor vandaag aan (op basis van de weekdag van de serie) en geeft ze
-- terug met leerlingaantal. Tijd in America/Paramaribo.
create or replace function public.get_instructor_today()
returns table (
  session_id uuid,
  name text,
  level_name text,
  location_name text,
  start_time time,
  student_count int
) language plpgsql security definer set search_path = public as $$
declare
  v_staff uuid := public.current_staff_id();
  v_today date := (now() at time zone 'America/Paramaribo')::date;
  v_dow int := extract(dow from v_today);
begin
  if v_staff is null then
    return;
  end if;

  insert into public.lesson_sessions (class_series_id, session_date)
  select cs.id, v_today
  from public.class_series cs
  where cs.is_active and cs.instructor_id = v_staff and cs.weekday = v_dow
  on conflict (class_series_id, session_date) do nothing;

  return query
  select
    ls.id,
    cs.name,
    lv.name,
    loc.name,
    coalesce(ls.start_time, cs.start_time),
    (select count(*)::int from public.enrollments e
       where e.class_series_id = cs.id and e.status in ('active', 'trial'))
  from public.lesson_sessions ls
  join public.class_series cs on cs.id = ls.class_series_id
  left join public.levels lv on lv.id = cs.level_id
  left join public.locations loc on loc.id = cs.location_id
  where ls.session_date = v_today
    and not ls.is_cancelled
    and cs.instructor_id = v_staff
  order by coalesce(ls.start_time, cs.start_time);
end;
$$;

revoke all on function public.get_instructor_today() from public;
grant execute on function public.get_instructor_today() to authenticated;

-- Leerlingenlijst voor één les: ingeschreven leerlingen + huidige aanwezigheid
-- + een safety-indicator (geen medische details in de lijst zelf - FR-2.5/PR-4).
create or replace function public.get_lesson_roster(p_session_id uuid)
returns table (
  student_id uuid,
  first_name text,
  last_name text,
  status public.attendance_status,
  has_safety_note boolean
) language plpgsql security definer set search_path = public as $$
begin
  if not public.instructor_sees_session(p_session_id) then
    raise exception 'Geen toegang tot deze les';
  end if;

  return query
  select
    s.id,
    s.first_name,
    s.last_name,
    a.status,
    exists (
      select 1 from public.safety_profiles sp
      where sp.student_id = s.id
        and (sp.medical_notes is not null or sp.allergies is not null
             or sp.water_anxiety is not null)
    )
  from public.lesson_sessions ls
  join public.enrollments e
    on e.class_series_id = ls.class_series_id and e.status in ('active', 'trial')
  join public.students s on s.id = e.student_id
  left join public.attendance a on a.lesson_session_id = ls.id and a.student_id = s.id
  where ls.id = p_session_id
  order by s.first_name;
end;
$$;

revoke all on function public.get_lesson_roster(uuid) from public;
grant execute on function public.get_lesson_roster(uuid) to authenticated;
