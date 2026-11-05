# Sitio público

La página de inicio es una sola página con cuatro secciones. **Provisorio:** la portada principal (`/`) es la versión B; la versión C (`/c`) se conserva como alternativa y se borra si no se elige. Ambas tienen cuatro secciones; el menú lleva a cada una con scroll suave y marca con un recuadro en cuál se está:

| Menú | Sección (id) | Contenido |
|---|---|---|
| Inicio | `#inicio` | Portada con la foto del auto de ECOS |
| Cursos | `#cursos` | Tarjetas de precios y "Cómo reservar" |
| Nosotros | `#nosotros` | "Sobre ECOS" y las cuatro ventajas |
| Contacto | `#contacto` | Llamado final con el WhatsApp |

Los enlaces del menú están en `src/lib/site.ts` (`ENLACES`) y los `id` en `src/app/(sitio)/page.tsx`. Existen además las páginas `/cursos`, `/nosotros` y `/contacto`, que hoy no están enlazadas desde el menú.

Viven en `src/app/(sitio)/` con un layout común (barra + pie). El panel interno tendrá su propio layout.

## Diseño

Se tomó la estructura de la plantilla de Lovable "Pet Resort Page" (secciones, tarjetas, aparición animada), **reescrita para Next.js 16 y Tailwind 4** y sin sus dependencias (shadcn/ui, framer-motion, react-router, lucide). Los íconos son SVG propios en `src/components/sitio/iconos.tsx`. El cliente vio dos variantes (una fiel a la plantilla, dorada, y otra naranja y crema) y **se eligió la naranja**; la otra se eliminó.

- **Paleta:** naranja suave `#F08A3E` del logo sobre crema, con texto oscuro sobre los botones naranjas (mejor contraste que el blanco). Los colores están en `src/app/globals.css`.
- **Fuentes:** Poppins (títulos) e Inter (texto), con `next/font`. La plantilla traía Fredoka; se cambió por pedido. Para probar otra, se cambia en `src/app/layout.tsx`.
- **Foto:** la portada usa la foto del auto de ECOS (`public/auto-ecos.jpg`, recortada de una captura; mide 888 px de ancho, conviene reemplazarla por el original en mayor resolución).
- **Logo:** `public/logo-ecos-solo.svg` (vectorial, 2,6 KB).

## Comportamientos

- **Barra de navegación:** transparente arriba; al bajar pasa a ser una píldora flotante con sombra, y una línea de color arriba de todo muestra el avance de lectura. Idea tomada del sitio de Comdetur.
- **Cortina de bienvenida:** el logo se revela y la pantalla sube (≈1 s). Solo en escritorio, una vez por sesión, en la portada, y nunca con movimiento reducido, conexión lenta o ahorro de datos. Es un script en `src/app/layout.tsx` (corre antes de React para no parpadear); estilos `.cortina-ecos` en `globals.css`.
- **Una pantalla por sección:** desde tablet, cada sección ocupa una pantalla y el scroll se acomoda al llegar (clase `pantalla` y `scroll-snap` en `globals.css`). En celular el contenido se apila normalmente.
- **Aparición animada:** `Aparecer.tsx` hace que las tarjetas suban al entrar en pantalla. El contenido nace visible; solo se anima lo que está más abajo.

## Reservas por WhatsApp (etapa actual)

Por pedido del cliente, **todos los botones de reserva llevan a WhatsApp** con un mensaje armado. Los pagos online y la reserva de turnos en la web vienen después.

- El número y los mensajes están en `src/lib/site.ts` (con test en `site.test.ts`).
- El mensaje de un curso incluye su nombre, para que quien atiende sepa qué eligió.

## Supuestos (a confirmar con el cliente)

- **Precios en pantalla:** hoy están escritos a mano en `src/lib/cursos.ts` (los del cartel: 5 clases $165.000, 7 clases $230.000). Es una duplicación temporal: el PR de reservas los va a leer de la tabla `courses` (`precio_lista`). El curso de 10 clases no se muestra hasta conocer su precio.
- **Descuentos:** el sitio no menciona descuentos ni formas de pago hasta que el cliente defina las reglas (ver `03-preguntas-pendientes.md`).
- **Examen:** el sitio ya no aclara que el costo del examen no está incluido (respuesta 24 del cliente); el curso de 10 clases dice que se acompaña a rendir el examen práctico en la clase 10. Confirmar con el cliente si hace falta aclarar el costo.
- **Textos:** los escribió el equipo de desarrollo con lo que se sabe de la escuela; el cliente debe revisarlos.
- **Dirección, horarios y redes:** no se publican todavía; faltan datos del cliente.
