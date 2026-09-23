// ==========================================
// Gestión de Equipos ("/admin/equipos").
// Client Component: lista los equipos, permite crear/editar vía
// EquipoFormModal, cambiar la disponibilidad con un switch directo en la
// fila (sin abrir el formulario) y eliminar con confirmación.
// ==========================================

"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { ApiError, cambiarDisponibilidadEquipo, eliminarEquipo, getCategorias, getEquipos } from "@/lib/api";
import { formatearMoneda } from "@/lib/formato";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { Categoria, Equipo } from "@/types";
import EquipoFormModal from "./EquipoFormModal";

export default function EquiposAdminPage() {
  const { token } = useAuth();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Errores de acciones que se disparan directo desde la fila (el switch
  // de disponibilidad), sin un formulario propio donde mostrarlos.
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [idAlternando, setIdAlternando] = useState<number | null>(null);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      // Ambos son endpoints públicos: no hacen falta el token ni protección.
      const [equiposCargados, categoriasCargadas] = await Promise.all([getEquipos(), getCategorias()]);
      setEquipos(equiposCargados);
      setCategorias(categoriasCargadas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los equipos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // Mismo patrón que en categorias/page.tsx: fetch de datos al montar,
    // el caso de uso que un efecto debe cubrir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, []);

  // --- Alternar disponibilidad directo desde la lista ---
  async function manejarToggleDisponibilidad(equipo: Equipo) {
    if (!token || idAlternando !== null) return;

    setIdAlternando(equipo.id);
    setErrorAccion(null);
    try {
      const nuevoValor = !equipo.disponibleParaAlquiler;
      await cambiarDisponibilidadEquipo(equipo.id, nuevoValor, token);
      // Solo se actualiza el campo que cambió: el endpoint de disponibilidad
      // no devuelve la categoría anidada, así que reemplazar el equipo
      // completo con la respuesta perdería ese dato en la tabla.
      setEquipos((actual) =>
        actual.map((e) => (e.id === equipo.id ? { ...e, disponibleParaAlquiler: nuevoValor } : e))
      );
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "No se pudo cambiar la disponibilidad.");
    } finally {
      setIdAlternando(null);
    }
  }

  // --- Alta / edición (modal) ---
  const [equipoModal, setEquipoModal] = useState<Equipo | "nuevo" | null>(null);

  function manejarGuardado(equipoGuardado: Equipo) {
    setEquipos((actual) => {
      const yaExiste = actual.some((e) => e.id === equipoGuardado.id);
      return yaExiste
        ? actual.map((e) => (e.id === equipoGuardado.id ? equipoGuardado : e))
        : [...actual, equipoGuardado];
    });
    setEquipoModal(null);
  }

  // --- Eliminación (con confirmación) ---
  const [equipoAEliminar, setEquipoAEliminar] = useState<Equipo | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function confirmarEliminar() {
    if (!token || !equipoAEliminar || eliminando) return;

    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarEquipo(equipoAEliminar.id, token);
      setEquipos((actual) => actual.filter((e) => e.id !== equipoAEliminar.id));
      setEquipoAEliminar(null);
    } catch (err) {
      // Acá llega el 400 de "tiene reservas pendientes/confirmadas".
      setErrorEliminar(err instanceof ApiError ? err.message : "No se pudo eliminar el equipo.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipos</h1>
          <p className="mt-1 text-muted">Catálogo de equipos disponibles para alquiler.</p>
        </div>
        <Button onClick={() => setEquipoModal("nuevo")} disabled={categorias.length === 0}>
          Nuevo equipo
        </Button>
      </div>

      {!cargando && categorias.length === 0 && !error && (
        <p className="mt-3 text-sm text-muted">
          Todavía no hay categorías: crea al menos una en{" "}
          <a href="/admin/categorias" className={`text-brand-purple-light hover:text-brand-pink ${TRANSICION_HOVER}`}>
            Categorías
          </a>{" "}
          antes de agregar equipos.
        </p>
      )}

      {errorAccion && (
        <div className="mt-4">
          <ErrorMessage message={errorAccion} />
        </div>
      )}

      <div className="mt-8">
        {cargando && <LoadingSpinner label="Cargando equipos..." />}
        {!cargando && error && <ErrorMessage message={error} />}

        {!cargando && !error && (
          <table className="w-full border-separate border-spacing-y-2 text-left text-sm">
            {/* Encabezado en el mismo tono "surface" que las filas, pero en
                mayúsculas/tenue para que se siga leyendo como encabezado y
                no como una fila más de datos. */}
            <thead>
              <tr className="bg-background-surface text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="rounded-l-lg px-3 py-3">Imagen</th>
                <th className="px-3 py-3">Nombre</th>
                <th className="px-3 py-3">Categoría</th>
                <th className="px-3 py-3">Precio</th>
                <th className="px-3 py-3">Disponible</th>
                <th className="rounded-r-lg px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipos.map((equipo) => (
                // Hover sutil hacia morado: ayuda a "leer" la fila sobre la
                // que está el cursor en una tabla con varias columnas.
                <tr key={equipo.id} className={`bg-background-surface hover:bg-brand-purple/10 ${TRANSICION_HOVER}`}>
                  <td className="rounded-l-lg px-3 py-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-background">
                      {equipo.imagenUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={equipo.imagenUrl} alt={equipo.nombre} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[9px] text-muted">
                          Sin imagen
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">{equipo.nombre}</td>
                  <td className="px-3 py-3 text-muted">{equipo.categoria.nombre}</td>
                  <td className="px-3 py-3">{formatearMoneda(Number(equipo.precio))}</td>
                  <td className="px-3 py-3">
                    {/* "left-0.5" fijo en la perilla (mismo fix que el
                        switch "Destacado" de Publicaciones): sin él, el
                        navegador calculaba el "left" automático de forma
                        que, sumado a "translate-x-5" en el estado activo,
                        la perilla terminaba saliéndose del track de 44px
                        por la derecha. */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={equipo.disponibleParaAlquiler}
                      onClick={() => manejarToggleDisponibilidad(equipo)}
                      disabled={idAlternando === equipo.id}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                        equipo.disponibleParaAlquiler ? "bg-brand-purple" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          equipo.disponibleParaAlquiler ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="rounded-r-lg px-3 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEquipoModal(equipo)}
                        className={`text-brand-purple-light hover:text-brand-pink ${TRANSICION_HOVER}`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEquipoAEliminar(equipo)}
                        className={`text-red-300 hover:text-red-400 ${TRANSICION_HOVER}`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {equipos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted">
                    Todavía no hay equipos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {equipoModal !== null && token && (
        <EquipoFormModal
          equipo={equipoModal === "nuevo" ? null : equipoModal}
          categorias={categorias}
          token={token}
          onGuardado={manejarGuardado}
          onCerrar={() => setEquipoModal(null)}
        />
      )}

      <ConfirmDialog
        abierto={equipoAEliminar !== null}
        titulo="Eliminar equipo"
        mensaje={`¿Seguro que quieres eliminar "${equipoAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        cargando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={() => {
          setEquipoAEliminar(null);
          setErrorEliminar(null);
        }}
      />
    </div>
  );
}
