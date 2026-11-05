'use server';

import { procesarPedido, type EstadoPedido } from '@/lib/booking/pedido';

const texto = (formData: FormData, nombre: string) => {
  const v = formData.get(nombre);
  return typeof v === 'string' ? v : '';
};

/**
 * Server Action del formulario de compra. Solo lee los campos y delega: la validación y la lógica
 * viven en `procesarPedido` (se puede llamar con una petición directa, así que nada se da por válido acá).
 */
export async function crearPedido(_anterior: EstadoPedido, formData: FormData): Promise<EstadoPedido> {
  return procesarPedido({
    nombre: texto(formData, 'nombre'),
    telefono: texto(formData, 'telefono'),
    dni: texto(formData, 'dni'),
    email: texto(formData, 'email'),
    courseId: texto(formData, 'courseId'),
    metodo: texto(formData, 'metodo'),
    honeypot: texto(formData, 'sitio_web'),
  });
}
