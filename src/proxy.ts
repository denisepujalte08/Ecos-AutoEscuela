import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Primer filtro del panel: renueva la sesión (cookies) y manda al login a quien no tiene una.
 * NO decide permisos: cada página y acción del panel vuelve a verificar el rol (`exigirPersonal`).
 * Solo toca /panel; el sitio público no pasa por acá.
 */
export async function proxy(request: NextRequest) {
  const enLogin = request.nextUrl.pathname === '/panel/login';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Sin configuración no hay sesión posible: se manda al login, que muestra un error claro.
  if (!url || !key) return enLogin ? NextResponse.next() : redirigirAlLogin(request);

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

  if (!data?.claims && !enLogin) return redirigirAlLogin(request);
  if (data?.claims && enLogin) return NextResponse.redirect(new URL('/panel', request.url));

  // Lo del panel no se guarda en cachés compartidas.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function redirigirAlLogin(request: NextRequest) {
  return NextResponse.redirect(new URL('/panel/login', request.url));
}

export const config = { matcher: ['/panel', '/panel/:path*'] };
