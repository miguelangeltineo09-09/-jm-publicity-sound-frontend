// ==========================================
// Genera /robots.txt dinámicamente (Next.js reconoce este archivo por su
// nombre y ruta especiales, igual que sitemap.ts).
//
// Permite indexar todas las rutas públicas del sitio, pero bloquea
// explícitamente /admin/* — el panel de administración no tiene ninguna
// razón para aparecer en resultados de búsqueda, y aunque hoy ya está
// protegido por login, esto evita que Google llegue a rastrear/mostrar
// esas URLs (ej. "/admin/login") en absoluto. Es la razón por la que las
// páginas de /admin/* NO llevan metadata SEO propia (ver el comentario
// en src/app/layout.tsx): ya quedan fuera del índice acá, a nivel de
// todo el panel, en vez de tener que repetir un "noindex" página por página.
//
// Usa la URL placeholder de src/lib/seo.ts (ver el comentario largo en
// ese archivo sobre por qué, y qué actualizar cuando se compre el
// dominio real) para armar la URL absoluta del sitemap.
// ==========================================

import type { MetadataRoute } from "next";
import { URL_SITIO } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin/",
    },
    sitemap: `${URL_SITIO}/sitemap.xml`,
  };
}
