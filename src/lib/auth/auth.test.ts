import { afterEach, describe, expect, it, vi } from 'vitest';

// El cliente real (cookies de Next) nunca se crea en estos tests.
vi.mock('./session', () => ({
  createSessionClient: () => {
    throw new Error('Variables de entorno inválidas o ausentes (públicas)');
  },
}));

import { iniciarSesionPersonal, MENSAJE_CREDENCIALES } from './login';
import { obtenerPersonal } from './personal';
import type { SessionClient } from './session';

type Opciones = {
  usuario?: { id: string; email?: string } | null;
  errorGetUser?: boolean;
  rol?: string | null;
  errorLogin?: { status?: number; code?: string } | null;
};

/** Cliente simulado de Supabase con sesión: auth + lectura de `profiles`. */
function fakeSession({ usuario = { id: 'u1', email: 'a@b.com' }, errorGetUser = false, rol = null, errorLogin = null }: Opciones = {}) {
  const signInWithPassword = vi.fn().mockResolvedValue({ error: errorLogin });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const getUser = vi.fn().mockResolvedValue({ data: { user: usuario }, error: errorGetUser ? { message: 'jwt' } : null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: rol ? { role: rol } : null });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const client = { auth: { getUser, signInWithPassword, signOut }, from } as unknown as SessionClient;
  return { client, signInWithPassword, signOut, from, eq };
}

afterEach(() => vi.restoreAllMocks());

describe('obtenerPersonal', () => {
  it('devuelve a la administración con su rol', async () => {
    const { client, from, eq } = fakeSession({ rol: 'admin' });
    await expect(obtenerPersonal(client)).resolves.toEqual({ id: 'u1', email: 'a@b.com', rol: 'admin' });
    expect(from).toHaveBeenCalledWith('profiles');
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('devuelve al dueño', async () => {
    const { client } = fakeSession({ rol: 'owner' });
    await expect(obtenerPersonal(client)).resolves.toMatchObject({ rol: 'owner' });
  });

  it('un alumno no es personal', async () => {
    const { client } = fakeSession({ rol: 'student' });
    await expect(obtenerPersonal(client)).resolves.toBeNull();
  });

  it('sin perfil no es personal', async () => {
    const { client } = fakeSession({ rol: null });
    await expect(obtenerPersonal(client)).resolves.toBeNull();
  });

  it('sin sesión o con sesión inválida no es personal, y ni consulta el perfil', async () => {
    const sinSesion = fakeSession({ usuario: null });
    await expect(obtenerPersonal(sinSesion.client)).resolves.toBeNull();
    expect(sinSesion.from).not.toHaveBeenCalled();

    const invalida = fakeSession({ errorGetUser: true, rol: 'owner' });
    await expect(obtenerPersonal(invalida.client)).resolves.toBeNull();
    expect(invalida.from).not.toHaveBeenCalled();
  });
});

describe('iniciarSesionPersonal', () => {
  const datos = { email: ' admin@ecos.com ', password: 'clave-larga-123' };

  it('deja entrar a la administración', async () => {
    const { client, signInWithPassword } = fakeSession({ rol: 'admin' });
    await expect(iniciarSesionPersonal(datos, client)).resolves.toEqual({ ok: true });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'admin@ecos.com', password: 'clave-larga-123' });
  });

  it('un alumno con contraseña correcta NO entra: se cierra su sesión y recibe el mismo mensaje que una contraseña mala', async () => {
    const { client, signOut } = fakeSession({ rol: 'student' });
    const r = await iniciarSesionPersonal(datos, client);
    expect(r).toEqual({ ok: false, mensaje: MENSAJE_CREDENCIALES, email: 'admin@ecos.com' });
    expect(signOut).toHaveBeenCalled();
  });

  it('contraseña incorrecta: mensaje de credenciales, sin pistas sobre si el email existe', async () => {
    const { client, signOut } = fakeSession({ errorLogin: { status: 400, code: 'invalid_credentials' } });
    const r = await iniciarSesionPersonal(datos, client);
    expect(r).toMatchObject({ ok: false, mensaje: MENSAJE_CREDENCIALES });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('otros errores del servicio (límite de intentos, red) dan un mensaje distinto, no el de credenciales', async () => {
    const { client } = fakeSession({ errorLogin: { status: 429, code: 'over_request_rate_limit' } });
    const r = await iniciarSesionPersonal(datos, client);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.mensaje).not.toBe(MENSAJE_CREDENCIALES);
  });

  it('valida los campos antes de llamar al servicio', async () => {
    const { client, signInWithPassword } = fakeSession({ rol: 'admin' });
    const a = await iniciarSesionPersonal({ email: 'no-es-email', password: 'x' }, client);
    const b = await iniciarSesionPersonal({ email: 'a@b.com', password: '' }, client);
    expect(a).toMatchObject({ ok: false, mensaje: 'Escribí un email válido.' });
    expect(b).toMatchObject({ ok: false, mensaje: 'Escribí tu contraseña.' });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it('si falta configuración, responde con un mensaje genérico y lo registra', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await iniciarSesionPersonal(datos);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) {
      expect(r.mensaje).not.toBe(MENSAJE_CREDENCIALES);
      expect(r.mensaje).not.toMatch(/variables/i);
    }
    expect(log).toHaveBeenCalled();
  });
});
