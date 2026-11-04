# Sitio público

Páginas: Inicio (`/`), Cursos, Nosotros, Contacto. Viven en `src/app/(sitio)/` con un layout común (barra de navegación + pie). El panel interno tendrá su propio layout.

## Origen del diseño

Se tomó la estructura y el estilo de la plantilla de Lovable "Pet Resort Page" (secciones, tarjetas, estilo cálido), pero **reescrita para Next.js 16 y Tailwind 4** y sin las dependencias de la plantilla (shadcn/ui, framer-motion, react-router, lucide). Los íconos son SVG propios en `src/components/sitio/iconos.tsx`.

- **Paleta:** el naranja `#FB6D00` y el negro del logo de ECOS, sobre fondo crema. Los tokens están en `src/app/globals.css`. El texto de los botones naranjas es oscuro (mejor contraste que el blanco).
- **Fuentes:** Fredoka (títulos) e Inter (texto), con `next/font`.
- **Fotos:** todavía no hay. Cada lugar de foto es un `MarcoImagen` (marco vacío). Cuando el cliente las mande, se reemplaza por `next/image` con el mismo tamaño.

## Reservas por WhatsApp (etapa actual)

Por pedido del cliente, **todos los botones de reserva llevan a WhatsApp** con un mensaje armado. Los pagos online y la reserva de turnos en la web vienen después.

- El número y los mensajes están en `src/lib/site.ts` (con test en `site.test.ts`).
- El mensaje de un curso incluye su nombre, para que quien atiende sepa qué eligió.

## Supuestos (marcados, a confirmar con el cliente)

- **Precios en pantalla:** hoy están escritos a mano en `src/lib/cursos.ts` (los del cartel: 5 clases $165.000, 7 clases $230.000). Es una duplicación temporal: el PR de reservas los va a leer de la tabla `courses` (`precio_lista`). El curso de 10 clases no se muestra hasta conocer su precio.
- **Descuentos:** el sitio solo dice "consultá por descuentos pagando en efectivo o transferencia", sin porcentajes, hasta que el cliente defina las reglas (ver `03-preguntas-pendientes.md`).
- **Examen:** el texto aclara que no está incluido (respuesta 24 del cliente).
- **Dirección, horarios y redes:** no se publican todavía; faltan datos del cliente.
