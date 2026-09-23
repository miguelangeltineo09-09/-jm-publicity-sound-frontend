// ==========================================
// Gestión de Reservas ("/admin/reservas").
// Client Component: lista las solicitudes de alquiler y permite
// confirmarlas, rechazarlas, verlas en detalle, eliminarlas y, para las ya
// CONFIRMADAS, facturarlas (generar la factura, descargar su PDF y
// enviarla por correo al cliente).
//
// REGLA DE NEGOCIO: confirmar una reserva bloquea automáticamente esa
// fecha para ese equipo en el calendario público (el backend lo hace);
// por eso pide confirmación con ConfirmDialog. Rechazar no bloquea ni
// desbloquea nada, así que se aplica directo, sin diálogo. Enviar la
// factura por correo sí pide confirmación (muestra el email destino).
// ==========================================

"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError,
  cambiarEstadoReserva,
  crearFactura,
  descargarFacturaPDF,
  eliminarReserva,
  enviarFacturaPorCorreo,
  getFacturas,
  getReservas,
} from "@/lib/api";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { EstadoReserva, Factura, Reserva } from "@/types";
import { formatearFechaCreacion, formatearFechaEvento } from "./formatearFecha";
import NuevaReservaModal from "./NuevaReservaModal";
import ReservaDetalleModal from "./ReservaDetalleModal";

// Tabs de filtro. El orden visual va de "Todas" a cada estado, pero el
// filtro seleccionado por defecto (más abajo) es "PENDIENTE": es lo que el
// admin necesita atender primero al entrar a esta pantalla.
const OPCIONES_FILTRO: { valor: EstadoReserva | "TODAS"; etiqueta: string }[] = [
  { valor: "TODAS", etiqueta: "Todas" },
  { valor: "PENDIENTE", etiqueta: "Pendientes" },
  { valor: "CONFIRMADA", etiqueta: "Confirmadas" },
  { valor: "RECHAZADA", etiqueta: "Rechazadas" },
];

// Estilos del badge de estado: un color por estado, consistente en toda la tabla.
const ESTILOS_BADGE: Record<EstadoReserva, string> = {
  PENDIENTE: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  CONFIRMADA: "bg-green-500/15 text-green-300 border border-green-500/30",
  RECHAZADA: "bg-red-500/15 text-red-300 border border-red-500/30",
};

// Descarga un Blob en el navegador con el nombre de archivo indicado,
// simulando el clic en un enlace invisible. Es el patrón más simple y
// confiable en Next.js para archivos binarios (evita depender de cómo el
// navegador nombraría una pestaña nueva si se abriera el blob directo).
function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Libera la memoria reservada para la URL temporal del blob.
  URL.revokeObjectURL(url);
}

export default function ReservasAdminPage() {
  const { token } = useAuth();

  const [filtroEstado, setFiltroEstado] = useState<EstadoReserva | "TODAS">("PENDIENTE");
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Facturas ya emitidas, indexadas por reservaId: permite saber en O(1),
  // para cada fila de la tabla, si esa reserva ya tiene factura o no.
  const [facturasPorReserva, setFacturasPorReserva] = useState<Record<number, Factura>>({});

  async function cargarReservas() {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const filtros = filtroEstado === "TODAS" ? undefined : { estado: filtroEstado };
      // Se cargan reservas y facturas en paralelo: las facturas se piden
      // todas (sin filtro) porque el mapeo por reservaId es igual de simple
      // sea cual sea el filtro de estado activo en la tabla.
      const [listaReservas, listaFacturas] = await Promise.all([
        getReservas(filtros, token),
        getFacturas(undefined, token),
      ]);
      setReservas(listaReservas);
      setFacturasPorReserva(
        listaFacturas.reduce<Record<number, Factura>>((acc, factura) => {
          acc[factura.reservaId] = factura;
          return acc;
        }, {})
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las reservas.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // Fetch de datos al cambiar de filtro (o al montar): el caso de uso
    // que un efecto debe cubrir, no hay forma de derivarlo sin uno.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarReservas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, token]);

  // Aplica localmente el nuevo estado de una reserva sin recargar toda la
  // lista: si ya no coincide con el filtro activo, se quita de la vista
  // (ej. una PENDIENTE que se confirma desaparece de la pestaña "Pendientes").
  function actualizarReservaLocal(reservaActualizada: Reserva) {
    setReservas((actual) => {
      const coincideConFiltro = filtroEstado === "TODAS" || reservaActualizada.estado === filtroEstado;
      if (!coincideConFiltro) {
        return actual.filter((r) => r.id !== reservaActualizada.id);
      }
      return actual.map((r) => (r.id === reservaActualizada.id ? reservaActualizada : r));
    });
  }

  // --- Rechazar: acción directa, sin diálogo (no bloquea ni libera nada) ---
  const [idProcesando, setIdProcesando] = useState<number | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  async function manejarRechazar(reserva: Reserva) {
    if (!token || idProcesando !== null) return;
    setIdProcesando(reserva.id);
    setErrorAccion(null);
    try {
      const actualizada = await cambiarEstadoReserva(reserva.id, "RECHAZADA", token);
      actualizarReservaLocal(actualizada);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "No se pudo rechazar la reserva.");
    } finally {
      setIdProcesando(null);
    }
  }

  // --- Confirmar: pide confirmación, porque sí bloquea la fecha de verdad ---
  const [reservaAConfirmar, setReservaAConfirmar] = useState<Reserva | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [errorConfirmar, setErrorConfirmar] = useState<string | null>(null);

  async function confirmarConfirmacion() {
    if (!token || !reservaAConfirmar || confirmando) return;
    setConfirmando(true);
    setErrorConfirmar(null);
    try {
      const actualizada = await cambiarEstadoReserva(reservaAConfirmar.id, "CONFIRMADA", token);
      actualizarReservaLocal(actualizada);
      setReservaAConfirmar(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Alguien más confirmó otra reserva de ese equipo/fecha mientras
        // tanto: se avisa y se refresca toda la lista para reflejar el
        // estado real (puede haber cambiado más de lo que se ve acá).
        setErrorConfirmar(err.message);
        cargarReservas();
      } else {
        setErrorConfirmar(err instanceof Error ? err.message : "No se pudo confirmar la reserva.");
      }
    } finally {
      setConfirmando(false);
    }
  }

  // --- Eliminar (borrado administrativo, cualquier estado) ---
  const [reservaAEliminar, setReservaAEliminar] = useState<Reserva | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function confirmarEliminar() {
    if (!token || !reservaAEliminar || eliminando) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarReserva(reservaAEliminar.id, token);
      setReservas((actual) => actual.filter((r) => r.id !== reservaAEliminar.id));
      setReservaAEliminar(null);
    } catch (err) {
      setErrorEliminar(err instanceof ApiError ? err.message : "No se pudo eliminar la reserva.");
    } finally {
      setEliminando(false);
    }
  }

  // --- Ver detalle ---
  const [reservaEnDetalle, setReservaEnDetalle] = useState<Reserva | null>(null);

  // --- Nueva reserva (creada a mano por el admin) ---
  const [modalNuevaReservaAbierto, setModalNuevaReservaAbierto] = useState(false);

  // La reserva recién creada nace PENDIENTE: si coincide con el filtro
  // activo ("Todas" o "Pendientes"), se agrega al principio de la lista
  // (mismo lugar donde aparecería tras recargar, ya que la lista viene
  // ordenada por más reciente primero) sin tener que volver a pedirle
  // todo al backend.
  function manejarReservaCreada(reservaNueva: Reserva) {
    setModalNuevaReservaAbierto(false);
    const coincideConFiltro = filtroEstado === "TODAS" || reservaNueva.estado === filtroEstado;
    if (coincideConFiltro) {
      setReservas((actual) => [reservaNueva, ...actual]);
    }
  }

  // --- Facturación: generar factura ---
  // Acción directa (sin diálogo): a diferencia de confirmar una reserva,
  // generar la factura no bloquea ni libera ninguna fecha, solo emite un
  // documento a partir de una reserva que ya está CONFIRMADA.
  const [generandoFacturaId, setGenerandoFacturaId] = useState<number | null>(null);
  const [errorFactura, setErrorFactura] = useState<string | null>(null);

  async function manejarGenerarFactura(reserva: Reserva) {
    if (!token || generandoFacturaId !== null) return;
    setGenerandoFacturaId(reserva.id);
    setErrorFactura(null);
    try {
      const factura = await crearFactura(reserva.id, token);
      // Actualiza solo la entrada de esta reserva: en la siguiente
      // renderización, esta fila pasa de "Generar factura" a mostrar los
      // botones de "Descargar PDF"/"Enviar por correo".
      setFacturasPorReserva((actual) => ({ ...actual, [reserva.id]: factura }));
    } catch (err) {
      // Ej. 409 si la reserva ya estaba facturada (condición de carrera:
      // dos clics, o dos pestañas del admin abiertas a la vez).
      setErrorFactura(err instanceof Error ? err.message : "No se pudo generar la factura.");
    } finally {
      setGenerandoFacturaId(null);
    }
  }

  // --- Facturación: descargar PDF ---
  const [descargandoFacturaId, setDescargandoFacturaId] = useState<number | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  async function manejarDescargarPDF(factura: Factura) {
    if (!token || descargandoFacturaId !== null) return;
    setDescargandoFacturaId(factura.id);
    setErrorDescarga(null);
    try {
      const pdf = await descargarFacturaPDF(factura.id, token);
      descargarBlob(pdf, `factura-${factura.numeroFactura}.pdf`);
    } catch (err) {
      setErrorDescarga(err instanceof Error ? err.message : "No se pudo descargar el PDF de la factura.");
    } finally {
      setDescargandoFacturaId(null);
    }
  }

  // --- Facturación: enviar por correo (pide confirmación con el email destino) ---
  const [facturaAEnviar, setFacturaAEnviar] = useState<{ factura: Factura; reserva: Reserva } | null>(null);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
  const [errorEnviarCorreo, setErrorEnviarCorreo] = useState<string | null>(null);
  const [mensajeExitoEnvio, setMensajeExitoEnvio] = useState<string | null>(null);

  async function confirmarEnvioCorreo() {
    if (!token || !facturaAEnviar || enviandoCorreo) return;
    setEnviandoCorreo(true);
    setErrorEnviarCorreo(null);
    try {
      const { enviadoA } = await enviarFacturaPorCorreo(facturaAEnviar.factura.id, token);
      setMensajeExitoEnvio(`Factura enviada a ${enviadoA}.`);
      setFacturaAEnviar(null);
    } catch (err) {
      // El mensaje del backend se muestra tal cual: puede ser un error real
      // de configuración de Resend (ej. dominio no verificado), y el admin
      // necesita ver ese motivo real, no un error genérico.
      setErrorEnviarCorreo(err instanceof Error ? err.message : "No se pudo enviar la factura por correo.");
    } finally {
      setEnviandoCorreo(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Reservas</h1>
      <p className="mt-1 text-muted">Solicitudes de alquiler enviadas desde el sitio público.</p>

      {/* --- Tabs de filtro por estado + botón para registrar una reserva
          a mano (ej. un cliente que reservó en persona o por WhatsApp) --- */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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

        <Button type="button" onClick={() => setModalNuevaReservaAbierto(true)}>
          Nueva reserva
        </Button>
      </div>

      {errorAccion && (
        <div className="mt-4">
          <ErrorMessage message={errorAccion} />
        </div>
      )}
      {(errorFactura || errorDescarga) && (
        <div className="mt-4">
          <ErrorMessage message={(errorFactura || errorDescarga)!} />
        </div>
      )}
      {mensajeExitoEnvio && (
        // Morado de marca (antes cian), consistente con el resto del panel.
        <p
          role="status"
          className="mt-4 rounded-lg border border-brand-purple/30 bg-brand-purple/10 px-4 py-3 text-sm text-brand-purple-light"
        >
          {mensajeExitoEnvio}
        </p>
      )}

      <div className="mt-6">
        {cargando && <LoadingSpinner label="Cargando reservas..." />}
        {!cargando && error && <ErrorMessage message={error} />}

        {!cargando && !error && (
          <table className="w-full border-separate border-spacing-y-2 text-left text-sm">
            {/* Mismo tratamiento de encabezado "sobrio" que las demás tablas
                del panel (Equipos, Categorías). */}
            <thead>
              <tr className="bg-background-surface text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="rounded-l-lg px-3 py-3">Cliente</th>
                <th className="px-3 py-3">Equipo</th>
                <th className="px-3 py-3">Fecha del evento</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Solicitada el</th>
                <th className="rounded-r-lg px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((reserva) => {
                // Factura ya emitida para esta reserva (si existe): decide
                // qué botones de facturación mostrar en la fila.
                const factura = facturasPorReserva[reserva.id];

                return (
                  // Hover sutil hacia morado, igual que en Equipos/Categorías.
                  <tr key={reserva.id} className={`bg-background-surface align-top ${TRANSICION_HOVER} hover:bg-brand-purple/10`}>
                    <td className="rounded-l-lg px-3 py-3">
                      <p>{reserva.clienteNombre}</p>
                      <p className="text-muted">{reserva.clienteTelefono}</p>
                    </td>
                    {/* Antes una sola celda de texto con "reserva.equipo.nombre"
                        (un equipo por reserva). Ahora una reserva puede
                        tener varios equipos (ver ReservaEquipo en
                        src/types/index.ts): se listan como chips/etiquetas,
                        uno por cada equipo de "reserva.equipos". */}
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {reserva.equipos.map((reservaEquipo) => (
                          <span
                            key={reservaEquipo.id}
                            className="rounded-full bg-brand-purple/15 px-2.5 py-1 text-xs text-brand-purple-light"
                          >
                            {reservaEquipo.equipo.nombre}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">{formatearFechaEvento(reserva.fechaEvento)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTILOS_BADGE[reserva.estado]}`}>
                        {reserva.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted">{formatearFechaCreacion(reserva.createdAt)}</td>
                    <td className="rounded-r-lg px-3 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setReservaEnDetalle(reserva)}
                          className={`text-brand-purple-light hover:text-brand-pink ${TRANSICION_HOVER}`}
                        >
                          Ver
                        </button>

                        {reserva.estado === "PENDIENTE" && (
                          <>
                            <button
                              type="button"
                              onClick={() => setReservaAConfirmar(reserva)}
                              className={`text-green-300 hover:text-green-400 ${TRANSICION_HOVER}`}
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              onClick={() => manejarRechazar(reserva)}
                              disabled={idProcesando === reserva.id}
                              className={`text-red-300 hover:text-red-400 disabled:opacity-50 ${TRANSICION_HOVER}`}
                            >
                              {idProcesando === reserva.id ? "Procesando..." : "Rechazar"}
                            </button>
                          </>
                        )}

                        {/* --- Facturación: solo aplica a reservas CONFIRMADAS --- */}
                        {reserva.estado === "CONFIRMADA" && !factura && (
                          <button
                            type="button"
                            onClick={() => manejarGenerarFactura(reserva)}
                            disabled={generandoFacturaId === reserva.id}
                            className={`text-brand-purple-light hover:text-brand-pink disabled:opacity-50 ${TRANSICION_HOVER}`}
                          >
                            {generandoFacturaId === reserva.id ? "Generando..." : "Generar factura"}
                          </button>
                        )}

                        {reserva.estado === "CONFIRMADA" && factura && (
                          <>
                            <button
                              type="button"
                              onClick={() => manejarDescargarPDF(factura)}
                              disabled={descargandoFacturaId === factura.id}
                              className={`text-brand-purple-light hover:text-brand-pink disabled:opacity-50 ${TRANSICION_HOVER}`}
                            >
                              {descargandoFacturaId === factura.id ? "Descargando..." : "Descargar PDF"}
                            </button>
                            {/* Deshabilitado (con un "title" explicativo,
                                a modo de tooltip nativo) en vez de dejar
                                que el clic falle sin explicación: esta
                                reserva puede haberse creado a mano desde
                                "Nueva reserva" sin email del cliente. */}
                            <button
                              type="button"
                              disabled={!reserva.clienteEmail}
                              title={
                                reserva.clienteEmail
                                  ? undefined
                                  : "Esta reserva no tiene email registrado, no se puede enviar la factura por correo."
                              }
                              onClick={() => {
                                setMensajeExitoEnvio(null);
                                setFacturaAEnviar({ factura, reserva });
                              }}
                              className={`text-brand-purple-light hover:text-brand-pink disabled:cursor-not-allowed disabled:text-muted disabled:hover:text-muted ${TRANSICION_HOVER}`}
                            >
                              Enviar por correo
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setReservaAEliminar(reserva)}
                          className={`text-muted hover:text-red-400 ${TRANSICION_HOVER}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {reservas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted">
                    No hay reservas en este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {reservaEnDetalle && (
        <ReservaDetalleModal reserva={reservaEnDetalle} onCerrar={() => setReservaEnDetalle(null)} />
      )}

      {modalNuevaReservaAbierto && token && (
        <NuevaReservaModal
          token={token}
          onCerrar={() => setModalNuevaReservaAbierto(false)}
          onCreada={manejarReservaCreada}
        />
      )}

      <ConfirmDialog
        abierto={reservaAConfirmar !== null}
        titulo="Confirmar reserva"
        mensaje={
          reservaAConfirmar
            ? // Antes citaba un solo "equipo.nombre"; ahora se listan TODOS
              // los equipos de la reserva (puede ser más de uno) separados
              // por coma.
              `¿Confirmar la reserva de ${reservaAConfirmar.clienteNombre} para "${reservaAConfirmar.equipos
                .map((re) => re.equipo.nombre)
                .join(", ")}" el ${formatearFechaEvento(reservaAConfirmar.fechaEvento)}? Esto bloqueará esa fecha para estos equipos en el calendario público.`
            : ""
        }
        textoConfirmar="Confirmar"
        variantConfirmar="primary"
        cargando={confirmando}
        error={errorConfirmar}
        onConfirmar={confirmarConfirmacion}
        onCancelar={() => {
          setReservaAConfirmar(null);
          setErrorConfirmar(null);
        }}
      />

      <ConfirmDialog
        abierto={reservaAEliminar !== null}
        titulo="Eliminar reserva"
        mensaje={`¿Seguro que quieres eliminar la solicitud de ${reservaAEliminar?.clienteNombre}? Esta acción no se puede deshacer.`}
        cargando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={() => {
          setReservaAEliminar(null);
          setErrorEliminar(null);
        }}
      />

      <ConfirmDialog
        abierto={facturaAEnviar !== null}
        titulo="Enviar factura por correo"
        mensaje={
          facturaAEnviar
            ? `¿Enviar la factura ${facturaAEnviar.factura.numeroFactura} al correo ${facturaAEnviar.reserva.clienteEmail}?`
            : ""
        }
        textoConfirmar="Enviar"
        variantConfirmar="primary"
        cargando={enviandoCorreo}
        error={errorEnviarCorreo}
        onConfirmar={confirmarEnvioCorreo}
        onCancelar={() => {
          setFacturaAEnviar(null);
          setErrorEnviarCorreo(null);
        }}
      />
    </div>
  );
}
