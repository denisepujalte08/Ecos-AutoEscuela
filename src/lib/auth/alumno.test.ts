import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminClient } from '@/lib/db/server';

// Los clientes reales (cookies de Next, variables de entorno) nunca se crean en estos tests.
vi.mock('./session', () => ({
  createSessionClient: () => {
    throw new Error('Variables de entorno inválidas o ausentes (públicas)');
  },
}));
vi.mock('@/lib/db/server', () => ({
  createAdminClient: () => {
    throw new Error('Variables de entorno inválidas o ausentes (servidor)');
  },
}));

import { fichaCompleta, leerTutor, obtenerAlumno } from './alumno';
import { MENSAJE_ENLACE_ENVIADO, pedirEnlace } from './enlace';
import { guardarFicha, type DatosFicha } from './ficha';
import type { SessionClient } from './session';

afterEach(() => vi.restoreAllMocks());

const ALUMNO_ID = 'a1000000-0000-4000-8000-000000000001';

function fakeSession(opciones: { usuario?: { id: string } | null; alumno?: unknown; signIn?: { error: unknown } } = {}) {
  const usuario = 'usuario' in opciones ? opciones.usuario : { id: 'u1' };
  const maybeSingle = vi.fn().mockResolvedValue({ data: opciones.alumno ?? null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const from = vi.fn(() => ({ select: () => ({ eq }) }));
  const signInWithOtp = vi.fn().mockResolvedValue(opciones.signIn ?? { error: null });
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: usuario }, error: null }), signInWithOtp },
    from,
  } as unknown as SessionClient;
  return { client, from, eq, signInWithOtp };
}

const FILA = {
  id: ALUMNO_ID,
  nombre_completo: 'Ana Pérez',
  dni: '30111222',
  email: 'ana@test.com',
  telefono: '3624123456',
  fecha_nacimiento: null,
  tutor: null,
};

describe('obtenerAlumno', () => {
  it('devuelve la ficha del alumno de la sesión, buscándola por su usuario', async () => {
    const { client, eq } = fakeSession({ alumno: FILA });
    await expect(obtenerAlumno(client)).resolves.toEqual({
      id: ALUMNO_ID,
      nombre: 'Ana Pérez',
      dni: '30111222',
      email: 'ana@test.com',
      telefono: '3624123456',
      fechaNacimiento: null,
      tutor: null,
    });
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('sin sesión devuelve null y ni consulta la ficha', async () => {
    const { client, from } = fakeSession({ usuario: null, alumno: FILA });
    await expect(obtenerAlumno(client)).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it('un usuario sin ficha de alumno (por ejemplo, del personal) devuelve null', async () => {
    const { client } = fakeSession({ alumno: null });
    await expect(obtenerAlumno(client)).resolves.toBeNull();
  });
});

describe('leerTutor / fichaCompleta', () => {
  it('leerTutor descarta lo que no tiene la forma esperada', () => {
    expect(leerTutor({ nombre: 'Rosa', dni: '1', telefono: '2' })).toEqual({ nombre: 'Rosa', dni: '1', telefono: '2' });
    for (const malo of [null, undefined, 'x', 3, {}, { nombre: 'Rosa' }, { nombre: 1, dni: '1', telefono: '2' }]) {
      expect(leerTutor(malo)).toBeNull();
    }
  });

  const tutor = { nombre: 'Rosa', dni: '20111222', telefono: '3624000000' };

  it('sin fecha de nacimiento la ficha está incompleta', () => {
    expect(fichaCompleta({ fechaNacimiento: null, tutor: null }, '2026-11-05')).toBe(false);
  });

  it('un adulto solo necesita la fecha de nacimiento', () => {
    expect(fichaCompleta({ fechaNacimiento: '1990-01-01', tutor: null }, '2026-11-05')).toBe(true);
    expect(fichaCompleta({ fechaNacimiento: '2008-11-05', tutor: null }, '2026-11-05')).toBe(true); // cumple 18 hoy
  });

  it('un menor necesita además los datos de su tutor', () => {
    expect(fichaCompleta({ fechaNacimiento: '2009-01-01', tutor: null }, '2026-11-05')).toBe(false);
    expect(fichaCompleta({ fechaNacimiento: '2009-01-01', tutor }, '2026-11-05')).toBe(true);
  });
});

describe('pedirEnlace', () => {
  it('manda el link sin crear cuentas nuevas', async () => {
    const { client, signInWithOtp } = fakeSession();
    const r = await pedirEnlace(' ana@test.com ', client);
    expect(r).toEqual({ ok: true, mensaje: MENSAJE_ENLACE_ENVIADO });
    expect(signInWithOtp).toHaveBeenCalledWith({ email: 'ana@test.com', options: { shouldCreateUser: false } });
  });

  it('responde igual si el email no tiene cuenta: no revela quién es alumno', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fakeSession({ signIn: { error: { status: 400, code: 'otp_disabled', message: 'Signups not allowed' } } });
    await expect(pedirEnlace('nadie@test.com', client)).resolves.toEqual({ ok: true, mensaje: MENSAJE_ENLACE_ENVIADO });
  });

  it('avisa si se superó el límite de envíos', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fakeSession({ signIn: { error: { status: 429, code: 'over_email_send_rate_limit', message: 'x' } } });
    const r = await pedirEnlace('ana@test.com', client);
    expect(r.ok).toBe(false);
  });

  it('valida el email antes de llamar al servicio', async () => {
    const { client, signInWithOtp } = fakeSession();
    await expect(pedirEnlace('no-es-email', client)).resolves.toMatchObject({ ok: false, mensaje: 'Escribí un email válido.' });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('si falta configuración, responde con un mensaje genérico y lo registra', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await pedirEnlace('ana@test.com');
    expect(r.ok).toBe(false);
    expect(log).toHaveBeenCalled();
  });
});

describe('guardarFicha', () => {
  const HOY = '2026-11-05';
  const adulto: DatosFicha = { fechaNacimiento: '1995-03-20', tutorNombre: '', tutorDni: '', tutorTelefono: '' };
  const menor: DatosFicha = { fechaNacimiento: '2010-03-20', tutorNombre: 'Rosa Gómez', tutorDni: '20.111.222', tutorTelefono: '362 412-3456' };

  function fakeAdmin(error: { message: string } | null = null) {
    const eq = vi.fn().mockResolvedValue({ error });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    return { client: { from } as unknown as AdminClient, update, eq, from };
  }

  it('guarda la fecha de un adulto, sin tutor, solo sobre el alumno indicado', async () => {
    const { client, update, eq, from } = fakeAdmin();
    await expect(guardarFicha(ALUMNO_ID, adulto, client, HOY)).resolves.toEqual({ estado: 'ok' });
    expect(from).toHaveBeenCalledWith('students');
    expect(update).toHaveBeenCalledWith({ fecha_nacimiento: '1995-03-20', tutor: null });
    expect(eq).toHaveBeenCalledWith('id', ALUMNO_ID);
  });

  it('un adulto no guarda datos de tutor aunque los mande', async () => {
    const { client, update } = fakeAdmin();
    await guardarFicha(ALUMNO_ID, { ...adulto, tutorNombre: 'Rosa', tutorDni: '1', tutorTelefono: '2' }, client, HOY);
    expect(update).toHaveBeenCalledWith({ fecha_nacimiento: '1995-03-20', tutor: null });
  });

  it('un menor guarda los datos de su tutor, con el DNI solo en dígitos', async () => {
    const { client, update } = fakeAdmin();
    await expect(guardarFicha(ALUMNO_ID, menor, client, HOY)).resolves.toEqual({ estado: 'ok' });
    expect(update).toHaveBeenCalledWith({
      fecha_nacimiento: '2010-03-20',
      tutor: { nombre: 'Rosa Gómez', dni: '20111222', telefono: '362 412-3456' },
    });
  });

  it('un menor sin tutor completo no se guarda y se marca cada dato que falta', async () => {
    const { client, update } = fakeAdmin();
    const r = await guardarFicha(ALUMNO_ID, { ...menor, tutorNombre: '', tutorDni: '12', tutorTelefono: '' }, client, HOY);
    expect(r.estado).toBe('error');
    if (r.estado === 'error') expect(Object.keys(r.campos).sort()).toEqual(['tutorDni', 'tutorNombre', 'tutorTelefono']);
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza fechas imposibles, futuras o absurdas', async () => {
    const { client, update } = fakeAdmin();
    for (const fecha of ['2026-02-31', '2027-01-01', '1800-01-01', 'ayer', '']) {
      const r = await guardarFicha(ALUMNO_ID, { ...adulto, fechaNacimiento: fecha }, client, HOY);
      expect(r).toMatchObject({ estado: 'error', campos: { fechaNacimiento: expect.any(String) } });
    }
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza un id de alumno inválido sin tocar la base', async () => {
    const { client, update } = fakeAdmin();
    expect((await guardarFicha('no-uuid', adulto, client, HOY)).estado).toBe('error');
    expect(update).not.toHaveBeenCalled();
  });

  it('si la base falla, registra el error y devuelve un mensaje genérico', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fakeAdmin({ message: 'connection reset' });
    const r = await guardarFicha(ALUMNO_ID, adulto, client, HOY);
    expect(r).toMatchObject({ estado: 'error' });
    expect(JSON.stringify(r)).not.toContain('connection reset');
    expect(log).toHaveBeenCalled();
  });
});

describe('verificarEnlace', () => {
  it('canjea un link válido por una sesión', async () => {
    const { verificarEnlace } = await import('./enlace');
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    const client = { auth: { verifyOtp } } as unknown as SessionClient;
    await expect(verificarEnlace('abc123', 'invite', client)).resolves.toEqual({ ok: true });
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'invite', token_hash: 'abc123' });
    await expect(verificarEnlace('abc123', 'email', client)).resolves.toEqual({ ok: true });
  });

  it('un link vencido o ya usado no es válido', async () => {
    const { verificarEnlace } = await import('./enlace');
    const client = { auth: { verifyOtp: vi.fn().mockResolvedValue({ error: { message: 'expired' } }) } } as unknown as SessionClient;
    await expect(verificarEnlace('abc123', 'email', client)).resolves.toEqual({ ok: false });
  });

  it('no acepta tipos que no sean invitación o ingreso (por ejemplo, recuperar contraseña) ni valores raros, sin llamar al servicio', async () => {
    const { verificarEnlace } = await import('./enlace');
    const verifyOtp = vi.fn();
    const client = { auth: { verifyOtp } } as unknown as SessionClient;
    for (const [token, tipo] of [['abc', 'recovery'], ['abc', 'magiclink'], ['abc', ''], ['', 'invite'], ['x'.repeat(301), 'invite']]) {
      await expect(verificarEnlace(token, tipo, client)).resolves.toEqual({ ok: false });
    }
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('si falta configuración devuelve no válido y lo registra', async () => {
    const { verificarEnlace } = await import('./enlace');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(verificarEnlace('abc', 'invite')).resolves.toEqual({ ok: false });
  });
});
