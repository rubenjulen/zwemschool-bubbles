-- =============================================================================
-- Productie-startdata voor Zwemschool Bubbles.
-- Draai dit EENMALIG in de Supabase SQL Editor (cloud). Idempotent dankzij
-- vaste id's + ON CONFLICT, dus per ongeluk nogmaals draaien is veilig.
-- Pas locatie/curriculum/lesgroepen daarna gewoon aan via beheer of door dit
-- bestand te wijzigen en opnieuw te draaien.
-- =============================================================================

-- Locatie (coördinaten van Paramaribo voor de weer-integratie).
insert into public.locations (id, name, address, latitude, longitude) values
  ('00000000-0000-0000-0000-000000000001', 'Hoofdbad Paramaribo', 'Paramaribo, Suriname', 5.852, -55.2038)
on conflict (id) do nothing;

insert into public.lanes_or_areas (id, location_id, name) values
  ('1a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Ondiep bad'),
  ('1a000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Diep bad')
on conflict (id) do nothing;

-- Niveaus.
insert into public.levels (id, name, sort_order, description) values
  ('10000000-0000-0000-0000-000000000001', 'Zeepaardje', 1, 'Watervrij maken en basis'),
  ('10000000-0000-0000-0000-000000000002', 'Zwem-A', 2, 'Richting diploma A'),
  ('10000000-0000-0000-0000-000000000003', 'Zwem-B', 3, 'Richting diploma B'),
  ('10000000-0000-0000-0000-000000000004', 'Zwem-C', 4, 'Richting diploma C')
on conflict (id) do nothing;

-- Skills per niveau (startset; vrij uit te breiden via beheer later).
insert into public.skills (id, level_id, name, sort_order, is_exam_requirement) values
  ('5c000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Watervrij / kopje onder', 1, false),
  ('5c000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Drijven op de buik', 2, true),
  ('5c000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Drijven op de rug', 3, true),
  ('5c000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Onder water uitademen', 4, true),
  ('5c000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', 'Schoolslag benen', 1, true),
  ('5c000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', 'Rugslag basis', 2, true),
  ('5c000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', '15 meter zwemmen', 3, true),
  ('5c000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000003', 'Schoolslag volledig', 1, true),
  ('5c000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000003', 'Borstcrawl basis', 2, true),
  ('5c000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000004', 'Survival / gekleed zwemmen', 1, true)
on conflict (id) do nothing;

-- Twee voorbeeld-lesgroepen, zodat het rooster en /lessen meteen gevuld zijn.
insert into public.class_series
  (id, location_id, lane_or_area_id, level_id, name, capacity, weekday, start_time, end_time) values
  ('c5000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   '1a000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Zeepaardje - woensdag 16:00', 8, 3, '16:00', '16:45'),
  ('c5000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   '1a000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
   'Zwem-A - woensdag 17:00', 8, 3, '17:00', '17:45')
on conflict (id) do nothing;

-- Basisinstellingen (valuta, tijdzone, regels - aanpasbaar).
insert into public.system_settings (key, value, description) values
  ('currency', '"SRD"', 'Valuta voor facturatie'),
  ('timezone', '"America/Paramaribo"', 'Tijdzone voor datum/tijd'),
  ('makeup_rules', '{"window_days": 30, "auto_grant": true, "valid_days": 60}',
    'Make-up credit regels (aanpasbaar)'),
  ('cancellation_rules', '{"min_hours_before": 24}', 'Afmeldregels (aanpasbaar)')
on conflict (key) do nothing;
