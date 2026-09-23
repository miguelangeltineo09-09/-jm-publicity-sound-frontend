// ==========================================
// Genera /sitemap.xml dinámicamente (Next.js reconoce este archivo por
// su nombre y ruta especiales: cualquier "sitemap.ts" dentro de
// src/app/ se sirve automáticamente en esa URL, sin necesitar una ruta
// ni un archivo .xml a mano).
//
// Incluye las rutas públicas ESTÁTICAS del sitio (Home, catálogo,
// nosotros, eventos, contacto) más una entrada dinámica por cada equipo
// real del catálogo (/catalogo/[id]), consultando la lista de equipos al
// backend — así, cuando el admin agregue un equipo nuevo, aparece en el
// sitemap solo, sin tener que tocar este archivo. Las rutas de
// /admin/* NUNCA se incluyen acá (ver también robots.ts, que además le
// pide a los buscadores que ni siquiera las rastree).
//
// Usa la URL placeholder de src/lib/seo.ts (ver el comentario largo en
// ese archivo sobre por qué, y qué actualizar cuando se compre el
// dominio real).
// ==========================================

import type { MetadataRoute } from "next";
import { getEquipos } from "@/lib/api";
import { URL_SITIO } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Rutas públicas que existen siempre, sin depender de ningún dato del
  // backend. "priority" es una pista relativa para los buscadores (1 =
  // más importante): la home y el catálogo son las páginas que más
  // interesa que se posicionen bien, por eso llevan la prioridad más alta.
  const rutasEstaticas: MetadataRoute.Sitemap = [
    { url: URL_SITIO, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${URL_SITIO}/catalogo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${URL_SITIO}/eventos`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${URL_SITIO}/nosotros`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${URL_SITIO}/contacto`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Una entrada por cada equipo real del catálogo. Si el backend no
  // responde, el sitemap se sirve igual con solo las rutas estáticas de
  // arriba (mejor un sitemap incompleto que un endpoint /sitemap.xml
  // roto, que Google podría dejar de confiar por completo).
  let rutasEquipos: MetadataRoute.Sitemap = [];
  try {
    const equipos = await getEquipos();
    rutasEquipos = equipos.map((equipo) => ({
      url: `${URL_SITIO}/catalogo/${equipo.id}`,
      lastModified: new Date(equipo.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    rutasEquipos = [];
  }

  return [...rutasEstaticas, ...rutasEquipos];
}
