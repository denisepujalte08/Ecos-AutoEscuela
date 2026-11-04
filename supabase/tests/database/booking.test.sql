-- Tests de la lógica de turnos y reserva (pgTAP). Ejecutar con: npm run db:test
begin;
select * from no_plan();

-- ---------------------------------------------------------------------------
-- Datos de prueba (se revierten al final)
-- ---------------------------------------------------------------------------
delete from lessons;
delete from enrollments;
delete from availability_rules;
delete from blackouts;
delete from instructors;

insert into instructors (id, nombre) values
  ('a0000000-0000-0000-0000-00000000000a', 'Profe Mañana'),
  ('b0000000-0000-0000-0000-00000000000b', 'Profe Tarde');

-- Lunes a viernes: mañana 08:00-12:00 (6 turnos), tarde 14:00-18:00 (6 turnos)
insert into availability_rules (instructor_id, weekday, start_time, end_time)
select 'a0000000-0000-0000-0000-00000000000a', d, '08:00', '12:00' from generate_series(1, 5) d
union all
select 'b0000000-0000-0000-0000-00000000000b', d, '14:00', '18:00' from generate_series(1, 5) d;

insert into courses (id, nombre, cantidad_clases, precio_lista) values
  ('c3000000-0000-0000-0000-000000000003', 'Curso de 3', 3, 100000),
  ('c1000000-0000-0000-0000-000000000001', 'Curso de 1', 1, 100000);

insert into students (id, nombre_completo, dni, fecha_nacimiento, telefono, email) values
  ('51000000-0000-0000-0000-000000000001', 'Alumno Uno', '1', '2000-01-01', '1', 'uno@test.com'),
  ('52000000-0000-0000-0000-000000000002', 'Alumno Dos', '2', '2000-01-01', '2', 'dos@test.com');

-- Lunes dentro de la ventana de reserva (14 a 20 días desde hoy)
create temp table ctx as
select date_trunc('week', ((now() at time zone 'America/Argentina/Buenos_Aires')::date + 14)::timestamp)::date as monday;

-- Turno: día (0 = lunes ... 4 = viernes) y hora local
create function pg_temp.slot(p_day int, p_time time) returns timestamptz
language sql stable as $$
  select ((select monday from ctx) + p_day + p_time) at time zone 'America/Argentina/Buenos_Aires'
$$;

-- ---------------------------------------------------------------------------
-- Turnos libres
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from get_free_slots((select monday from ctx), (select monday from ctx))),
  12, 'el lunes hay 12 turnos libres (6 mañana + 6 tarde)');

select is(
  (select instructor_id from get_free_slots((select monday from ctx), (select monday from ctx)) order by starts_at limit 1),
  'a0000000-0000-0000-0000-00000000000a'::uuid, 'el primer turno es del profesor de la mañana');

select is(
  (select count(*)::int from get_free_slots((select monday from ctx), (select monday from ctx))
   where starts_at = pg_temp.slot(0, '11:40')),
  0, 'no existe un turno 11:40 (terminaría después del fin del bloque)');

select is(
  (select count(*)::int from get_free_slots((select monday from ctx) + 5, (select monday from ctx) + 6)),
  0, 'sábado y domingo no hay turnos');

-- ---------------------------------------------------------------------------
-- Reserva
-- ---------------------------------------------------------------------------
create temp table e1 as
select create_enrollment(
  '51000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000003', 'tarjeta',
  array[pg_temp.slot(0, '08:00'), pg_temp.slot(1, '08:00'), pg_temp.slot(2, '08:00')]) as id;

select is((select count(*)::int from lessons where enrollment_id = (select id from e1) and status = 'held'),
  3, 'se crean 3 clases retenidas');
select is((select estado from enrollments where id = (select id from e1)),
  'pending_payment'::enrollment_status, 'tarjeta: inscripción pendiente de pago');
select is((select monto from enrollments where id = (select id from e1)),
  100000.00::numeric, 'tarjeta: precio de lista sin descuento');
select is((select array_agg(nro_clase order by starts_at) from lessons where enrollment_id = (select id from e1)),
  array[1, 2, 3], 'los números de clase siguen el orden cronológico');

select is(
  (select count(*)::int from get_free_slots((select monday from ctx), (select monday from ctx))),
  11, 'el turno retenido ya no aparece libre');

select throws_ok(
  format($$select create_enrollment('52000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'tarjeta', array[%L::timestamptz])$$,
         pg_temp.slot(0, '08:00')),
  'P0001', 'slot_taken', 'no se puede reservar un turno ya retenido');

select throws_ok(
  format($$select create_enrollment('52000000-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000003', 'tarjeta', array[%L::timestamptz, %L::timestamptz, %L::timestamptz])$$,
         pg_temp.slot(1, '08:40'), pg_temp.slot(0, '08:00'), pg_temp.slot(2, '08:40')),
  'P0001', 'slot_taken', 'si un turno falla, falla toda la reserva');
select is((select count(*)::int from enrollments where student_id = '52000000-0000-0000-0000-000000000002'),
  0, 'no queda ninguna inscripción a medias');
select is(
  (select count(*)::int from get_free_slots((select monday from ctx) + 1, (select monday from ctx) + 1)
   where starts_at = pg_temp.slot(1, '08:40')),
  1, 'los turnos del intento fallido siguen libres');

select throws_ok(
  format($$select create_enrollment('51000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'tarjeta', array[%L::timestamptz])$$,
         pg_temp.slot(0, '08:40')),
  'P0001', 'student_day_conflict', 'un alumno no puede tener dos clases el mismo día');

select throws_ok(
  format($$select create_enrollment('52000000-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000003', 'tarjeta', array[%L::timestamptz, %L::timestamptz])$$,
         pg_temp.slot(3, '08:00'), pg_temp.slot(4, '08:00')),
  'P0001', 'wrong_lesson_count', 'la cantidad de turnos debe coincidir con el curso');

select throws_ok(
  format($$select create_enrollment('52000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'tarjeta', array[%L::timestamptz])$$,
         pg_temp.slot(0, '11:40')),
  'P0001', 'slot_unavailable', 'no se puede reservar un horario fuera de los bloques');

select throws_ok(
  format($$select create_enrollment('52000000-0000-0000-0000-000000000002', 'c3000000-0000-0000-0000-000000000003', 'tarjeta', array[%L::timestamptz, %L::timestamptz, %L::timestamptz])$$,
         pg_temp.slot(4, '08:00'), pg_temp.slot(4, '08:00'), pg_temp.slot(3, '08:00')),
  'P0001', 'duplicate_slots', 'no se pueden repetir turnos');

-- ---------------------------------------------------------------------------
-- Confirmación
-- ---------------------------------------------------------------------------
select confirm_enrollment((select id from e1));
select is((select estado from enrollments where id = (select id from e1)),
  'active'::enrollment_status, 'confirmar activa la inscripción');
select is((select count(*)::int from lessons where enrollment_id = (select id from e1) and status = 'scheduled' and hold_expires_at is null),
  3, 'las clases pasan a programadas');
select throws_ok(
  format($$select confirm_enrollment(%L)$$, (select id from e1)),
  'P0001', 'enrollment_not_confirmable', 'no se puede confirmar dos veces');

-- ---------------------------------------------------------------------------
-- Vencimiento de retenciones
-- ---------------------------------------------------------------------------
create temp table e2 as
select create_enrollment(
  '52000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'tarjeta',
  array[pg_temp.slot(3, '08:00')]) as id;

update lessons set hold_expires_at = now() - interval '1 minute' where enrollment_id = (select id from e2);

select is(
  (select count(*)::int from get_free_slots((select monday from ctx) + 3, (select monday from ctx) + 3)
   where starts_at = pg_temp.slot(3, '08:00')),
  1, 'una retención vencida deja de bloquear el turno aunque aún no se haya limpiado');

select is(release_expired_holds(), 1, 'se libera 1 retención vencida');
select is((select estado from enrollments where id = (select id from e2)),
  'cancelled'::enrollment_status, 'la inscripción sin turnos se cancela');
select throws_ok(
  format($$select confirm_enrollment(%L)$$, (select id from e2)),
  'P0001', 'enrollment_not_confirmable', 'no se puede confirmar una inscripción vencida');

-- ---------------------------------------------------------------------------
-- Transferencia, dictado y cancelación
-- ---------------------------------------------------------------------------
create temp table e3 as
select create_enrollment(
  '52000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'transferencia',
  array[pg_temp.slot(3, '09:20')]) as id;

select is((select monto from enrollments where id = (select id from e3)),
  90000.00::numeric, 'transferencia: 10% de descuento');
select is((select estado from enrollments where id = (select id from e3)),
  'pending_review'::enrollment_status, 'transferencia: pendiente de revisión');
select ok((select hold_expires_at from lessons where enrollment_id = (select id from e3)) > now() + interval '1 hour',
  'transferencia: la retención dura más que la de tarjeta');

select confirm_enrollment((select id from e3));
select mark_lesson_done((select id from lessons where enrollment_id = (select id from e3)), null);
select is((select estado from enrollments where id = (select id from e3)),
  'completed'::enrollment_status, 'al dictar todas las clases la inscripción se completa');

select cancel_enrollment((select id from e1));
select is((select count(*)::int from lessons where enrollment_id = (select id from e1) and status = 'cancelled'),
  3, 'cancelar marca las 3 clases como canceladas');
select is(
  (select count(*)::int from get_free_slots((select monday from ctx), (select monday from ctx))
   where starts_at = pg_temp.slot(0, '08:00')),
  1, 'el turno cancelado vuelve a estar libre');

-- ---------------------------------------------------------------------------
-- Bloqueos y restricciones
-- ---------------------------------------------------------------------------
insert into blackouts (instructor_id, starts_at, ends_at, motivo)
values (null, pg_temp.slot(4, '00:00'), pg_temp.slot(4, '00:00') + interval '1 day', 'Feriado');
select is(
  (select count(*)::int from get_free_slots((select monday from ctx) + 4, (select monday from ctx) + 4)),
  0, 'un bloqueo global elimina todos los turnos del día');

select throws_ok(
  format($$insert into lessons (enrollment_id, student_id, instructor_id, nro_clase, status, starts_at, ends_at)
           values (%L, '51000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 9, 'scheduled', %L, %L)$$,
         (select id from e3), pg_temp.slot(3, '09:20'), pg_temp.slot(3, '09:20') + interval '40 minutes'),
  '23P01', null, 'la base rechaza dos clases superpuestas (un solo auto)');

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------
select is(has_function_privilege('anon', 'create_enrollment(uuid, uuid, payment_method, timestamptz[])', 'execute'),
  false, 'anon no puede crear inscripciones directamente');
select is(has_function_privilege('anon', 'get_free_slots(date, date)', 'execute'),
  true, 'anon puede consultar turnos libres');

select * from finish();
rollback;
