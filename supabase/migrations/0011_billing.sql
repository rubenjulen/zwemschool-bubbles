-- =============================================================================
-- Iteratie 4 blok 3 - facturatie & betalingen (FR-9). Geen kaartdata (FR-9.5):
-- betalingen worden handmatig geregistreerd met methode + bedrag.
-- =============================================================================

create sequence if not exists public.invoice_number_seq;

-- Factuur aanmaken (finance). lines = jsonb-array van {description, amount_cents}.
create or replace function public.create_invoice(
  p_family_id uuid,
  p_period text,
  p_lines jsonb,
  p_due_date date
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_amount int;
  v_number text;
begin
  if not public.is_finance() then
    raise exception 'Geen toegang';
  end if;

  select coalesce(sum((l ->> 'amount_cents')::int), 0)
    into v_amount
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) l;

  if v_amount <= 0 then
    raise exception 'Factuurbedrag moet groter dan 0 zijn';
  end if;

  v_number := 'INV-' || to_char(now(), 'YYYY') || '-'
              || lpad(nextval('public.invoice_number_seq')::text, 5, '0');

  insert into public.invoices
    (family_id, invoice_number, period, currency, amount_cents, status, due_date, lines)
  values
    (p_family_id, v_number, p_period, 'SRD', v_amount, 'open', p_due_date, coalesce(p_lines, '[]'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function public.create_invoice(uuid, text, jsonb, date) from public;
grant execute on function public.create_invoice(uuid, text, jsonb, date) to authenticated;

-- Betaling registreren (finance). Zet de factuur op 'paid' zodra volledig betaald.
create or replace function public.register_payment(
  p_invoice_id uuid,
  p_amount_cents int,
  p_method text
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_invoice int;
  v_paid int;
begin
  if not public.is_finance() then
    raise exception 'Geen toegang';
  end if;
  if p_amount_cents <= 0 then
    raise exception 'Bedrag moet groter dan 0 zijn';
  end if;

  insert into public.payments
    (invoice_id, amount_cents, currency, method, status, paid_at, recorded_by)
  values
    (p_invoice_id, p_amount_cents, 'SRD', p_method, 'succeeded', now(), public.current_staff_id());

  select amount_cents into v_invoice from public.invoices where id = p_invoice_id;
  select coalesce(sum(amount_cents), 0) into v_paid
    from public.payments where invoice_id = p_invoice_id and status = 'succeeded';

  if v_paid >= v_invoice then
    update public.invoices set status = 'paid' where id = p_invoice_id;
  end if;
end;
$$;
revoke all on function public.register_payment(uuid, int, text) from public;
grant execute on function public.register_payment(uuid, int, text) to authenticated;

-- Facturen van het eigen gezin (ouder), met betaald bedrag.
create or replace function public.get_family_billing()
returns table (
  id uuid, invoice_number text, period text, amount_cents int,
  status public.invoice_status, due_date date, lines jsonb, paid_cents bigint
) language plpgsql security definer set search_path = public as $$
begin
  return query
  select i.id, i.invoice_number, i.period, i.amount_cents, i.status, i.due_date, i.lines,
    coalesce((select sum(p.amount_cents) from public.payments p
              where p.invoice_id = i.id and p.status = 'succeeded'), 0)::bigint
  from public.invoices i
  where i.family_id in (select public.current_family_ids())
  order by i.created_at desc;
end;
$$;
revoke all on function public.get_family_billing() from public;
grant execute on function public.get_family_billing() to authenticated;

-- Facturatieoverzicht voor finance/beheer.
create or replace function public.get_billing_overview()
returns table (
  id uuid, invoice_number text, family_name text, amount_cents int,
  paid_cents bigint, status public.invoice_status, due_date date
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_finance() then
    raise exception 'Geen toegang';
  end if;
  return query
  select i.id, i.invoice_number, fa.name, i.amount_cents,
    coalesce((select sum(p.amount_cents) from public.payments p
              where p.invoice_id = i.id and p.status = 'succeeded'), 0)::bigint,
    i.status, i.due_date
  from public.invoices i
  join public.family_accounts fa on fa.id = i.family_id
  order by i.created_at desc;
end;
$$;
revoke all on function public.get_billing_overview() from public;
grant execute on function public.get_billing_overview() to authenticated;
