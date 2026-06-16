-- =============================================================================
-- Iteratie 4 blok 4a - gerichte aankondigingen (FR-8.4). Geeft de ontvangers
-- (guardians met e-mail) voor "alle ouders" of per niveau, met opt-out-respect:
-- standaard opt-in voor aankondigingen, tenzij expliciet uitgezet. Alleen staff.
-- Het versturen + loggen gebeurt server-side in de app (Resend).
-- =============================================================================
create or replace function public.get_announcement_recipients(p_level_id uuid default null)
returns table (guardian_id uuid, email text) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Geen toegang';
  end if;

  return query
  select distinct g.id, g.email
  from public.guardians g
  where g.email is not null and g.deleted_at is null
    and (
      p_level_id is null
      or g.family_id in (
        select s.family_id
        from public.students s
        join public.enrollments e on e.student_id = s.id and e.status in ('active', 'trial')
        join public.class_series cs on cs.id = e.class_series_id
        where cs.level_id = p_level_id
      )
    )
    and not exists (
      select 1 from public.notification_preferences np
      where np.guardian_id = g.id
        and np.channel = 'email'
        and np.category = 'announcements'
        and np.opted_in = false
    );
end;
$$;

revoke all on function public.get_announcement_recipients(uuid) from public;
grant execute on function public.get_announcement_recipients(uuid) to authenticated;
