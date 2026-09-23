// ==========================================
// Layout del sitio público (Home, catálogo, detalle, reservas).
// Es un "route group" ((site)) — el paréntesis no forma parte de la URL,
// solo agrupa estas rutas para darles este layout sin afectarla.
// Existe separado del layout raíz para que la zona de administración
// (/admin/*) NO herede el header/footer públicos (ver src/app/admin/).
// ==========================================

import BotonWhatsApp from "@/components/BotonWhatsApp";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CarritoProvider } from "@/context/CarritoContext";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    // El carrito de reserva (ver CarritoContext.tsx) solo tiene sentido en
    // el sitio público: envuelve este layout (no el raíz) para que el
    // panel de admin, que tiene su propio layout separado, ni siquiera lo
    // monte. Header (el indicador con el contador) y todas las páginas de
    // catálogo/reserva quedan adentro.
    <CarritoProvider>
      <Header />
      {/* pt-16 compensa la altura del header, que es "fixed" y quedaría flotando sobre el contenido. */}
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
      {/* Botón flotante de WhatsApp: al vivir en ESTE layout (el del route
          group "(site)"), aparece en todas las páginas públicas (Home,
          catálogo, detalle, reservar, eventos, nosotros) pero nunca en
          /admin/*, que tiene su propio layout separado y no lo importa. */}
      <BotonWhatsApp />
    </CarritoProvider>
  );
}
