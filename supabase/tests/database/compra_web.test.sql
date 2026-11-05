-- Tests de la compra desde la web: pedido, confirmación del pago y elección de turnos (pgTAP).
-- Ejecutar con: npm run db:test
begin;
select * from no_plan();

-- ---------------------------------------------------------------------------
-- Datos de prueba (se revierten al final)
-- ---------------------------------------------------------------------------
delete from payments;
delete from lessons;
delete from enrollments;
delete from students;
delete from availability_rules;
delete from blackouts;
delete from instructors;

insert into instructors (id, nombre) values
  ('a0000000-0000-0000-0000-00000000000a', 'Profe Mañana'),
  ('b0000000-0000-0000-0000-00000000000b', 'Profe Tarde');

-- Lunes a viernes: mañana 08:00-12:00, tarde 14:00-18:00
insert into availability_rules (instructor_id, weekday, start_time, end_time)
select 'a0000000-0000-0000-0000-00000000000a'::uuid, d, '08:00'::time, '12:00'::time from generate_series(1, 5) d
union all
select 'b0000000-0000-0000-0000-00000000000b'::uuid, d, '14:00'::time, '18:00'::time from generate_series(1, 5) d;

insert into courses (id, nombre, cantidad_clases, precio_lista, activo) values
  ('c3000000-0000-0000-0000-000000000003', 'Curso de 3',     3, 100000, true),
  ('c9000000-0000-0000-0000-000000000009', 'Curso inactivo', 3, 100000, false);

-- Lunes dentro de la ventana de reserva (14 a 20 días desde hoy)
create temp table ctx as
select date_trunc('week', ((now() at time zone 'America/Argentina/Buenos_Aires')::date + 14)::timestamp)::date as monday;

-- Turno: día (0 = lunes ... 4 = viernes) y hora local. La grilla es de 40 min: 08:00, 08:40, 09:20, 10:00 ...
create function pg_temp.slot(p_day int, p_time time) returns timestamptz
language sql stable as $$
  select ((select monday from ctx) + p_day + p_time) at time zone 'America/Argentina/Buenos_Aires'
$$;

-- ---------------------------------------------------------------------------
-- 1) Pedido de compra
-- ---------------------------------------------------------------------------
create temp table c1 as
select create_web_purchase(
  '  Ana Pérez ', '+54 9 362 485-5645', '30.123.456', ' Ana@Test.com ',
  'c3000000-0000-0000-0000-000000000003', 'transferencia') as id;

select is((select estado::text from enrollments where id = (select id from c1)),
  'pending_review', 'el pedido queda pendiente de revisión');

select is((select metodo::text from enrollments where id = (select id from c1)),
  'transferencia', 'queda el medio de pago elegido');

select is((select monto from enrollments where id = (select id from c1)),
  90000.00::numeric(12, 2), 'transferencia: el monto es el precio de lista menos el 10 %');

select is((select count(*)::int from lessons where enrollment_id = (select id from c1)),
  0, 'el pedido no retiene ningún turno');

select is((select nombre_completo from students where dni = '30123456'),
  'Ana Pérez', 'el nombre se guarda sin espacios de más');

select is((select telefono from students where dni = '30123456'),
  '5493624855645', 'el teléfono se guarda solo con dígitos');

select is((select email from students where dni = '30123456'),
  'ana@test.com', 'el email se guarda en minúsculas y sin espacios');

select ok((select fecha_nacimiento is null from students where dni = '30123456'),
  'la fecha de nacimiento queda vacía hasta completar la ficha');

create temp table c2 as
select create_web_purchase(
  'Beto Díaz', '3624111222', '28111222', 'beto@test.com',
  'c3000000-0000-0000-0000-000000000003', 'efectivo') as id;

select is((select monto from enrollments where id = (select id from c2)),
  85000.00::numeric(12, 2), 'efectivo: el monto es el precio de lista menos el 15 %');

-- ---------------------------------------------------------------------------
-- Reglas del pedido
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select create_web_purchase('Ana Pérez', '3624855645', '30123456', 'ana@test.com',
      'c3000000-0000-0000-0000-000000000003', 'efectivo')$$,
  'P0001', 'enrollment_in_progress', 'no se puede tener dos cursos a la vez');

select is((select count(*)::int from students where dni = '30123456'),
  1, 'con el mismo DNI se reutiliza al alumno');

select throws_ok(
  $$select create_web_purchase('Otro Nombre', '3624999999', '30123456', 'otro@test.com',
      'c3000000-0000-0000-0000-000000000003', 'efectivo')$$,
  'P0001', 'enrollment_in_progress', 'con un DNI ajeno tampoco se crea otro pedido');

select is((select nombre_completo || '|' || email from students where dni = '30123456'),
  'Ana Pérez|ana@test.com', 'los datos de un alumno existente no se pisan desde la web');

select throws_ok(
  $$select create_web_purchase('Carla Ruiz', '3624333444', '27333444', 'carla@test.com',
      'c3000000-0000-0000-0000-000000000003', 'tarjeta')$$,
  'P0001', 'invalid_method', 'la tarjeta no se compra por este flujo');

select throws_ok(
  $$select create_web_purchase('Carla Ruiz', '3624333444', '27333444', 'carla@test.com',
      'c9000000-0000-0000-0000-000000000009', 'efectivo')$$,
  'P0001', 'course_not_found', 'no se puede comprar un curso inactivo');

select is((select count(*)::int from students where dni = '27333444'),
  0, 'si falla el pedido no queda ningún alumno suelto');

select throws_ok($$select create_web_purchase('  ', '3624333444', '27333444', 'c@test.com',
    'c3000000-0000-0000-0000-000000000003', 'efectivo')$$,
  'P0001', 'invalid_name', 'rechaza un nombre vacío');
select throws_ok($$select create_web_purchase('Carla Ruiz', '123', '27333444', 'c@test.com',
    'c3000000-0000-0000-0000-000000000003', 'efectivo')$$,
  'P0001', 'invalid_phone', 'rechaza un teléfono demasiado corto');
select throws_ok($$select create_web_purchase('Carla Ruiz', '3624333444', '12', 'c@test.com',
    'c3000000-0000-0000-0000-000000000003', 'efectivo')$$,
  'P0001', 'invalid_dni', 'rechaza un DNI inválido');
select throws_ok($$select create_web_purchase('Carla Ruiz', '3624333444', '27333444', 'no-es-email',
    'c3000000-0000-0000-0000-000000000003', 'efectivo')$$,
  'P0001', 'invalid_email', 'rechaza un email inválido');
select throws_ok($$select create_web_purchase('Carla Ruiz', '3624333444', '27333444', '',
    'c3000000-0000-0000-0000-000000000003', 'efectivo')$$,
  'P0001', 'invalid_email', 'el email es obligatorio');

-- ---------------------------------------------------------------------------
-- 2) Confirmar el pago
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select schedule_enrollment((select id from c1),
      array[pg_temp.slot(0, '08:00'), pg_temp.slot(1, '08:00'), pg_temp.slot(2, '08:00')])$$,
  'P0001', 'enrollment_not_active', 'sin pago confirmado no se pueden elegir turnos');

select confirm_payment((select id from c1));

select is((select estado::text from enrollments where id = (select id from c1)),
  'active', 'al confirmar el pago la inscripción queda activa');

select throws_ok($$select confirm_payment((select id from c1))$$,
  'P0001', 'enrollment_not_confirmable', 'no se puede confirmar dos veces');

select cancel_enrollment((select id from c2));
select throws_ok($$select confirm_payment((select id from c2))$$,
  'P0001', 'enrollment_not_confirmable', 'una inscripción cancelada no se confirma');

-- ---------------------------------------------------------------------------
-- 3) Elegir los turnos
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select schedule_enrollment((select id from c1), array[pg_temp.slot(0, '08:00')])$$,
  'P0001', 'wrong_lesson_count', 'hay que elegir todas las clases del curso');

select throws_ok(
  $$select schedule_enrollment((select id from c1),
      array[pg_temp.slot(0, '08:00'), pg_temp.slot(0, '08:00'), pg_temp.slot(1, '08:00')])$$,
  'P0001', 'duplicate_slots', 'no se puede repetir un turno');

select throws_ok(
  $$select schedule_enrollment((select id from c1),
      array[pg_temp.slot(0, '08:00'), pg_temp.slot(0, '08:40'), pg_temp.slot(1, '08:00')])$$,
  'P0001', 'student_day_conflict', 'una sola clase por día');

select is((select count(*)::int from lessons where enrollment_id = (select id from c1)),
  0, 'si algo falla no queda ninguna clase a medias');

select throws_ok(
  $$select schedule_enrollment((select id from c1),
      array[pg_temp.slot(0, '08:10'), pg_temp.slot(1, '08:00'), pg_temp.slot(2, '08:00')])$$,
  'P0001', 'slot_unavailable', 'un horario que no existe en la grilla se rechaza');

select schedule_enrollment((select id from c1),
  array[pg_temp.slot(2, '08:00'), pg_temp.slot(0, '08:00'), pg_temp.slot(1, '08:00')]);

select is((select count(*)::int from lessons where enrollment_id = (select id from c1) and status = 'scheduled'),
  3, 'las 3 clases quedan agendadas, sin retención');

select ok((select bool_and(hold_expires_at is null) from lessons where enrollment_id = (select id from c1)),
  'las clases agendadas no vencen');

select is((select array_agg(nro_clase order by starts_at) from lessons where enrollment_id = (select id from c1)),
  array[1, 2, 3], 'el número de clase sigue el orden de las fechas');

select throws_ok(
  $$select schedule_enrollment((select id from c1),
      array[pg_temp.slot(0, '09:20'), pg_temp.slot(1, '09:20'), pg_temp.slot(2, '09:20')])$$,
  'P0001', 'already_scheduled', 'no se pueden elegir los turnos dos veces');

select is((select count(*)::int from lessons where enrollment_id = (select id from c1)),
  3, 'las clases ya agendadas siguen siendo 3');

-- Otro alumno con pago confirmado quiere un turno que ya está tomado
create temp table c3 as
select create_web_purchase(
  'Dani Soto', '3624555666', '26555666', 'dani@test.com',
  'c3000000-0000-0000-0000-000000000003', 'efectivo') as id;
select confirm_payment((select id from c3));

select throws_ok(
  $$select schedule_enrollment((select id from c3),
      array[pg_temp.slot(0, '08:00'), pg_temp.slot(1, '09:20'), pg_temp.slot(2, '09:20')])$$,
  'P0001', 'slot_taken', 'no se puede tomar un turno que ya tiene otro alumno');

select is((select count(*)::int from lessons where enrollment_id = (select id from c3)),
  0, 'si un turno está tomado, no se agenda ninguna clase');

select lives_ok(
  $$select schedule_enrollment((select id from c3),
      array[pg_temp.slot(0, '08:40'), pg_temp.slot(1, '08:40'), pg_temp.slot(2, '08:40')])$$,
  'con turnos libres, el otro alumno puede agendar');

-- Liberar retenciones vencidas no toca las clases agendadas
select release_expired_holds();
select is((select count(*)::int from lessons where status = 'scheduled'),
  6, 'las clases agendadas no se liberan nunca solas');

-- ---------------------------------------------------------------------------
-- Permisos: solo el servidor (service_role) ejecuta estas funciones
-- ---------------------------------------------------------------------------
select is(has_function_privilege('anon',
    'create_web_purchase(text, text, text, text, uuid, payment_method)', 'execute'),
  false, 'el público no puede crear pedidos directamente');
select is(has_function_privilege('authenticated',
    'create_web_purchase(text, text, text, text, uuid, payment_method)', 'execute'),
  false, 'un usuario con sesión tampoco: el pedido pasa por el servidor');
select is(has_function_privilege('anon', 'confirm_payment(uuid)', 'execute'),
  false, 'el público no puede confirmar pagos');
select is(has_function_privilege('authenticated', 'confirm_payment(uuid)', 'execute'),
  false, 'un usuario con sesión tampoco puede confirmar pagos directamente');
select is(has_function_privilege('anon', 'schedule_enrollment(uuid, timestamptz[])', 'execute'),
  false, 'el público no puede agendar clases');
select is(has_function_privilege('authenticated', 'schedule_enrollment(uuid, timestamptz[])', 'execute'),
  false, 'un usuario con sesión tampoco: agenda a través del servidor, que verifica que sea suya');

select * from finish();
rollback;
