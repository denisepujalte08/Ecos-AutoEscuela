-- ECOS: lógica de turnos y reserva
--
--   slot_candidates      turnos posibles según reglas, ventana de reserva y bloqueos (interno)
--   get_free_slots       turnos libres para el público (RPC)
--   release_expired_holds libera retenciones vencidas (también para pg_cron)
--   create_enrollment    reserva todas las clases de un curso o ninguna
--   confirm_enrollment   confirma el pago: retenidas -> programadas
--   cancel_enrollment    cancela y libera los turnos
--   mark_lesson_done     administración marca la clase como dictada

-- ---------------------------------------------------------------------------
-- Turnos candidatos (sin mirar ocupación)
-- ---------------------------------------------------------------------------
create function slot_candidates(p_from date, p_to date)
returns table (starts_at timestamptz, ends_at timestamptz, instructor_id uuid)
language sql stable security definer set search_path = public as $$
  with cfg as (
    select get_setting_int('slot_minutes')      as slot,
           get_setting_int('min_advance_hours') as min_h,
           get_setting_int('max_advance_days')  as max_d
  ),
  days as (
    select p_from + k as d from generate_series(0, p_to - p_from) k
  ),
  raw as (
    select ar.instructor_id as instr,
           days.d + ar.start_time + make_interval(mins => n * cfg.slot)       as local_start,
           days.d + ar.start_time + make_interval(mins => (n + 1) * cfg.slot) as local_end,
           days.d + ar.end_time                                               as local_limit
    from days
    cross join cfg
    join availability_rules ar on ar.weekday = extract(isodow from days.d)::int
    join instructors i on i.id = ar.instructor_id and i.activo
    cross join lateral generate_series(0, (24 * 60) / cfg.slot) n
  ),
  slots as (
    select instr,
           local_start at time zone 'America/Argentina/Buenos_Aires' as s,
           local_end   at time zone 'America/Argentina/Buenos_Aires' as e
    from raw
    where local_end <= local_limit
  )
  select slots.s, slots.e, slots.instr
  from slots cross join cfg
  where slots.s >= now() + make_interval(hours => cfg.min_h)
    and slots.s <= now() + make_interval(days => cfg.max_d)
    and not exists (
      select 1 from blackouts b
      where (b.instructor_id is null or b.instructor_id = slots.instr)
        and b.starts_at < slots.e
        and b.ends_at > slots.s
    )
$$;

-- ---------------------------------------------------------------------------
-- Turnos libres (público)
-- ---------------------------------------------------------------------------
create function get_free_slots(p_from date, p_to date)
returns table (starts_at timestamptz, ends_at timestamptz, instructor_id uuid)
language sql stable security definer set search_path = public as $$
  select c.starts_at, c.ends_at, c.instructor_id
  from slot_candidates(p_from, p_to) c
  where not exists (
    select 1 from lessons l
    where (l.status in ('scheduled', 'done')
           or (l.status = 'held' and l.hold_expires_at > now()))
      and l.starts_at < c.ends_at
      and l.ends_at > c.starts_at
  )
  order by c.starts_at
$$;

-- ---------------------------------------------------------------------------
-- Liberar retenciones vencidas
-- ---------------------------------------------------------------------------
create function release_expired_holds() returns integer
language sql security definer set search_path = public as $$
  with d as (
    delete from lessons
    where status = 'held' and hold_expires_at <= now()
    returning enrollment_id
  ), u as (
    update enrollments set estado = 'cancelled'
    where id in (select enrollment_id from d)
      and estado in ('pending_payment', 'pending_review')
  )
  select count(*)::integer from d
$$;

-- ---------------------------------------------------------------------------
-- Crear inscripción: todas las clases o ninguna
-- Errores (mensaje): course_not_found, student_not_found, wrong_lesson_count,
--   duplicate_slots, slot_unavailable, slot_taken, student_day_conflict
-- ---------------------------------------------------------------------------
create function create_enrollment(
  p_student_id uuid,
  p_course_id  uuid,
  p_metodo     payment_method,
  p_starts     timestamptz[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_course  courses;
  v_disc    numeric;
  v_monto   numeric;
  v_estado  enrollment_status;
  v_hold    interval;
  v_slot    integer;
  v_id      uuid;
  v_sorted  timestamptz[];
  v_start   timestamptz;
  v_instr   uuid;
  v_n       integer := 0;
  v_local   date;
begin
  select * into v_course from courses where id = p_course_id and activo;
  if not found then
    raise exception 'course_not_found';
  end if;

  if not exists (select 1 from students where id = p_student_id) then
    raise exception 'student_not_found';
  end if;

  if array_length(p_starts, 1) is distinct from v_course.cantidad_clases then
    raise exception 'wrong_lesson_count'
      using detail = format('esperadas %s, recibidas %s',
                            v_course.cantidad_clases, coalesce(array_length(p_starts, 1), 0));
  end if;

  select array_agg(x order by x) into v_sorted from unnest(p_starts) x;
  if (select count(distinct x) from unnest(v_sorted) x) <> array_length(v_sorted, 1) then
    raise exception 'duplicate_slots';
  end if;

  perform release_expired_holds();

  select descuento_pct into v_disc from payment_method_rules where metodo = p_metodo;
  v_monto  := round(v_course.precio_lista * (100 - v_disc) / 100, 2);
  v_estado := case p_metodo when 'tarjeta' then 'pending_payment'::enrollment_status
                            else 'pending_review'::enrollment_status end;
  v_hold   := make_interval(mins => get_setting_int(
                case when p_metodo = 'tarjeta' then 'hold_minutes_card' else 'hold_minutes_manual' end));
  v_slot   := get_setting_int('slot_minutes');

  insert into enrollments (student_id, course_id, metodo, monto, estado)
  values (p_student_id, p_course_id, p_metodo, v_monto, v_estado)
  returning id into v_id;

  foreach v_start in array v_sorted loop
    v_n := v_n + 1;
    v_local := (v_start at time zone 'America/Argentina/Buenos_Aires')::date;

    select c.instructor_id into v_instr
    from slot_candidates(v_local, v_local) c
    where c.starts_at = v_start
    limit 1;

    if v_instr is null then
      raise exception 'slot_unavailable' using detail = v_start::text;
    end if;

    begin
      insert into lessons (enrollment_id, student_id, instructor_id, nro_clase, kind,
                           status, starts_at, ends_at, hold_expires_at)
      values (v_id, p_student_id, v_instr, v_n, 'clase',
              'held', v_start, v_start + make_interval(mins => v_slot), now() + v_hold);
    exception
      when exclusion_violation then
        raise exception 'slot_taken' using detail = v_start::text;
      when unique_violation then
        raise exception 'student_day_conflict' using detail = v_start::text;
    end;
  end loop;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Confirmar pago
-- Errores: enrollment_not_confirmable (ya cancelada, activa, etc.), holds_lost
-- Si los turnos ya no están retenidos, la capa de aplicación debe resolver el
-- "pago sin turno" (reasignar o devolver). Ver docs/02-pagos.md.
-- ---------------------------------------------------------------------------
create function confirm_enrollment(p_enrollment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_enr  enrollments;
  v_need integer;
  v_have integer;
begin
  select * into v_enr from enrollments where id = p_enrollment_id for update;
  if not found or v_enr.estado not in ('pending_payment', 'pending_review') then
    raise exception 'enrollment_not_confirmable'
      using detail = coalesce(v_enr.estado::text, 'inexistente');
  end if;

  select cantidad_clases into v_need from courses where id = v_enr.course_id;
  select count(*) into v_have from lessons
  where enrollment_id = p_enrollment_id and status = 'held';

  if v_have <> v_need then
    raise exception 'holds_lost' using detail = format('retenidas %s de %s', v_have, v_need);
  end if;

  update enrollments set estado = 'active' where id = p_enrollment_id;
  update lessons set status = 'scheduled', hold_expires_at = null
  where enrollment_id = p_enrollment_id and status = 'held';
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancelar inscripción: libera todos los turnos
-- ---------------------------------------------------------------------------
create function cancel_enrollment(p_enrollment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update enrollments set estado = 'cancelled'
  where id = p_enrollment_id and estado <> 'cancelled';
  if not found then
    raise exception 'enrollment_not_found_or_cancelled';
  end if;
  update lessons set status = 'cancelled', hold_expires_at = null
  where enrollment_id = p_enrollment_id and status in ('held', 'scheduled');
end;
$$;

-- ---------------------------------------------------------------------------
-- Marcar clase dictada (reemplaza la firma en la ficha)
-- ---------------------------------------------------------------------------
create function mark_lesson_done(p_lesson_id uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_enr uuid;
  v_pending integer;
begin
  update lessons set status = 'done', done_at = now(), done_by = p_user
  where id = p_lesson_id and status = 'scheduled'
  returning enrollment_id into v_enr;
  if v_enr is null then
    raise exception 'lesson_not_scheduled';
  end if;

  select count(*) into v_pending from lessons
  where enrollment_id = v_enr and kind = 'clase' and status <> 'done';
  if v_pending = 0 then
    update enrollments set estado = 'completed' where id = v_enr;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: solo get_free_slots es público; el resto, solo service_role
-- ---------------------------------------------------------------------------
revoke execute on function slot_candidates(date, date)                              from public, anon, authenticated;
revoke execute on function release_expired_holds()                                  from public, anon, authenticated;
revoke execute on function create_enrollment(uuid, uuid, payment_method, timestamptz[]) from public, anon, authenticated;
revoke execute on function confirm_enrollment(uuid)                                 from public, anon, authenticated;
revoke execute on function cancel_enrollment(uuid)                                  from public, anon, authenticated;
revoke execute on function mark_lesson_done(uuid, uuid)                             from public, anon, authenticated;
revoke execute on function get_free_slots(date, date)                               from public;
grant  execute on function get_free_slots(date, date)                               to anon, authenticated, service_role;

-- Lectura pública mínima para el sitio
create policy courses_public_read on courses for select to anon, authenticated using (activo);
create policy payment_rules_public_read on payment_method_rules for select to anon, authenticated using (true);
