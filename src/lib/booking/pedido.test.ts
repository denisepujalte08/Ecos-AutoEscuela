import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminClient, PublicClient } from '@/lib/db/server';
import { getDescuentos } from './courses';
import { mensajeDeError, MENSAJE_GENERICO } from './mensajes';
import { procesarPedido, type DatosFormulario } from './pedido';

// El cliente real nunca se crea en estos tests: si algo lo pidiera sin pasarlo, falla como si faltara configuración.
vi.mock('@/lib/db/server', () => ({
  createAdminClient: () => {
    throw new Error('Variables de entorno inválidas o ausentes (servidor)');
  },
  createPublicClient: () => {
    throw new Error('Variables de entorno inválidas o ausentes (públicas)');
  },
}));

const COURSE = 'c1000000-0000-4000-8000-000000000001';
const ENROLLMENT = 'abcdef12-0000-4000-8000-000000000001';

const datos: DatosFormulario = {
  nombre: ' Ana Pérez ',
  telefono: '+54 9 362 485-5645',
  dni: '30.123.456',
  email: 'ana@test.com',
  courseId: COURSE,
  metodo: 'transferencia',
};

type RpcResult = { data: unknown; error: { message: string; details?: string } | null };

/** Cliente simulado: `rpc` crea el pedido y la consulta lee el monto y el curso. */
function fakeAdmin(
  rpcResult: RpcResult = { data: ENROLLMENT, error: null },
  lectura: { data: unknown; error: { message: string } | null } = {
    data: { monto: '148500.00', courses: { nombre: 'Curso de 5 clases' } },
    error: null,
  },
) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  const single = vi.fn().mockResolvedValue(lectura);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { rpc, from } as unknown as AdminClient, rpc, from, eq };
}

afterEach(() => vi.restoreAllMocks());

describe('procesarPedido', () => {
  it('crea el pedido y devuelve el resumen con el monto que calculó la base', async () => {
    const { client, rpc, from, eq } = fakeAdmin();

    const estado = await procesarPedido(datos, client);

    expect(estado).toEqual({
      estado: 'ok',
      pedido: {
        codigo: 'ABCDEF12',
        curso: 'Curso de 5 clases',
        metodo: 'transferencia',
        monto: 148500,
        nombre: 'Ana Pérez',
        dni: '30123456',
      },
    });
    expect(rpc).toHaveBeenCalledWith('create_web_purchase', expect.objectContaining({ p_metodo: 'transferencia' }));
    expect(from).toHaveBeenCalledWith('enrollments');
    expect(eq).toHaveBeenCalledWith('id', ENROLLMENT);
  });

  it('no manda a la base ningún monto', async () => {
    const { client, rpc } = fakeAdmin();
    await procesarPedido({ ...datos, ...({ monto: '1' } as object) } as DatosFormulario, client);
    expect(Object.keys(rpc.mock.calls[0][1])).not.toContain('p_monto');
  });

  it('frena a un robot que llenó el campo trampa, sin crear nada ni dar pistas', async () => {
    const { client, rpc } = fakeAdmin();
    const estado = await procesarPedido({ ...datos, honeypot: 'http://spam.example' }, client);
    expect(estado).toMatchObject({ estado: 'error', mensaje: MENSAJE_GENERICO });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('marca los campos inválidos con un mensaje para cada uno y no llama a la base', async () => {
    const { client, rpc } = fakeAdmin();
    const estado = await procesarPedido(
      { nombre: 'A', telefono: '123', dni: '12', email: 'no-es-email', courseId: 'x', metodo: 'tarjeta' },
      client,
    );

    expect(estado.estado).toBe('error');
    if (estado.estado !== 'error') return;
    expect(Object.keys(estado.campos).sort()).toEqual(['courseId', 'dni', 'email', 'metodo', 'nombre', 'telefono']);
    expect(estado.campos.dni).toBe('Escribí tu DNI, solo números.');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('conserva lo que la persona escribió para no hacerle repetir todo', async () => {
    const { client } = fakeAdmin();
    const estado = await procesarPedido({ ...datos, dni: '12' }, client);
    expect(estado).toMatchObject({ estado: 'error', valores: { nombre: ' Ana Pérez ', email: 'ana@test.com' } });
  });

  it('no deja comprar con tarjeta por este flujo', async () => {
    const { client, rpc } = fakeAdmin();
    const estado = await procesarPedido({ ...datos, metodo: 'tarjeta' }, client);
    expect(estado).toMatchObject({ estado: 'error', campos: { metodo: 'Elegí efectivo o transferencia.' } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('si la persona ya tiene un curso en marcha, se lo explica con un mensaje claro', async () => {
    const { client } = fakeAdmin({ data: null, error: { message: 'enrollment_in_progress' } });
    const estado = await procesarPedido(datos, client);
    expect(estado).toMatchObject({ estado: 'error', mensaje: mensajeDeError('enrollment_in_progress') });
    expect(mensajeDeError('enrollment_in_progress')).toMatch(/WhatsApp/);
  });

  it('un error inesperado se registra en el servidor y la persona ve un mensaje genérico', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fakeAdmin({ data: null, error: { message: 'connection refused to 10.0.0.5' } });

    const estado = await procesarPedido(datos, client);

    expect(estado).toMatchObject({ estado: 'error', mensaje: MENSAJE_GENERICO });
    expect(JSON.stringify(estado)).not.toContain('10.0.0.5');
    expect(log).toHaveBeenCalled();
  });

  it('si no se puede leer el pedido recién creado, también responde con un mensaje genérico', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fakeAdmin(undefined, { data: null, error: { message: 'boom' } });
    const estado = await procesarPedido(datos, client);
    expect(estado).toMatchObject({ estado: 'error', mensaje: MENSAJE_GENERICO });
  });
});

describe('mensajeDeError', () => {
  it('cada error de datos tiene un texto propio y los desconocidos, uno genérico', () => {
    for (const code of ['invalid_name', 'invalid_phone', 'invalid_dni', 'invalid_email', 'invalid_method', 'course_not_found'] as const) {
      expect(mensajeDeError(code)).not.toBe(MENSAJE_GENERICO);
    }
    expect(mensajeDeError('slot_taken')).toBe(MENSAJE_GENERICO);
    expect(mensajeDeError(undefined)).toBe(MENSAJE_GENERICO);
  });
});

describe('getDescuentos', () => {
  function fakePublic(result: { data: unknown; error: { message: string } | null }) {
    const inFn = vi.fn().mockResolvedValue(result);
    const select = vi.fn(() => ({ in: inFn }));
    const from = vi.fn(() => ({ select }));
    return { client: { from } as unknown as PublicClient, from, inFn };
  }

  it('lee el descuento de transferencia y de efectivo', async () => {
    const { client, from, inFn } = fakePublic({
      data: [
        { metodo: 'transferencia', descuento_pct: '10.00' },
        { metodo: 'efectivo', descuento_pct: '15.00' },
      ],
      error: null,
    });
    await expect(getDescuentos(client)).resolves.toEqual({ transferencia: 10, efectivo: 15 });
    expect(from).toHaveBeenCalledWith('payment_method_rules');
    expect(inFn).toHaveBeenCalledWith('metodo', ['transferencia', 'efectivo']);
  });

  it('si falta una regla, cuenta como sin descuento', async () => {
    const { client } = fakePublic({ data: [], error: null });
    await expect(getDescuentos(client)).resolves.toEqual({ transferencia: 0, efectivo: 0 });
  });

  it('falla con un mensaje claro si la base da error', async () => {
    const { client } = fakePublic({ data: null, error: { message: 'boom' } });
    await expect(getDescuentos(client)).rejects.toThrow(/No se pudieron leer los descuentos: boom/);
  });
});

describe('procesarPedido sin configuración', () => {
  it('si no se puede crear el cliente (falta una variable de entorno), responde con el mensaje genérico', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const estado = await procesarPedido(datos);
    expect(estado).toMatchObject({ estado: 'error', mensaje: MENSAJE_GENERICO });
  });
});
