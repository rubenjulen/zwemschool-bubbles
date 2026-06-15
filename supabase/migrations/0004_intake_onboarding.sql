-- =============================================================================
-- Iteratie 1 - gezinsaccount onboarding + intake (FR-1, FR-2).
-- family_accounts/guardians mogen niet vrij door ouders worden geïnsert
-- (alleen admin in 0002). Self-onboarding loopt daarom via een gecontroleerde
-- SECURITY DEFINER-RPC die de ouder aan precies één gezin koppelt. Daarnaast
-- mogen ouders hun eigen kinderen toevoegen/bewerken (FR-1.1, FR-1.3).
-- =============================================================================

-- Koppelt de huidige auth-gebruiker als hoofdouder aan een nieuw gezin.
-- Idempotent: bestaat er al een koppeling, dan wordt die familie teruggegeven.
create or replace function public.onboard_family(
  p_family_name text,
  p_full_name text,
  p_phone text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_family uuid;
  v_existing uuid;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;

  select family_id into v_existing
  from public.guardians
  where user_id = auth.uid() and deleted_at is null
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.family_accounts (name)
  values (coalesce(nullif(trim(p_family_name), ''), p_full_name))
  returning id into v_family;

  insert into public.guardians
    (family_id, user_id, full_name, phone_e164, family_role, is_payer, email)
  values
    (v_family, auth.uid(), p_full_name, p_phone, 'primary', true, auth.jwt() ->> 'email');

  return v_family;
end;
$$;

revoke all on function public.onboard_family(text, text, text) from public;
grant execute on function public.onboard_family(text, text, text) to authenticated;

-- Ouders beheren de leerlingen binnen hun eigen gezin (naast bestaande
-- select-policy students_family en admin-policy students_admin uit 0002).
create policy students_family_insert on public.students for insert to authenticated
  with check (family_id in (select public.current_family_ids()));

create policy students_family_update on public.students for update to authenticated
  using (family_id in (select public.current_family_ids()))
  with check (family_id in (select public.current_family_ids()));
