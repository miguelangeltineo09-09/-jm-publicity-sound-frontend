// ==========================================
// Galería de eventos realizados ("/eventos").
// Server Component: publicaciones y equipos se piden al backend antes de
// enviar el HTML (primera carga sin spinner), igual criterio que
// "/catalogo". El filtrado interactivo por equipo lo maneja
// FiltroPublicaciones.tsx (Client Component).
// ==========================================

import type { Metadata } from "next";
import ErrorMessage from "@/components/ErrorMessage";
import { getEquipos, getPublicaciones } from "@/lib/api";
import type { Equipo, Publicacion } from "@/types";
import FiltroPublicaciones from "./FiltroPublicaciones";

// SEO: título/descripción propios de la galería de eventos.
export const metadata: Metadata = {
  title: "Eventos realizados - Galería",
  description:
    "Fotos y videos de bodas, fiestas y conciertos donde nuestros equipos de sonido y luces fueron parte del evento en República Dominicana.",
};

export default async function EventosPage() {
  let publicaciones: Publicacion[] = [];
  let equipos: Equipo[] = [];
  let error: string | null = null;

  try {
    // No dependen entre sí: se piden en paralelo.
    [publicaciones, equipos] = await Promise.all([getPublicaciones(), getEquipos()]);
  } catch (err) {
    error = err instanceof Error ? err.message : "No se pudo cargar la galería de eventos.";
  }

  return (
    // "px-4 sm:px-6" (antes "px-6" fijo): más espacio útil en un celular
    // angosto para la grilla de publicaciones y los tabs de filtro; desde
    // "sm" queda igual que antes.
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      {/* Título con la misma utilidad de degradado de marca usada en el
          resto del sitio (Home, Catálogo, Nosotros). */}
      <h1 className="text-gradient-brand mb-2 text-center text-3xl font-bold tracking-tight sm:text-4xl">
        Eventos realizados
      </h1>
      <p className="mb-10 text-center text-muted">
        Fotos y videos de nuestro trabajo en acción, evento por evento.
      </p>

      {error ? (
        <ErrorMessage message={error} />
      ) : (
        <FiltroPublicaciones equipos={equipos} publicacionesIniciales={publicaciones} />
      )}
    </div>
  );
}
