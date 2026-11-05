import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Tipografía de los títulos. Para cambiarla, reemplazar Poppins por otra fuente de next/font/google.
const titulos = Poppins({
  variable: "--font-titulos",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: SITE.nombreCompleto, template: `%s | ${SITE.nombre}` },
  description: SITE.descripcion,
};

/**
 * Cortina de bienvenida: una pantalla crema con el logo que se revela y sube (estilos: .cortina-ecos en globals.css).
 * Solo en escritorio, una vez por sesión, en la portada (también con `#inicio`, que es a donde lleva el logo; con cualquier otra sección no), y nunca con movimiento reducido,
 * conexión lenta o ahorro de datos. Se pone encima de la página ya pintada, antes de que cargue React,
 * para no demorarla ni hacerla parpadear.
 */
const CORTINA_ENTRADA = `(function(){try{
var w=window,c=navigator.connection||{},k='ecos-intro-visto';
if(['/','/c','/d'].indexOf(w.location.pathname)<0||(w.location.hash&&w.location.hash!=='#inicio')||w.innerWidth<768||c.saveData||/^(slow-2g|2g|3g)$/.test(c.effectiveType||'')||w.matchMedia('(prefers-reduced-motion: reduce)').matches||w.sessionStorage.getItem(k))return;
w.sessionStorage.setItem(k,'1');
var d=document.createElement('div');d.className='cortina-ecos';var h=document.documentElement;h.classList.add('con-cortina');var q=function(){d.remove();h.classList.remove('con-cortina')};setTimeout(q,2500);d.setAttribute('aria-hidden','true');
d.innerHTML='<img src="/logo-ecos-solo.svg" alt="" width="260" height="78">';
document.body.appendChild(d);
d.addEventListener('animationend',function(e){if(e.target===d)q()});
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      // El script de la cortina de bienvenida agrega una clase a <html> antes de que cargue React.
      suppressHydrationWarning
      className={`${inter.variable} ${titulos.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Cortina de bienvenida (ver CORTINA_ENTRADA). */}
        <script dangerouslySetInnerHTML={{ __html: CORTINA_ENTRADA }} />
        {children}
      </body>
    </html>
  );
}
