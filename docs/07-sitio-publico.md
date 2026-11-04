# Sitio público

Páginas: Inicio (`/`), Cursos, Nosotros, Contacto. Viven en `src/app/(sitio)/` con un layout común (barra de navegación + pie). El panel interno tendrá su propio layout.

## Dos diseños para elegir (provisorio)

Para que el cliente elija, el sitio trae **dos diseños** con un deslizador flotante "Diseño A / Diseño B" (abajo al centro; recuerda la elección en el navegador):

- **A (por defecto):** fiel a la plantilla. Foto a pantalla completa con degradé y onda blanca, barra translúcida, dorado sobre crema, pie oscuro.
- **B:** el primero que armamos. Portada oscura dividida con marco de foto, naranja y negro del logo, pie claro con el logo.

Cómo está hecho: los colores cambian con el atributo `data-diseno` de `<html>` (tokens en `src/app/globals.css`) y los pocos elementos distintos (portada, pie, botón de la barra) llevan la clase `solo-a` o `solo-b`. Las páginas interiores (Cursos, Nosotros, Contacto) comparten estructura y solo cambian de colores.

**Al elegir uno:** borrar `SelectorDiseno.tsx` (y su uso en `(sitio)/layout.tsx`), el script y `data-diseno` de `src/app/layout.tsx`, el diseño que no gane (sus tokens, las clases `solo-*` y su versión de `Hero` y `Footer`) y `MarcoImagen` si ya no se usa.

## Origen del diseño

Se tomó la estructura y el estilo de la plantilla de Lovable "Pet Resort Page" (secciones, tarjetas, estilo cálido), pero **reescrita para Next.js 16 y Tailwind 4** y sin las dependencias de la plantilla (shadcn/ui, framer-motion, react-router, lucide). Los íconos son SVG propios en `src/components/sitio/iconos.tsx`.

- **Paleta A:** dorado y crema de la plantilla. **Paleta B:** el naranja `#FB6D00` y el negro del logo de ECOS, con texto oscuro sobre los botones naranjas (mejor contraste que el blanco).
- **Fuentes:** Fredoka (títulos) e Inter (texto), con `next/font`.
- **Fotos:** todavía no hay fotos de ECOS. El diseño A usa **provisoriamente la foto de portada de la plantilla** (`public/plantilla/hero.jpg`, un perro): hay que reemplazarla. En el diseño B, el lugar de la foto es un `MarcoImagen` (marco vacío).

## Reservas por WhatsApp (etapa actual)

Por pedido del cliente, **todos los botones de reserva llevan a WhatsApp** con un mensaje armado. Los pagos online y la reserva de turnos en la web vienen después.

- El número y los mensajes están en `src/lib/site.ts` (con test en `site.test.ts`).
- El mensaje de un curso incluye su nombre, para que quien atiende sepa qué eligió.

## Supuestos (marcados, a confirmar con el cliente)

- **Precios en pantalla:** hoy están escritos a mano en `src/lib/cursos.ts` (los del cartel: 5 clases $165.000, 7 clases $230.000). Es una duplicación temporal: el PR de reservas los va a leer de la tabla `courses` (`precio_lista`). El curso de 10 clases no se muestra hasta conocer su precio.
- **Descuentos:** el sitio solo dice "consultá por descuentos pagando en efectivo o transferencia", sin porcentajes, hasta que el cliente defina las reglas (ver `03-preguntas-pendientes.md`).
- **Examen:** el texto aclara que no está incluido (respuesta 24 del cliente).
- **Dirección, horarios y redes:** no se publican todavía; faltan datos del cliente.
