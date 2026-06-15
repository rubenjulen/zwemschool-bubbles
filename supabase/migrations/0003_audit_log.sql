-- =============================================================================
-- Append-only auditlog (SEC-4, Prompt 9). Logt gevoelige acties: financiele
-- mutaties, rolwijzigingen, verwijderingen, consentwijzigingen, safety-profile
-- updates en incidenten. De triggerfunctie is SECURITY DEFINER zodat hij in
-- audit_logs mag schrijven ondanks force RLS (clients kunnen dat nooit).
-- Exports worden op applicatieniveau gelogd (geen DB-trigger mogelijk).
-- =============================================================================

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_entity_id uuid;
  v_changed text[];
begin
  if (tg_op = 'DELETE') then
    v_entity_id := old.id;
  else
    v_entity_id := new.id;
  end if;

  if (tg_op = 'UPDATE') then
    select array_agg(key)
      into v_changed
    from jsonb_each(to_jsonb(new))
    where to_jsonb(new) -> key is distinct from to_jsonb(old) -> key;
  end if;

  insert into public.audit_logs
    (actor_user_id, actor_role, action, entity_table, entity_id, changed_columns)
  values
    (auth.uid(), public.jwt_role(), lower(tg_op), tg_table_name, v_entity_id, v_changed);

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  -- Tabellen waarvan elke mutatie wordt geaudit.
  foreach t in array array[
    'invoices','payments','consent_records','safety_profiles',
    'incident_reports','staff_profiles','certificates'
  ]
  loop
    execute format(
      'create trigger trg_audit_%s
         after insert or update or delete on public.%I
         for each row execute function public.audit_trigger();', t, t);
  end loop;
end $$;
