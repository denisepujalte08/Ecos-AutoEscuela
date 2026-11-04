-- ECOS: sugerencia de horarios alternativos
--
-- Cuando el horario que el alumno quería ya no está libre, suggest_slots devuelve
-- los turnos libres más cercanos (misma jornada primero, luego días vecinos).
-- Respeta la regla de una clase por día: descarta los días en que el alumno ya
-- tiene clase y los días de los turnos que ya eligió en esta misma reserva.

create function suggest_slots(
  p_student_id uuid,
  p_wanted     timestamptz,
  p_exclude    timestamptz[] default '{}',  -- turnos ya elegidos en la reserva en curso
  p_limit      integer default 5
) returns table (
  starts_at        timestamptz,
  ends_at          timestamptz,
  instructor_id    uuid,
  distance_minutes integer
)
language sql stable security definer set search_path = public as $$
  with w as (
    select (p_wanted at time zone 'America/Argentina/Buenos_Aires')::date as d
  )
  select f.starts_at,
         f.ends_at,
         f.instructor_id,
         (abs(extract(epoch from (f.starts_at - p_wanted))) / 60)::integer as distance_minutes
  from w
  cross join lateral get_free_slots(w.d - 7, w.d + 7) f
  where not (f.starts_at = any (p_exclude))
    and not exists (
      select 1 from lessons l
      where l.student_id = p_student_id
        and l.kind = 'clase'
        and l.status in ('held', 'scheduled', 'done')
        and l.fecha_local = (f.starts_at at time zone 'America/Argentina/Buenos_Aires')::date
    )
    and not exists (
      select 1 from unnest(p_exclude) x
      where (x at time zone 'America/Argentina/Buenos_Aires')::date
          = (f.starts_at at time zone 'America/Argentina/Buenos_Aires')::date
    )
  order by distance_minutes, f.starts_at
  limit p_limit
$$;

-- Solo el servidor la llama (recibe el id del alumno).
revoke execute on function suggest_slots(uuid, timestamptz, timestamptz[], integer)
  from public, anon, authenticated;
