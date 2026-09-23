// ==========================================
// Editor de "Redes sociales" dentro de /admin/configuracion.
// Lista, crea, edita, elimina y reordena las redes sociales del negocio.
// Client Component: necesita el token de sesión y estado local para la
// lista, el formulario de alta y la edición inline de cada fila —
// mismo patrón general que la pantalla de Preguntas Frecuentes
// (src/app/admin/faq/page.tsx), adaptado a los campos nombre/url en vez
// de pregunta/respuesta.
// ==========================================

"use client";

import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import IconoRedSocial from "@/components/IconoRedSocial";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  ApiError,
  crearRedSocial,
  editarRedSocial,
  eliminarRedSocial,
  getRedesSociales,
  reordenarRedesSociales,
} from "@/lib/api";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { RedSocial } from "@/types";

interface RedesSocialesEditorProps {
  token: string;
}

export default function RedesSocialesEditor({ token }: RedesSocialesEditorProps) {
  // --- Listado ---
  const [redes, setRedes] = useState<RedSocial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRedesSociales()
      .then(setRedes)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las redes sociales."))
      .finally(() => setCargando(false));
  }, []);

  // --- Alta de una red nueva ---
  const [formAgregarAbierto, setFormAgregarAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaUrl, setNuevaUrl] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  async function manejarCrear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (creando) return;

    if (!nuevoNombre.trim() || !nuevaUrl.trim()) {
      setErrorCrear("El nombre y la url son obligatorios.");
      return;
    }

    setCreando(true);
    setErrorCrear(null);
    try {
      const creada = await crearRedSocial(nuevoNombre.trim(), nuevaUrl.trim(), token);
      // Igual criterio que crearPreguntaFrecuente en la pantalla de FAQ:
      // la red nueva siempre queda al final (el backend le asigna el
      // siguiente "orden"), alcanza con agregarla al final del array local.
      setRedes((actual) => [...actual, creada]);
      setNuevoNombre("");
      setNuevaUrl("");
      setFormAgregarAbierto(false);
    } catch (err) {
      setErrorCrear(err instanceof Error ? err.message : "No se pudo crear la red social.");
    } finally {
      setCreando(false);
    }
  }

  // --- Edición inline (nombre + url de una fila a la vez) ---
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [urlEditada, setUrlEditada] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

  function iniciarEdicion(red: RedSocial) {
    setIdEditando(red.id);
    setNombreEditado(red.nombre);
    setUrlEditada(red.url);
    setErrorEditar(null);
  }

  function cancelarEdicion() {
    setIdEditando(null);
    setErrorEditar(null);
  }

  async function guardarEdicion() {
    if (idEditando === null || guardando) return;

    if (!nombreEditado.trim() || !urlEditada.trim()) {
      setErrorEditar("El nombre y la url son obligatorios.");
      return;
    }

    setGuardando(true);
    setErrorEditar(null);
    try {
      const actualizada = await editarRedSocial(idEditando, nombreEditado.trim(), urlEditada.trim(), token);
      setRedes((actual) => actual.map((r) => (r.id === actualizada.id ? actualizada : r)));
      setIdEditando(null);
    } catch (err) {
      setErrorEditar(err instanceof Error ? err.message : "No se pudo guardar la red social.");
    } finally {
      setGuardando(false);
    }
  }

  // --- Reordenar con flechas subir/bajar: intercambia con el vecino
  // inmediato (arriba o abajo) — mismo patrón que ItemsIncluidosEditor.tsx
  // y la pantalla de Preguntas Frecuentes. ---
  const [errorReordenar, setErrorReordenar] = useState<string | null>(null);

  async function manejarMover(indice: number, direccion: "arriba" | "abajo") {
    const indiceVecino = direccion === "arriba" ? indice - 1 : indice + 1;
    if (indiceVecino < 0 || indiceVecino >= redes.length) return;

    const red = redes[indice];
    const vecino = redes[indiceVecino];

    setErrorReordenar(null);
    try {
      await reordenarRedesSociales(
        [
          { id: red.id, orden: vecino.orden },
          { id: vecino.id, orden: red.orden },
        ],
        token
      );
      setRedes((actual) => {
        const copia = [...actual];
        const ordenTemp = copia[indice].orden;
        copia[indice] = { ...copia[indice], orden: copia[indiceVecino].orden };
        copia[indiceVecino] = { ...copia[indiceVecino], orden: ordenTemp };
        [copia[indice], copia[indiceVecino]] = [copia[indiceVecino], copia[indice]];
        return copia;
      });
    } catch (err) {
      setErrorReordenar(err instanceof Error ? err.message : "No se pudo reordenar las redes sociales.");
    }
  }

  // --- Eliminación (con confirmación) ---
  const [redAEliminar, setRedAEliminar] = useState<RedSocial | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function confirmarEliminar() {
    if (!redAEliminar || eliminando) return;

    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarRedSocial(redAEliminar.id, token);
      setRedes((actual) => actual.filter((r) => r.id !== redAEliminar.id));
      setRedAEliminar(null);
    } catch (err) {
      setErrorEliminar(err instanceof ApiError ? err.message : "No se pudo eliminar la red social.");
    } finally {
      setEliminando(false);
    }
  }

  if (cargando) return <LoadingSpinner label="Cargando redes sociales..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Se muestran en este orden en el Footer y en la página de Contacto.</p>
        <Button type="button" onClick={() => setFormAgregarAbierto((abierto) => !abierto)}>
          {formAgregarAbierto ? "Cancelar" : "Agregar red social"}
        </Button>
      </div>

      {formAgregarAbierto && (
        <form
          onSubmit={manejarCrear}
          className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-background-surface p-5"
        >
          <label className="flex flex-col gap-1 text-sm">
            Nombre
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              autoFocus
              placeholder="Ej. Instagram"
              className="rounded-lg border border-white/10 bg-background px-3 py-2 text-foreground outline-none focus:border-brand-purple"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Url
            <input
              type="text"
              value={nuevaUrl}
              onChange={(e) => setNuevaUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-lg border border-white/10 bg-background px-3 py-2 text-foreground outline-none focus:border-brand-purple"
            />
          </label>
          {errorCrear && <ErrorMessage message={errorCrear} />}
          <div className="flex justify-end">
            <Button type="submit" disabled={creando}>
              {creando ? "Creando..." : "Crear red social"}
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {redes.map((red, indice) => {
          const enEdicion = idEditando === red.id;

          return (
            <div key={red.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-background-surface p-4">
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
                  disabled={indice === redes.length - 1}
                  aria-label="Mover abajo"
                  className={`text-xs text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 ${TRANSICION_HOVER}`}
                >
                  ▼
                </button>
              </div>

              <IconoRedSocial nombre={red.nombre} className="h-8 w-8" />

              {/* "min-w-0" (antes solo "flex-1"): un item flex, por
                  default, no se encoge por debajo del ancho que necesita
                  su CONTENIDO sin cortar ("overflow: visible" es el
                  default) — el "truncate" del <p> de la url de más abajo
                  no alcanzaba a evitar el desborde porque ese recorte
                  vive en el hijo, no en este contenedor, que seguía
                  reservando el ancho completo de la url (a veces larga,
                  con parámetros) para calcular el layout de la fila.
                  "min-w-0" le permite a este contenedor encogerse hasta
                  0 si hace falta, y ahí sí el "truncate" del hijo puede
                  recortar visualmente el texto en vez de empujar
                  "Editar"/"Eliminar" fuera de la pantalla. */}
              <div className="min-w-0 flex-1">
                {enEdicion ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      autoFocus
                      className="w-full rounded-lg border border-brand-purple bg-background px-3 py-1.5 text-sm text-foreground outline-none sm:w-32"
                    />
                    <input
                      type="text"
                      value={urlEditada}
                      onChange={(e) => setUrlEditada(e.target.value)}
                      className="w-full flex-1 rounded-lg border border-brand-purple bg-background px-3 py-1.5 text-sm text-foreground outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-foreground">{red.nombre}</p>
                    <p className="truncate text-sm text-muted">{red.url}</p>
                  </div>
                )}
                {enEdicion && errorEditar && (
                  <div className="mt-2">
                    <ErrorMessage message={errorEditar} />
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3 text-sm">
                {enEdicion ? (
                  <>
                    <button
                      type="button"
                      onClick={guardarEdicion}
                      disabled={guardando}
                      className={`text-brand-purple-light hover:text-brand-pink disabled:opacity-50 ${TRANSICION_HOVER}`}
                    >
                      {guardando ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelarEdicion}
                      disabled={guardando}
                      className={`text-muted hover:text-foreground disabled:opacity-50 ${TRANSICION_HOVER}`}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => iniciarEdicion(red)}
                      className={`text-brand-purple-light hover:text-brand-pink ${TRANSICION_HOVER}`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRedAEliminar(red)}
                      className={`text-red-300 hover:text-red-400 ${TRANSICION_HOVER}`}
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {redes.length === 0 && <p className="py-6 text-center text-muted">Todavía no hay redes sociales.</p>}

        {errorReordenar && <ErrorMessage message={errorReordenar} />}
      </div>

      <ConfirmDialog
        abierto={redAEliminar !== null}
        titulo="Eliminar red social"
        mensaje={`¿Seguro que quieres eliminar "${redAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        cargando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={() => {
          setRedAEliminar(null);
          setErrorEliminar(null);
        }}
      />
    </div>
  );
}
