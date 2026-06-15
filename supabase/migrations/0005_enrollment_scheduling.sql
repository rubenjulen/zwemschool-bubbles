-- =============================================================================
-- Iteratie 2 - inschrijving, plaatsing en rooster (FR-3, FR-4).
-- =============================================================================

-- Beschikbaarheid per lesgroep (FR-3.2/FR-4.3). De view telt ALLE actieve/
-- proefinschrijvingen; security_invoker=false zodat de telling niet door de
-- enrollment-RLS van een ouder wordt beperkt (ouder zou anders alleen eigen
-- inschrijvingen tellen). De view bevat geen persoonsgegevens, alleen aantallen.
create view public.class_availability with (security_invoker = false) as
select
  cs.id as class_series_id,
  cs.name,
  cs.level_id,
  lv.name as level_name,
  cs.location_id,
  loc.name as location_name,
  cs.weekday,
  cs.start_time,
  cs.end_time,
  cs.capacity,
  count(e.id) filter (where e.status in ('active', 'trial'))::int as booked,
  greatest(cs.capacity - count(e.id) filter (where e.status in ('active', 'trial')), 0)::int
    as spots_left
from public.class_series cs
left join public.levels lv on lv.id = cs.level_id
left join public.locations loc on loc.id = cs.location_id
left join public.enrollments e on e.class_series_id = cs.id
where cs.is_active
group by cs.id, lv.name, loc.name;

grant select on public.class_availability to authenticated;

-- Ouder vraagt een (proef)plaatsing aan voor het eigen kind (FR-3.1). Definitieve
-- plaatsing bevestigt beheer later (FR-3.3) door de status naar 'active' te zetten.
-- SECURITY DEFINER om de capaciteit over alle inschrijvingen te kunnen tellen.
create or replace function public.request_enrollment(
  p_student_id uuid,
  p_class_series_id uuid
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_capacity int;
  v_booked int;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;
  if not public.student_in_my_family(p_student_id) then
    raise exception 'Geen toegang tot deze leerling';
  end if;

  select capacity into v_capacity
  from public.class_series where id = p_class_series_id and is_active;
  if v_capacity is null then
    raise exception 'Lesgroep niet gevonden';
  end if;

  select count(*) into v_booked
  from public.enrollments
  where class_series_id = p_class_series_id and status in ('active', 'trial');

  if v_booked >= v_capacity then
    raise exception 'Lesgroep is vol';
  end if;

  insert into public.enrollments (student_id, class_series_id, status, start_date)
  values (p_student_id, p_class_series_id, 'trial', current_date)
  on conflict (student_id, class_series_id) do nothing
  returning id into v_id;

  if v_id is null then
    raise exception 'Al ingeschreven voor deze lesgroep';
  end if;
  return v_id;
end;
$$;

revoke all on function public.request_enrollment(uuid, uuid) from public;
grant execute on function public.request_enrollment(uuid, uuid) to authenticated;

-- Ouder kan het eigen kind op de wachtlijst zetten (FR-3.1/3.5).
create policy waitlist_family_insert on public.waitlist_entries for insert to authenticated
  with check (public.student_in_my_family(student_id));
