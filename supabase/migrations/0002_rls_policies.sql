-- =============================================================================
-- Row Level Security (SEC-2, Prompt 8). Deny-by-default: zodra RLS aanstaat en
-- er geen policy matcht, ziet/krijgt niemand iets. Anonieme gebruikers hebben
-- nergens toegang. Rol komt uit JWT app_metadata; gezins-/lescontext uit
-- security-definer helpers (voorkomt recursieve RLS).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.jwt_role()
returns public.user_role language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::public.user_role;
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.jwt_role() in ('admin', 'system_admin');
$$;

create or replace function public.is_staff()
returns boolean language sql stable as $$
  select public.jwt_role() in
    ('instructor','lead_instructor','admin','finance_admin','system_admin');
$$;

create or replace function public.is_finance()
returns boolean language sql stable as $$
  select public.jwt_role() in ('finance_admin','admin','system_admin');
$$;

create or replace function public.is_instructor()
returns boolean language sql stable as $$
  select public.jwt_role() in ('instructor','lead_instructor');
$$;

-- security definer: leest staff/guardian-koppeling zonder RLS-recursie.
create or replace function public.current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.staff_profiles where user_id = auth.uid();
$$;

create or replace function public.current_family_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select family_id from public.guardians where user_id = auth.uid() and deleted_at is null;
$$;

-- Mag de huidige instructeur deze sessie zien? (eigen serie of vervanging)
create or replace function public.instructor_sees_session(p_session_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.lesson_sessions ls
    join public.class_series cs on cs.id = ls.class_series_id
    where ls.id = p_session_id
      and (cs.instructor_id = public.current_staff_id()
           or ls.instructor_id = public.current_staff_id())
  ) or public.jwt_role() in ('lead_instructor','admin','system_admin');
$$;

create or replace function public.student_in_my_family(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students s
    where s.id = p_student_id and s.family_id in (select public.current_family_ids())
  );
$$;

-- -----------------------------------------------------------------------------
-- RLS aanzetten op ALLE tabellen (geen tabel zonder beleid).
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'locations','lanes_or_areas','levels','skills','family_accounts','guardians',
    'students','emergency_contacts','consent_records','safety_profiles','staff_profiles',
    'staff_certifications','class_series','lesson_sessions','enrollments','waitlist_entries',
    'attendance','makeup_credits','progress_records','certificates','invoices','payments',
    'payment_webhook_events','messages','notification_preferences','incident_reports',
    'tasks','audit_logs','system_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Stamgegevens: leesbaar voor alle ingelogde gebruikers; schrijven = admin.
-- -----------------------------------------------------------------------------
create policy read_levels on public.levels for select to authenticated using (true);
create policy admin_levels on public.levels for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy read_skills on public.skills for select to authenticated using (true);
create policy admin_skills on public.skills for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy read_locations on public.locations for select to authenticated using (true);
create policy admin_locations on public.locations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy read_lanes on public.lanes_or_areas for select to authenticated using (true);
create policy admin_lanes on public.lanes_or_areas for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Gezin: ouder ziet/bewerkt eigen gezin; staff (admin) ziet alles.
-- -----------------------------------------------------------------------------
create policy family_self on public.family_accounts for select to authenticated
  using (id in (select public.current_family_ids()) or public.is_staff());
create policy family_admin on public.family_accounts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy guardians_self on public.guardians for select to authenticated
  using (family_id in (select public.current_family_ids()) or public.is_staff());
create policy guardians_update_self on public.guardians for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy guardians_admin on public.guardians for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy students_family on public.students for select to authenticated
  using (family_id in (select public.current_family_ids()) or public.is_staff());
create policy students_admin on public.students for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy emergency_family on public.emergency_contacts for all to authenticated
  using (family_id in (select public.current_family_ids()) or public.is_staff())
  with check (family_id in (select public.current_family_ids()) or public.is_admin());

create policy consent_family on public.consent_records for select to authenticated
  using (family_id in (select public.current_family_ids()) or public.is_staff());
create policy consent_insert_family on public.consent_records for insert to authenticated
  with check (family_id in (select public.current_family_ids()) or public.is_admin());
create policy consent_admin on public.consent_records for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Bijzondere gegevens: ouder (eigen kind) + lesgevende staff; NIET finance.
-- (PR-4, FR-2.5/2.6 - extra beperkt, geen brede staff-toegang.)
create policy safety_family on public.safety_profiles for all to authenticated
  using (public.student_in_my_family(student_id))
  with check (public.student_in_my_family(student_id));
create policy safety_instructor_read on public.safety_profiles for select to authenticated
  using (
    public.is_instructor() and exists (
      select 1 from public.enrollments e
      join public.lesson_sessions ls on ls.class_series_id = e.class_series_id
      where e.student_id = safety_profiles.student_id
        and public.instructor_sees_session(ls.id)
    )
  );
create policy safety_admin on public.safety_profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Staff
-- -----------------------------------------------------------------------------
create policy staff_self on public.staff_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy staff_admin on public.staff_profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy staffcert_read on public.staff_certifications for select to authenticated
  using (staff_id = public.current_staff_id() or public.is_admin());
create policy staffcert_admin on public.staff_certifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Rooster: ouders lezen (gefilterd via app); staff beheert.
-- -----------------------------------------------------------------------------
create policy series_read on public.class_series for select to authenticated using (true);
create policy series_admin on public.class_series for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy sessions_read on public.lesson_sessions for select to authenticated using (true);
create policy sessions_admin on public.lesson_sessions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy enroll_family on public.enrollments for select to authenticated
  using (public.student_in_my_family(student_id) or public.is_staff());
create policy enroll_admin on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy waitlist_family on public.waitlist_entries for select to authenticated
  using (public.student_in_my_family(student_id) or public.is_staff());
create policy waitlist_admin on public.waitlist_entries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Aanwezigheid & voortgang: instructeur schrijft voor eigen lessen; ouder leest.
-- -----------------------------------------------------------------------------
create policy attendance_family_read on public.attendance for select to authenticated
  using (public.student_in_my_family(student_id) or public.is_staff());
create policy attendance_instructor_write on public.attendance for all to authenticated
  using (public.instructor_sees_session(lesson_session_id))
  with check (public.instructor_sees_session(lesson_session_id));

create policy progress_family_read on public.progress_records for select to authenticated
  using ((public.student_in_my_family(student_id) and is_parent_visible) or public.is_staff());
create policy progress_instructor_write on public.progress_records for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy makeup_family on public.makeup_credits for select to authenticated
  using (public.student_in_my_family(student_id) or public.is_staff());
create policy makeup_admin on public.makeup_credits for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy cert_family_read on public.certificates for select to authenticated
  using (public.student_in_my_family(student_id) or public.is_staff());
create policy cert_admin on public.certificates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Financieel: ouder leest eigen facturen/betalingen; finance beheert.
-- Geen medische data voor finance (die staat in safety_profiles, niet hier).
-- -----------------------------------------------------------------------------
create policy invoice_family_read on public.invoices for select to authenticated
  using (family_id in (select public.current_family_ids()) or public.is_finance());
create policy invoice_finance on public.invoices for all to authenticated
  using (public.is_finance()) with check (public.is_finance());

create policy payment_family_read on public.payments for select to authenticated
  using (
    public.is_finance() or exists (
      select 1 from public.invoices i
      where i.id = payments.invoice_id
        and i.family_id in (select public.current_family_ids())
    )
  );
create policy payment_finance on public.payments for all to authenticated
  using (public.is_finance()) with check (public.is_finance());

-- Webhook-events: alleen server (service role bypasst RLS). Geen client-toegang.
create policy webhook_admin_read on public.payment_webhook_events for select to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Communicatie
-- -----------------------------------------------------------------------------
create policy messages_recipient_read on public.messages for select to authenticated
  using (
    public.is_staff() or recipient_guardian_id in (
      select id from public.guardians where user_id = auth.uid()
    )
  );
create policy messages_admin on public.messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy notifprefs_self on public.notification_preferences for all to authenticated
  using (guardian_id in (select id from public.guardians where user_id = auth.uid()) or public.is_staff())
  with check (guardian_id in (select id from public.guardians where user_id = auth.uid()) or public.is_admin());

-- -----------------------------------------------------------------------------
-- Incidenten, taken: staff-only.
-- -----------------------------------------------------------------------------
create policy incidents_staff on public.incident_reports for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy tasks_staff on public.tasks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Auditlog: alleen lezen voor admin; nooit muteren via client (append-only via
-- triggers met service-context). Geen insert/update/delete-policy = geweigerd.
-- -----------------------------------------------------------------------------
create policy audit_admin_read on public.audit_logs for select to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Instellingen: iedereen leest publieke config; alleen admin schrijft.
-- -----------------------------------------------------------------------------
create policy settings_read on public.system_settings for select to authenticated using (true);
create policy settings_admin on public.system_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
