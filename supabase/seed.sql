-- =============================================================================
-- Seed-/testdata voor lokale ontwikkeling. Curriculum is PLACEHOLDER tot
-- besluit D-1 (Zeepaardje + Zwem-ABC of eigen Surinaams model). Alles is
-- configureerbaar via beheer; hier alleen een werkbare startset.
-- =============================================================================

-- Locatie met coordinaten van Paramaribo voor de weer-integratie.
insert into public.locations (id, name, address, latitude, longitude) values
  ('00000000-0000-0000-0000-000000000001', 'Hoofdbad Paramaribo', 'Paramaribo, Suriname', 5.852, -55.2038)
on conflict (id) do nothing;

insert into public.lanes_or_areas (location_id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Ondiep bad'),
  ('00000000-0000-0000-0000-000000000001', 'Diep bad')
on conflict do nothing;

-- Niveaus (placeholder).
insert into public.levels (id, name, sort_order, description) values
  ('10000000-0000-0000-0000-000000000001', 'Zeepaardje', 1, 'Watervrij maken en basis'),
  ('10000000-0000-0000-0000-000000000002', 'Zwem-A', 2, 'Richting diploma A'),
  ('10000000-0000-0000-0000-000000000003', 'Zwem-B', 3, 'Richting diploma B'),
  ('10000000-0000-0000-0000-000000000004', 'Zwem-C', 4, 'Richting diploma C')
on conflict (id) do nothing;

-- Enkele skills binnen Zeepaardje (placeholder skill tree).
insert into public.skills (level_id, name, sort_order, is_exam_requirement) values
  ('10000000-0000-0000-0000-000000000001', 'Watertrappelen 5 sec', 1, false),
  ('10000000-0000-0000-0000-000000000001', 'Drijven op de rug', 2, true),
  ('10000000-0000-0000-0000-000000000001', 'Onder water uitademen', 3, true),
  ('10000000-0000-0000-0000-000000000001', 'Te water gaan via trap', 4, false)
on conflict do nothing;

-- Configureerbare regels en instellingen.
insert into public.system_settings (key, value, description) values
  ('currency', '"SRD"', 'Valuta voor facturatie (NFR-9)'),
  ('timezone', '"America/Paramaribo"', 'Tijdzone voor datum/tijd'),
  ('makeup_rules', '{"window_days": 30, "auto_grant": true, "valid_days": 60}',
    'Make-up credit regels (placeholder, besluit D-4)'),
  ('cancellation_rules', '{"min_hours_before": 24}',
    'Afmeldregels (placeholder, besluit D-4)')
on conflict (key) do nothing;
