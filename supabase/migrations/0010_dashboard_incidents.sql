-- =============================================================================
-- Iteratie 4 blok 1+2 - beheer-dashboard (FR-12.1) + incidenten (FR-11).
-- Lezen/bijwerken van incidenten loopt via RLS (incidents_staff). Aanmaken via
-- een RPC zodat reported_by automatisch op de juiste staff wordt gezet.
-- =============================================================================

-- KPI's voor het beheer-dashboard. Alleen staff.
create or replace function public.get_admin_dashboard()
returns table (
  active_students int,
  lessons_this_week int,
  occupancy_pct int,
  waitlist int,
  outstanding_cents bigint,
  open_incidents int,
  trial_requests int
) language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'America/Paramaribo')::date;
  v_week_start date := date_trunc('week', v_today)::date;
  v_week_end date := v_week_start + 6;
  v_booked int;
  v_capacity int;
begin
  if not public.is_staff() then
    raise exception 'Geen toegang';
  end if;

  select count(*)::int into v_booked
  from public.enrollments e
  join public.class_series cs on cs.id = e.class_series_id and cs.is_active
  where e.status in ('active', 'trial');

  select coalesce(sum(cs.capacity), 0)::int into v_capacity
  from public.class_series cs where cs.is_active;

  return query select
    (select count(distinct e.student_id)::int from public.enrollments e where e.status = 'active'),
    (select count(*)::int from public.lesson_sessions ls
       where ls.session_date between v_week_start and v_week_end and not ls.is_cancelled),
    (case when v_capacity > 0 then round(v_booked::numeric / v_capacity * 100)::int else 0 end),
    (select count(*)::int from public.waitlist_entries w where w.status = 'waiting'),
    (select coalesce(sum(i.amount_cents), 0)::bigint from public.invoices i
       where i.status in ('open', 'overdue')),
    (select count(*)::int from public.incident_reports ir where ir.status <> 'done'),
    (select count(*)::int from public.enrollments e where e.status = 'trial');
end;
$$;

revoke all on function public.get_admin_dashboard() from public;
grant execute on function public.get_admin_dashboard() to authenticated;

-- Incident melden (FR-11.1). reported_by = huidige staff. Alleen staff.
create or replace function public.report_incident(
  p_category text,
  p_severity text,
  p_description text,
  p_student_id uuid default null,
  p_lesson_session_id uuid default null,
  p_action_taken text default null,
  p_parent_informed boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Geen toegang';
  end if;
  if coalesce(trim(p_description), '') = '' then
    raise exception 'Beschrijving is verplicht';
  end if;

  insert into public.incident_reports
    (category, severity, description, student_id, lesson_session_id,
     action_taken, parent_informed, reported_by, status)
  values
    (p_category, p_severity, p_description, p_student_id, p_lesson_session_id,
     p_action_taken, p_parent_informed, public.current_staff_id(), 'open')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.report_incident(text, text, text, uuid, uuid, text, boolean) from public;
grant execute on function public.report_incident(text, text, text, uuid, uuid, text, boolean) to authenticated;
