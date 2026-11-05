-- Tests de permisos por rol (RLS + grants). Ejecutar con: npm run db:test
--
-- Cada prueba corre una consulta "como" un rol y guarda el resultado en rls_res:
--   n >= 0   la consulta se ejecutó y afectó/devolvió n filas (0 = RLS filtró todo)
--   -1       permiso denegado (falta de privilegio o violación de política)
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

insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'owner@test.com'),
  ('0a000000-0000-0000-0000-000000000002', 'admin@test.com'),
  ('0a000000-0000-0000-0000-000000000003', 'alumno1@test.com'),
  ('0a000000-0000-0000-0000-000000000004', 'alumno2@test.com');

select is((select count(*)::int from profiles where user_id::text like '0a000000-%'),
  4, 'dar de alta un usuario crea su perfil automáticamente');
select is((select role from profiles where user_id = '0a000000-0000-0000-0000-000000000003'),
  'student'::user_role, 'todo usuario nuevo es alumno por defecto');

update profiles set role = 'owner' where user_id = '0a000000-0000-0000-0000-000000000001';
update profiles set role = 'admin' where user_id = '0a000000-0000-0000-0000-000000000002';

insert into instructors (id, nombre) values ('a0000000-0000-0000-0000-00000000000a', 'Profe');
insert into courses (id, nombre, cantidad_clases, precio_lista, activo) values
  ('c1000000-0000-0000-0000-000000000001', 'Curso activo',   1, 100000, true),
  ('c2000000-0000-0000-0000-000000000002', 'Curso inactivo', 1, 100000, false);

insert into students (id, user_id, nombre_completo, dni, fecha_nacimiento, telefono, email) values
  ('51000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000003', 'Alumno Uno', '1', '2000-01-01', '1', 'uno@test.com'),
  ('52000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000004', 'Alumno Dos', '2', '2000-01-01', '2', 'dos@test.com');

insert into enrollments (id, student_id, course_id, metodo, monto, estado) values
  ('e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'tarjeta', 100000, 'active'),
  ('e2000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'tarjeta', 100000, 'active');

insert into lessons (enrollment_id, student_id, instructor_id, nro_clase, status, starts_at, ends_at) values
  ('e1000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 1, 'scheduled', now() + interval '30 days', now() + interval '30 days 40 minutes'),
  ('e2000000-0000-0000-0000-000000000002', '52000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 1, 'scheduled', now() + interval '31 days', now() + interval '31 days 40 minutes');

insert into payments (enrollment_id, proveedor, monto, estado) values
  ('e1000000-0000-0000-0000-000000000001', 'mercadopago', 100000, 'approved'),
  ('e2000000-0000-0000-0000-000000000002', 'mercadopago', 100000, 'approved');

-- ---------------------------------------------------------------------------
-- Ayudas
-- ---------------------------------------------------------------------------
create temp table rls_res (k text primary key, v bigint);
grant all on rls_res to public;

create function pg_temp.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
end $$;

create function pg_temp.try(p_k text, p_sql text) returns void language plpgsql as $$
declare n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  insert into rls_res values (p_k, n);
exception when insufficient_privilege then
  insert into rls_res values (p_k, -1);
end $$;

-- ---------------------------------------------------------------------------
-- Público (sin sesión)
-- ---------------------------------------------------------------------------
select pg_temp.as_anon();
select pg_temp.try('anon_courses',     'select 1 from courses');
select pg_temp.try('anon_rules',       'select 1 from payment_method_rules');
select pg_temp.try('anon_students',    'select 1 from students');
select pg_temp.try('anon_enrollments', 'select 1 from enrollments');
select pg_temp.try('anon_lessons',     'select 1 from lessons');
select pg_temp.try('anon_payments',    'select 1 from payments');
select pg_temp.try('anon_settings',    'select 1 from settings');
select pg_temp.try('anon_profiles',    'select 1 from profiles');
select pg_temp.try('anon_audit',       'select 1 from audit_log');
select pg_temp.try('anon_insert_student',
  $$insert into students (nombre_completo, dni, fecha_nacimiento, telefono, email) values ('x','9','2000-01-01','1','x@x.com')$$);
select pg_temp.try('anon_free_slots',  'select 1 from get_free_slots(current_date, current_date)');
reset role;

select is((select v from rls_res where k = 'anon_courses'), 1::bigint, 'público: ve solo los cursos activos');
select is((select v from rls_res where k = 'anon_rules'), 4::bigint, 'público: ve las reglas de descuento (tarjeta, transferencia, efectivo y a coordinar)');
select is((select v from rls_res where k = 'anon_students'),    -1::bigint, 'público: no puede leer alumnos');
select is((select v from rls_res where k = 'anon_enrollments'), -1::bigint, 'público: no puede leer inscripciones');
select is((select v from rls_res where k = 'anon_lessons'),     -1::bigint, 'público: no puede leer clases');
select is((select v from rls_res where k = 'anon_payments'),    -1::bigint, 'público: no puede leer pagos');
select is((select v from rls_res where k = 'anon_settings'),    -1::bigint, 'público: no puede leer configuración');
select is((select v from rls_res where k = 'anon_profiles'),    -1::bigint, 'público: no puede leer perfiles');
select is((select v from rls_res where k = 'anon_audit'),       -1::bigint, 'público: no puede leer la auditoría');
select is((select v from rls_res where k = 'anon_insert_student'), -1::bigint, 'público: no puede crear alumnos');
select ok((select v from rls_res where k = 'anon_free_slots') >= 0, 'público: sí puede consultar turnos libres');

-- ---------------------------------------------------------------------------
-- Alumno 1
-- ---------------------------------------------------------------------------
select pg_temp.as_user('0a000000-0000-0000-0000-000000000003');
select pg_temp.try('s1_students',    'select 1 from students');
select pg_temp.try('s1_enrollments', 'select 1 from enrollments');
select pg_temp.try('s1_lessons',     'select 1 from lessons');
select pg_temp.try('s1_payments',    'select 1 from payments');
select pg_temp.try('s1_profiles',    'select 1 from profiles');
select pg_temp.try('s1_courses',     'select 1 from courses');
select pg_temp.try('s1_instructors', 'select 1 from instructors');
select pg_temp.try('s1_settings',    'select 1 from settings');
select pg_temp.try('s1_audit',       'select 1 from audit_log');
select pg_temp.try('s1_sees_other_enrollment', $$select 1 from enrollments where id = 'e2000000-0000-0000-0000-000000000002'$$);
select pg_temp.try('s1_sees_other_student',    $$select 1 from students where id = '52000000-0000-0000-0000-000000000002'$$);
select pg_temp.try('s1_update_other_student',  $$update students set telefono = 'hack' where id = '52000000-0000-0000-0000-000000000002'$$);
select pg_temp.try('s1_update_own_student',    $$update students set telefono = 'hack' where id = '51000000-0000-0000-0000-000000000001'$$);
select pg_temp.try('s1_insert_student',
  $$insert into students (nombre_completo, dni, fecha_nacimiento, telefono, email) values ('x','9','2000-01-01','1','x@x.com')$$);
select pg_temp.try('s1_update_enrollment',     $$update enrollments set monto = 1$$);
select pg_temp.try('s1_insert_lesson',
  $$insert into lessons (enrollment_id, student_id, instructor_id, nro_clase, status, starts_at, ends_at) values ('e1000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a',9,'scheduled', now() + interval '40 days', now() + interval '40 days 40 minutes')$$);
select pg_temp.try('s1_update_payment',       $$update payments set estado = 'approved'$$);
select pg_temp.try('s1_escalate_role',        $$update profiles set role = 'owner' where user_id = '0a000000-0000-0000-0000-000000000003'$$);
select pg_temp.try('s1_update_course',        $$update courses set precio_lista = 1$$);
select pg_temp.try('s1_delete_course',        $$delete from courses$$);
select pg_temp.try('s1_update_settings',      $$update settings set value = '1'$$);
reset role;

select is((select v from rls_res where k = 's1_students'),    1::bigint, 'alumno: ve solo su propia ficha');
select is((select v from rls_res where k = 's1_enrollments'), 1::bigint, 'alumno: ve solo su inscripción');
select is((select v from rls_res where k = 's1_lessons'),     1::bigint, 'alumno: ve solo sus clases');
select is((select v from rls_res where k = 's1_payments'),    1::bigint, 'alumno: ve solo sus pagos');
select is((select v from rls_res where k = 's1_profiles'),    1::bigint, 'alumno: ve solo su perfil');
select is((select v from rls_res where k = 's1_courses'),     1::bigint, 'alumno: ve solo cursos activos');
select is((select v from rls_res where k = 's1_instructors'), 0::bigint, 'alumno: no ve profesores (teléfonos)');
select is((select v from rls_res where k = 's1_settings'),    0::bigint, 'alumno: no ve configuración');
select is((select v from rls_res where k = 's1_audit'),       0::bigint, 'alumno: no ve auditoría');
select is((select v from rls_res where k = 's1_sees_other_enrollment'), 0::bigint, 'alumno: no ve la inscripción de otro alumno');
select is((select v from rls_res where k = 's1_sees_other_student'),    0::bigint, 'alumno: no ve la ficha de otro alumno');
select is((select v from rls_res where k = 's1_update_other_student'),  0::bigint, 'alumno: no puede modificar la ficha de otro');
select is((select v from rls_res where k = 's1_update_own_student'),    0::bigint, 'alumno: no edita su ficha directamente (va por el servidor)');
select is((select v from rls_res where k = 's1_insert_student'),       -1::bigint, 'alumno: no puede crear alumnos');
select is((select v from rls_res where k = 's1_update_enrollment'),    -1::bigint, 'alumno: no puede modificar inscripciones');
select is((select v from rls_res where k = 's1_insert_lesson'),        -1::bigint, 'alumno: no puede crear clases directamente');
select is((select v from rls_res where k = 's1_update_payment'),       -1::bigint, 'alumno: no puede tocar pagos');
select is((select v from rls_res where k = 's1_escalate_role'),         0::bigint, 'alumno: no puede cambiarse el rol');
select is((select role from profiles where user_id = '0a000000-0000-0000-0000-000000000003'),
  'student'::user_role, 'alumno: sigue siendo alumno tras intentar escalar privilegios');
select is((select v from rls_res where k = 's1_update_course'),         0::bigint, 'alumno: no puede cambiar precios');
select is((select v from rls_res where k = 's1_delete_course'),         0::bigint, 'alumno: no puede borrar cursos');
select is((select v from rls_res where k = 's1_update_settings'),       0::bigint, 'alumno: no puede cambiar la configuración');

-- ---------------------------------------------------------------------------
-- Alumno 2 (no ve lo del alumno 1)
-- ---------------------------------------------------------------------------
select pg_temp.as_user('0a000000-0000-0000-0000-000000000004');
select pg_temp.try('s2_enrollments',       'select 1 from enrollments');
select pg_temp.try('s2_sees_s1_enrollment', $$select 1 from enrollments where id = 'e1000000-0000-0000-0000-000000000001'$$);
select pg_temp.try('s2_sees_s1_payment',    $$select 1 from payments where enrollment_id = 'e1000000-0000-0000-0000-000000000001'$$);
reset role;

select is((select v from rls_res where k = 's2_enrollments'), 1::bigint, 'alumno 2: ve solo su inscripción');
select is((select v from rls_res where k = 's2_sees_s1_enrollment'), 0::bigint, 'alumno 2: no ve la inscripción del alumno 1');
select is((select v from rls_res where k = 's2_sees_s1_payment'),    0::bigint, 'alumno 2: no ve los pagos del alumno 1');

-- ---------------------------------------------------------------------------
-- Administración
-- ---------------------------------------------------------------------------
select pg_temp.as_user('0a000000-0000-0000-0000-000000000002');
select pg_temp.try('adm_students',    'select 1 from students');
select pg_temp.try('adm_enrollments', 'select 1 from enrollments');
select pg_temp.try('adm_payments',    'select 1 from payments');
select pg_temp.try('adm_courses',     'select 1 from courses');
select pg_temp.try('adm_settings',    'select 1 from settings');
select pg_temp.try('adm_audit',       'select 1 from audit_log');
select pg_temp.try('adm_insert_instructor', $$insert into instructors (nombre) values ('Nuevo')$$);
select pg_temp.try('adm_update_course',     $$update courses set precio_lista = 120000 where id = 'c1000000-0000-0000-0000-000000000001'$$);
select pg_temp.try('adm_insert_blackout',
  $$insert into blackouts (starts_at, ends_at, motivo) values (now() + interval '50 days', now() + interval '51 days', 'Feriado')$$);
select pg_temp.try('adm_update_settings',   $$update settings set value = '1'$$);
select pg_temp.try('adm_update_rules',      $$update payment_method_rules set descuento_pct = 50$$);
select pg_temp.try('adm_change_role',       $$update profiles set role = 'admin' where user_id = '0a000000-0000-0000-0000-000000000004'$$);
select pg_temp.try('adm_update_enrollment', $$update enrollments set monto = 1$$);
select pg_temp.try('adm_insert_lesson',
  $$insert into lessons (enrollment_id, student_id, instructor_id, nro_clase, status, starts_at, ends_at) values ('e1000000-0000-0000-0000-000000000001','51000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-00000000000a',9,'scheduled', now() + interval '40 days', now() + interval '40 days 40 minutes')$$);
reset role;

select is((select v from rls_res where k = 'adm_students'),    2::bigint, 'admin: ve todos los alumnos');
select is((select v from rls_res where k = 'adm_enrollments'), 2::bigint, 'admin: ve todas las inscripciones');
select is((select v from rls_res where k = 'adm_payments'),    2::bigint, 'admin: ve todos los pagos');
select is((select v from rls_res where k = 'adm_courses'),     2::bigint, 'admin: ve cursos activos e inactivos');
select is((select v from rls_res where k = 'adm_settings'),    5::bigint, 'admin: lee la configuración');
select is((select v from rls_res where k = 'adm_audit'),       0::bigint, 'admin: no lee la auditoría');
select is((select v from rls_res where k = 'adm_insert_instructor'), 1::bigint, 'admin: puede crear profesores');
select is((select v from rls_res where k = 'adm_update_course'),     1::bigint, 'admin: puede editar cursos');
select is((select v from rls_res where k = 'adm_insert_blackout'),   1::bigint, 'admin: puede cargar bloqueos');
select is((select v from rls_res where k = 'adm_update_settings'),   0::bigint, 'admin: no puede cambiar la configuración');
select is((select v from rls_res where k = 'adm_update_rules'),      0::bigint, 'admin: no puede cambiar descuentos');
select is((select v from rls_res where k = 'adm_change_role'),       0::bigint, 'admin: no puede cambiar roles');
select is((select v from rls_res where k = 'adm_update_enrollment'), -1::bigint, 'admin: no modifica inscripciones directamente (usa funciones)');
select is((select v from rls_res where k = 'adm_insert_lesson'),     -1::bigint, 'admin: no crea clases directamente (usa funciones)');

-- ---------------------------------------------------------------------------
-- Dueño
-- ---------------------------------------------------------------------------
select pg_temp.as_user('0a000000-0000-0000-0000-000000000001');
select pg_temp.try('own_students',        'select 1 from students');
select pg_temp.try('own_audit',           'select 1 from audit_log');
select pg_temp.try('own_update_settings', $$update settings set value = '45' where key = 'max_advance_days'$$);
select pg_temp.try('own_update_rules',    $$update payment_method_rules set descuento_pct = 10 where metodo = 'transferencia'$$);
select pg_temp.try('own_change_role',     $$update profiles set role = 'admin' where user_id = '0a000000-0000-0000-0000-000000000004'$$);
select pg_temp.try('own_delete_audit',    $$delete from audit_log$$);
select pg_temp.try('own_insert_audit',    $$insert into audit_log (tabla, operacion) values ('x', 'y')$$);
reset role;

select is((select v from rls_res where k = 'own_students'), 2::bigint, 'dueño: ve todos los alumnos');
select ok((select v from rls_res where k = 'own_audit') > 0, 'dueño: lee la auditoría');
select is((select v from rls_res where k = 'own_update_settings'), 1::bigint, 'dueño: puede cambiar la configuración');
select is((select v from rls_res where k = 'own_update_rules'),    1::bigint, 'dueño: puede cambiar descuentos');
select is((select v from rls_res where k = 'own_change_role'),     1::bigint, 'dueño: puede cambiar roles');
select is((select v from rls_res where k = 'own_delete_audit'),   -1::bigint, 'dueño: no puede borrar la auditoría');
select is((select v from rls_res where k = 'own_insert_audit'),   -1::bigint, 'dueño: no puede falsificar la auditoría');

-- ---------------------------------------------------------------------------
-- Las funciones de reserva no son ejecutables por usuarios finales
-- ---------------------------------------------------------------------------
select is(has_function_privilege('authenticated', 'create_enrollment(uuid, uuid, payment_method, timestamptz[])', 'execute'),
  false, 'authenticated no puede ejecutar create_enrollment');
select is(has_function_privilege('authenticated', 'confirm_enrollment(uuid)', 'execute'),
  false, 'authenticated no puede ejecutar confirm_enrollment');
select is(has_function_privilege('authenticated', 'cancel_enrollment(uuid)', 'execute'),
  false, 'authenticated no puede ejecutar cancel_enrollment');
select is(has_function_privilege('authenticated', 'mark_lesson_done(uuid, uuid)', 'execute'),
  false, 'authenticated no puede ejecutar mark_lesson_done');
select is(has_function_privilege('authenticated', 'suggest_slots(uuid, timestamptz, timestamptz[], integer)', 'execute'),
  false, 'authenticated no puede ejecutar suggest_slots');
select is(has_function_privilege('authenticated', 'release_expired_holds()', 'execute'),
  false, 'authenticated no puede ejecutar release_expired_holds');

select * from finish();
rollback;
