import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Primer filtro de las zonas con sesión: renueva la sesión (cookies) y manda a la pantalla de ingreso a quien
 * no tiene una. NO decide permisos: cada página y acción vuelve a verificar quién es (`exigirPersonal`,
 * `exigirAlumno`). Tampoco saca a nadie de la pantalla de ingreso: eso lo decide la propia pantalla, porque
 * alguien con sesión de alumno que abre el ingreso del personal (o al revés) no debe quedar en un bucle.
 * El sitio público no pasa por acá.
 */
const ZONAS = [
  { prefijo: '/panel', ingreso: '/panel/login' },
  { prefijo: '/cuenta', ingreso: '/cuenta/entrar' },
] as const;

export async function proxy(request: NextRequest) {
  const ruta = request.nextUrl.pathname;
  const zona = ZONAS.find((z) => ruta === z.prefijo || ruta.startsWith(`${z.prefijo}/`));
  if (!zona) return NextResponse.next();

  const enIngreso = ruta === zona.ingreso;
  const alIngreso = () => NextResponse.redirect(new URL(zona.ingreso, request.url));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Sin configuración no hay sesión posible: se manda al ingreso, que muestra un error claro.
  if (!url || !key) return enIngreso ? NextResponse.next() : alIngreso();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of lista) response.cookies.set(name, value, options);
      },
    },
  });

  // `getClaims` valida la firma del token sin una consulta a la base y renueva la sesión si venció.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims && !enIngreso) return alIngreso();

  // Lo que tiene sesión no se guarda en cachés compartidas.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/panel', '/panel/:path*', '/cuenta', '/cuenta/:path*'] };
