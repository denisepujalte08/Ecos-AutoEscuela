-- Datos de desarrollo (se cargan con `npm run db:reset`).
-- Supuestos a confirmar con el cliente: ver docs/03-preguntas-pendientes.md

insert into instructors (id, nombre) values
  ('a0000000-0000-0000-0000-00000000000a', 'Profesor mañana'),
  ('b0000000-0000-0000-0000-00000000000b', 'Profesor tarde');

-- Lunes a viernes. Horarios supuestos (pregunta 7): mañana 08:00-13:00, tarde 14:00-19:00.
insert into availability_rules (instructor_id, weekday, start_time, end_time)
select 'a0000000-0000-0000-0000-00000000000a'::uuid, d, '08:00'::time, '13:00'::time from generate_series(1, 5) d
union all
select 'b0000000-0000-0000-0000-00000000000b'::uuid, d, '14:00'::time, '19:00'::time from generate_series(1, 5) d;

-- Precios de lista (cartel). El curso de 10 clases queda inactivo hasta conocer su precio (pregunta 1).
insert into courses (nombre, cantidad_clases, precio_lista, incluye_examen, activo) values
  ('Curso de 5 clases',  5, 165000, false, true),
  ('Curso de 7 clases',  7, 230000, false, true),
  ('Curso de 10 clases', 10, 0,      true,  false);
