// ==========================================
// Filtro por equipo + grilla de publicaciones de la galería de eventos.
// Es Client Component porque necesita estado (equipo seleccionado) e
// interactividad (clic en un tab vuelve a pedir las publicaciones sin
// recargar la página). El fetch inicial ya llega listo desde el Server
// Component (page.tsx); este componente solo vuelve a llamar a la API
// cuando el visitante cambia de filtro — mismo patrón que
// src/app/(site)/catalogo/FiltroEquipos.tsx.
// ==========================================

"use client";

import { useState } from "react";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import ScrollReveal from "@/components/ScrollReveal";
import TarjetaPublicacion from "@/components/TarjetaPublicacion";
import { getPublicaciones } from "@/lib/api";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { Equipo, Publicacion } from "@/types";

interface FiltroPublicacionesProps {
  equipos: Equipo[];
  publicacionesIniciales: Publicacion[];
}

// Delay (ms) entre la aparición de cada tarjeta: una tras otra, no todas
// de golpe (mismo criterio que las tarjetas de categoría del Home).
const DELAY_ESCALONADO_MS = 100;

export default function FiltroPublicaciones({ equipos, publicacionesIniciales }: FiltroPublicacionesProps) {
  const [equipoId, setEquipoId] = useState<number | null>(null);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>(publicacionesIniciales);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function seleccionarEquipo(id: number | null) {
    if (id === equipoId) return;

    setEquipoId(id);
    setCargando(true);
    setError(null);
    try {
      const datos = await getPublicaciones(id !== null ? { equipoId: id } : undefined);
      setPublicaciones(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las publicaciones.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div>
      {/* --- Tabs de filtro por equipo: "Todos" + uno por cada equipo del
          catálogo, mismo tratamiento visual que los tabs de categoría del
          catálogo/reservas del admin (degradado en el activo).
          RESPONSIVO: mismo criterio que el filtro de categorías del
          catálogo (ver el comentario largo en FiltroEquipos.tsx) — en
          móvil la fila hace scroll horizontal con el dedo en vez de
          envolverse en varias filas, porque acá hay un tab por cada
          EQUIPO (pueden ser muchos más que las pocas categorías fijas),
          así que envolver es aún más probable que se vea mal en un
          celular. Desde "sm" vuelve al comportamiento centrado original. --- */}
      <div className="mb-10 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
        <button
          type="button"
          onClick={() => seleccionarEquipo(null)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
            equipoId === null
              ? "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white"
              : "bg-background-surface text-muted hover:text-foreground"
          }`}
        >
          Todos
        </button>
        {equipos.map((equipo) => (
          <button
            key={equipo.id}
            type="button"
            onClick={() => seleccionarEquipo(equipo.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
              equipoId === equipo.id
                ? "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white"
                : "bg-background-surface text-muted hover:text-foreground"
            }`}
          >
            {equipo.nombre}
          </button>
        ))}
      </div>

      {/* --- Resultado: carga, error, estado vacío, o la grilla --- */}
      {cargando && <LoadingSpinner label="Cargando publicaciones..." />}

      {!cargando && error && <ErrorMessage message={error} />}

      {!cargando && !error && publicaciones.length === 0 && (
        <p className="py-12 text-center text-muted">
          {equipoId === null
            ? "Todavía no hay publicaciones de eventos. Muy pronto vas a ver aquí nuestro trabajo en acción."
            : "Todavía no hay publicaciones para este equipo."}
        </p>
      )}

      {!cargando && !error && publicaciones.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {publicaciones.map((publicacion, indice) => (
            <ScrollReveal key={publicacion.id} delay={indice * DELAY_ESCALONADO_MS} className="h-full">
              {/* "enGaleria": en esta grilla completa (a diferencia del
                  adelanto del Home) cada tarjeta lleva a su página de
                  detalle individual y muestra el ícono de compartir —
                  ver el comentario largo al inicio de TarjetaPublicacion.tsx. */}
              <TarjetaPublicacion publicacion={publicacion} enGaleria />
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
