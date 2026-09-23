// ==========================================
// Modal de detalle de una reserva (solo lectura).
// Muestra los datos que no entran en la tabla (email, notas del cliente),
// sin necesitar una ruta separada — se abre y cierra como overlay.
// ==========================================

"use client";

import Button from "@/components/Button";
import { formatearMoneda } from "@/lib/formato";
import type { Reserva } from "@/types";
import { formatearFechaCreacion, formatearFechaEvento } from "./formatearFecha";

interface ReservaDetalleModalProps {
  reserva: Reserva;
  onCerrar: () => void;
}

export default function ReservaDetalleModal({ reserva, onCerrar }: ReservaDetalleModalProps) {
  // Desglose de precio: mismo criterio que la cotización que el cliente ya
  // vio al reservar (ver FormularioReserva.tsx) — precio de CADA equipo +
  // precio de viaje según la provincia de ESTA reserva puntual = total.
  // Antes había un solo "reserva.equipo"; ahora se suma sobre TODOS los
  // equipos de "reserva.equipos" (ver ReservaEquipo en src/types/index.ts).
  // No hace falta pedir nada más al backend: los equipos y la provincia ya
  // vienen incluidos en la reserva (ver GET /api/reservas del backend).
  const precioViaje = Number(reserva.provincia.precioViaje);
  const subtotalEquipos = reserva.equipos.reduce(
    (suma, reservaEquipo) => suma + Number(reservaEquipo.equipo.precio),
    0
  );
  const totalEstimado = subtotalEquipos + precioViaje;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      {/* "max-h-[90vh]" + "flex flex-col" + "overflow-hidden": el modal
          en sí nunca excede el 90% del alto del viewport (antes no tenía
          ningún límite propio, así que con el desglose de precio nuevo
          de acá abajo — o simplemente en pantallas chicas — terminaba
          más alto que la pantalla, cortado arriba/abajo). "overflow-hidden"
          en esta caja (no "overflow-y-auto") es a propósito: el que
          scrollea es el DIV DE ADENTRO, para que el botón "Cerrar" quede
          siempre visible, fijo abajo, sin importar cuánto se scrollee el
          contenido — mismo criterio que EquipoFormModal.tsx y
          PublicacionFormModal.tsx. */}
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-white/10 bg-background-surface">
        <div className="overflow-y-auto p-6">
          <h2 className="text-lg font-bold">Detalle de la solicitud</h2>

          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-muted">Cliente</dt>
              <dd>{reserva.clienteNombre}</dd>
            </div>
            <div>
              <dt className="text-muted">Teléfono</dt>
              <dd>{reserva.clienteTelefono}</dd>
            </div>
            <div>
              <dt className="text-muted">Email</dt>
              {/* "No registrado" en vez de un campo vacío/undefined: esta
                  reserva puede haberla creado el admin a mano (POST
                  /api/reservas/admin) sin ese dato, ej. un cliente que
                  reservó en persona o por WhatsApp. */}
              <dd>{reserva.clienteEmail ?? "No registrado"}</dd>
            </div>
            <div>
              {/* Antes un solo "Equipo solicitado" con "reserva.equipo.nombre".
                  Ahora puede haber varios: se listan como chips, mismo
                  tratamiento visual que la columna "Equipo" de la tabla
                  (ver admin/reservas/page.tsx). */}
              <dt className="text-muted">Equipos solicitados</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {reserva.equipos.map((reservaEquipo) => (
                  <span
                    key={reservaEquipo.id}
                    className="rounded-full bg-brand-purple/15 px-2.5 py-1 text-xs text-brand-purple-light"
                  >
                    {reservaEquipo.equipo.nombre}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Fecha del evento</dt>
              <dd>{formatearFechaEvento(reserva.fechaEvento)}</dd>
            </div>
            <div>
              <dt className="text-muted">Horario del evento</dt>
              <dd>
                {reserva.horaInicio} - {reserva.horaFin}
              </dd>
            </div>
            {/* Ubicación del evento: provincia (para la cotización de
                viaje/dieta, ver factura.service.ts del backend) + municipio
                puntual, junto a la fecha y el horario ya mostrados arriba. */}
            <div>
              <dt className="text-muted">Provincia</dt>
              <dd>{reserva.provincia.nombre}</dd>
            </div>
            <div>
              <dt className="text-muted">Municipio</dt>
              <dd>{reserva.municipio}</dd>
            </div>
            {/* Desglose de precio: mismo criterio que la cotización que el
                cliente ya vio al reservar (ver FormularioReserva.tsx), para
                que el admin sepa cuánto se le va a cobrar sin tener que ir
                a mirar los equipos y la provincia por separado. Antes una
                sola línea "Precio del equipo"; ahora una línea POR CADA
                equipo de "reserva.equipos" (mismo patrón que
                FormularioReserva.tsx). */}
            <div>
              <dt className="text-muted">Cotización estimada</dt>
              <dd>
                <div className="mt-1 flex flex-col gap-1 rounded-lg border border-white/10 bg-background p-3">
                  {reserva.equipos.map((reservaEquipo) => (
                    <div key={reservaEquipo.id} className="flex items-center justify-between">
                      <span className="text-muted">{reservaEquipo.equipo.nombre}</span>
                      <span>{formatearMoneda(Number(reservaEquipo.equipo.precio))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Viaje ({reserva.provincia.nombre})</span>
                    <span>{formatearMoneda(precioViaje)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-1 font-semibold">
                    <span>Total estimado</span>
                    <span className="text-gradient-brand">{formatearMoneda(totalEstimado)}</span>
                  </div>
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Notas del cliente</dt>
              <dd>{reserva.notas || "Sin notas."}</dd>
            </div>
            <div>
              <dt className="text-muted">Solicitud enviada el</dt>
              <dd>{formatearFechaCreacion(reserva.createdAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Footer fijo (fuera del div con scroll de arriba): el botón de
            cerrar siempre queda visible, sin importar cuánto se scrollee
            el contenido. */}
        <div className="flex justify-end border-t border-white/10 p-6 pt-4">
          <Button variant="secondary" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
