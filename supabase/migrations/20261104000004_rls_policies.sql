-- ECOS: permisos por rol (RLS + grants)
--
-- Defensa en dos capas:
--   1. GRANTs mínimos: cada rol de Postgres (anon / authenticated) solo tiene los
--      privilegios de tabla que necesita.
--   2. RLS: dentro de lo permitido, filtra filas según el usuario.
--
-- Roles de la aplicación (profiles.role):
--   owner    dueño: todo, más configuración, roles y auditoría
--   admin    administración: gestión operativa (lectura total, altas/bajas de config)
--   student  alumno: solo lo propio
--   (anon)   público: cursos activos, reglas de pago y turnos libres (RPC)
--
-- Las escrituras sobre inscripciones, clases y pagos NO se hacen por tablas:
-- pasan por las funciones SQL (create_enrollment, confirm_enrollment, ...) que
-- solo puede ejecutar el servidor (service_role). El servidor ignora RLS.
--
-- Supuesto a confirmar con el cliente (pregunta 38): administración puede gestionar
-- cursos, horarios, bloqueos y alumnos; solo el dueño toca settings, reglas de
-- pago, roles y auditoría.

-- ---------------------------------------------------------------------------
-- Alta de usuario -> perfil de alumno por defecto (nunca privilegiado)
-- ---------------------------------------------------------------------------
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (user_id, role, nombre)
  values (new.id, 'student', new.raw_user_meta_data ->> 'nombre')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Funciones auxiliares (security definer: evitan recursión de RLS sobre profiles)
-- ---------------------------------------------------------------------------
create function app_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where user_id = auth.uid()
$$;

create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('admin', 'owner'), false)
$$;

create function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() = 'owner', false)
$$;

create function my_student_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from students where user_id = auth.uid()
$$;

revoke execute on function app_role(), is_staff(), is_owner(), my_student_ids() from public;
grant  execute on function app_role(), is_staff(), is_owner(), my_student_ids() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privilegios de tabla (capa 1)
-- ---------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Público: solo lo que muestra el sitio.
grant select on courses, payment_method_rules to anon, authenticated;

-- Usuarios autenticados: lectura (RLS filtra filas)...
grant select on
  profiles, settings, instructors, students, availability_rules, blackouts,
  enrollments, lessons, payments, audit_log
  to authenticated;

-- ...y escritura solo donde el panel edita tablas directamente.
grant insert, update, delete on instructors, availability_rules, blackouts, courses, students to authenticated;
grant update on settings, payment_method_rules, profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas (capa 2)
-- ---------------------------------------------------------------------------

-- courses: el público ve los activos (policy ya creada); el staff gestiona todos.
create policy courses_staff_all on courses
  for all to authenticated using (is_staff()) with check (is_staff());

-- payment_method_rules: lectura pública (policy ya creada); solo el dueño edita.
create policy payment_rules_owner_update on payment_method_rules
  for update to authenticated using (is_owner()) with check (is_owner());

-- settings: el staff lee; solo el dueño modifica.
create policy settings_staff_read on settings
  for select to authenticated using (is_staff());
create policy settings_owner_update on settings
  for update to authenticated using (is_owner()) with check (is_owner());

-- profiles: cada uno ve el suyo; el staff ve todos; solo el dueño cambia roles.
create policy profiles_read on profiles
  for select to authenticated using (user_id = auth.uid() or is_staff());
create policy profiles_owner_update on profiles
  for update to authenticated using (is_owner()) with check (is_owner());

-- Tablas de configuración operativa: solo el staff.
create policy instructors_staff_all on instructors
  for all to authenticated using (is_staff()) with check (is_staff());
create policy availability_staff_all on availability_rules
  for all to authenticated using (is_staff()) with check (is_staff());
create policy blackouts_staff_all on blackouts
  for all to authenticated using (is_staff()) with check (is_staff());

-- students: el alumno ve su ficha; el staff gestiona todas.
create policy students_read on students
  for select to authenticated using (is_staff() or user_id = auth.uid());
create policy students_staff_write on students
  for all to authenticated using (is_staff()) with check (is_staff());

-- enrollments / lessons / payments: lectura propia o staff. Sin escritura directa.
create policy enrollments_read on enrollments
  for select to authenticated
  using (is_staff() or student_id in (select my_student_ids()));

create policy lessons_read on lessons
  for select to authenticated
  using (is_staff() or student_id in (select my_student_ids()));

create policy payments_read on payments
  for select to authenticated
  using (
    is_staff()
    or enrollment_id in (select id from enrollments where student_id in (select my_student_ids()))
  );

-- audit_log: solo el dueño lee. Nadie escribe (solo los triggers).
create policy audit_owner_read on audit_log
  for select to authenticated using (is_owner());
