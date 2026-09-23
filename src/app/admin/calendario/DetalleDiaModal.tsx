// ==========================================
// Modal de detalle de un día del calendario (solo lectura).
// Al hacer clic en un día con eventos confirmados (ver page.tsx), muestra
// la ficha logística de CADA reserva de ese día: cliente, teléfono,
// equipos, horario, provincia y municipio — todo lo que el admin necesita
// para coordinar la entrega/recogida de esa fecha sin tener que ir a
// buscar cada reserva por separado en "/admin/reservas".
//
// Puede haber MÁS DE UNA reserva confirmada el mismo día (dos eventos
// distintos, cada uno con sus propios equipos): por eso el contenido es
// una LISTA de tarjetas, no una ficha única.
// ==========================================

"use client";

import Button from "@/components/Button";
import type { Reserva } from "@/types";
import { formatearFechaEvento } from "../reservas/formatearFecha";

interface DetalleDiaModalProps {
  fechaISO: string;
  reservas: Reserva[];
  onCerrar: () => void;
}

export default function DetalleDiaModal({ fechaISO, reservas, onCerrar }: DetalleDiaModalProps) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* Mismo patrón de modal "sin cortes" que el resto del panel (ver
          ReservaDetalleModal.tsx): la caja nunca excede el 90% del alto
          del viewport, el contenido largo scrollea POR DENTRO y el footer
          con el botón de cerrar queda fijo. */}
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/10 bg-background-surface">
        <div className="overflow-y-auto p-6">
          <h2 className="text-lg font-bold">Eventos del {formatearFechaEvento(fechaISO)}</h2>
          <p className="mt-1 text-sm text-muted">
            {reservas.length === 1
              ? "1 reserva confirmada este día."
              : `${reservas.length} reservas confirmadas este día.`}
          </p>

          {/* Una tarjeta por reserva: si hay más de un evento el mismo día
              (equipos distintos, clientes distintos), quedan separados
              claramente en vez de mezclarse en una sola lista. */}
          <div className="mt-4 flex flex-col gap-4">
            {reservas.map((reserva) => (
              <div key={reserva.id} className="rounded-lg border border-white/10 bg-background p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{reserva.clienteNombre}</p>
                  <p className="text-sm text-muted">{reserva.clienteTelefono}</p>
                </div>

                <p className="mt-2 text-sm text-muted">
                  Horario: <span className="text-foreground">{reserva.horaInicio} - {reserva.horaFin}</span>
                </p>
                <p className="text-sm text-muted">
                  Ubicación:{" "}
                  <span className="text-foreground">
                    {reserva.municipio}, {reserva.provincia.nombre}
                  </span>
                </p>

                {/* Chips de equipos: mismo tratamiento visual que la
                    columna "Equipo" de la tabla de /admin/reservas y el
                    detalle de ReservaDetalleModal.tsx, para que un admin
                    que ya conoce esa pantalla reconozca el patrón acá. */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {reserva.equipos.map((reservaEquipo) => (
                    <span
                      key={reservaEquipo.id}
                      className="rounded-full bg-brand-purple/15 px-2.5 py-1 text-xs text-brand-purple-light"
                    >
                      {reservaEquipo.equipo.nombre}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-white/10 p-6 pt-4">
          <Button variant="secondary" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
