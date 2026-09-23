// ==========================================
// Filtro de categorías + grilla de equipos del catálogo.
// Es Client Component porque necesita estado (categoría seleccionada) e
// interactividad (clic en un tab vuelve a pedir los equipos sin recargar la
// página). El fetch inicial ya llega listo desde el Server Component
// (page.tsx); este componente solo vuelve a llamar a la API cuando el
// usuario cambia de filtro.
// ==========================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EquipoCard from "@/components/EquipoCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { getEquipos } from "@/lib/api";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { Categoria, Equipo } from "@/types";

interface FiltroEquiposProps {
  categorias: Categoria[];
  equiposIniciales: Equipo[];
  categoriaIdInicial: number | null;
}

export default function FiltroEquipos({
  categorias,
  equiposIniciales,
  categoriaIdInicial,
}: FiltroEquiposProps) {
  const router = useRouter();

  const [categoriaId, setCategoriaId] = useState<number | null>(categoriaIdInicial);
  const [equipos, setEquipos] = useState<Equipo[]>(equiposIniciales);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pide al backend los equipos de la categoría elegida (o todos, si es "Todas")
  // y sincroniza la URL (?categoria=) para que el filtro quede en el link,
  // sin disparar una navegación/recarga de página completa.
  async function seleccionarCategoria(id: number | null) {
    if (id === categoriaId) return;

    setCategoriaId(id);
    setCargando(true);
    setError(null);

    try {
      const datos = await getEquipos(id ?? undefined);
      setEquipos(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los equipos.");
    } finally {
      setCargando(false);
    }

    router.replace(id === null ? "/catalogo" : `/catalogo?categoria=${id}`, { scroll: false });
  }

  return (
    <div>
      {/* --- Tabs de categoría: "Todas" + una por cada categoría del backend.
          El tab activo usa el degradado de marca como fondo (mismo
          tratamiento que el botón primario); los inactivos quedan en el
          tono "surface" neutro, igual que antes.
          RESPONSIVO: en móvil ya NO se envuelven en varias filas
          ("flex-wrap") — si el backend agrega más categorías de las que
          entran en el ancho de un celular, envolver rompía la fila
          centrada y ocupaba mucho alto vertical. En su lugar la fila hace
          scroll horizontal con el dedo ("overflow-x-auto", "flex-nowrap"
          es el comportamiento por defecto de "flex" al no pedir "wrap"), y
          cada botón queda con "shrink-0" para que no se compriman entre sí
          cuando no entran todos. Desde "sm" se recupera el comportamiento
          original (centrado y en varias filas si hiciera falta), porque a
          partir de ahí ya suele entrar todo en una sola fila. --- */}
      <div className="mb-8 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
        <button
          type="button"
          onClick={() => seleccionarCategoria(null)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
            categoriaId === null
              ? "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white"
              : "bg-background-surface text-muted hover:text-foreground"
          }`}
        >
          Todas
        </button>
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            onClick={() => seleccionarCategoria(categoria.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
              categoriaId === categoria.id
                ? "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white"
                : "bg-background-surface text-muted hover:text-foreground"
            }`}
          >
            {categoria.nombre}
          </button>
        ))}
      </div>

      {/* --- Resultado: carga, error, catálogo vacío, o la grilla de equipos --- */}
      {cargando && <LoadingSpinner label="Cargando equipos..." />}

      {!cargando && error && <ErrorMessage message={error} />}

      {!cargando && !error && equipos.length === 0 && (
        <p className="py-12 text-center text-muted">
          No hay equipos disponibles en esta categoría por el momento.
        </p>
      )}

      {!cargando && !error && equipos.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {equipos.map((equipo) => (
            <EquipoCard key={equipo.id} equipo={equipo} />
          ))}
        </div>
      )}
    </div>
  );
}
