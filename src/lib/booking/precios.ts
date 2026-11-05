/**
 * Precio de un curso con el descuento de su medio de pago.
 *
 * Es solo para MOSTRAR el monto en pantalla. El monto real lo calcula la base al crear el pedido
 * (`create_web_purchase`: round(precio_lista * (100 - descuento) / 100, 2)) y es el único que vale:
 * esta función replica esa cuenta para que lo que se ve coincida con lo que se cobra.
 */
export function calcularMonto(precioLista: number, descuentoPct: number): number {
  // x/100 redondeado a centavos equivale a redondear x y dividir por 100.
  return Math.round(precioLista * (100 - descuentoPct)) / 100;
}
