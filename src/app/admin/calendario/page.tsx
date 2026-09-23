// ==========================================
// Calendario de reservas confirmadas ("/admin/calendario").
//
// POR QUÉ EXISTE: el resto del panel muestra las reservas como una TABLA
// (ver /admin/reservas), útil para gestionar el estado de cada solicitud,
// pero no responde de un vistazo "¿qué eventos tengo programados este
// mes?" — hay que leer fila por fila. Esta vista da esa respuesta visual:
// un calendario mensual con un indicador en cada día que ya tiene al
// menos una reserva CONFIRMADA (las PENDIENTE/RECHAZADA no representan un
// compromiso real todavía, mismo criterio que el resto del sistema), y el
// detalle logístico completo al hacer clic en ese día.
//
// Es un calendario armado A MANO (no react-day-picker, aunque ya está
// instalado y en uso en CalendarioDisponibilidad.tsx): esa librería está
// pensada para ELEGIR una fecha, no para pintar contenido rico (varios
// eventos, chips de equipos) dentro de cada celda del mes — forzar ese
// caso de uso a su API de "modifiers" habría sido más código y menos
// claro que una grilla propia de 7 columnas, que es lo que esta vista
// necesita en realidad.
//
// Es Client Component: depende de useAuth() (el token del admin) y de
// estado propio (mes/año que se está viendo, reserva del día seleccionado).
// ==========================================

"use client";

import { useEffect, useState } from "react";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { getReservasCalendario } from "@/lib/api";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { Reserva } from "@/types";
import DetalleDiaModal from "./DetalleDiaModal";

// Abreviaturas de los días de la semana, empezando en domingo (mismo
// orden que usa Date.getUTCDay(): 0 = domingo). En español, a diferencia
// de CalendarioDisponibilidad.tsx (que hereda el locale en inglés por
// defecto de react-day-picker): esta grilla se arma a mano, así que se
// elige el idioma del resto del panel.
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Devuelve el día del mes (1-31) de una fechaEvento en UTC. El backend
// guarda fechaEvento como medianoche UTC representando un día calendario
// fijo (ver el comentario en formatearFecha.ts): hay que leerlo con
// getUTCDate(), no con getDate() (que lo interpretaría en la hora LOCAL
// del navegador y podría correrse un día).
function diaUTCDeFecha(fechaISO: string): number {
  return new Date(fechaISO).getUTCDate();
}

// Cantidad de días de un mes dado (1-12): el día 0 del mes SIGUIENTE es,
// en el calendario, el último día del mes actual.
function diasEnElMes(mes: number, anio: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

// Día de la semana (0 = domingo) en el que cae el día 1 del mes, en UTC:
// determina cuántas celdas vacías van antes del día 1 en la grilla.
function primerDiaDeSemanaDelMes(mes: number, anio: number): number {
  return new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay();
}

// Nombre del mes + año para el encabezado (ej. "Septiembre de 2026"),
// capitalizado a mano porque Intl.DateTimeFormat en español devuelve el
// mes en minúscula ("septiembre de 2026").
function nombreMesAnio(mes: number, anio: number): string {
  const texto = new Date(Date.UTC(anio, mes - 1, 1)).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function CalendarioAdminPage() {
  const { token } = useAuth();

  const ahora = new Date();
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [anio, setAnio] = useState(ahora.getFullYear());

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);

  // Se vuelve a pedir el calendario cada vez que cambia el mes/año que se
  // está viendo (ver manejarMesAnterior/manejarMesSiguiente).
  useEffect(() => {
    if (!token) return;
    // Se captura en una constante propia (mismo patrón que admin/page.tsx):
    // dentro de la función anidada de abajo, TypeScript no puede
    // garantizar que "token" siga sin ser null, al ser una variable
    // capturada por closure y no un valor ya angostado.
    const tokenActual = token;
    let cancelado = false;

    async function cargarCalendario() {
      setCargando(true);
      setError(null);
      try {
        const datos = await getReservasCalendario(mes, anio, tokenActual);
        if (!cancelado) setReservas(datos);
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el calendario.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarCalendario();
    return () => {
      cancelado = true;
    };
  }, [mes, anio, token]);

  // Al cambiar de mes, cualquier día seleccionado del mes ANTERIOR ya no
  // tiene sentido (el modal se cierra solo, ver el JSX de más abajo).
  function manejarMesAnterior() {
    setDiaSeleccionado(null);
    if (mes === 1) {
      setMes(12);
      setAnio((actual) => actual - 1);
    } else {
      setMes((actual) => actual - 1);
    }
  }

  function manejarMesSiguiente() {
    setDiaSeleccionado(null);
    if (mes === 12) {
      setMes(1);
      setAnio((actual) => actual + 1);
    } else {
      setMes((actual) => actual + 1);
    }
  }

  // Agrupa las reservas del mes por día (1-31): así cada celda de la
  // grilla puede consultar en O(1) si tiene eventos y cuántos.
  const reservasPorDia = new Map<number, Reserva[]>();
  for (const reserva of reservas) {
    const dia = diaUTCDeFecha(reserva.fechaEvento);
    const listaDelDia = reservasPorDia.get(dia) ?? [];
    listaDelDia.push(reserva);
    reservasPorDia.set(dia, listaDelDia);
  }

  const totalDias = diasEnElMes(mes, anio);
  const celdasVacias = primerDiaDeSemanaDelMes(mes, anio);

  // La grilla completa: "celdasVacias" espacios en blanco antes del día 1
  // (para que el día 1 caiga en la columna del día de la semana que le
  // corresponde), seguidos de un número por cada día real del mes.
  const celdas: (number | null)[] = [
    ...Array.from({ length: celdasVacias }, () => null),
    ...Array.from({ length: totalDias }, (_, indice) => indice + 1),
  ];

  const reservasDelDiaSeleccionado = diaSeleccionado !== null ? reservasPorDia.get(diaSeleccionado) ?? [] : [];
  // Fecha ISO simple (sin hora) del día seleccionado, para el título del
  // modal — se arma en UTC a propósito, mismo criterio que el resto del
  // archivo, para que formatearFechaEvento() (que también fuerza UTC) la
  // muestre exactamente como el día que el admin clickeó.
  const fechaISODiaSeleccionado =
    diaSeleccionado !== null
      ? new Date(Date.UTC(anio, mes - 1, diaSeleccionado)).toISOString()
      : "";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Calendario de reservas</h1>
      <p className="mt-1 text-muted">
        Vista mensual de todos los eventos con reserva CONFIRMADA, sin importar el equipo.
      </p>

      {/* --- Navegación entre meses --- */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={manejarMesAnterior}
          className={`rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-muted ${TRANSICION_HOVER} hover:border-brand-purple-light hover:text-foreground`}
        >
          ‹ Mes anterior
        </button>
        <h2 className="text-lg font-semibold">{nombreMesAnio(mes, anio)}</h2>
        <button
          type="button"
          onClick={manejarMesSiguiente}
          className={`rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-muted ${TRANSICION_HOVER} hover:border-brand-purple-light hover:text-foreground`}
        >
          Mes siguiente ›
        </button>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorMessage message={error} />
        </div>
      )}

      {cargando && (
        <div className="mt-6">
          <LoadingSpinner label="Cargando calendario..." />
        </div>
      )}

      {!cargando && !error && (
        <div className="mt-6 rounded-xl border border-white/10 bg-background-surface p-4 sm:p-6">
          {/* --- Encabezado de días de la semana --- */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted sm:gap-2">
            {DIAS_SEMANA.map((dia) => (
              <div key={dia} className="py-1">
                {dia}
              </div>
            ))}
          </div>

          {/* --- Grilla del mes: una celda por día, "aspect-square" para
              que se vean como cuadrados uniformes en cualquier ancho de
              pantalla. Las celdas vacías (antes del día 1) son divs sin
              contenido, no botones. --- */}
          <div className="mt-1.5 grid grid-cols-7 gap-1.5 sm:gap-2">
            {celdas.map((dia, indice) => {
              if (dia === null) {
                return <div key={`vacio-${indice}`} />;
              }

              const reservasDelDia = reservasPorDia.get(dia);
              const tieneEventos = reservasDelDia !== undefined && reservasDelDia.length > 0;

              return (
                <button
                  key={dia}
                  type="button"
                  disabled={!tieneEventos}
                  onClick={() => setDiaSeleccionado(dia)}
                  className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border text-sm ${TRANSICION_HOVER} ${
                    tieneEventos
                      ? "border-brand-orange/40 bg-brand-orange/10 font-semibold text-foreground hover:border-brand-orange hover:bg-brand-orange/20"
                      : "border-white/5 text-muted"
                  } disabled:cursor-default`}
                >
                  <span>{dia}</span>
                  {/* Indicador visual (punto cálido) + conteo de eventos
                      ese día, para distinguir de un vistazo "1 evento" de
                      "varios eventos" sin abrir el detalle. */}
                  {tieneEventos && (
                    <span className="flex items-center gap-1 text-[10px] text-brand-orange">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" aria-hidden="true" />
                      {reservasDelDia!.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* --- Mes sin ninguna reserva confirmada: la grilla vacía sigue
              intacta arriba (sin indicadores en ningún día), y se agrega
              este aviso simple debajo en vez de dejar la pantalla sin
              ninguna explicación. --- */}
          {reservas.length === 0 && (
            <p className="mt-4 text-center text-sm text-muted">
              No hay reservas confirmadas para {nombreMesAnio(mes, anio).toLowerCase()}.
            </p>
          )}
        </div>
      )}

      {diaSeleccionado !== null && reservasDelDiaSeleccionado.length > 0 && (
        <DetalleDiaModal
          fechaISO={fechaISODiaSeleccionado}
          reservas={reservasDelDiaSeleccionado}
          onCerrar={() => setDiaSeleccionado(null)}
        />
      )}
    </div>
  );
}
