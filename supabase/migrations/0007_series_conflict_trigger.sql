-- =============================================================================
-- DB-level conflictbewaking voor lesgroepen (FR-4.4). De app controleert al op
-- conflicten vóór insert, maar deze trigger maakt de database autoritair en
-- vangt ook races/directe inserts. Conflict = zelfde weekdag + overlappende
-- tijd + (zelfde instructeur OF zelfde baan op zelfde locatie).
-- =============================================================================
create or replace function public.check_series_conflict()
returns trigger language plpgsql as $$
begin
  if new.is_active is not true
     or new.weekday is null or new.start_time is null or new.end_time is null then
    return new;
  end if;

  if exists (
    select 1
    from public.class_series o
    where o.id <> new.id
      and o.is_active
      and o.weekday = new.weekday
      and o.start_time is not null and o.end_time is not null
      and new.start_time < o.end_time and o.start_time < new.end_time
      and (
        (new.instructor_id is not null and o.instructor_id = new.instructor_id)
        or (new.lane_or_area_id is not null
            and o.location_id = new.location_id
            and o.lane_or_area_id = new.lane_or_area_id)
      )
  ) then
    raise exception 'Roosterconflict: instructeur of baan is op dit tijdslot al bezet';
  end if;

  return new;
end;
$$;

create trigger trg_series_conflict
  before insert or update on public.class_series
  for each row execute function public.check_series_conflict();
