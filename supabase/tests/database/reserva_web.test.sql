-- Tests de la reserva desde la web (pgTAP). Ejecutar con: npm run db:test
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
  ('c3000000-0000-0000-0000-000000000003', 'Curso de 3',  3, 100000, true),
  ('c9000000-0000-0000-0000-000000000009', 'Curso inactivo', 3, 100000, false);

-- Lunes dentro de la ventana de reserva (14 a 20 días desde hoy)
create temp table ctx as
select date_trunc('week', ((now() at time zone 'America/Argentina/Buenos_Aires')::date + 14)::timestamp)::date as monday;

create function pg_temp.slot(p_day int, p_time time) returns timestamptz
language sql stable as $$
  select ((select monday from ctx) + p_day + p_time) at time zone 'America/Argentina/Buenos_Aires'
$$;

-- ---------------------------------------------------------------------------
-- Medio de pago "a coordinar"
-- ---------------------------------------------------------------------------
select is(
  (select descuento_pct from payment_method_rules where metodo = 'a_coordinar'),
  0::numeric, '"a coordinar" no aplica ningún descuento');

-- ---------------------------------------------------------------------------
-- Reserva feliz
-- ---------------------------------------------------------------------------
create temp table r1 as
select create_web_reservation(
  '  Ana Pérez ', '+54 9 362 485-5645', null, 'c3000000-0000-0000-0000-000000000003',
  array[pg_temp.slot(0, '08:00'), pg_temp.slot(1, '08:00'), pg_temp.slot(2, '08:00')]) as id;

select is((select metodo::text from enrollments where id = (select id from r1)),
  'a_coordinar', 'la reserva queda con el medio de pago "a coordinar"');

select is((select estado::text from enrollments where id = (select id from r1)),
  'pending_review', 'la reserva queda pendiente de revisión');

select is((select monto from enrollments where id = (select id from r1)),
  100000.00::numeric(12, 2), 'el monto es el precio de lista, sin descuento');

select is((select count(*)::int from lessons where enrollment_id = (select id from r1) and status = 'held'),
  3, 'los 3 turnos quedan retenidos');

select ok(
  (select min(hold_expires_at) from lessons where enrollment_id = (select id from r1))
    between now() + interval '23 hours' and now() + interval '25 hours',
  'los turnos se retienen unas 24 horas');

select is((select nombre_completo from students where telefono = '5493624855645'),
  'Ana Pérez', 'el nombre se guarda sin espacios de más');

select is((select telefono from students where nombre_completo = 'Ana Pérez'),
  '5493624855645', 'el teléfono se guarda solo con dígitos');

select ok(
  (select dni is null and fecha_nacimiento is null and email is null
   from students where telefono = '5493624855645'),
  'DNI, fecha de nacimiento y email quedan vacíos hasta completar la ficha');

-- ---------------------------------------------------------------------------
-- Límite: una sola reserva pendiente por teléfono
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select create_web_reservation('Ana Pérez', '+54 9 (362) 485-5645 ', null, 'c3000000-0000-0000-0000-000000000003',
      array[pg_temp.slot(0, '09:20'), pg_temp.slot(1, '09:20'), pg_temp.slot(2, '09:20')])$$,
  'P0001', 'too_many_pending', 'no se puede tener dos reservas pendientes con el mismo teléfono');

-- ---------------------------------------------------------------------------
-- Cancelar permite reservar de nuevo, y se reutiliza al alumno
-- ---------------------------------------------------------------------------
select cancel_enrollment((select id from r1));

create temp table r2 as
select create_web_reservation(
  'ana pérez', '5493624855645', 'ana@test.com', 'c3000000-0000-0000-0000-000000000003',
  array[pg_temp.slot(0, '08:00'), pg_temp.slot(1, '08:00'), pg_temp.slot(2, '08:00')]) as id;

select is((select count(*)::int from students where telefono = '5493624855645'),
  1, 'con el mismo teléfono y nombre se reutiliza al alumno');

select is((select email from students where telefono = '5493624855645'),
  'ana@test.com', 'si ahora deja un email, se completa en la ficha');

-- ---------------------------------------------------------------------------
-- Una reserva vencida no bloquea una nueva
-- ---------------------------------------------------------------------------
update lessons set hold_expires_at = now() - interval '1 minute' where enrollment_id = (select id from r2);

select lives_ok(
  $$select create_web_reservation('Ana Pérez', '5493624855645', null, 'c3000000-0000-0000-0000-000000000003',
      array[pg_temp.slot(0, '09:20'), pg_temp.slot(1, '09:20'), pg_temp.slot(2, '09:20')])$$,
  'una reserva con las retenciones vencidas ya no cuenta como pendiente');

-- ---------------------------------------------------------------------------
-- Validación de datos
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select create_web_reservation('  ', '3624000001', null, 'c3000000-0000-0000-0000-000000000003',
      array[pg_temp.slot(0, '10:00'), pg_temp.slot(1, '10:00'), pg_temp.slot(2, '10:00')])$$,
  'P0001', 'invalid_name', 'rechaza un nombre vacío');

select throws_ok(
  $$select create_web_reservation('Luis Gómez', '123', null, 'c3000000-0000-0000-0000-000000000003',
      array[pg_temp.slot(0, '10:00'), pg_temp.slot(1, '10:00'), pg_temp.slot(2, '10:00')])$$,
  'P0001', 'invalid_phone', 'rechaza un teléfono demasiado corto');

select throws_ok(
  $$select create_web_reservation('Luis Gómez', '3624000001', 'no-es-un-email', 'c3000000-0000-0000-0000-000000000003',
      array[pg_temp.slot(0, '10:00'), pg_temp.slot(1, '10:00'), pg_temp.slot(2, '10:00')])$$,
  'P0001', 'invalid_email', 'rechaza un email con formato inválido');

-- ---------------------------------------------------------------------------
-- Todo o nada: si falla la reserva no queda ningún alumno suelto
-- ---------------------------------------------------------------------------
select throws_ok(
  $$select create_web_reservation('Luis Gómez', '3624000001', null, 'c9000000-0000-0000-0000-000000000009',
      array[pg_temp.slot(0, '10:00'), pg_temp.slot(1, '10:00'), pg_temp.slot(2, '10:00')])$$,
  'P0001', 'course_not_found', 'no se puede reservar un curso inactivo');

select is((select count(*)::int from students where telefono = '3624000001'),
  0, 'si el curso no existe, no se crea el alumno');

-- El turno lunes 09:20 quedó tomado por la reserva anterior de Ana
select throws_ok(
  $$select create_web_reservation('Luis Gómez', '3624000001', null, 'c3000000-0000-0000-0000-000000000003',
      array[pg_temp.slot(0, '09:20'), pg_temp.slot(1, '10:00'), pg_temp.slot(2, '10:00')])$$,
  'P0001', 'slot_taken', 'no se puede tomar un turno ya retenido');

select is((select count(*)::int from students where telefono = '3624000001'),
  0, 'si un turno está tomado, no se crea el alumno');

-- ---------------------------------------------------------------------------
-- Permisos: solo el servidor (service_role) puede reservar
-- ---------------------------------------------------------------------------
select is(has_function_privilege('anon',
    'create_web_reservation(text, text, text, uuid, timestamptz[])', 'execute'),
  false, 'el público no puede ejecutar la reserva directamente');

select is(has_function_privilege('authenticated',
    'create_web_reservation(text, text, text, uuid, timestamptz[])', 'execute'),
  false, 'un usuario con sesión tampoco: la reserva pasa por el servidor');

select * from finish();
rollback;
