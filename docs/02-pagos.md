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

## Implementación (hecho)

| Pieza | Dónde |
|---|---|
| `apply_payment` (SQL): registra el pago de forma idempotente y confirma la inscripción | `supabase/migrations/20261104000005_payments.sql` |
| `webhook_events`: bitácora de cada aviso recibido | misma migración |
| Verificación de firma HMAC-SHA256 | `src/lib/payments/mercadopago/signature.ts` |
| Cliente de la API (consultar pago, crear preferencia) | `src/lib/payments/mercadopago/api.ts` |
| Manejo del webhook | `src/lib/payments/mercadopago/webhook.ts` y `src/app/api/webhooks/mercadopago/route.ts` |
| Link de pago con tarjeta | `src/lib/payments/checkout.ts` → `createCardCheckout(enrollmentId)` |

### Qué devuelve `apply_payment`
| Resultado | Significado | Acción |
|---|---|---|
| `confirmed` | Pago aprobado y monto correcto | Inscripción activa; enviar mail |
| `already_confirmed` | Aviso repetido | Nada |
| `pending` / `rejected` | Pago no acreditado | Nada (la inscripción sigue pendiente) |
| `refunded` | Pago devuelto | Se registra; **no** se cancela solo, lo resuelve administración |
| `amount_mismatch` | Pagó un monto distinto | **Revisión manual** (`payments.estado = needs_review`) |
| `duplicate_payment` | Segundo pago para una inscripción ya activa | **Revisión manual** (devolver uno) |
| `needs_review` | Pagó pero los turnos ya no estaban retenidos | **Revisión manual**: reasignar turnos o devolver |

Los casos de revisión manual **nunca pierden el pago**: queda en `payments` con estado `needs_review`. El panel de administración debe listarlos de forma destacada.

### Garantías del webhook
- Sin firma válida → `401`, sin tocar nada.
- El estado y el monto se **consultan a la API de Mercado Pago**; del aviso solo se usa el id.
- Aviso repetido o desordenado → no confirma dos veces ni deshace un pago aprobado.
- Solo moneda `ARS`.
- Error nuestro o transitorio de Mercado Pago → `500` (Mercado Pago reintenta). Pago inexistente o caso de revisión manual → `200` (reintentar no lo arregla).
- Cada aviso queda en `webhook_events` con su resultado.
- El link de pago **vence junto con la retención de turnos**.
- Los estados desconocidos de Mercado Pago se tratan como "pendiente": nunca confirman.

### Variables de entorno
`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` y `APP_URL` (ver `.env.example`). En desarrollo, credenciales **de prueba**.

### Cómo probar con Mercado Pago de prueba
1. En https://www.mercadopago.com.ar/developers/panel crear una aplicación (Checkout Pro) y copiar las **credenciales de prueba**.
2. Crear dos **cuentas de prueba** (vendedor y comprador) desde "Cuentas de prueba".
3. Exponer el servidor local con un túnel (por ejemplo `cloudflared tunnel --url http://localhost:3000`) y poner esa URL en `APP_URL`.
4. En la aplicación de Mercado Pago, configurar el webhook `APP_URL/api/webhooks/mercadopago` (evento *Pagos*) y copiar la **clave secreta** a `MP_WEBHOOK_SECRET`.
5. Guardar todo en `.env.local` (**nunca** en el repo ni en el chat).

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
