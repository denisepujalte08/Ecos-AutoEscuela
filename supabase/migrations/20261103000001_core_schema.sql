-- ECOS: esquema núcleo (turnos, cursos, alumnos, inscripciones, clases, pagos, auditoría)
-- Zona horaria del negocio: America/Argentina/Buenos_Aires

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type user_role as enum ('admin', 'owner', 'student');
create type payment_method as enum ('tarjeta', 'transferencia', 'efectivo');
create type enrollment_status as enum (
  'pending_payment',  -- esperando pago online (tarjeta)
  'pending_review',   -- esperando confirmación manual (transferencia / efectivo)
  'active',
  'completed',
  'cancelled'
);
create type lesson_kind as enum ('clase', 'examen');
create type lesson_status as enum ('held', 'scheduled', 'done', 'cancelled', 'no_show');

-- ---------------------------------------------------------------------------
-- Configuración
-- ---------------------------------------------------------------------------
create table settings (
  key   text primary key,
  value jsonb not null
);

insert into settings (key, value) values
  ('slot_minutes',        '40'),    -- duración de cada clase
  ('hold_minutes_card',   '15'),    -- retención del turno mientras se paga online
  ('hold_minutes_manual', '1440'),  -- retención para transferencia / efectivo (pendiente: pregunta 15)
  ('min_advance_hours',   '12'),    -- anticipación mínima para reservar (pendiente: pregunta 6)
  ('max_advance_days',    '45');    -- anticipación máxima (pendiente: pregunta 6)

create function get_setting_int(p_key text) returns integer
language sql stable as $$
  select (value #>> '{}')::integer from settings where key = p_key
$$;

-- ---------------------------------------------------------------------------
-- Perfiles y personas
-- ---------------------------------------------------------------------------
create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role    user_role not null default 'student',
  nombre  text
);

create table instructors (
  id       uuid primary key default gen_random_uuid(),
  nombre   text not null,
  telefono text,
  activo   boolean not null default true
);

create table students (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users (id) on delete set null,
  nombre_completo  text not null,
  dni              text not null unique,
  fecha_nacimiento date not null,
  telefono         text not null,
  email            text not null,
  tutor            jsonb,  -- datos del tutor / autorización si es menor
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Disponibilidad
-- ---------------------------------------------------------------------------
create table availability_rules (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references instructors (id) on delete cascade,
  weekday       smallint not null check (weekday between 1 and 7), -- ISO: 1 = lunes
  start_time    time not null,
  end_time      time not null,
  check (end_time > start_time)
);

create table blackouts (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid references instructors (id) on delete cascade, -- null = todos (feriados, auto en taller)
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  motivo        text,
  check (ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- Cursos y precios
-- ---------------------------------------------------------------------------
create table courses (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  cantidad_clases integer not null check (cantidad_clases > 0),
  precio_lista    numeric(12, 2) not null check (precio_lista >= 0),
  incluye_examen  boolean not null default false,
  activo          boolean not null default true
);

create table payment_method_rules (
  metodo        payment_method primary key,
  descuento_pct numeric(5, 2) not null check (descuento_pct between 0 and 100)
);

insert into payment_method_rules (metodo, descuento_pct) values
  ('tarjeta', 0), ('transferencia', 10), ('efectivo', 15);

-- ---------------------------------------------------------------------------
-- Inscripciones, clases, pagos
-- ---------------------------------------------------------------------------
create table enrollments (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id),
  course_id  uuid not null references courses (id),
  metodo     payment_method not null,
  monto      numeric(12, 2) not null check (monto >= 0),
  estado     enrollment_status not null,
  created_at timestamptz not null default now()
);

create table lessons (
  id              uuid primary key default gen_random_uuid(),
  enrollment_id   uuid not null references enrollments (id) on delete cascade,
  student_id      uuid not null references students (id),
  instructor_id   uuid not null references instructors (id),
  nro_clase       integer check (nro_clase > 0),
  kind            lesson_kind not null default 'clase',
  status          lesson_status not null,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  fecha_local     date generated always as
                    ((starts_at at time zone 'America/Argentina/Buenos_Aires')::date) stored,
  hold_expires_at timestamptz,
  done_at         timestamptz,
  done_by         uuid references auth.users (id),
  check (ends_at > starts_at),
  check (kind = 'examen' or nro_clase is not null),
  check ((status = 'held') = (hold_expires_at is not null))
);

-- Un solo auto: ninguna clase activa puede superponerse con otra.
alter table lessons add constraint lessons_single_car
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
  where (status in ('held', 'scheduled', 'done'));

-- Una clase por día por alumno.
create unique index lessons_one_per_day
  on lessons (student_id, fecha_local)
  where kind = 'clase' and status in ('held', 'scheduled', 'done');

-- Número de clase único por inscripción.
create unique index lessons_unique_nro
  on lessons (enrollment_id, nro_clase)
  where kind = 'clase';

create index lessons_starts_at_idx on lessons (starts_at);
create index lessons_hold_idx on lessons (hold_expires_at) where status = 'held';

create table payments (
  id                  uuid primary key default gen_random_uuid(),
  enrollment_id       uuid not null references enrollments (id) on delete cascade,
  proveedor           text not null,  -- 'mercadopago', 'unicobros', 'transferencia', 'efectivo'
  provider_payment_id text,
  monto               numeric(12, 2) not null,
  estado              text not null,  -- pending, pending_review, approved, rejected
  comprobante_path    text,           -- Supabase Storage (privado)
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  unique (proveedor, provider_payment_id)
);

-- ---------------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------------
create table audit_log (
  id        bigint generated always as identity primary key,
  at        timestamptz not null default now(),
  usuario   uuid,
  tabla     text not null,
  operacion text not null,
  fila_id   text,
  antes     jsonb,
  despues   jsonb
);

create function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (usuario, tabla, operacion, fila_id, antes, despues)
  values (
    auth.uid(),
    tg_table_name,
    tg_op,
    coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id')),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger audit_students     after insert or update or delete on students     for each row execute function audit_trigger();
create trigger audit_enrollments  after insert or update or delete on enrollments  for each row execute function audit_trigger();
create trigger audit_lessons      after insert or update or delete on lessons      for each row execute function audit_trigger();
create trigger audit_payments     after insert or update or delete on payments     for each row execute function audit_trigger();
create trigger audit_courses      after insert or update or delete on courses      for each row execute function audit_trigger();
create trigger audit_blackouts    after insert or update or delete on blackouts    for each row execute function audit_trigger();
create trigger audit_availability after insert or update or delete on availability_rules for each row execute function audit_trigger();

-- ---------------------------------------------------------------------------
-- RLS: todo cerrado por defecto. Las políticas se agregan en migraciones posteriores.
-- El servidor (service role) y las funciones security definer son los únicos accesos.
-- ---------------------------------------------------------------------------
alter table settings            enable row level security;
alter table profiles            enable row level security;
alter table instructors         enable row level security;
alter table students            enable row level security;
alter table availability_rules  enable row level security;
alter table blackouts           enable row level security;
alter table courses             enable row level security;
alter table payment_method_rules enable row level security;
alter table enrollments         enable row level security;
alter table lessons             enable row level security;
alter table payments            enable row level security;
alter table audit_log           enable row level security;
