-- Reserva desde la web (PR 2): el pago se coordina por WhatsApp, así que hace falta un medio de pago
-- "a coordinar" que no aplique ningún descuento hasta que el personal defina el real.
--
-- Va en una migración aparte: en Postgres un valor nuevo de un enum no se puede usar en la misma
-- transacción en la que se crea. La regla de descuento (0 %) se carga en la migración siguiente.

alter type payment_method add value if not exists 'a_coordinar';
