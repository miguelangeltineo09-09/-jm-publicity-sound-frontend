// ==========================================
// Editor de "¿Qué incluye este equipo?" dentro de EquipoFormModal.tsx.
// Permite agregar, editar, eliminar y reordenar (con flechas subir/bajar)
// los ítems incluidos de un equipo (ej. "4 monitores", "1 cerebro").
//
// Tiene DOS modos, según si el equipo ya existe o todavía no:
// - Modo "persistido" (equipoId es un número): cada acción se guarda al
//   instante contra el backend (crearItemIncluido/editarItemIncluido/
//   eliminarItemIncluido/reordenarItemsIncluidos), sin esperar al botón
//   "Guardar" del formulario del equipo. Es el patrón más simple y
//   confiable: no hay que sincronizar un estado "sucio" aparte ni
//   preocuparse por perder cambios de ítems si el admin cierra el modal
//   sin guardar el resto del formulario.
// - Modo "temporal" (equipoId es null, equipo todavía no guardado): no
//   hay ningún id contra el que llamar al backend todavía, así que los
//   ítems viven en un simple array de strings, controlado por el padre
//   (EquipoFormModal), que los envía uno por uno a crearItemIncluido()
//   recién creado el equipo (ver manejarEnvio en EquipoFormModal.tsx).
// ==========================================

"use client";

import { useEffect, useState } from "react";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  crearItemIncluido,
  editarItemIncluido,
  eliminarItemIncluido,
  getItemsIncluidos,
  reordenarItemsIncluidos,
} from "@/lib/api";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { ItemIncluido } from "@/types";

interface ItemsIncluidosEditorProps {
  // null = equipo nuevo, todavía sin guardar (modo temporal).
  equipoId: number | null;
  token: string;
  // Solo se usan en modo temporal (equipoId === null): el padre es quien
  // guarda esta lista y decide qué hacer con ella al crear el equipo.
  itemsTemporales: string[];
  onCambiarItemsTemporales: (items: string[]) => void;
}

export default function ItemsIncluidosEditor({
  equipoId,
  token,
  itemsTemporales,
  onCambiarItemsTemporales,
}: ItemsIncluidosEditorProps) {
  // --- Modo persistido: lista real, cargada del backend ---
  const [itemsPersistidos, setItemsPersistidos] = useState<ItemIncluido[]>([]);
  const [cargando, setCargando] = useState(equipoId !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (equipoId === null) return;

    let cancelado = false;
    // Fetch de datos al cambiar de equipo (o al montar): el caso de uso
    // que un efecto debe cubrir, no hay forma de derivarlo sin uno.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true);
    setError(null);
    getItemsIncluidos(equipoId)
      .then((items) => {
        if (!cancelado) setItemsPersistidos(items);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "No se pudieron cargar los ítems.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    // Si el modal se cierra/desmonta antes de que la petición responda,
    // evita actualizar el estado de un componente que ya no existe.
    return () => {
      cancelado = true;
    };
  }, [equipoId]);

  // --- Campo para agregar un ítem nuevo (compartido por ambos modos) ---
  const [descripcionNueva, setDescripcionNueva] = useState("");
  const [agregando, setAgregando] = useState(false);

  async function manejarAgregar() {
    const descripcion = descripcionNueva.trim();
    if (!descripcion) return;

    if (equipoId === null) {
      // Modo temporal: solo se agrega al array local del padre.
      onCambiarItemsTemporales([...itemsTemporales, descripcion]);
      setDescripcionNueva("");
      return;
    }

    setAgregando(true);
    setError(null);
    try {
      const item = await crearItemIncluido(equipoId, descripcion, token);
      setItemsPersistidos((actual) => [...actual, item]);
      setDescripcionNueva("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el ítem.");
    } finally {
      setAgregando(false);
    }
  }

  // --- Editar la descripción de un ítem existente (solo modo persistido:
  // en modo temporal, el input de cada fila ya es controlado directamente) ---
  async function manejarEditar(item: ItemIncluido, descripcionNuevaTexto: string) {
    const descripcion = descripcionNuevaTexto.trim();
    // Sin cambios reales, o vacío (no se permite guardar una descripción
    // vacía): no hace falta llamar al backend.
    if (!descripcion || descripcion === item.descripcion) return;

    setError(null);
    try {
      const actualizado = await editarItemIncluido(item.id, descripcion, token);
      setItemsPersistidos((actual) => actual.map((i) => (i.id === item.id ? actualizado : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo editar el ítem.");
    }
  }

  // --- Eliminar un ítem ---
  async function manejarEliminar(indice: number) {
    if (equipoId === null) {
      onCambiarItemsTemporales(itemsTemporales.filter((_, i) => i !== indice));
      return;
    }

    const item = itemsPersistidos[indice];
    setError(null);
    try {
      await eliminarItemIncluido(item.id, token);
      setItemsPersistidos((actual) => actual.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el ítem.");
    }
  }

  // --- Reordenar con flechas subir/bajar: intercambia el ítem con su
  // vecino inmediato (arriba o abajo) ---
  async function manejarMover(indice: number, direccion: "arriba" | "abajo") {
    const indiceVecino = direccion === "arriba" ? indice - 1 : indice + 1;

    if (equipoId === null) {
      if (indiceVecino < 0 || indiceVecino >= itemsTemporales.length) return;
      const copia = [...itemsTemporales];
      [copia[indice], copia[indiceVecino]] = [copia[indiceVecino], copia[indice]];
      onCambiarItemsTemporales(copia);
      return;
    }

    if (indiceVecino < 0 || indiceVecino >= itemsPersistidos.length) return;
    const item = itemsPersistidos[indice];
    const vecino = itemsPersistidos[indiceVecino];

    setError(null);
    try {
      // Se intercambian los valores de "orden" entre los dos ítems
      // vecinos: alcanza con mandar esos dos, no toda la lista.
      await reordenarItemsIncluidos(
        equipoId,
        [
          { id: item.id, orden: vecino.orden },
          { id: vecino.id, orden: item.orden },
        ],
        token
      );
      setItemsPersistidos((actual) => {
        const copia = [...actual];
        const ordenTemp = copia[indice].orden;
        copia[indice] = { ...copia[indice], orden: copia[indiceVecino].orden };
        copia[indiceVecino] = { ...copia[indiceVecino], orden: ordenTemp };
        // Se reordena el array local por posición (no solo el campo
        // "orden") para que la UI refleje el nuevo orden de inmediato.
        [copia[indice], copia[indiceVecino]] = [copia[indiceVecino], copia[indice]];
        return copia;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reordenar los ítems.");
    }
  }

  // Filas a renderizar, normalizadas para que el JSX de abajo no tenga
  // que ramificar entre modos: en modo temporal se envuelve cada string
  // en un objeto "falso" con un id sintético (su índice).
  const filas =
    equipoId === null
      ? itemsTemporales.map((descripcion, indice) => ({ key: `temp-${indice}`, descripcion }))
      : itemsPersistidos.map((item) => ({ key: String(item.id), descripcion: item.descripcion }));

  return (
    <div>
      <p className="mb-2 text-sm">¿Qué incluye este equipo?</p>

      {cargando && <LoadingSpinner label="Cargando ítems..." />}
      {error && (
        <div className="mb-2">
          <ErrorMessage message={error} />
        </div>
      )}

      {!cargando && (
        <div className="flex flex-col gap-2">
          {filas.map((fila, indice) => (
            <div key={fila.key} className="flex items-center gap-2">
              {/* Flechas de reordenar: la primera fila no puede subir, la
                  última no puede bajar. Más simple y confiable de
                  implementar que arrastrar y soltar. */}
              <div className="flex flex-col leading-none">
                <button
                  type="button"
                  onClick={() => manejarMover(indice, "arriba")}
                  disabled={indice === 0}
                  aria-label="Mover arriba"
                  className={`text-xs text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 ${TRANSICION_HOVER}`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => manejarMover(indice, "abajo")}
                  disabled={indice === filas.length - 1}
                  aria-label="Mover abajo"
                  className={`text-xs text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 ${TRANSICION_HOVER}`}
                >
                  ▼
                </button>
              </div>

              {/* Modo temporal: input controlado que actualiza el array
                  del padre en cada tecla. Modo persistido: input con su
                  propio estado local, que solo llama al backend al
                  perder el foco (onBlur) — evita una petición por cada
                  tecla presionada. */}
              {equipoId === null ? (
                <input
                  type="text"
                  value={fila.descripcion}
                  onChange={(e) => {
                    const copia = [...itemsTemporales];
                    copia[indice] = e.target.value;
                    onCambiarItemsTemporales(copia);
                  }}
                  className="flex-1 rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-purple"
                />
              ) : (
                <input
                  type="text"
                  defaultValue={fila.descripcion}
                  onBlur={(e) => manejarEditar(itemsPersistidos[indice], e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-purple"
                />
              )}

              <button
                type="button"
                onClick={() => manejarEliminar(indice)}
                aria-label="Eliminar ítem"
                className={`text-red-300 hover:text-red-400 ${TRANSICION_HOVER}`}
              >
                Eliminar
              </button>
            </div>
          ))}

          {filas.length === 0 && <p className="text-sm text-muted">Todavía no agregaste ningún ítem.</p>}

          {/* Agregar ítem nuevo: mismo campo para ambos modos. */}
          <div className="mt-1 flex items-center gap-2">
            <input
              type="text"
              value={descripcionNueva}
              onChange={(e) => setDescripcionNueva(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  manejarAgregar();
                }
              }}
              placeholder="Ej. 4 monitores"
              className="flex-1 rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-purple"
            />
            <button
              type="button"
              onClick={manejarAgregar}
              disabled={agregando || !descripcionNueva.trim()}
              className={`rounded-lg border border-brand-purple-light px-3 py-2 text-sm text-brand-purple-light hover:bg-brand-purple/10 disabled:cursor-not-allowed disabled:opacity-50 ${TRANSICION_HOVER}`}
            >
              {agregando ? "Agregando..." : "Agregar ítem"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
