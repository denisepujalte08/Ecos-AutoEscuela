# ECOS – Sistema de reservas y gestión (autoescuela)

Documento de análisis: requisitos, decisiones, arquitectura, pagos y preguntas pendientes.

---

## 1. Contexto

Escuela de conducción (ECOS). Hoy trabajan con planillas Excel separadas, sin sitio web (solo Facebook, Instagram y una ficha de Google). Quieren modernizar y evitar errores humanos de carga.

Acuerdo inicial: el desarrollo no se cobra; se cobra solo la infraestructura (hosting, base de datos, dominio), estimada en menos de 50 USD/mes.

## 2. Lo que quieren

- **Sitio web público** con catálogo de cursos y redirección a WhatsApp.
- **Compra sin contacto humano:** elige curso → elige día y horario libre → completa datos del alumno → paga. Solo se ven los turnos libres.
- **Sistema interno cerrado** (usuario y contraseña), con registro de quién editó qué (auditoría).
- **Ficha de alumno automática:** datos, curso, horario, pago y primera clase.
- **Avisos automáticos** tras el pago (mail; WhatsApp a definir).
- **Medios de pago:** tarjeta, transferencia y efectivo, con precios distintos.
- **Identidad de marca:** logo individual y completo (PNG/SVG) que enviará el cliente.

## 3. Dominio (lo ya definido)

### Recursos y operación
- Un solo auto. Dos profesores: uno a la mañana y otro a la tarde, **de a uno por vez**.
- El profesor depende del horario elegido.
- Turnos de **40 minutos**, probablemente pegados (a confirmar).
- Lunes a viernes, desde las 8/9 h. No trabajan feriados.
- Solo clases prácticas, solo auto **manual**.
- El alumno se espera en la **oficina**; se identifica por nombre.
- **Una clase por día por alumno.**
- No hay lista de espera: el alumno elige entre los horarios que hay.
- Un alumno no tiene dos cursos activos a la vez.
- Se registra el número de clase; el alumno firma en su ficha al terminar (administración le da la ficha).
- No tienen otra sede ni planes de tenerla.

### Cursos y precios
| Curso | Tarjeta (hasta 3 cuotas sin interés) | Transferencia (-10%) | Efectivo (-15%) |
|---|---|---|---|
| 5 clases | $165.000 | $148.500 | $140.250 |
| 7 clases | $230.000 | $207.000 | $195.500 |
| 10 clases + acompañamiento al examen | ? | ? | ? |

- Se vende el **curso completo** (no clases sueltas).
- La **tasa del examen no está incluida**.
- Se reservan, en principio, todas las clases al comprar; probablemente con reprogramación (a definir).
- Los precios con descuento se **calculan** a partir del precio de lista y del porcentaje por método.

### Usuarios
- Administrativos y dueño usan el panel.
- Los alumnos podrían tener usuario (reprogramar, ver sus clases) – a definir.
- Cancelación por enfermedad del profesor: se avisa por WhatsApp (puede ser manual).
- La agenda del día debe mostrar el **número de clase** de cada alumno (hoy lo tienen en Excel).
- Hay que **migrar** los datos del Excel actual.

## 4. Arquitectura propuesta

Monolito en **Next.js** (Vercel) + **Supabase** (Postgres, Auth, RLS, pg_cron).

```
Alumno / Admin (navegador)
        │
   Next.js en Vercel ── Server Actions y Route Handlers
        │        │              │
        │        │              └── Mercado Pago (Checkout Pro + webhook)
        │        └── Resend (emails)
        ▼
   Supabase: Postgres + Auth + RLS + pg_cron
```

Áreas: pública, reserva, mi cuenta (alumno), admin.

### Modelo de datos
- `profiles` (usuario y rol: admin, owner, student)
- `students` (nombre, DNI, nacimiento, teléfono, mail, tutor si es menor)
- `instructors`
- `availability_rules` (profesor, día de semana, hora inicio/fin)
- `blackouts` (feriados, vacaciones, taller; global o por profesor)
- `courses` (nombre, cantidad de clases, precio de lista, incluye_examen)
- `payment_method_rules` (tarjeta 0%, transferencia 10%, efectivo 15%)
- `enrollments` (alumno, curso, método, monto, estado: pending_payment / active / completed / cancelled)
- `lessons` (inscripción, nro_clase, profesor, starts_at, ends_at, tipo clase|examen, estado: held / scheduled / done / cancelled / no_show; quién la marcó dictada y cuándo)
- `payments` (proveedor, id externo, monto, estado, respuesta cruda, comprobante)
- `notifications` (cola de mails)
- `audit_log` (por triggers)

### Reglas críticas en la base de datos
1. **Un solo auto:** exclusion constraint (`btree_gist`) sobre `tstzrange(starts_at, ends_at)` en clases activas o retenidas.
2. **Una clase por día por alumno:** índice único parcial sobre `(student_id, fecha_local)`.
3. `unique(enrollment_id, nro_clase)`.
4. Turnos de 40 min por check, salvo tipo `examen`.

### Turnos libres
Función SQL `get_free_slots(desde, hasta)`: genera la grilla de 40 min desde `availability_rules`, resta `blackouts` y clases ocupadas/retenidas vigentes. Zona horaria `America/Argentina/Buenos_Aires`, `timestamptz` en la base.

### Flujo de reserva
1. Alumno elige curso, clases y método de pago.
2. Función transaccional `create_enrollment`: crea inscripción `pending_payment` y clases `held` con vencimiento (15 min); falla entera si algún horario se ocupó. Limpia retenciones vencidas del mismo horario.
3. **Tarjeta:** preferencia de Mercado Pago → redirección → webhook (valida firma, consulta el pago por API, idempotente por `payment_id`) → activa inscripción y clases.
4. **Transferencia/efectivo:** queda `pending_review` hasta que administración confirma (comprobante subido o pago en persona).
5. Mail de confirmación.

`pg_cron` libera retenciones vencidas cada minuto.

### Panel de administración
- Agenda del día (hora, alumno, número de clase, profesor).
- Marcar clase como dictada.
- Reservas manuales.
- Pagos pendientes (ver comprobante, aprobar/rechazar).
- Bloqueos (feriados, taller, vacaciones).
- Botón de WhatsApp (`wa.me` con mensaje prellenado) para avisos.
- Importador del Excel.

### Seguridad
- Supabase Auth; RLS en todas las tablas; el público solo accede a RPC de turnos libres y cursos.
- Operaciones sensibles con service key solo en el servidor.
- Validación con Zod; auditoría por triggers; backups.

### Despliegue y costos
- Supabase Pro (~25 USD/mes) y Vercel Pro (~20 USD/mes por usuario); la licencia Hobby de Vercel es solo para uso no comercial. Alternativa: Cloudflare Pages / Netlify.
- Dominio: ~10–15 USD/año.
- Cuentas y dominio idealmente **a nombre del cliente**.

### Orden de construcción
1. Esquema, restricciones y `get_free_slots`, con tests.
2. Reserva y pago con tarjeta (webhook incluido).
3. Panel: agenda, marcar clases, confirmar pagos.
4. Mi cuenta y reprogramación.
5. Notificaciones.
6. Importación del Excel y sitio público.

## 5. Lo más complicado

1. **Reserva de varias clases con un solo auto** (atomicidad, carreras, retenciones que vencen).
2. **Reprogramación** (reglas por definir, número de clase consistente).
3. **Pagos y estados** (webhooks duplicados/en desorden, tres flujos distintos).
4. **Examen de manejo** (duración y agenda propias, depende de un tercero).
5. **Migración del Excel** (datos sucios).
6. **Adopción:** si el panel es más lento que el Excel, vuelven a la planilla.

Reducción de riesgo: empezar por el modelo de turnos con tests, dejar la reprogramación simple al inicio (solo administración), conseguir el Excel y la respuesta del examen pronto, y probar el panel con ellos temprano.

## 6. Pagos

### Principio
**Siempre se sale del sitio a pagar** (no manejar datos de tarjeta; evitar la responsabilidad PCI). Se descarta el formulario de tarjeta propio.

### Mercado Pago (etapa 1)
- **Checkout Pro:** se crea una preferencia en el servidor, se redirige al alumno, y un webhook confirma.
- El monto se calcula **en el servidor** (nunca desde el navegador). `external_reference` = id de la inscripción.
- El webhook es la fuente de verdad (no depender de la redirección de vuelta). La página de retorno solo muestra "confirmando" y consulta el estado.
- Acepta Visa, Mastercard y otras tarjetas.
- Las cuotas sin interés se configuran en la cuenta del vendedor, no en el código.
- Dificultades reales: webhooks, sandbox/credenciales de prueba, probar en local (túnel), cuenta del cliente verificada.
- Abstraer el pago detrás de una interfaz propia (`crearPago`, `procesarWebhook`) para sumar otro proveedor sin tocar la reserva.

### Transferencia con comprobante y efectivo
- Mismo mecanismo: la reserva queda `pending_review`.
- Transferencia: el alumno sube el comprobante (Supabase Storage, privado); administración aprueba/rechaza desde el panel.
- Efectivo: administración marca "recibido".
- Modelo de referencia: el checkout de Tikzet (Mercado Pago + transferencia con comprobante).

### Unicobros (etapa 2, probable)
- Proveedor de servicios de pago (NOVUSTEC S.A.U., vinculado al Nuevo Banco del Chaco). Productos: uniSmartPOS, QR Uni, **Link de Pagos**, Suscripciones.
- Acepta Visa, Mastercard, Tarjeta Tuya y billeteras. Comisiones de 0,60% a 4% + IVA según medio y plazo de acreditación (1–18 días hábiles).
- Según la documentación de Tikzet: débito 1,25–1,30%, crédito 1,50–4%, QR 0,60–0,80% (+ IVA). Cuotas: plan Tarjeta Tuya 3/5/6/9 (7,79%–24,70% + IVA) y Cuota Simple 3/6 (5,93%–11,24% + IVA).
- **Las cuotas "sin interés" tienen costo para el comercio** (absorberlo o trasladarlo al precio).
- **Tiene API** (credenciales API Key + Access Token; la entregan a quien las pide). Hay integraciones de terceros: Tikzet (online) y un módulo de Odoo (solo terminal POS, no web).
- La documentación técnica (endpoints, webhooks, sandbox) **no es pública**: hay que pedirla a Unicobros. Probablemente existan productos de API distintos (terminal vs. checkout web): pedir específicamente el de **checkout web con webhooks**.
- **La gestión debe salir del cliente** (la cuenta es suya y las credenciales mueven dinero). Las credenciales de producción se cargan como variables de entorno, nunca por chat o mail.
- Mientras tanto: Unicobros como **medio manual** (Link de Pagos, pendiente de confirmación).

#### Mensaje sugerido para que el cliente envíe a Unicobros
> Hola, somos [nombre] y ya cobramos con Unicobros. Estamos desarrollando un sitio web para vender nuestros cursos y queremos cobrar con tarjeta desde ahí. ¿Pueden habilitarnos la API de checkout con webhooks para sitios web? Necesitamos: (1) la documentación técnica, (2) credenciales y un entorno de pruebas, y (3) las condiciones comerciales (comisiones, plazos de acreditación y planes de cuotas). La documentación pueden enviarla a [mail]. Gracias.

### Otras ideas
- **Transferencia automática** (confirmación sin revisión manual, acreditación el mismo día): existe en plataformas como Tikzet; evaluar más adelante.
- Tuya, Sol y MODO (vistos en Cetrogar) no son necesarios para este caso.

## 7. Respuestas ya obtenidas

| # | Tema | Respuesta |
|---|---|---|
| 3 | Clases por día | Una por día por alumno |
| 24 | Tasa del examen | No está incluida |
| 46 | Redes | Tienen Instagram y Facebook |
| 47 | Dominio | No tienen dominio |
| — | Pago dentro o fuera del sitio | Fuera del sitio (redirección) |
| — | Dos cursos activos a la vez | No |
| — | Alumno sabe manejar o parte de cero | Se pregunta en la primera clase; no cambia el rumbo |
| — | Automático o manual | Solo manual |
| — | Lista de espera | No; elige entre los horarios disponibles |
| — | Identificación del alumno | Por nombre |
| — | Punto de encuentro | Se espera en la oficina |
| 6* | Pegadas | Creen que las clases van pegadas (confirmar) |
| 5* | Horarios | Lunes a viernes desde 8/9 h; el final falta |
| 9* | Feriados | No trabajan; vacaciones sin saber |
| 11* | Menores | Suponen que necesitan autorización |
| 14* | Pago | Suponen pago completo |
| 21* | Cancelación del profesor | Rara; por enfermedad o por examen; aviso por WhatsApp |

(*) Respuestas tentativas, a confirmar con el cliente.

## 8. Preguntas pendientes (para el cliente)

La numeración se mantiene. **Bloqueantes:** 2, 9, 10, 15, 23, 25, 26 y 60.

### A. Cursos y reserva
1. ¿Cuánto cuesta el curso de 10 clases en tarjeta, transferencia y efectivo?
2. ¿Cómo eligen las clases: una por una en un calendario, o un patrón semanal (ej. martes y jueves 10 h)?
4. ¿Hay un tiempo máximo para terminar el curso (ej. 3 meses) o las clases no vencen?
5. ¿Se vende alguna clase suelta o de refuerzo fuera de los cursos de 5, 7 y 10?
6. ¿Con cuánta anticipación mínima se puede reservar (ej. desde mañana) y máxima (ej. 30 días)?
7. ¿A qué hora empieza y termina cada profesor, y hay pausa al mediodía?
8. ¿Un mismo alumno puede mezclar clases de mañana y de tarde (o sea, con ambos profesores)?

### B. Reprogramación y cancelaciones
9. ¿Puede el alumno reprogramar solo desde su usuario, o tiene que consultar a administración?
10. Si puede, ¿con cuántas horas de anticipación y cuántas veces por curso?
11. Si falta sin avisar, ¿pierde la clase o igual se reprograma?
12. Si llega tarde, ¿hay tolerancia o se descuenta tiempo?
13. ¿Hay cancelación por mal clima? ¿Quién decide?
14. Si el profesor falta (enfermo o acompañando un examen), ¿lo cubre el otro o se reprograma con el alumno?

### C. Pagos
15. En transferencia y efectivo, ¿el alumno elige el turno al reservar o después de que administración confirme el pago?
16. ¿El pago es siempre completo, o aceptan seña?
17. ¿Aceptan que el alumno suba el comprobante de la transferencia en el sitio y que administración lo apruebe desde el panel? ¿Cómo confirman hoy una transferencia?
18. ¿A nombre de quién están las cuentas de Mercado Pago y Unicobros?
19. ¿Emiten factura o comprobante?
20. ¿Se devuelve el dinero si el alumno abandona? ¿Con qué criterio?
21. ¿Hay promociones, cupones o descuentos por referidos?
22. ¿Cada cuánto actualizan precios?
54. ¿Cómo cobran hoy con Unicobros: Link de Pagos, uniSmartPOS, QR u otro?
55. ¿Tienen cuenta de Mercado Pago? ¿Cuántos de sus alumnos pagan hoy con tarjeta NBCH?
57. ¿Prefieren cobrar con Unicobros, con Mercado Pago o con los dos?
59. ¿Qué comisión y qué plazo de acreditación les ofrece Unicobros en tarjeta, y ofrecen cuotas sin interés? ¿Cuánto absorberían del costo de las cuotas?
60. ¿Pueden pedirle a Unicobros las credenciales de API, la documentación técnica y un entorno de pruebas para un sitio web con checkout y webhooks?
62. ¿Les interesaría que las transferencias se confirmen automáticamente, sin revisión manual? (Requiere un proveedor adicional y probablemente un costo por operación.)

### D. Examen de manejo
23. ¿Ellos gestionan el turno del examen en el municipio, o solo acompañan?
25. ¿Cómo se agenda el acompañamiento: lo fija el municipio, o lo eligen ellos?
26. ¿Cuánto dura el examen para el profesor y el auto: 1 hora, medio día?
27. Si el alumno desaprueba, ¿puede repetir con ellos? ¿Con costo?

### E. Alumno y datos
28. ¿Qué datos exactos tiene hoy el formulario del alumno?
29. ¿Aceptan menores? ¿Desde qué edad, y qué autorización piden?
30. ¿Hay alguna condición médica o de aptitud que se pida al inscribirse?
31. ¿Los alumnos entrarían con usuario y contraseña, o prefieren un enlace por email sin cuenta?

### F. Operación diaria
32. ¿Los profesores anotan observaciones del alumno después de cada clase, o solo el número?
33. ¿Qué hacen con el auto (service, carga de combustible, lavado) y eso bloquea horarios?
34. ¿Cómo avisan hoy vacaciones o cierres, y con cuánta anticipación?
35. ¿El profesor puede cambiar de turno (mañana a tarde) en un día puntual?

### G. Panel interno
36. ¿Cuántas personas administrativas usan el panel a la vez?
37. ¿Tienen que poder cargar una reserva a mano para alguien que llama o va en persona?
38. ¿Quiénes pueden editar o borrar reservas: cualquiera o solo el dueño?
39. ¿Qué reportes usan hoy o quisieran (ingresos por mes, clases por profesor, alumnos activos)?
40. ¿Qué datos necesitan exportar, y para quién (AFIP, municipio, seguro)?
41. ¿Hay obligaciones legales sobre guardar fichas de alumnos y por cuánto tiempo?

### H. Comunicación
42. ¿Prefieren que los avisos salgan por mail, WhatsApp, o los dos?
43. ¿Les sirve que el recordatorio sea por mail, o lo quieren por WhatsApp aunque cueste?
44. ¿Quién avisa las cancelaciones por enfermedad del profesor: el sistema o administración manualmente?

### I. Web pública
45. ¿Qué quieren mostrar además de cursos: quiénes son, fotos del auto, testimonios, preguntas frecuentes, ubicación?
47. ¿Tienen algún nombre de dominio pensado (ej. ecosautoescuela.com.ar)?
48. ¿Hay términos y condiciones o política de cancelación que el alumno deba aceptar?

### J. Negocio y proyecto
49. ¿Cuántos alumnos nuevos reciben por mes, más o menos?
50. ¿Piensan sumar otro auto en el futuro?
51. ¿Hay fecha deseada de lanzamiento?
52. ¿Quién va a administrar los usuarios y el mantenimiento después de la entrega? ¿Querés un acuerdo de soporte?
53. ¿Pueden pasar el Excel actual (o una muestra sin datos reales) para diseñar la importación?

## 9. Tareas del cliente (no son preguntas)

- Pedir a Unicobros la API de checkout web, documentación, credenciales y entorno de pruebas (60).
- Tener lista la cuenta de Mercado Pago verificada, y definir a nombre de quién está (18, 55).
- Enviar el Excel actual (53).
- Elegir y comprar el dominio (47).
- Enviar los logos (individual y completo, PNG/SVG).

## 10. Fuentes consultadas

- Unicobros: https://www.unicobros.com.ar
- Tikzet – pagos con Unicobros: https://www.tikzet.com/docs/payments-argentina/unicobros
- Módulo de Odoo para POS Unicobros: https://apps.odoo.com/apps/modules/18.0/pos_unicobros
