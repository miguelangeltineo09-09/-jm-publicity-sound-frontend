// ==========================================
// Layout raíz de la aplicación (App Router).
// Envuelve TODAS las páginas, incluida la zona de administración: define el
// idioma, la fuente global, los metadatos por defecto y el fondo/tema
// oscuro base del sitio. A propósito NO incluye el header/footer públicos
// (esos viven en src/app/(site)/layout.tsx) para que /admin/* pueda tener
// su propia interfaz, distinta a la del sitio público.
//
// El AuthProvider envuelve toda la app aquí (y no más abajo) porque el
// contexto de sesión del admin debe existir antes de que se monte
// cualquier página, sin importar si es pública o de administración.
// ==========================================

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { URL_SITIO } from "@/lib/seo";
import "./globals.css";

// Fuente sans-serif moderna cargada vía next/font (se auto-hospeda, sin llamadas
// externas a Google en producción). Se expone como variable CSS para usarla
// desde Tailwind (ver "fontFamily.sans" en tailwind.config.ts).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Descripción general del negocio: se reutiliza como valor por defecto
// de "description" y de Open Graph/Twitter — se repite el mismo texto en
// los tres lugares a propósito, en vez de escribir tres descripciones
// distintas, porque describe lo mismo (qué hace el negocio y dónde) sin
// importar en qué red social o buscador se vea.
const DESCRIPCION_NEGOCIO =
  "Alquiler de equipos de sonido, luces y consolas para bodas, fiestas, conciertos y todo tipo de eventos en toda República Dominicana.";

// Metadatos por defecto del sitio: título/descripción para buscadores y
// redes sociales, más la configuración base de Open Graph/Twitter Card.
// Cada página pública sobreescribe "title"/"description"/"openGraph" con
// los suyos (ver el "metadata" o "generateMetadata" de cada page.tsx);
// las rutas de /admin/* NO definen metadata propia a propósito — quedan
// con estos valores genéricos, y de todos modos robots.ts (ver ese
// archivo) le pide a los buscadores que ni siquiera las rastree.
export const metadata: Metadata = {
  // "%s | JM Publicity Sound": la plantilla que usa cualquier página que
  // defina su propio "title" corto (ej. "Catálogo" -> pestaña/resultado
  // de búsqueda "Catálogo | JM Publicity Sound"), sin tener que escribir
  // "| JM Publicity Sound" a mano en cada page.tsx. "default" es el
  // título de ESTE layout raíz, para páginas que no definan ninguno
  // (hoy, solo /admin/*, ya que todas las públicas sí definen el suyo).
  title: {
    default: "JM Publicity Sound",
    template: "%s | JM Publicity Sound",
  },
  description: DESCRIPCION_NEGOCIO,
  // ACTUALIZAR esta URL cuando se compre el dominio real (ver el
  // comentario largo en src/lib/seo.ts). "metadataBase" es lo que le
  // permite a Next.js resolver como URL absoluta cualquier ruta relativa
  // usada más abajo (ej. la imagen "/og-image.png") o en la metadata de
  // cada página pública — sin esto, Next no podría armar una URL
  // absoluta válida para Open Graph/Twitter (esas redes exigen URLs
  // absolutas, no rutas relativas).
  metadataBase: new URL(URL_SITIO),
  openGraph: {
    title: "JM Publicity Sound",
    description: DESCRIPCION_NEGOCIO,
    siteName: "JM Publicity Sound",
    // "es_DO": español de República Dominicana — el país donde opera el
    // negocio, más preciso que un "es_ES"/"es" genérico para SEO local.
    locale: "es_DO",
    type: "website",
    images: [
      {
        // Ruta relativa: se resuelve contra "metadataBase" de arriba.
        // Generado con un script propio (ver el historial de este
        // cambio) a partir del logo.svg del sitio, ya en formato PNG de
        // 1200x630 (el tamaño estándar que recomiendan Facebook/
        // WhatsApp/LinkedIn para la vista previa de un enlace) porque
        // Open Graph no renderiza SVG de forma confiable en la mayoría
        // de esas plataformas. REEMPLAZAR "public/og-image.png" por una
        // imagen promocional real cuando el negocio tenga una (fotos de
        // un evento real, por ejemplo), manteniendo el mismo tamaño de
        // 1200x630px.
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "JM Publicity Sound — Alquiler de equipos de sonido en República Dominicana",
      },
    ],
  },
  // Twitter/X reutiliza los mismos textos que Open Graph; solo cambia el
  // formato de tarjeta. "summary_large_image" muestra la imagen grande
  // (og-image.png) en vez de una miniatura chica al lado del texto.
  twitter: {
    card: "summary_large_image",
    title: "JM Publicity Sound",
    description: DESCRIPCION_NEGOCIO,
    images: ["/og-image.png"],
  },
  // "icons" registra favicon.svg (en public/) como ícono de la pestaña del
  // navegador; al ser SVG se ve nítido en cualquier resolución/zoom, sin
  // necesitar varios tamaños de PNG como un favicon tradicional.
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Antes "html" tenía "h-full" (height: 100%, fija) y "body" tenía
    // "min-h-full" (min-height: 100%, relativo a esa altura fija de
    // "html"). El problema: "height: 100%" en "html" fija su caja a
    // exactamente un alto de pantalla — cuando el contenido real de la
    // página es más alto que eso (la mayoría de las páginas), "body" sí
    // crecía correctamente para contenerlo, pero "html" se quedaba
    // "corto". El navegador usa el fondo de "html"/"body" para pintar
    // el canvas completo de la página (no solo la caja de cada uno), y
    // esa mezcla entre la caja fija de "html" y la caja más alta de
    // "body" es justo lo que producía un corte de color visible exactamente
    // a un alto de pantalla completa desde arriba, en TODAS las páginas
    // (confirmado tomando el color real del pixel a lo largo del scroll:
    // el salto aparecía siempre en el mismo punto, el alto del viewport).
    //
    // La corrección: "html" ya no fuerza ninguna altura (queda en su
    // "auto" natural); "body" usa "min-h-screen" (min-height: 100vh, un
    // mínimo en unidades de viewport, no un porcentaje que dependa de la
    // altura de "html") en vez de "min-h-full". Así el fondo/degradado de
    // "body" (definido en globals.css) siempre cubre, como mínimo, una
    // pantalla completa en páginas cortas, y crece sin ningún límite ni
    // corte cuando el contenido real es más alto — exactamente el mismo
    // patrón que ya usa correctamente el layout del panel admin
    // (ver src/app/admin/layout.tsx, que siempre usó "min-h-screen").
    <html lang="es" className={inter.variable}>
      {/* Fondo oscuro y texto claro aplicados globalmente en globals.css (bg-background / text-foreground). */}
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
