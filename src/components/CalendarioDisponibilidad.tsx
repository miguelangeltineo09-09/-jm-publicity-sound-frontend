// ==========================================
// Calendario de disponibilidad de uno o varios equipos.
// Muestra qué fechas están bloqueadas (reservas CONFIRMADAS) para que el
// cliente solo pueda elegir una fecha realmente libre. Es Client Component
// porque necesita estado (fechas cargadas, selección) e interactividad.
//
// REGLA DE NEGOCIO: el backend (GET /api/disponibilidad) solo devuelve
// fechas con reserva CONFIRMADA. Una reserva PENDIENTE no aparece aquí y
// por lo tanto NO bloquea el día: el cliente puede seguir pidiéndolo hasta
// que el admin confirme una de las solicitudes.
//
// CAMBIO DE RELACIÓN CLAVE: antes este calendario recibía un único
// "equipoId" (una reserva = un equipo). Ahora una reserva puede incluir
// VARIOS equipos que comparten la misma fecha/horario (un solo evento), así
// que recibe "equipoIds" (un array) y le pasa todos a getDisponibilidad():
// el backend ya devuelve la UNIÓN de fechas ocupadas de todos ellos, así
// que una fecha se marca en rojo si CUALQUIERA de los equipos elegidos ya
// está confirmado ese día — exactamente lo que hace falta para no poder
// elegir una fecha que no sirva para la solicitud completa.
// ==========================================

"use client";

import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import { getDisponibilidad } from "@/lib/api";

// El backend devuelve cada fecha como ISO en UTC medianoche (ej.
// "2026-09-25T00:00:00.000Z"), representando el DÍA 25 sin importar la
// zona horaria. Si se hiciera `new Date(iso)` directo, ese instante UTC se
// interpreta en la hora LOCAL del navegador: en una zona horaria detrás de
// UTC (ej. América, UTC-4 o más atrás) cae la noche anterior, y DayPicker
// terminaría marcando como ocupado el día 24 en vez del 25. Por eso se
// toman solo los componentes año-mes-día del string y se arma una fecha en
// horario LOCAL para ese mismo día calendario (mismo criterio que
// formatearFechaISO en FormularioReserva.tsx, en la dirección inversa).
function fechaLocalDesdeISO(iso: string): Date {
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(anio, mes - 1, dia);
}

interface CalendarioDisponibilidadProps {
  equipoIds: number[];
  // Selección controlada por el padre (FormularioReserva la necesita para
  // armar el payload de la reserva al enviar el formulario).
  fechaSeleccionada: Date | undefined;
  onFechaSeleccionada: (fecha: Date | undefined) => void;
}

export default function CalendarioDisponibilidad({
  equipoIds,
  fechaSeleccionada,
  onFechaSeleccionada,
}: CalendarioDisponibilidadProps) {
  const [fechasConfirmadas, setFechasConfirmadas] = useState<Date[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // "equipoIds" es un array nuevo en cada render (aunque tenga el mismo
  // contenido), así que no sirve como dependencia directa del efecto —
  // dispararía el fetch en cada render. Se deriva una clave de texto
  // estable (ids ordenados y unidos por coma) para comparar por CONTENIDO,
  // no por referencia.
  const claveEquipos = equipoIds.slice().sort((a, b) => a - b).join(",");

  // Se vuelve a pedir la disponibilidad si cambia la combinación de
  // equipos, o si el padre remonta este componente (le cambia la "key")
  // tras un conflicto 409.
  useEffect(() => {
    let cancelado = false;

    async function cargarDisponibilidad() {
      setError(null);
      setFechasConfirmadas(null);
      try {
        const fechasISO = await getDisponibilidad(equipoIds);
        if (!cancelado) {
          setFechasConfirmadas(fechasISO.map(fechaLocalDesdeISO));
        }
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "No se pudo cargar la disponibilidad.");
        }
      }
    }

    cargarDisponibilidad();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveEquipos]);

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (fechasConfirmadas === null) {
    return <LoadingSpinner label="Cargando disponibilidad..." />;
  }

  // Medianoche de hoy: cualquier día antes de esto ya pasó y no se puede elegir.
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return (
    <div>
      <DayPicker
        mode="single"
        selected={fechaSeleccionada}
        onSelect={onFechaSeleccionada}
        // No se puede seleccionar un día pasado, ni uno con reserva CONFIRMADA.
        disabled={[{ before: hoy }, ...fechasConfirmadas]}
        // Modificador extra solo para poder pintar distinto (rojizo) los días
        // ocupados por una reserva confirmada, y no solo "atenuados" como
        // cualquier día deshabilitado (ej. los del pasado).
        modifiers={{ reservado: fechasConfirmadas }}
        modifiersClassNames={{ reservado: "dia-reservado" }}
        className="rdp-tema-oscuro mx-auto"
      />
      <p className="mt-2 text-center text-xs text-muted">
        {equipoIds.length > 1
          ? "Los días marcados en rojo ya tienen una reserva confirmada para alguno de los equipos elegidos."
          : "Los días marcados en rojo ya tienen una reserva confirmada para este equipo."}
      </p>
    </div>
  );
}
