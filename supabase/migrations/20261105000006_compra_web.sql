-- Compra del curso desde la web (PR 2).
--
-- Flujo acordado (pregunta 15 del cliente, todavía por confirmar): la persona compra el curso eligiendo
-- efectivo o transferencia y paga por fuera; el personal confirma el pago; recién entonces se eligen los
-- turnos. Nunca se retienen turnos sin pago, así que no hay forma de bloquear la agenda con datos falsos.
--
--  1) create_web_purchase : pedido de compra, sin turnos.
--  2) confirm_payment     : el personal confirma el pago (la inscripción pasa a "active").
--  3) schedule_enrollment : elige los turnos de una inscripción ya paga.
--
-- Las tres solo las ejecuta service_role (desde el servidor); el público y los usuarios con sesión no.

-- La fecha de nacimiento se completa en la ficha del alumno, al primer ingreso (también sirve para saber
-- si es menor y pedir la autorización del tutor). DNI y email siguen siendo obligatorios.
alter table students alter column fecha_nacimiento drop not null;

-- ---------------------------------------------------------------------------
-- 1) Pedido de compra
-- Errores: invalid_name, invalid_phone, invalid_dni, invalid_email, invalid_method, course_not_found,
--          enrollment_in_progress
--
-- Un alumno no puede tener dos cursos a la vez: si ya tiene uno pendiente o activo, no se crea otro.
-- Si el DNI ya existe se reutiliza al alumno y NO se pisan sus datos (cualquiera podría escribir un DNI
-- ajeno); el personal corrige los datos desde el panel.
-- ---------------------------------------------------------------------------
create function create_web_purchase(
  p_nombre    text,
  p_telefono  text,
  p_dni       text,
  p_email     text,
  p_course_id uuid,
  p_metodo    payment_method
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_nombre  text := btrim(coalesce(p_nombre, ''));
  v_tel     text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_dni     text := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_course  courses;
  v_student uuid;
  v_disc    numeric;
  v_id      uuid;
begin
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 120 then
    raise exception 'invalid_name';
  end if;
  if char_length(v_tel) < 8 or char_length(v_tel) > 15 then
    raise exception 'invalid_phone';
  end if;
  if char_length(v_dni) < 6 or char_length(v_dni) > 10 then
    raise exception 'invalid_dni';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;
  -- La tarjeta se paga online (otro flujo, con retención de turnos de 15 minutos).
  if p_metodo is null or p_metodo not in ('transferencia', 'efectivo') then
    raise exception 'invalid_method';
  end if;

  select * into v_course from courses where id = p_course_id and activo;
  if not found then
    raise exception 'course_not_found';
  end if;

  select id into v_student from students where dni = v_dni;
  if v_student is null then
    insert into students (nombre_completo, telefono, dni, email)
    values (v_nombre, v_tel, v_dni, v_email)
    returning id into v_student;
  end if;

  if exists (
    select 1 from enrollments
    where student_id = v_student
      and estado in ('pending_payment', 'pending_review', 'active')
  ) then
    raise exception 'enrollment_in_progress';
  end if;

  select descuento_pct into v_disc from payment_method_rules where metodo = p_metodo;

  insert into enrollments (student_id, course_id, metodo, monto, estado)
  values (v_student, p_course_id, p_metodo,
          round(v_course.precio_lista * (100 - v_disc) / 100, 2), 'pending_review')
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Confirmar el pago (transferencia o efectivo), sin turnos todavía
-- Errores: enrollment_not_confirmable, enrollment_has_lessons
-- Las inscripciones que ya tienen turnos retenidos (pago con tarjeta) se confirman con confirm_enrollment.
-- ---------------------------------------------------------------------------
create function confirm_payment(p_enrollment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_enr enrollments;
begin
  select * into v_enr from enrollments where id = p_enrollment_id for update;
  if not found or v_enr.estado <> 'pending_review' then
    raise exception 'enrollment_not_confirmable'
      using detail = coalesce(v_enr.estado::text, 'inexistente');
  end if;

  if exists (select 1 from lessons where enrollment_id = p_enrollment_id) then
    raise exception 'enrollment_has_lessons';
  end if;

  update enrollments set estado = 'active' where id = p_enrollment_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Elegir los turnos de una inscripción ya paga (todos o ninguno)
-- Errores: enrollment_not_active, already_scheduled, wrong_lesson_count, duplicate_slots,
--          slot_unavailable, slot_taken, student_day_conflict
-- Las clases quedan directamente "scheduled": ya está pago, no hay nada que retener.
-- ---------------------------------------------------------------------------
create function schedule_enrollment(p_enrollment_id uuid, p_starts timestamptz[]) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_enr    enrollments;
  v_course courses;
  v_sorted timestamptz[];
  v_start  timestamptz;
  v_instr  uuid;
  v_slot   integer := get_setting_int('slot_minutes');
  v_n      integer := 0;
  v_local  date;
begin
  select * into v_enr from enrollments where id = p_enrollment_id for update;
  if not found or v_enr.estado <> 'active' then
    raise exception 'enrollment_not_active'
      using detail = coalesce(v_enr.estado::text, 'inexistente');
  end if;

  if exists (
    select 1 from lessons
    where enrollment_id = p_enrollment_id and status in ('held', 'scheduled', 'done')
  ) then
    raise exception 'already_scheduled';
  end if;

  select * into v_course from courses where id = v_enr.course_id;

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
      values (p_enrollment_id, v_enr.student_id, v_instr, v_n, 'clase',
              'scheduled', v_start, v_start + make_interval(mins => v_slot), null);
    exception
      when exclusion_violation then
        raise exception 'slot_taken' using detail = v_start::text;
      when unique_violation then
        raise exception 'student_day_conflict' using detail = v_start::text;
    end;
  end loop;
end;
$$;

revoke execute on function create_web_purchase(text, text, text, text, uuid, payment_method) from public, anon, authenticated;
revoke execute on function confirm_payment(uuid)                                             from public, anon, authenticated;
revoke execute on function schedule_enrollment(uuid, timestamptz[])                          from public, anon, authenticated;
