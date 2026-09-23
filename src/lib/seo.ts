// ==========================================
// Constantes de SEO compartidas por toda la app: la URL base del sitio,
// usada por el layout raíz (metadataBase/Open Graph), el sitemap y el
// robots.txt.
//
// ACTUALIZAR ESTA URL cuando el negocio compre un dominio propio: hoy
// "https://jmpublicitysound.com" es un PLACEHOLDER — el dominio real
// todavía no existe/no está comprado (ver la nota del mismo tipo en
// ConfiguracionContactoForm.tsx sobre el email, que tampoco tiene
// dominio propio todavía). Se centraliza en esta única constante, en vez
// de escribir el string suelto en el layout raíz, en cada page.tsx con
// metadata, en sitemap.ts y en robots.ts, para que el día que se compre
// el dominio real alcance con cambiar esta sola línea.
// ==========================================
export const URL_SITIO = "https://jmpublicitysound.com";
