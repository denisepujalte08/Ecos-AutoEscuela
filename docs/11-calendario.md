# Calendario del personal

Pantalla `/panel/calendario` (solo personal). Es lo que el cliente más quería ver.

## Qué muestra

- **Una semana, de lunes a viernes**, con las franjas de 40 minutos. Botones "Anterior", "Hoy" y "Siguiente"; la semana va en la URL (`?semana=AAAA-MM-DD`) para poder compartir o volver a una semana. Cualquier valor que no sea una fecha válida cae en la semana de hoy.
- Cada clase muestra **alumno y número de clase** ("Clase 3 de 5"), con el color del profesor.
- Estados: **dada** (atenuada), **ausente** (tachada), **sin pagar / reservada** (borde punteado, solo en reservas con tarjeta). Las canceladas no se muestran.
- Las filas salen de los horarios de atención de los profesores (`availability_rules`) y de la duración del turno (`settings.slot_minutes`), no están escritas a mano. Los horarios sin atención se ven rayados, y el corte del mediodía figura como "Descanso".
- El día de hoy (en Argentina) aparece resaltado.

## Decisiones

- **Primera versión de solo lectura**: no mueve ni marca clases. Marcar clase dada, reprogramar y cargar reservas manuales vienen después.
- Se lee con la sesión de la persona (RLS), no con `service_role`.
- Las fechas viajan como texto `AAAA-MM-DD` en hora de Argentina; las horas se calculan siempre con la zona del negocio (`src/lib/calendario/fechas.ts`, con tests).
- Pendiente: mostrar bloqueos (feriados, auto en el taller) y la vista de un día.

## Datos de ejemplo para la demo

```bash
npm run demo:cargar
```

Carga 12 alumnos ficticios (`@demo.ecos.test`) con sus clases de esta semana y las dos siguientes; lo que ya pasó figura como dado, con alguna ausencia. Se puede repetir las veces que haga falta. **Solo corre contra la base local**: se niega si la URL no es `localhost` o `127.0.0.1`. Para quitarlos: `npm run db:reset`.
