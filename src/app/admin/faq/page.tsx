// ==========================================
// Gestión de Preguntas Frecuentes ("/admin/faq").
// Client Component: necesita el token de sesión (useAuth) para las
// operaciones protegidas (crear/editar/eliminar/reordenar) y estado local
// para la lista, el formulario de alta y la edición inline de cada
// pregunta.
//
// Se muestran las preguntas SIEMPRE expandidas (pregunta + respuesta
// visibles), no como acordeón colapsable: son pocas (8 de ejemplo, y no
// se espera que crezcan mucho más), y el admin necesita ver el contenido
// completo de cada una para poder editarlo de un vistazo, sin tener que
// desplegar una por una primero. El acordeón colapsable sí se usa en el
// sitio PÚBLICO (ver AcordeonFaq.tsx), donde el objetivo es justo el
// opuesto: no saturar la pantalla con todas las respuestas a la vez.
// ==========================================

"use client";

import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError,
  crearPreguntaFrecuente,
  editarPreguntaFrecuente,
  eliminarPreguntaFrecuente,
  getPreguntasFrecuentes,
  reordenarPreguntasFrecuentes,
} from "@/lib/api";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { PreguntaFrecuente } from "@/types";

export default function FaqAdminPage() {
  const { token } = useAuth();

  // --- Listado ---
  const [preguntas, setPreguntas] = useState<PreguntaFrecuente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarPreguntas() {
    setCargando(true);
    setError(null);
    try {
      // El backend ya las devuelve ordenadas por "orden"; no hace falta
      // volver a ordenarlas del lado del cliente.
      setPreguntas(await getPreguntasFrecuentes());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las preguntas frecuentes.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // Fetch de datos al montar: el caso de uso que un efecto debe cubrir,
    // no hay forma de derivarlo sin uno (mismo criterio que el resto de
    // las pantallas de gestión del panel).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarPreguntas();
  }, []);

  // --- Alta de una pregunta nueva: formulario que se abre/cierra con el
  // botón "Agregar pregunta", en vez de estar siempre visible ocupando
  // espacio arriba de la lista. ---
  const [formAgregarAbierto, setFormAgregarAbierto] = useState(false);
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [nuevaRespuesta, setNuevaRespuesta] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  async function manejarCrear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!token || creando) return;

    if (!nuevaPregunta.trim() || !nuevaRespuesta.trim()) {
      setErrorCrear("La pregunta y la respuesta son obligatorias.");
      return;
    }

    setCreando(true);
    setErrorCrear(null);
    try {
      const creada = await crearPreguntaFrecuente(nuevaPregunta.trim(), nuevaRespuesta.trim(), token);
      // La pregunta nueva siempre queda al final (el backend le asigna el
      // siguiente "orden"): alcanza con agregarla al final del array
      // local, sin tener que volver a pedir toda la lista.
      setPreguntas((actual) => [...actual, creada]);
      setNuevaPregunta("");
      setNuevaRespuesta("");
      setFormAgregarAbierto(false);
    } catch (err) {
      setErrorCrear(err instanceof Error ? err.message : "No se pudo crear la pregunta.");
    } finally {
      setCreando(false);
    }
  }

  // --- Edición inline (pregunta + respuesta de una fila a la vez) ---
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [preguntaEditada, setPreguntaEditada] = useState("");
  const [respuestaEditada, setRespuestaEditada] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

  function iniciarEdicion(item: PreguntaFrecuente) {
    setIdEditando(item.id);
    setPreguntaEditada(item.pregunta);
    setRespuestaEditada(item.respuesta);
    setErrorEditar(null);
  }

  function cancelarEdicion() {
    setIdEditando(null);
    setErrorEditar(null);
  }

  async function guardarEdicion() {
    if (!token || idEditando === null || guardando) return;

    if (!preguntaEditada.trim() || !respuestaEditada.trim()) {
      setErrorEditar("La pregunta y la respuesta son obligatorias.");
      return;
    }

    setGuardando(true);
    setErrorEditar(null);
    try {
      const actualizada = await editarPreguntaFrecuente(
        idEditando,
        preguntaEditada.trim(),
        respuestaEditada.trim(),
        token
      );
      setPreguntas((actual) => actual.map((p) => (p.id === actualizada.id ? actualizada : p)));
      setIdEditando(null);
    } catch (err) {
      setErrorEditar(err instanceof Error ? err.message : "No se pudo guardar la pregunta.");
    } finally {
      setGuardando(false);
    }
  }

  // --- Reordenar con flechas subir/bajar: intercambia la pregunta con su
  // vecina inmediata (arriba o abajo) — mismo patrón que
  // ItemsIncluidosEditor.tsx (manejarMover), pero sin estar anidado bajo
  // ningún equipo: acá la lista es única y global. ---
  const [errorReordenar, setErrorReordenar] = useState<string | null>(null);

  async function manejarMover(indice: number, direccion: "arriba" | "abajo") {
    if (!token) return;

    const indiceVecino = direccion === "arriba" ? indice - 1 : indice + 1;
    if (indiceVecino < 0 || indiceVecino >= preguntas.length) return;

    const item = preguntas[indice];
    const vecino = preguntas[indiceVecino];

    setErrorReordenar(null);
    try {
      // Se intercambian los valores de "orden" entre las dos preguntas
      // vecinas: alcanza con mandar esas dos, no toda la lista.
      await reordenarPreguntasFrecuentes(
        [
          { id: item.id, orden: vecino.orden },
          { id: vecino.id, orden: item.orden },
        ],
        token
      );
      setPreguntas((actual) => {
        const copia = [...actual];
        const ordenTemp = copia[indice].orden;
        copia[indice] = { ...copia[indice], orden: copia[indiceVecino].orden };
        copia[indiceVecino] = { ...copia[indiceVecino], orden: ordenTemp };
        // Se reordena el array local por POSICIÓN (no solo el campo
        // "orden") para que la lista se vea reordenada de inmediato, sin
        // esperar a un nuevo fetch.
        [copia[indice], copia[indiceVecino]] = [copia[indiceVecino], copia[indice]];
        return copia;
      });
    } catch (err) {
      setErrorReordenar(err instanceof Error ? err.message : "No se pudo reordenar las preguntas.");
    }
  }

  // --- Eliminación (con confirmación) ---
  const [preguntaAEliminar, setPreguntaAEliminar] = useState<PreguntaFrecuente | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function confirmarEliminar() {
    if (!token || !preguntaAEliminar || eliminando) return;

    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarPreguntaFrecuente(preguntaAEliminar.id, token);
      setPreguntas((actual) => actual.filter((p) => p.id !== preguntaAEliminar.id));
      setPreguntaAEliminar(null);
    } catch (err) {
      setErrorEliminar(err instanceof ApiError ? err.message : "No se pudo eliminar la pregunta.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Preguntas frecuentes</h1>
          <p className="mt-1 text-muted">
            Se muestran en ese mismo orden en la sección &quot;Preguntas frecuentes&quot; del sitio público.
          </p>
        </div>
        <Button type="button" onClick={() => setFormAgregarAbierto((abierto) => !abierto)}>
          {formAgregarAbierto ? "Cancelar" : "Agregar pregunta"}
        </Button>
      </div>

      {/* --- Formulario de alta: solo visible al pulsar "Agregar pregunta" --- */}
      {formAgregarAbierto && (
        <form
          onSubmit={manejarCrear}
          className="mt-6 flex flex-col gap-3 rounded-xl border border-white/10 bg-background-surface p-5"
        >
          <label className="flex flex-col gap-1 text-sm">
            Pregunta
            <input
              type="text"
              value={nuevaPregunta}
              onChange={(e) => setNuevaPregunta(e.target.value)}
              autoFocus
              placeholder="Ej. ¿Cuál es el horario de atención?"
              className="rounded-lg border border-white/10 bg-background px-4 py-2 text-foreground outline-none focus:border-brand-purple"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Respuesta
            <textarea
              value={nuevaRespuesta}
              onChange={(e) => setNuevaRespuesta(e.target.value)}
              rows={3}
              className="rounded-lg border border-white/10 bg-background px-4 py-2 text-foreground outline-none focus:border-brand-purple"
            />
          </label>
          {errorCrear && <ErrorMessage message={errorCrear} />}
          <div className="flex justify-end">
            <Button type="submit" disabled={creando}>
              {creando ? "Creando..." : "Crear pregunta"}
            </Button>
          </div>
        </form>
      )}

      {/* --- Lista --- */}
      <div className="mt-8">
        {cargando && <LoadingSpinner label="Cargando preguntas frecuentes..." />}
        {!cargando && error && <ErrorMessage message={error} />}

        {!cargando && !error && (
          <div className="flex flex-col gap-3">
            {preguntas.map((item, indice) => {
              const enEdicion = idEditando === item.id;

              return (
                <div
                  key={item.id}
                  // "data-testid" estable por id: independiente de si la
                  // fila está en modo lectura o edición (a diferencia de
                  // filtrar por "contiene el botón Editar", que deja de
                  // matchear justo al entrar en modo edición).
                  data-testid={`faq-fila-${item.id}`}
                  className="rounded-xl border border-white/10 bg-background-surface p-5"
                >
                  <div className="flex items-start gap-3">
                    {/* Flechas de reordenar: la primera fila no puede
                        subir, la última no puede bajar — mismo criterio
                        que ItemsIncluidosEditor.tsx. */}
                    <div className="mt-1 flex flex-col leading-none">
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
                        disabled={indice === preguntas.length - 1}
                        aria-label="Mover abajo"
                        className={`text-xs text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 ${TRANSICION_HOVER}`}
                      >
                        ▼
                      </button>
                    </div>

                    {/* Contenido: modo lectura o modo edición inline. */}
                    <div className="flex-1">
                      {enEdicion ? (
                        <div className="flex flex-col gap-3">
                          <label className="flex flex-col gap-1 text-sm">
                            Pregunta
                            <input
                              type="text"
                              value={preguntaEditada}
                              onChange={(e) => setPreguntaEditada(e.target.value)}
                              autoFocus
                              className="rounded-lg border border-brand-purple bg-background px-3 py-2 text-foreground outline-none"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-sm">
                            Respuesta
                            <textarea
                              value={respuestaEditada}
                              onChange={(e) => setRespuestaEditada(e.target.value)}
                              rows={3}
                              className="rounded-lg border border-brand-purple bg-background px-3 py-2 text-foreground outline-none"
                            />
                          </label>
                          {errorEditar && <ErrorMessage message={errorEditar} />}
                          <div className="flex items-center gap-3">
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
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{item.pregunta}</p>
                            <p className="mt-1 text-sm leading-relaxed text-muted">{item.respuesta}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <button
                              type="button"
                              onClick={() => iniciarEdicion(item)}
                              className={`text-sm text-brand-purple-light hover:text-brand-pink ${TRANSICION_HOVER}`}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreguntaAEliminar(item)}
                              className={`text-sm text-red-300 hover:text-red-400 ${TRANSICION_HOVER}`}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {preguntas.length === 0 && (
              <p className="py-6 text-center text-muted">Todavía no hay preguntas frecuentes.</p>
            )}

            {errorReordenar && <ErrorMessage message={errorReordenar} />}
          </div>
        )}
      </div>

      <ConfirmDialog
        abierto={preguntaAEliminar !== null}
        titulo="Eliminar pregunta frecuente"
        mensaje={`¿Seguro que quieres eliminar "${preguntaAEliminar?.pregunta}"? Esta acción no se puede deshacer.`}
        cargando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={() => {
          setPreguntaAEliminar(null);
          setErrorEliminar(null);
        }}
      />
    </div>
  );
}
