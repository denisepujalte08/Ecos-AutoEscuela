# Pagos

## Principios

- **Siempre se sale del sitio a pagar.** No se maneja ningún dato de tarjeta: así no hay responsabilidad PCI.
- El **precio se calcula en el servidor**, nunca desde el navegador.
- El **webhook es la fuente de verdad**; la redirección de vuelta solo informa.
- Los pagos van detrás de una interfaz propia (`crearPago`, `procesarWebhook`) para poder sumar proveedores sin tocar la reserva.

## Precios

| Curso | Tarjeta (hasta 3 cuotas sin interés) | Transferencia (-10%) | Efectivo (-15%) |
|---|---|---|---|
| 5 clases | $165.000 | $148.500 | $140.250 |
| 7 clases | $230.000 | $207.000 | $195.500 |
| 10 clases + examen | ? | ? | ? |

La tasa del examen **no está incluida** en el curso.

## Flujo por método

### Tarjeta (Mercado Pago, Checkout Pro)
1. `create_enrollment` → inscripción `pending_payment`, clases `held` (15 min).
2. El servidor crea la preferencia con el monto calculado y `external_reference = id de la inscripción`.
3. Redirección al `init_point`. El alumno paga en Mercado Pago.
4. Webhook: se valida la firma, se **consulta el pago por API** (no se confía en el cuerpo), se registra en `payments` de forma idempotente (`unique (proveedor, provider_payment_id)`) y se llama a `confirm_enrollment`.
5. Mail de confirmación.

La página de retorno solo muestra "confirmando tu pago" y consulta el estado de la base.

### Transferencia
1. `create_enrollment` → `pending_review`, clases `held` (retención larga).
2. El alumno sube el comprobante (Supabase Storage, bucket privado) → `payments.comprobante_path`.
3. Administración revisa en el panel y aprueba (`confirm_enrollment`) o rechaza (`cancel_enrollment`).

### Efectivo
Igual que transferencia, pero administración marca "recibido" al cobrar en persona.

## Pago sin turno (`holds_lost`)

Si el alumno paga después de que venció la retención y el turno fue tomado por otro, `confirm_enrollment` falla con `holds_lost` o `enrollment_not_confirmable`. La capa de aplicación debe:
1. Registrar el pago igual en `payments` (con estado `approved`).
2. Avisar a administración para reasignar turnos o devolver el dinero.

Es un caso raro pero real; no debe perderse el pago.

## Unicobros

- PSP de NOVUSTEC S.A.U. (vinculado al Nuevo Banco del Chaco). Acepta Visa, Mastercard, Tarjeta Tuya y billeteras. Comisiones de 0,60% a 4% + IVA según medio y plazo de acreditación.
- **Tiene API** (API Key + Access Token), pero la documentación técnica no es pública y hay que pedirla. Existen integraciones de terceros (Tikzet online; un módulo de Odoo solo para terminales).
- La gestión debe salir **del cliente** (la cuenta es suya). Las credenciales de producción se cargan como variables de entorno, nunca por chat o mail.
- Las cuotas "sin interés" tienen costo para el comercio: definir si se absorbe o se traslada al precio.
- **Plan:** Mercado Pago primero; Unicobros después, si la API sirve para checkout web. Hasta entonces, Unicobros como medio manual (Link de Pagos).

### Mensaje para que el cliente lo pida
> Hola, somos [nombre] y ya cobramos con Unicobros. Estamos desarrollando un sitio web para vender nuestros cursos y queremos cobrar con tarjeta desde ahí. ¿Pueden habilitarnos la API de checkout con webhooks para sitios web? Necesitamos: (1) la documentación técnica, (2) credenciales y un entorno de pruebas, y (3) las condiciones comerciales (comisiones, plazos de acreditación y planes de cuotas). La documentación pueden enviarla a [mail]. Gracias.

## Dificultades conocidas de Mercado Pago

- Webhooks duplicados, tardíos o en desorden.
- Sandbox incómodo (usuarios de prueba de vendedor y comprador).
- Probar en local requiere un túnel público.
- Las credenciales de producción dependen de que la cuenta del cliente esté verificada.
- Las cuotas sin interés se configuran en la cuenta del vendedor, no en el código.
