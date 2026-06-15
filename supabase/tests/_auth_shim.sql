-- =============================================================================
-- CI-only auth-shim. Een kale Postgres mist het Supabase `auth`-schema, de
-- helpers auth.uid()/auth.jwt() en de rollen anon/authenticated. Deze shim
-- bootst dat na zodat de migraties + RLS-tests in CI kunnen draaien ZONDER de
-- volledige Supabase-stack. NOOIT toepassen op een echt Supabase-project -
-- daar levert het platform dit.
-- =============================================================================

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

-- auth.uid(): leest 'sub' uit de gesimuleerde JWT-claims (request.jwt.claims).
create or replace function auth.uid()
returns uuid language sql stable as $$
  select case
    when coalesce(current_setting('request.jwt.claims', true), '') = '' then null
    else (current_setting('request.jwt.claims', true)::json ->> 'sub')::uuid
  end;
$$;

-- auth.jwt(): geeft de volledige claims terug (of leeg object).
create or replace function auth.jwt()
returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

-- Net als in Supabase: tabellen/functies die hierna worden aangemaakt krijgen
-- rechten voor de applicatierollen.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, anon;
alter default privileges in schema public
  grant execute on functions to authenticated;
