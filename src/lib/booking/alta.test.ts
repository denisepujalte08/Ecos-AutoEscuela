import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminClient } from '@/lib/db/server';
import { confirmarPedido, darDeAlta } from './alta';

const STUDENT = 'a1000000-0000-4000-8000-000000000001';
const ENROLLMENT = 'e1000000-0000-4000-8000-000000000001';
const NUEVO_USUARIO = 'f1000000-0000-4000-8000-000000000001';
const EXISTENTE = 'f2000000-0000-4000-8000-000000000002';

type Opciones = {
  alumno?: { id: string; nombre_completo: string; email: string; user_id: string | null } | null;
  invitacion?: { data: { user: { id: string } } | null; error: { code?: string; message: string } | null };
  usuarios?: { id: string; email?: string }[];
  rolExistente?: string | null;
  errorVincular?: { message: string } | null;
  errorConfirmar?: { message: string } | null;
  studentDeInscripcion?: string | null;
};

/** Cliente de administración simulado: tablas, auth.admin y rpc. */
function fakeAdmin(o: Opciones = {}) {
  const alumno = 'alumno' in o ? o.alumno : { id: STUDENT, nombre_completo: 'Ana Pérez', email: 'ana@test.com', user_id: null };
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: o.errorVincular ?? null }) }));
  const inviteUserByEmail = vi
    .fn()
    .mockResolvedValue(o.invitacion ?? { data: { user: { id: NUEVO_USUARIO } }, error: null });
  const listUsers = vi.fn().mockResolvedValue({ data: { users: o.usuarios ?? [] }, error: null });
  const rpc = vi.fn().mockResolvedValue({ error: o.errorConfirmar ?? null });

  const lectura = (data: unknown) => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data, error: null }) }) }) });
  const from = vi.fn((tabla: string) => {
    if (tabla === 'students') return { ...lectura(alumno), update };
    if (tabla === 'profiles') return lectura(o.rolExistente ? { role: o.rolExistente } : null);
    if (tabla === 'enrollments') {
      return lectura('studentDeInscripcion' in o ? (o.studentDeInscripcion ? { student_id: o.studentDeInscripcion } : null) : { student_id: STUDENT });
    }
    throw new Error(`tabla inesperada ${tabla}`);
  });

  const client = { from, rpc, auth: { admin: { inviteUserByEmail, listUsers } } } as unknown as AdminClient;
  return { client, update, inviteUserByEmail, listUsers, rpc };
}

afterEach(() => vi.restoreAllMocks());

describe('darDeAlta', () => {
  it('crea el usuario con una invitación por mail y lo vincula con el alumno', async () => {
    const { client, inviteUserByEmail, update } = fakeAdmin();
    const r = await darDeAlta(STUDENT, {}, client);

    expect(r).toEqual({ ok: true, yaTeniaUsuario: false });
    expect(inviteUserByEmail).toHaveBeenCalledWith('ana@test.com', expect.objectContaining({ data: { nombre: 'Ana Pérez' } }));
    expect(update).toHaveBeenCalledWith({ user_id: NUEVO_USUARIO });
  });

  it('si el alumno ya tiene usuario no hace nada (se puede repetir sin problema)', async () => {
    const { client, inviteUserByEmail } = fakeAdmin({ alumno: { id: STUDENT, nombre_completo: 'Ana', email: 'a@b.com', user_id: EXISTENTE } });
    await expect(darDeAlta(STUDENT, {}, client)).resolves.toEqual({ ok: true, yaTeniaUsuario: true });
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('si el email ya tenía usuario de alumno, lo vincula en vez de invitar de nuevo', async () => {
    const { client, update } = fakeAdmin({
      invitacion: { data: null, error: { code: 'email_exists', message: 'exists' } },
      usuarios: [{ id: EXISTENTE, email: 'ANA@test.com' }],
      rolExistente: 'student',
    });
    await expect(darDeAlta(STUDENT, {}, client)).resolves.toEqual({ ok: true, yaTeniaUsuario: true });
    expect(update).toHaveBeenCalledWith({ user_id: EXISTENTE });
  });

  it('NUNCA vincula a un alumno con una cuenta del personal que tiene el mismo email', async () => {
    for (const rol of ['admin', 'owner']) {
      const { client, update } = fakeAdmin({
        invitacion: { data: null, error: { code: 'email_exists', message: 'exists' } },
        usuarios: [{ id: EXISTENTE, email: 'ana@test.com' }],
        rolExistente: rol,
      });
      await expect(darDeAlta(STUDENT, {}, client)).resolves.toEqual({ ok: false, motivo: 'email_de_personal' });
      expect(update).not.toHaveBeenCalled();
    }
  });

  it('si el mail no se puede enviar devuelve un motivo y no vincula nada', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, update } = fakeAdmin({ invitacion: { data: null, error: { code: 'smtp_failed', message: 'smtp' } } });
    await expect(darDeAlta(STUDENT, {}, client)).resolves.toEqual({ ok: false, motivo: 'no_se_pudo_invitar' });
    expect(update).not.toHaveBeenCalled();
  });

  it('si no se puede vincular (usuario ya usado por otro alumno) avisa y no da falso éxito', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fakeAdmin({ errorVincular: { message: 'duplicate key' } });
    await expect(darDeAlta(STUDENT, {}, client)).resolves.toEqual({ ok: false, motivo: 'no_se_pudo_invitar' });
  });

  it('alumno inexistente', async () => {
    const { client } = fakeAdmin({ alumno: null });
    await expect(darDeAlta(STUDENT, {}, client)).resolves.toEqual({ ok: false, motivo: 'alumno_inexistente' });
  });

  it('rechaza un id que no es un uuid', async () => {
    const { client } = fakeAdmin();
    await expect(darDeAlta('no-uuid', {}, client)).rejects.toThrow();
  });
});

describe('confirmarPedido', () => {
  it('confirma el pago y da de alta al alumno', async () => {
    const { client, rpc, inviteUserByEmail } = fakeAdmin();
    const r = await confirmarPedido(ENROLLMENT, {}, client);

    expect(r).toEqual({ estado: 'ok', alta: { ok: true, yaTeniaUsuario: false } });
    expect(rpc).toHaveBeenCalledWith('confirm_payment', { p_enrollment_id: ENROLLMENT });
    expect(inviteUserByEmail).toHaveBeenCalled();
  });

  it('un pedido que ya no está pendiente da un error claro y NO da de alta a nadie', async () => {
    const { client, inviteUserByEmail } = fakeAdmin({ errorConfirmar: { message: 'enrollment_not_confirmable' } });
    await expect(confirmarPedido(ENROLLMENT, {}, client)).resolves.toEqual({ estado: 'error', motivo: 'no_pendiente' });
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('un error inesperado al confirmar se registra y no da de alta', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, inviteUserByEmail } = fakeAdmin({ errorConfirmar: { message: 'connection reset' } });
    await expect(confirmarPedido(ENROLLMENT, {}, client)).resolves.toEqual({ estado: 'error', motivo: 'fallo' });
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it('si el pago se confirma pero el alta falla, el pago NO se deshace y se informa', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, rpc } = fakeAdmin({ invitacion: { data: null, error: { code: 'smtp_failed', message: 'x' } } });
    const r = await confirmarPedido(ENROLLMENT, {}, client);
    expect(r).toEqual({ estado: 'ok', alta: { ok: false, motivo: 'no_se_pudo_invitar' } });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('rechaza un id inválido sin tocar la base', async () => {
    const { client, rpc } = fakeAdmin();
    await expect(confirmarPedido('x', {}, client)).resolves.toEqual({ estado: 'error', motivo: 'fallo' });
    expect(rpc).not.toHaveBeenCalled();
  });
});
