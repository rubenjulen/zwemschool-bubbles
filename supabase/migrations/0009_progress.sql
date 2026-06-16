-- =============================================================================
-- Iteratie 3 deel 2 - voortgang/skill tree (FR-7).
-- Skills afvinken loopt via RLS progress_instructor_write (direct upsert vanuit
-- de app). Twee leesfuncties met autorisatie:
--  - get_student_skills: skills van het lesniveau + status, voor de instructeur.
--  - get_family_progress: voortgang per kind voor de ouder (alleen-lezen).
-- =============================================================================

-- Skills van het niveau van DEZE les, met de status voor één leerling.
create or replace function public.get_student_skills(p_student_id uuid, p_session_id uuid)
returns table (
  skill_id uuid,
  name text,
  is_exam boolean,
  achieved boolean,
  note text
) language plpgsql security definer set search_path = public as $$
declare
  v_level uuid;
begin
  if not public.instructor_sees_session(p_session_id) then
    raise exception 'Geen toegang tot deze les';
  end if;

  select cs.level_id into v_level
  from public.lesson_sessions ls
  join public.class_series cs on cs.id = ls.class_series_id
  where ls.id = p_session_id;

  return query
  select sk.id, sk.name, sk.is_exam_requirement,
         coalesce(pr.achieved, false), pr.note
  from public.skills sk
  left join public.progress_records pr
    on pr.skill_id = sk.id and pr.student_id = p_student_id
  where sk.level_id = v_level
  order by sk.sort_order;
end;
$$;

revoke all on function public.get_student_skills(uuid, uuid) from public;
grant execute on function public.get_student_skills(uuid, uuid) to authenticated;

-- Voortgang per kind voor de ouder. Niveau = vastgelegd huidig niveau, anders
-- afgeleid uit de actieve inschrijving. Toont alleen oudergerichte notities.
create or replace function public.get_family_progress()
returns table (
  student_id uuid,
  student_name text,
  level_name text,
  skill_id uuid,
  skill_name text,
  is_exam boolean,
  achieved boolean,
  note text
) language plpgsql security definer set search_path = public as $$
begin
  return query
  with kids as (
    select s.id, s.first_name,
      coalesce(
        s.current_level_id,
        (select cs.level_id from public.enrollments e
           join public.class_series cs on cs.id = e.class_series_id
          where e.student_id = s.id and e.status in ('active', 'trial')
          order by e.created_at desc limit 1)
      ) as level_id
    from public.students s
    where s.family_id in (select public.current_family_ids()) and s.deleted_at is null
  )
  select k.id, k.first_name, lv.name, sk.id, sk.name, sk.is_exam_requirement,
         coalesce(pr.achieved, false),
         case when pr.is_parent_visible then pr.note else null end
  from kids k
  join public.levels lv on lv.id = k.level_id
  join public.skills sk on sk.level_id = k.level_id
  left join public.progress_records pr on pr.student_id = k.id and pr.skill_id = sk.id
  order by k.first_name, sk.sort_order;
end;
$$;

revoke all on function public.get_family_progress() from public;
grant execute on function public.get_family_progress() to authenticated;
