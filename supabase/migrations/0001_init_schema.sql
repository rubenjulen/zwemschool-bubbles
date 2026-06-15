-- =============================================================================
-- Zwemschool Bubbles - initieel schema (Datamodel v1.0, §9 requirements).
-- UUID PK's, created_at/updated_at, soft-delete waar retentie speelt,
-- foreign keys, indexes en constraints. Multi-locatie-ready (location_id),
-- niet multi-tenant-complex (Datamodelbesluit §9).
-- RLS wordt aangezet in 0002_rls_policies.sql (RLS-first werkregel).
-- =============================================================================

create extension if not exists "pgcrypto";

-- Rolmodel (§4). Wordt gespiegeld in JWT app_metadata.
create type public.user_role as enum (
  'guardian', 'instructor', 'lead_instructor', 'admin', 'finance_admin', 'system_admin'
);

create type public.attendance_status as enum ('present', 'absent', 'late', 'no_show');
create type public.enrollment_status as enum ('trial', 'active', 'paused', 'ended', 'waitlisted');
create type public.invoice_status as enum ('draft', 'open', 'paid', 'overdue', 'credited', 'cancelled');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.credit_status as enum ('available', 'reserved', 'used', 'expired');
create type public.task_status as enum ('open', 'in_progress', 'done', 'cancelled');
create type public.message_channel as enum ('email', 'whatsapp', 'push');

-- Gedeelde trigger voor updated_at.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Stamgegevens: locaties, niveaus, skills
-- -----------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision,   -- voor weer-integratie (openluchtbad)
  longitude double precision,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lanes_or_areas (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- bv. Zeepaardje, A, B, C
  sort_order int not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_exam_requirement boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Gezin, verzorgers, leerlingen, safety
-- -----------------------------------------------------------------------------
create table public.family_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_address text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_accounts(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone_e164 text,
  -- rechten binnen het gezin (FR-1.2): hoofdouder, mede-ouder, betaler, alleen-lezen
  family_role text not null default 'primary',
  is_payer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.guardians (family_id);
create index on public.guardians (user_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_accounts(id) on delete cascade,
  first_name text not null,
  last_name text,
  date_of_birth date,
  current_level_id uuid references public.levels(id),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index on public.students (family_id);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_accounts(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  name text not null,
  phone_e164 text not null,
  relationship text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.emergency_contacts (family_id);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_accounts(id) on delete cascade,
  guardian_id uuid references public.guardians(id) on delete set null,
  consent_type text not null,         -- terms, privacy, photo_video, whatsapp, email, push
  version text not null,
  granted boolean not null,
  channel text,
  recorded_at timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index on public.consent_records (family_id, consent_type);

-- Bijzondere/medische gegevens, extra afgeschermd (PR-4, FR-2.6).
create table public.safety_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  medical_notes text,                 -- gevoelig
  allergies text,
  water_anxiety text,
  general_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Staff
-- -----------------------------------------------------------------------------
create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  role public.user_role not null default 'instructor',
  email text,
  phone_e164 text,
  availability jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.staff_profiles (user_id);

create table public.staff_certifications (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_profiles(id) on delete cascade,
  name text not null,                 -- bv. EHBO, reddend zwemmen
  issued_at date,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.staff_certifications (staff_id);

-- -----------------------------------------------------------------------------
-- Rooster
-- -----------------------------------------------------------------------------
create table public.class_series (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id),
  lane_or_area_id uuid references public.lanes_or_areas(id),
  level_id uuid references public.levels(id),
  instructor_id uuid references public.staff_profiles(id),
  name text not null,
  capacity int not null default 8,
  weekday int,                        -- 0-6 voor terugkerende series
  start_time time,
  end_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.class_series (instructor_id);
create index on public.class_series (location_id);

create table public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  class_series_id uuid not null references public.class_series(id) on delete cascade,
  session_date date not null,
  start_time time,
  end_time time,
  -- overschrijvende instructeur/locatie bij vervanging/uitzondering
  instructor_id uuid references public.staff_profiles(id),
  is_cancelled boolean not null default false,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index on public.lesson_sessions (class_series_id, session_date);
create index on public.lesson_sessions (session_date);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_series_id uuid not null references public.class_series(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index on public.enrollments (student_id, class_series_id);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  level_id uuid references public.levels(id),
  priority int not null default 0,
  preferences jsonb,
  status text not null default 'waiting',
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.waitlist_entries (level_id, priority);

-- -----------------------------------------------------------------------------
-- Aanwezigheid, make-up credits, voortgang, certificaten
-- -----------------------------------------------------------------------------
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  lesson_session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status public.attendance_status not null,
  -- idempotente sleutel van de offline mutatie (FR-13.4)
  client_mutation_id uuid unique,
  recorded_by uuid references public.staff_profiles(id),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index on public.attendance (lesson_session_id, student_id);

create table public.makeup_credits (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  source_lesson_session_id uuid references public.lesson_sessions(id),
  status public.credit_status not null default 'available',
  expires_at date,
  used_lesson_session_id uuid references public.lesson_sessions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.makeup_credits (student_id, status);

create table public.progress_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  achieved boolean not null default false,
  note text,                          -- kan intern of oudergericht zijn
  is_parent_visible boolean not null default false,
  client_mutation_id uuid unique,     -- idempotentie offline (FR-13.4)
  recorded_by uuid references public.staff_profiles(id),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index on public.progress_records (student_id, skill_id);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  level_id uuid not null references public.levels(id),
  certificate_number text not null unique,
  verification_code text unique,
  approved_by uuid references public.staff_profiles(id),
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Financieel
-- -----------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.family_accounts(id) on delete restrict,
  invoice_number text not null unique,
  period text,
  currency text not null default 'SRD',
  amount_cents int not null default 0,
  status public.invoice_status not null default 'draft',
  due_date date,
  lines jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.invoices (family_id, status);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount_cents int not null,
  currency text not null default 'SRD',
  method text not null,               -- bank, cash, payment_link
  -- GEEN kaartdata (FR-9.5/SEC-9): enkel een providerreferentie.
  provider_reference text,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  recorded_by uuid references public.staff_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.payments (invoice_id);

-- Idempotente verwerking van betaalprovider-events (FR-14.2/SEC-9).
create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

-- -----------------------------------------------------------------------------
-- Communicatie
-- -----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel public.message_channel not null,
  template text not null,
  template_version text,
  recipient_guardian_id uuid references public.guardians(id) on delete set null,
  subject text,
  status text not null default 'queued',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.messages (recipient_guardian_id);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  channel public.message_channel not null,
  category text not null,             -- reminders, billing, announcements...
  opted_in boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (guardian_id, channel, category)
);

-- -----------------------------------------------------------------------------
-- Incidenten, taken, audit, instellingen
-- -----------------------------------------------------------------------------
create table public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  lesson_session_id uuid references public.lesson_sessions(id),
  student_id uuid references public.students(id),
  location_id uuid references public.locations(id),
  category text not null,             -- ehbo, gedrag, safety, bijna-incident
  severity text,
  description text not null,
  action_taken text,
  parent_informed boolean not null default false,
  follow_up text,
  responsible_staff_id uuid references public.staff_profiles(id),
  status text not null default 'open',
  reported_by uuid references public.staff_profiles(id),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.incident_reports (status);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  type text not null,                 -- enrollment_review, payment_follow_up, ...
  title text not null,
  description text,
  related_table text,
  related_id uuid,
  status public.task_status not null default 'open',
  assigned_to uuid references public.staff_profiles(id),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks (status, type);

-- Append-only auditlog (SEC-4). Wijzigingen/inserts via triggers in 0003.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_role public.user_role,
  action text not null,               -- insert/update/delete
  entity_table text not null,
  entity_id uuid,
  changed_columns text[],
  occurred_at timestamptz not null default now()
);
create index on public.audit_logs (entity_table, entity_id);
create index on public.audit_logs (occurred_at);

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'locations','lanes_or_areas','levels','skills','family_accounts','guardians',
    'students','emergency_contacts','safety_profiles','staff_profiles','staff_certifications',
    'class_series','lesson_sessions','enrollments','waitlist_entries','attendance',
    'makeup_credits','progress_records','invoices','payments','incident_reports','tasks'
  ]
  loop
    execute format(
      'create trigger trg_%s_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;
