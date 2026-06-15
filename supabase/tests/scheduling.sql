-- =============================================================================
-- DB-tests voor de roosterconflict-trigger (0007). Draait in CI na de
-- migraties. Alles in één transactie met ROLLBACK.
-- =============================================================================
begin;

insert into public.locations (id, name) values
  ('10c00000-0000-0000-0000-000000000001', 'Testbad');
insert into public.lanes_or_areas (id, location_id, name) values
  ('1a000000-0000-0000-0000-000000000001', '10c00000-0000-0000-0000-000000000001', 'Baan 1');

-- Bestaande lesgroep: woensdag 16:00-17:00 op baan 1.
insert into public.class_series
  (id, location_id, lane_or_area_id, name, capacity, weekday, start_time, end_time)
values
  ('c5000000-0000-0000-0000-000000000001', '10c00000-0000-0000-0000-000000000001',
   '1a000000-0000-0000-0000-000000000001', 'Bestaand wo 16:00', 8, 3, '16:00', '17:00');

-- TEST 1: overlappende lesgroep op dezelfde baan moet worden geweigerd.
do $$
begin
  begin
    insert into public.class_series
      (location_id, lane_or_area_id, name, capacity, weekday, start_time, end_time)
    values
      ('10c00000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001',
       'Conflict wo 16:30', 8, 3, '16:30', '17:30');
  exception when others then
    if position('Roosterconflict' in sqlerrm) > 0 then
      raise notice 'OK: baanconflict gedetecteerd';
      return;
    end if;
    raise;
  end;
  raise exception 'FAIL: baanconflict werd NIET gedetecteerd';
end $$;

-- TEST 2: rand-aan-rand (17:00-18:00) op dezelfde baan mag wel.
do $$
begin
  insert into public.class_series
    (location_id, lane_or_area_id, name, capacity, weekday, start_time, end_time)
  values
    ('10c00000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001',
     'Aansluitend wo 17:00', 8, 3, '17:00', '18:00');
  raise notice 'OK: aansluitende lesgroep toegestaan';
end $$;

-- TEST 3: zelfde tijd op een andere weekdag mag wel.
do $$
begin
  insert into public.class_series
    (location_id, lane_or_area_id, name, capacity, weekday, start_time, end_time)
  values
    ('10c00000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001',
     'Donderdag 16:00', 8, 4, '16:00', '17:00');
  raise notice 'OK: andere weekdag toegestaan';
end $$;

rollback;
