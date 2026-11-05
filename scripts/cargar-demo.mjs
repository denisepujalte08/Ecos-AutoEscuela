// Carga alumnos y clases de EJEMPLO para ver el calendario con vida. Solo para la base LOCAL.
//
//   npm run demo:cargar
//
// Se puede correr las veces que haga falta: borra primero lo que cargó antes (alumnos con email
// @demo.ecos.test) y vuelve a crearlo. Las clases se agendan con la tabla de clases, así que
// rigen las restricciones de la base (un solo auto, un día por alumno, etc.).
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Freno de seguridad: jamás cargar datos falsos en una base que no sea la de tu compu.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(url)) {
  console.error(`Me niego a cargar datos de ejemplo en "${url}": no es una base local.`);
  process.exit(1);
}
if (!clave) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
const falla = (contexto, error) => {
  console.error(`${contexto}: ${error.message}`);
  process.exit(1);
};

// --- 1) Limpiar lo cargado antes --------------------------------------------------------------
const { data: previos, error: errPrevios } = await supabase.from('students').select('id').like('email', '%@demo.ecos.test');
if (errPrevios) falla('No se pudo leer lo anterior', errPrevios);
const idsPrevios = (previos ?? []).map((s) => s.id);
if (idsPrevios.length > 0) {
  for (const tabla of ['lessons', 'payments']) {
    if (tabla === 'payments') continue; // los pagos cuelgan de la inscripción (on delete cascade)
    const { error } = await supabase.from(tabla).delete().in('student_id', idsPrevios);
    if (error) falla(`No se pudo limpiar ${tabla}`, error);
  }
  const { error: e1 } = await supabase.from('enrollments').delete().in('student_id', idsPrevios);
  if (e1) falla('No se pudo limpiar inscripciones', e1);
  const { error: e2 } = await supabase.from('students').delete().in('id', idsPrevios);
  if (e2) falla('No se pudo limpiar alumnos', e2);
}

// --- 2) Cursos --------------------------------------------------------------------------------
const { data: cursos, error: errCursos } = await supabase.from('courses').select('id, cantidad_clases, precio_lista').eq('activo', true);
if (errCursos) falla('No se pudieron leer los cursos', errCursos);
const curso = (n) => cursos.find((c) => c.cantidad_clases === n) ?? cursos[0];

// Profesor de la mañana y de la tarde, según sus horarios de atención.
const { data: reglas, error: errReglas } = await supabase.from('availability_rules').select('instructor_id, start_time');
if (errReglas) falla('No se pudieron leer los horarios', errReglas);
const profeManana = reglas.find((r) => r.start_time.startsWith('08'))?.instructor_id;
const profeTarde = reglas.find((r) => r.start_time.startsWith('14'))?.instructor_id;
if (!profeManana || !profeTarde) falla('Faltan los horarios de los profesores', { message: 'corré npm run db:reset' });

// --- 3) Grilla de turnos (hora local de Argentina = UTC-3) ------------------------------------
const MANANA = ['08:00', '08:40', '09:20', '10:00', '10:40', '11:20', '12:00'];
const TARDE = ['14:00', '14:40', '15:20', '16:00', '16:40', '17:20', '18:00'];
const HORAS = [...MANANA, ...TARDE];

const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
const sumar = (fecha, n) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const diaIso = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay() || 7;
const lunes = sumar(hoy, -(diaIso(hoy) - 1));

// Tres semanas: la actual y las dos siguientes, de lunes a viernes.
const dias = [];
for (let semana = 0; semana < 3; semana++) for (let d = 0; d < 5; d++) dias.push(sumar(lunes, semana * 7 + d));

// --- 4) Alumnos de ejemplo ---------------------------------------------------------------------
const ALUMNOS = [
  ['Lucía Fernández', 5], ['Martín Gómez', 7], ['Camila Rodríguez', 5], ['Joaquín Benítez', 5],
  ['Valentina Acosta', 7], ['Tomás Villalba', 5], ['Sofía Romero', 5], ['Nicolás Cardozo', 5],
  ['Agustina Duarte', 5], ['Facundo Medina', 5], ['Brisa Ledesma', 5], ['Lautaro Ojeda', 5],
];

const ocupado = new Set();
let creados = 0;

for (const [i, [nombre, nClases]] of ALUMNOS.entries()) {
  const { data: alumno, error: eAl } = await supabase
    .from('students')
    .insert({
      nombre_completo: nombre,
      dni: String(40000001 + i),
      telefono: `36245500${String(i).padStart(2, '0')}`,
      email: `alumno${i + 1}@demo.ecos.test`,
    })
    .select('id')
    .single();
  if (eAl) falla(`No se pudo crear a ${nombre}`, eAl);

  const c = curso(nClases);
  const { data: insc, error: eIn } = await supabase
    .from('enrollments')
    .insert({ student_id: alumno.id, course_id: c.id, metodo: 'transferencia', monto: Number(c.precio_lista) * 0.9, estado: 'active' })
    .select('id')
    .single();
  if (eIn) falla(`No se pudo crear la inscripción de ${nombre}`, eIn);

  // Un día por medio, a partir de un día distinto para cada alumno; el horario va rotando.
  const inicio = i % 4;
  const turnos = [];
  for (let k = 0; k < nClases; k++) {
    const dia = dias[inicio + k * 2];
    if (!dia) break;
    let h = (i * 3 + k * 5) % HORAS.length;
    for (let intento = 0; intento < HORAS.length && ocupado.has(`${dia}|${HORAS[h]}`); intento++) h = (h + 1) % HORAS.length;
    ocupado.add(`${dia}|${HORAS[h]}`);
    turnos.push(`${dia}T${HORAS[h]}:00-03:00`);
  }
  if (turnos.length !== nClases) {
    console.warn(`  ${nombre}: no entran ${nClases} clases en las tres semanas, se omite`);
    continue;
  }

  // Se insertan directo (en vez de `schedule_enrollment`) porque esa función no agenda días que ya pasaron
  // y esta semana ya empezó. Igual rige todo lo de la base: un solo auto, un día por alumno, etc.
  const filas = turnos.map((inicio, k) => {
    const hora = inicio.slice(11, 16);
    const desde = new Date(inicio);
    return {
      enrollment_id: insc.id,
      student_id: alumno.id,
      instructor_id: MANANA.includes(hora) ? profeManana : profeTarde,
      nro_clase: k + 1,
      kind: 'clase',
      status: 'scheduled',
      starts_at: desde.toISOString(),
      ends_at: new Date(desde.getTime() + 40 * 60000).toISOString(),
    };
  });
  const { error: eAg } = await supabase.from('lessons').insert(filas);
  if (eAg) falla(`No se pudieron agendar las clases de ${nombre}`, eAg);
  creados++;
}

// --- 5) Lo que ya pasó figura como dado (y alguna ausencia, para ver los estados) --------------
const ahora = new Date().toISOString();
const { data: pasadas, error: ePas } = await supabase
  .from('lessons')
  .select('id')
  .in('student_id', (await supabase.from('students').select('id').like('email', '%@demo.ecos.test')).data.map((s) => s.id))
  .lt('ends_at', ahora)
  .order('starts_at', { ascending: true });
if (ePas) falla('No se pudieron leer las clases pasadas', ePas);
for (const [n, l] of (pasadas ?? []).entries()) {
  const { error } = await supabase
    .from('lessons')
    .update(n % 7 === 6 ? { status: 'no_show' } : { status: 'done', done_at: ahora })
    .eq('id', l.id);
  if (error) falla('No se pudo marcar una clase como dada', error);
}

console.log(`Listo: ${creados} alumnos de ejemplo con sus clases (semana del ${lunes} y las dos siguientes).`);
console.log('Para quitarlos: npm run db:reset');
