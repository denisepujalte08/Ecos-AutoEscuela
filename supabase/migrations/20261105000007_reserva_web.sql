-- Reserva desde la web (PR 2).
--
-- 1) "a coordinar" no tiene descuento: se cobra el precio de lista hasta que el personal elija el medio real.
-- 2) Quien reserva en la web deja solo nombre y teléfono; DNI, fecha de nacimiento y email se completan
--    después, en la escuela, en la ficha del alumno. Por eso dejan de ser obligatorios. El DNI sigue siendo
--    único cuando existe (Postgres permite varios valores nulos en una columna única).
-- 3) create_web_reservation crea (o reutiliza) al alumno y hace la reserva en una sola transacción: si algún
--    turno no se puede tomar, no queda ningún alumno suelto.

insert into payment_method_rules (metodo, descuento_pct) values ('a_coordinar', 0);

alter table students alter column dni drop not null;
alter table students alter column fecha_nacimiento drop not null;
alter table students alter column email drop not null;

-- ---------------------------------------------------------------------------
-- Reserva desde la web
-- Errores (mensaje): invalid_name, invalid_phone, invalid_email, too_many_pending,
--   más los de create_enrollment (course_not_found, wrong_lesson_count, duplicate_slots,
--   slot_unavailable, slot_taken, student_day_conflict).
--
-- Límite anti-abuso: una persona (por teléfono) no puede tener más de UNA reserva pendiente a la vez.
-- Sin esto, cualquiera podría retener todos los turnos con datos falsos. Las retenciones vencen solas.
-- ---------------------------------------------------------------------------
create function create_web_reservation(
  p_nombre   text,
  p_telefono text,
  p_email    text,
  p_course_id uuid,
  p_starts   timestamptz[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_nombre  text := btrim(coalesce(p_nombre, ''));
  v_tel     text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_email   text := nullif(btrim(coalesce(p_email, '')), '');
  v_student uuid;
begin
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 120 then
    raise exception 'invalid_name';
  end if;
  if char_length(v_tel) < 8 or char_length(v_tel) > 15 then
    raise exception 'invalid_phone';
  end if;
  if v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'invalid_email';
  end if;

  -- Libera retenciones vencidas antes de contar las pendientes.
  perform release_expired_holds();

  if exists (
    select 1
    from enrollments e
    join students s on s.id = e.student_id
    where s.telefono = v_tel
      and e.estado in ('pending_payment', 'pending_review')
  ) then
    raise exception 'too_many_pending';
  end if;

  -- Reutiliza al alumno si ya reservó antes con el mismo teléfono y nombre.
  select id into v_student
  from students
  where telefono = v_tel and lower(nombre_completo) = lower(v_nombre)
  limit 1;

  if v_student is null then
    insert into students (nombre_completo, telefono, email)
    values (v_nombre, v_tel, v_email)
    returning id into v_student;
  elsif v_email is not null then
    update students set email = v_email where id = v_student and email is distinct from v_email;
  end if;

  return create_enrollment(v_student, p_course_id, 'a_coordinar', p_starts);
end;
$$;

revoke execute on function create_web_reservation(text, text, text, uuid, timestamptz[]) from public, anon, authenticated;
