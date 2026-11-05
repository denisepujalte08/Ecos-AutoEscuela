# Cuenta del alumno

Zona `/cuenta` para el alumno que ya pagó. Esta primera parte cubre **entrar, completar la ficha y elegir los turnos**. Ver y **reprogramar** turnos va en el PR siguiente.

## Cómo entra

- **Sin contraseña**, con un link por mail (**supuesto**: método de ingreso sin confirmar con el cliente, pregunta 31).
- Primera vez: al dar de alta, el personal dispara el mail "Tu acceso a ECOS Autoescuela" (invitación).
- Después: en `/cuenta/entrar` pone su email y recibe "Tu link para entrar a ECOS Autoescuela". La respuesta es **siempre la misma** haya o no una cuenta con ese email, para no revelar quién es alumno. El link es de un solo uso y vence.
- El botón del mail lleva a `/auth/confirmar`, que muestra un botón "Entrar". El link se canjea recién al apretarlo: así los programas de correo que "visitan" los links para revisarlos no gastan el link antes de que lo use la persona.
- Solo se aceptan links de tipo invitación e ingreso (`invite`, `email`); cualquier otro tipo se rechaza.
- La ficha del alumno se vincula con su usuario al darlo de alta (`docs/10-pedidos-y-alta.md`). Un usuario sin ficha de alumno (por ejemplo, del personal) no entra a `/cuenta`.

## Ficha

- Fecha de nacimiento. Si es **menor de 18 años**, también nombre, DNI y teléfono de un adulto responsable (obligatorio). Se completa antes de poder elegir turnos.
- Se guarda con privilegios de servidor, pero el alumno sale de la **sesión**, nunca del formulario: nadie puede editar la ficha de otra persona.

## Elegir turnos

- Se eligen **todas las clases del curso de una vez** (o ninguna), **una por día**, navegando por semanas.
- Los horarios libres los calcula la base (`get_free_slots`): respeta la anticipación mínima (12 h, supuesto en `settings`), la máxima (45 días), los bloqueos y los turnos ocupados.
- La reserva usa `schedule_enrollment`. La inscripción sale de la sesión (la del alumno, ya paga y sin turnos). Si alguien ocupó un horario mientras tanto, se avisa y se elige de nuevo.
- Los horarios que ya tienen una clase de otro alumno no se ofrecen.

## Seguridad

- Proxy (`src/proxy.ts`) pide sesión en `/cuenta` y `/panel`, pero no decide permisos: cada página y acción usa `exigirAlumno()` / `exigirPersonal()`.
- El proxy no saca a nadie de la pantalla de ingreso: lo decide la propia pantalla. Así, un alumno con sesión que abre el ingreso del personal no queda en un bucle de redirecciones.
- **Registro público desactivado** (`enable_signup = false`): las cuentas las crea el sistema (invitación al dar de alta, script del personal). **En producción hay que desactivarlo también** en el panel de Supabase (Authentication → Providers → Email).
- En producción, la **URL del sitio** (`site_url`) y las URLs permitidas de redirección tienen que ser las del dominio real; los mails arman sus links con ese valor.

## Pendiente

- Ver y **reprogramar** turnos (reglas en `settings`: anticipación mínima supuesta de 12 h; preguntas 9, 10 y 31 del cliente).
- Servicio de mails propio para producción (el de prueba de Supabase tiene un límite muy bajo).
