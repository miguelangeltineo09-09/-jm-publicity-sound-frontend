// ==========================================
// Moderación de Reseñas ("/admin/resenas").
// Client Component: lista todas las reseñas de clientes sobre los
// equipos, permite aprobar/rechazar las PENDIENTE (el único lugar donde
// una reseña deja ese estado) y eliminar cualquiera (ej. spam evidente).
// Mismo patrón que admin/reservas/page.tsx (filtro por estado con tabs,
// actualización local sin recargar toda la lista).
// ==========================================

"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { cambiarEstadoResena, eliminarResena, getResenas } from "@/lib/api";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { EstadoResena, Resena } from "@/types";

// Tabs de filtro. Por defecto abre en "Pendientes" (más abajo, en el
// estado inicial): es lo que realmente requiere una decisión del admin,
// a diferencia de las ya aprobadas/rechazadas.
const OPCIONES_FILTRO: { valor: EstadoResena | "TODAS"; etiqueta: string }[] = [
  { valor: "TODAS", etiqueta: "Todas" },
  { valor: "PENDIENTE", etiqueta: "Pendientes" },
  { valor: "APROBADA", etiqueta: "Aprobadas" },
  { valor: "RECHAZADA", etiqueta: "Rechazadas" },
];

// Estilos del badge de estado: mismos tonos (desaturados, ya coherentes
// con el fondo morado oscuro) que ESTILOS_BADGE en admin/reservas/page.tsx.
const ESTILOS_BADGE: Record<EstadoResena, string> = {
  PENDIENTE: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  APROBADA: "bg-green-500/15 text-green-300 border border-green-500/30",
  RECHAZADA: "bg-red-500/15 text-red-300 border border-red-500/30",
};

// Calificación en estrellas (ej. "★★★★☆"): Unicode simple, sin depender
// de ninguna librería de iconos. Las estrellas llenas van en ámbar (el
// mismo tono cálido que ya usan las advertencias del resto del panel); las
// vacías quedan tenues para no competir visualmente con el resto de la fila.
function Estrellas({ calificacion }: { calificacion: number }) {
  return (
    <span aria-label={`${calificacion} de 5 estrellas`}>
      <span className="text-amber-300">{"★".repeat(calificacion)}</span>
      <span className="text-white/20">{"☆".repeat(5 - calificacion)}</span>
    </span>
  );
}

// "createdAt" es un instante real (cuándo se envió la reseña): se muestra
// en la hora local del navegador, sin forzar UTC (a diferencia de la
// fecha de un EVENTO, que sí representa un día calendario fijo).
function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ResenasAdminPage() {
  const { token } = useAuth();

  const [filtroEstado, setFiltroEstado] = useState<EstadoResena | "TODAS">("PENDIENTE");
  const [resenas, setResenas] = useState<Resena[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarResenas() {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const filtros = filtroEstado === "TODAS" ? undefined : { estado: filtroEstado };
      setResenas(await getResenas(filtros, token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las reseñas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // Fetch de datos al cambiar de filtro (o al montar): el caso de uso
    // que un efecto debe cubrir, no hay forma de derivarlo sin uno.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarResenas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, token]);

  // Aplica localmente el nuevo estado de una reseña sin recargar toda la
  // lista: si ya no coincide con el filtro activo, se quita de la vista
  // (ej. una PENDIENTE que se aprueba desaparece de la pestaña "Pendientes").
  function actualizarResenaLocal(resenaActualizada: Resena) {
    setResenas((actual) => {
      const coincideConFiltro = filtroEstado === "TODAS" || resenaActualizada.estado === filtroEstado;
      if (!coincideConFiltro) {
        return actual.filter((r) => r.id !== resenaActualizada.id);
      }
      return actual.map((r) => (r.id === resenaActualizada.id ? resenaActualizada : r));
    });
  }

  // --- Aprobar / Rechazar ---
  const [idProcesando, setIdProcesando] = useState<number | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  async function manejarCambioEstado(resena: Resena, estado: "APROBADA" | "RECHAZADA") {
    if (!token || idProcesando !== null) return;
    setIdProcesando(resena.id);
    setErrorAccion(null);
    try {
      const actualizada = await cambiarEstadoResena(resena.id, estado, token);
      actualizarResenaLocal(actualizada);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "No se pudo actualizar la reseña.");
    } finally {
      setIdProcesando(null);
    }
  }

  // --- Eliminar (con confirmación) ---
  const [resenaAEliminar, setResenaAEliminar] = useState<Resena | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function confirmarEliminar() {
    if (!token || !resenaAEliminar || eliminando) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarResena(resenaAEliminar.id, token);
      setResenas((actual) => actual.filter((r) => r.id !== resenaAEliminar.id));
      setResenaAEliminar(null);
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : "No se pudo eliminar la reseña.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Reseñas</h1>
      <p className="mt-1 text-muted">Calificaciones y comentarios de clientes sobre los equipos.</p>

      {/* --- Tabs de filtro por estado --- */}
      <div className="mt-6 flex flex-wrap gap-2">
        {OPCIONES_FILTRO.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => setFiltroEstado(opcion.valor)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
              filtroEstado === opcion.valor
                ? "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white"
                : "bg-background-surface text-muted hover:text-foreground"
            }`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {errorAccion && (
        <div className="mt-4">
          <ErrorMessage message={errorAccion} />
        </div>
      )}

      <div className="mt-6">
        {cargando && <LoadingSpinner label="Cargando reseñas..." />}
        {!cargando && error && <ErrorMessage message={error} />}

        {!cargando && !error && (
          // Mismo patrón responsivo de scroll horizontal contenido que el
          // resto de las tablas del panel (ver el comentario largo en
          // admin/equipos/page.tsx). 7 columnas, incluida una de
          // comentario libre: es de las anchas que definitivamente no
          // entran en 320-375px sin este contenedor.
          <div>
            <p className="mb-2 text-xs text-muted sm:hidden">← Desliza para ver toda la tabla →</p>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
                {/* Mismo tratamiento de encabezado "sobrio" que el resto de las
                    tablas del panel (Equipos, Categorías, Reservas). */}
                <thead>
                  <tr className="bg-background-surface text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="rounded-l-lg px-3 py-3">Cliente</th>
                    <th className="px-3 py-3">Equipo</th>
                    <th className="px-3 py-3">Calificación</th>
                    <th className="px-3 py-3">Comentario</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Fecha</th>
                    <th className="rounded-r-lg px-3 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
              {resenas.map((resena) => (
                <tr
                  key={resena.id}
                  className={`bg-background-surface align-top ${TRANSICION_HOVER} hover:bg-brand-purple/10`}
                >
                  <td className="rounded-l-lg px-3 py-3">{resena.nombreCliente}</td>
                  <td className="px-3 py-3 text-muted">{resena.equipo.nombre}</td>
                  <td className="px-3 py-3">
                    <Estrellas calificacion={resena.calificacion} />
                  </td>
                  <td className="max-w-xs px-3 py-3 text-muted">{resena.comentario || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTILOS_BADGE[resena.estado]}`}>
                      {resena.estado}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted">{formatearFecha(resena.createdAt)}</td>
                  <td className="rounded-r-lg px-3 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {resena.estado === "PENDIENTE" && (
                        <>
                          <button
                            type="button"
                            onClick={() => manejarCambioEstado(resena, "APROBADA")}
                            disabled={idProcesando === resena.id}
                            className={`text-green-300 hover:text-green-400 disabled:opacity-50 ${TRANSICION_HOVER}`}
                          >
                            {idProcesando === resena.id ? "Procesando..." : "Aprobar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => manejarCambioEstado(resena, "RECHAZADA")}
                            disabled={idProcesando === resena.id}
                            className={`text-red-300 hover:text-red-400 disabled:opacity-50 ${TRANSICION_HOVER}`}
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setResenaAEliminar(resena)}
                        className={`text-muted hover:text-red-400 ${TRANSICION_HOVER}`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {resenas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted">
                    No hay reseñas en este filtro.
                  </td>
                </tr>
              )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        abierto={resenaAEliminar !== null}
        titulo="Eliminar reseña"
        mensaje={`¿Seguro que quieres eliminar la reseña de "${resenaAEliminar?.nombreCliente}"? Esta acción no se puede deshacer.`}
        cargando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={() => {
          setResenaAEliminar(null);
          setErrorEliminar(null);
        }}
      />
    </div>
  );
}
