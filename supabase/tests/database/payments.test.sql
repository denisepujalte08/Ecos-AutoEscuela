-- Tests de apply_payment: idempotencia, montos, desorden de avisos y pagos sin turno.
begin;
select * from no_plan();

-- ---------------------------------------------------------------------------
-- Datos
-- ---------------------------------------------------------------------------
delete from lessons;
delete from enrollments;
delete from students;
delete from availability_rules;
delete from blackouts;
delete from instructors;
delete from courses;

insert into instructors (id, nombre) values ('a0000000-0000-0000-0000-00000000000a', 'Profe');
insert into availability_rules (instructor_id, weekday, start_time, end_time)
select 'a0000000-0000-0000-0000-00000000000a'::uuid, d, '08:00'::time, '12:00'::time from generate_series(1, 5) d;

insert into courses (id, nombre, cantidad_clases, precio_lista) values
  ('c1000000-0000-0000-0000-000000000001', 'Curso de 1', 1, 100000);

insert into students (id, nombre_completo, dni, fecha_nacimiento, telefono, email)
select ('5' || n || '000000-0000-0000-0000-000000000000')::uuid, 'Alumno ' || n, n::text, '2000-01-01', n::text, n || '@test.com'
from generate_series(1, 6) n;

create temp table ctx as
select date_trunc('week', ((now() at time zone 'America/Argentina/Buenos_Aires')::date + 14)::timestamp)::date as monday;

create function pg_temp.slot(p_day int, p_time time) returns timestamptz
language sql stable as $$
  select ((select monday from ctx) + p_day + p_time) at time zone 'America/Argentina/Buenos_Aires'
$$;

create function pg_temp.enroll(p_student int, p_time time) returns uuid
language sql as $$
  select create_enrollment(('5' || p_student || '000000-0000-0000-0000-000000000000')::uuid,
    'c1000000-0000-0000-0000-000000000001', 'tarjeta', array[pg_temp.slot(0, p_time)])
$$;

create temp table e as
select n, pg_temp.enroll(n, ('08:00'::time + (n - 1) * interval '40 minutes')::time) as id
from generate_series(1, 6) n;

create function pg_temp.eid(p_n int) returns uuid language sql as $$ select id from e where n = p_n $$;

-- ---------------------------------------------------------------------------
-- Pago aprobado con el monto correcto confirma la inscripción
-- ---------------------------------------------------------------------------
select is(apply_payment(pg_temp.eid(1), 'mercadopago', 'pay-1', 100000, 'approved', '{"x":1}'),
  'confirmed', 'un pago aprobado con el monto correcto confirma la inscripción');
select is((select estado from enrollments where id = pg_temp.eid(1)),
  'active'::enrollment_status, 'la inscripción queda activa');
select is((select count(*)::int from lessons where enrollment_id = pg_temp.eid(1) and status = 'scheduled'),
  1, 'las clases pasan a programadas');
select is((select estado from payments where provider_payment_id = 'pay-1'),
  'approved', 'el pago queda registrado como aprobado');

-- ---------------------------------------------------------------------------
-- Idempotencia
-- ---------------------------------------------------------------------------
select is(apply_payment(pg_temp.eid(1), 'mercadopago', 'pay-1', 100000, 'approved', '{"x":1}'),
  'already_confirmed', 'el mismo aviso repetido no vuelve a confirmar');
select is((select count(*)::int from payments where enrollment_id = pg_temp.eid(1)),
  1, 'el aviso repetido no duplica el pago');

select is(apply_payment(pg_temp.eid(1), 'mercadopago', 'pay-1b', 100000, 'approved'),
  'duplicate_payment', 'un segundo pago distinto para la misma inscripción se marca para revisión');
select is((select estado from payments where provider_payment_id = 'pay-1b'),
  'needs_review', 'el pago duplicado queda en revisión y no se pierde');

-- ---------------------------------------------------------------------------
-- Monto distinto
-- ---------------------------------------------------------------------------
select is(apply_payment(pg_temp.eid(2), 'mercadopago', 'pay-2', 1, 'approved'),
  'amount_mismatch', 'un monto distinto al de la inscripción no la confirma');
select is((select estado from enrollments where id = pg_temp.eid(2)),
  'pending_payment'::enrollment_status, 'la inscripción sigue pendiente');
select is((select estado from payments where provider_payment_id = 'pay-2'),
  'needs_review', 'el pago con monto distinto queda en revisión');

-- ---------------------------------------------------------------------------
-- Pendiente y luego aprobado
-- ---------------------------------------------------------------------------
select is(apply_payment(pg_temp.eid(3), 'mercadopago', 'pay-3', 100000, 'pending'),
  'pending', 'un pago pendiente no confirma');
select is((select estado from enrollments where id = pg_temp.eid(3)),
  'pending_payment'::enrollment_status, 'la inscripción sigue pendiente');
select is(apply_payment(pg_temp.eid(3), 'mercadopago', 'pay-3', 100000, 'approved'),
  'confirmed', 'cuando el mismo pago se aprueba, confirma');
select is((select count(*)::int from payments where enrollment_id = pg_temp.eid(3)),
  1, 'es el mismo registro de pago, no uno nuevo');

-- ---------------------------------------------------------------------------
-- Avisos desordenados: un "pendiente" tardío no deshace un pago aprobado
-- ---------------------------------------------------------------------------
select apply_payment(pg_temp.eid(4), 'mercadopago', 'pay-4', 100000, 'approved');
select is(apply_payment(pg_temp.eid(4), 'mercadopago', 'pay-4', 100000, 'pending'),
  'pending', 'llega un aviso pendiente tardío');
select is((select estado from payments where provider_payment_id = 'pay-4'),
  'approved', 'el pago sigue aprobado');
select is((select estado from enrollments where id = pg_temp.eid(4)),
  'active'::enrollment_status, 'la inscripción sigue activa');

-- ---------------------------------------------------------------------------
-- Rechazado y devuelto
-- ---------------------------------------------------------------------------
select is(apply_payment(pg_temp.eid(5), 'mercadopago', 'pay-5', 100000, 'rejected'),
  'rejected', 'un pago rechazado se registra');
select is((select estado from enrollments where id = pg_temp.eid(5)),
  'pending_payment'::enrollment_status, 'un pago rechazado no confirma ni cancela');

select is(apply_payment(pg_temp.eid(1), 'mercadopago', 'pay-1', 100000, 'refunded'),
  'refunded', 'una devolución se registra');
select is((select estado from payments where provider_payment_id = 'pay-1'),
  'refunded', 'el pago queda como devuelto');
select is((select estado from enrollments where id = pg_temp.eid(1)),
  'active'::enrollment_status, 'una devolución no cancela automáticamente la inscripción');

-- ---------------------------------------------------------------------------
-- Pago que llega cuando los turnos ya se liberaron
-- ---------------------------------------------------------------------------
update lessons set hold_expires_at = now() - interval '1 minute' where enrollment_id = pg_temp.eid(6);
select release_expired_holds();
select is((select estado from enrollments where id = pg_temp.eid(6)),
  'cancelled'::enrollment_status, 'la inscripción vencida se canceló');
select is(apply_payment(pg_temp.eid(6), 'mercadopago', 'pay-6', 100000, 'approved'),
  'needs_review', 'un pago aprobado sin turnos retenidos queda para revisión');
select is((select estado from payments where provider_payment_id = 'pay-6'),
  'needs_review', 'el pago NO se pierde: queda registrado en revisión');

-- ---------------------------------------------------------------------------
-- Validaciones y permisos
-- ---------------------------------------------------------------------------
select throws_ok(
  format($$select apply_payment(%L, 'mercadopago', 'pay-x', 1, 'inventado')$$, pg_temp.eid(5)),
  'P0001', 'invalid_payment_status', 'se rechazan estados desconocidos');
select throws_ok(
  $$select apply_payment('00000000-0000-0000-0000-000000000000', 'mercadopago', 'pay-y', 1, 'approved')$$,
  'P0001', 'enrollment_not_found', 'se rechaza un pago de una inscripción inexistente');

select is(has_function_privilege('authenticated', 'apply_payment(uuid, text, text, numeric, text, jsonb)', 'execute'),
  false, 'los usuarios no pueden ejecutar apply_payment');
select is(has_function_privilege('anon', 'apply_payment(uuid, text, text, numeric, text, jsonb)', 'execute'),
  false, 'el público no puede ejecutar apply_payment');
select is(has_table_privilege('anon', 'webhook_events', 'select'),
  false, 'el público no puede leer la bitácora de webhooks');
select is(has_table_privilege('authenticated', 'webhook_events', 'insert'),
  false, 'los usuarios no pueden escribir en la bitácora de webhooks');

select * from finish();
rollback;
