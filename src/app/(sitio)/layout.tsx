import type { ReactNode } from 'react';
import { Footer } from '@/components/sitio/Footer';
import { Navbar } from '@/components/sitio/Navbar';
import { SelectorDiseno } from '@/components/sitio/SelectorDiseno';

/** Marco común de las páginas públicas (el panel interno tendrá el suyo). */
export default function SitioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <SelectorDiseno />
    </>
  );
}
