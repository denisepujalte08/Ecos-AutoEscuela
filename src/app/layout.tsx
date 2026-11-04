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
});

export const metadata: Metadata = {
  title: { default: SITE.nombreCompleto, template: `%s | ${SITE.nombre}` },
  description: SITE.descripcion,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      data-diseno="a"
      suppressHydrationWarning
      className={`${inter.variable} ${titulos.variable} h-full antialiased`}
    >
      <head>
        {/* Aplica el diseño elegido antes de pintar, para que no parpadee. Se va con el selector. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=localStorage.getItem('ecos-diseno');if(d==='a'||d==='b')document.documentElement.dataset.diseno=d}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
