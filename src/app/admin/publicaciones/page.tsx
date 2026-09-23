// ==========================================
// Gestión de Publicaciones de eventos ("/admin/publicaciones").
// Client Component: lista las publicaciones (fotos/videos de eventos ya
// realizados) en una grilla tipo galería, permite crear nuevas vía
// PublicacionFormModal, alternar "destacado" directo desde la tarjeta (sin
// abrir el formulario, mismo criterio que el switch de disponibilidad de
// Equipos) y eliminar con confirmación.
// ==========================================

"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { ApiError, editarPublicacion, eliminarPublicacion, getEquipos, getPublicaciones } from "@/lib/api";
import { TRANSICION_HOVER, TRANSICION_HOVER_COMPLETA } from "@/lib/estilos";
import type { Equipo, Publicacion } from "@/types";
import PublicacionFormModal from "./PublicacionFormModal";

export default function PublicacionesAdminPage() {
  const { token } = useAuth();

  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      // Ambos son endpoints públicos: no hace falta el token para leerlos.
      const [publicacionesCargadas, equiposCargados] = await Promise.all([getPublicaciones(), getEquipos()]);
      setPublicaciones(publicacionesCargadas);
      setEquipos(equiposCargados);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las publicaciones.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, []);

  // --- Alternar "destacado" directo desde la tarjeta ---
  const [idAlternando, setIdAlternando] = useState<number | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  async function manejarToggleDestacado(publicacion: Publicacion) {
    if (!token || idAlternando !== null) return;

    setIdAlternando(publicacion.id);
    setErrorAccion(null);
    try {
      const nuevoValor = !publicacion.destacado;
      await editarPublicacion(publicacion.id, { destacado: nuevoValor }, token);
      setPublicaciones((actual) =>
        actual.map((p) => (p.id === publicacion.id ? { ...p, destacado: nuevoValor } : p))
      );
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "No se pudo cambiar el estado de destacado.");
    } finally {
      setIdAlternando(null);
    }
  }

  // --- Alta (modal). No hay edición de contenido multimedia: el backend
  //     no la permite, ver DatosEditarPublicacion en lib/api.ts. ---
  const [modalAbierto, setModalAbierto] = useState(false);

  function manejarGuardado() {
    setModalAbierto(false);
    // El POST no devuelve la publicación con "equipo" incluido: se vuelve
    // a pedir la lista completa en vez de intentar armar el objeto a mano.
    cargarDatos();
  }

  // --- Eliminación (con confirmación) ---
  const [publicacionAEliminar, setPublicacionAEliminar] = useState<Publicacion | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function confirmarEliminar() {
    if (!token || !publicacionAEliminar || eliminando) return;

    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarPublicacion(publicacionAEliminar.id, token);
      setPublicaciones((actual) => actual.filter((p) => p.id !== publicacionAEliminar.id));
      setPublicacionAEliminar(null);
    } catch (err) {
      setErrorEliminar(err instanceof ApiError ? err.message : "No se pudo eliminar la publicación.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Publicaciones</h1>
          <p className="mt-1 text-muted">Fotos y videos de eventos ya realizados.</p>
        </div>
        <Button onClick={() => setModalAbierto(true)} disabled={equipos.length === 0}>
          Nueva publicación
        </Button>
      </div>

      {!cargando && equipos.length === 0 && !error && (
        <p className="mt-3 text-sm text-muted">
          Todavía no hay equipos: crea al menos uno en{" "}
          <a href="/admin/equipos" className={`text-brand-purple-light hover:text-brand-pink ${TRANSICION_HOVER}`}>
            Equipos
          </a>{" "}
          antes de publicar un evento.
        </p>
      )}

      {errorAccion && (
        <div className="mt-4">
          <ErrorMessage message={errorAccion} />
        </div>
      )}

      <div className="mt-8">
        {cargando && <LoadingSpinner label="Cargando publicaciones..." />}
        {!cargando && error && <ErrorMessage message={error} />}

        {!cargando && !error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicaciones.map((publicacion) => {
              // Miniatura: la portada del video, o la primera foto del álbum.
              const miniatura =
                publicacion.tipo === "VIDEO" ? publicacion.thumbnailUrl : publicacion.imagenes[0]?.imagenUrl;

              return (
                <div
                  key={publicacion.id}
                  className={`overflow-hidden rounded-xl border border-white/10 bg-background-surface ${TRANSICION_HOVER_COMPLETA} hover:border-brand-pink`}
                >
                  <div className="relative aspect-[4/3] w-full bg-background">
                    {miniatura ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={miniatura} alt={publicacion.titulo} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">Sin imagen</div>
                    )}

                    {/* Etiqueta de tipo, superpuesta sobre la miniatura. */}
                    <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-purple-light">
                      {publicacion.tipo === "VIDEO" ? "Video" : `Álbum (${publicacion.imagenes.length})`}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 p-4">
                    <h3 className="font-semibold text-foreground">{publicacion.titulo}</h3>
                    <p className="text-xs text-muted">{publicacion.equipo.nombre}</p>

                    <div className="mt-3 flex items-center justify-between">
                      {/* Toggle "Destacado" directo desde la tarjeta, mismo
                          patrón visual que el switch de disponibilidad de
                          Equipos. "left-0.5" en la perilla (antes ausente)
                          fija su posición base en vez de dejarla en el
                          "left" automático que el navegador calcula para un
                          elemento absoluto sin ninguna otra referencia —
                          ese automático la ubicaba corrida hacia la derecha,
                          y al sumarle "translate-x-5" (estado activo) se
                          salía del track de 44px y tapaba la primera letra
                          de la etiqueta. Con "left-0.5" fijo, la perilla
                          queda igual de contenida en ambos estados (2px de
                          margen a cada lado, igual que "top-0.5" en
                          vertical). "gap-3" (antes "gap-2") es el espacio
                          entre el switch y su etiqueta: con la perilla ya
                          contenida no era estrictamente necesario, pero da
                          un margen extra para que nunca vuelvan a quedar
                          pegados. */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={publicacion.destacado}
                          onClick={() => manejarToggleDestacado(publicacion)}
                          disabled={idAlternando === publicacion.id}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                            publicacion.destacado ? "bg-brand-purple" : "bg-white/10"
                          }`}
                        >
                          <span
                            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                              publicacion.destacado ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-xs text-muted">Destacado</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPublicacionAEliminar(publicacion)}
                        className={`text-sm text-red-300 hover:text-red-400 ${TRANSICION_HOVER}`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {publicaciones.length === 0 && (
              <p className="col-span-full py-6 text-center text-muted">Todavía no hay publicaciones.</p>
            )}
          </div>
        )}
      </div>

      {modalAbierto && token && (
        <PublicacionFormModal
          equipos={equipos}
          token={token}
          onGuardado={manejarGuardado}
          onCerrar={() => setModalAbierto(false)}
        />
      )}

      <ConfirmDialog
        abierto={publicacionAEliminar !== null}
        titulo="Eliminar publicación"
        mensaje={`¿Seguro que quieres eliminar "${publicacionAEliminar?.titulo}"? Esta acción no se puede deshacer.`}
        cargando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={() => {
          setPublicacionAEliminar(null);
          setErrorEliminar(null);
        }}
      />
    </div>
  );
}
