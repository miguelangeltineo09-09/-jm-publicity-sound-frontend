// ==========================================
// Página de catálogo ("/catalogo").
// Server Component: pide categorías y equipos al backend antes de enviar el
// HTML (primera carga sin spinner). Si viene un ?categoria= en la URL
// (ej. desde una tarjeta del Home), se usa para pre-filtrar el resultado
// inicial; el filtrado interactivo posterior lo maneja FiltroEquipos.tsx.
// ==========================================

import type { Metadata } from "next";
import ErrorMessage from "@/components/ErrorMessage";
import { getCategorias, getEquipos } from "@/lib/api";
import type { Categoria, Equipo } from "@/types";
import FiltroEquipos from "./FiltroEquipos";

// SEO: título/descripción propios de la página de catálogo (distintos a
// los de la home), para que buscadores y redes sociales muestren un
// resultado específico de esta URL en vez del genérico del sitio.
export const metadata: Metadata = {
  title: "Catálogo de equipos de sonido, luces y consolas",
  description:
    "Explora nuestro catálogo de equipos de sonido, luces y consolas disponibles para alquilar en República Dominicana, filtrado por categoría.",
};

export default async function CatalogoPage({ searchParams }: PageProps<"/catalogo">) {
  const query = await searchParams;
  // El query param puede llegar como string, array de strings o undefined
  // (así lo tipa Next.js); nos interesa solo el primer valor si es array.
  const categoriaParam = Array.isArray(query.categoria) ? query.categoria[0] : query.categoria;
  const categoriaIdParseado = categoriaParam ? Number(categoriaParam) : null;
  const categoriaIdInicial =
    categoriaIdParseado !== null && Number.isInteger(categoriaIdParseado) ? categoriaIdParseado : null;

  let categorias: Categoria[] = [];
  let equipos: Equipo[] = [];
  let error: string | null = null;

  try {
    // Ambas peticiones no dependen entre sí: se piden en paralelo.
    [categorias, equipos] = await Promise.all([
      getCategorias(),
      getEquipos(categoriaIdInicial ?? undefined),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "No se pudo cargar el catálogo.";
  }

  return (
    // "px-4 sm:px-6" (antes "px-6" fijo): más espacio útil en un celular
    // angosto para la grilla de equipos y los tabs de categoría; desde
    // "sm" queda igual que antes.
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      {/* Título con la misma utilidad de degradado de marca usada en el Home. */}
      <h1 className="text-gradient-brand mb-2 text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Catálogo
      </h1>
      <p className="mb-10 text-center text-muted">
        Equipos de sonido, luces y consolas disponibles para tu evento.
      </p>

      {error ? (
        <ErrorMessage message={error} />
      ) : (
        <FiltroEquipos
          categorias={categorias}
          equiposIniciales={equipos}
          categoriaIdInicial={categoriaIdInicial}
        />
      )}
    </div>
  );
}
