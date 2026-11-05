import { describe, expect, it } from 'vitest';
import { calcularMonto } from './precios';

describe('calcularMonto', () => {
  it('con descuento cero devuelve el precio de lista', () => {
    expect(calcularMonto(165000, 0)).toBe(165000);
  });

  it('coincide con los precios del cartel del cliente (transferencia -10 %, efectivo -15 %)', () => {
    expect(calcularMonto(165000, 10)).toBe(148500);
    expect(calcularMonto(165000, 15)).toBe(140250);
    expect(calcularMonto(230000, 10)).toBe(207000);
    expect(calcularMonto(230000, 15)).toBe(195500);
  });

  it('redondea a centavos como la base', () => {
    // 99999 * 92.5 / 100 = 92499.075 -> 92499.08 (la base redondea hacia arriba la mitad)
    expect(calcularMonto(99999, 7.5)).toBe(92499.08);
  });

  it('con 100 % de descuento el monto es cero', () => {
    expect(calcularMonto(165000, 100)).toBe(0);
  });
});
