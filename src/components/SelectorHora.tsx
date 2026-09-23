// ==========================================
// Selector de hora personalizado (12h con AM/PM).
//
// Por qué existe: un <input type="time"> nativo muestra 12h o 24h según la
// configuración regional del sistema operativo/navegador de cada visitante
// (algunos ven "18:00", otros "6:00 PM"), lo que es inconsistente
// visualmente. Este componente dibuja sus propios controles para que TODOS
// los visitantes vean siempre el mismo formato (12h + AM/PM), sin importar
// su configuración regional.
//
// La hora y los minutos se escriben juntos en un solo campo de texto libre
// (ej. "7:30"), en vez de dos desplegables: es más rápido de llenar y no
// limita los minutos a intervalos fijos. El toggle AM/PM se mantiene como
// botones aparte.
//
// Hacia afuera sigue hablando en formato 24h ("HH:mm"): es el formato que
// ya espera y valida el backend (ver FormularioReserva.tsx), así que toda
// la conversión 12h<->24h queda encapsulada acá adentro.
// ==========================================

"use client";

import { useState } from "react";
import { TRANSICION_HOVER } from "@/lib/estilos";

interface SelectorHoraProps {
  // Hora actual en formato 24h ("HH:mm"), o "" si todavía no se ha elegido
  // ninguna. Solo se usa para inicializar los controles al montar: este
  // componente no vuelve a sincronizarse si el padre cambia "valor" después
  // de montado (igual que el calendario de disponibilidad, que se resetea
  // remontándolo con una key nueva en vez de sincronizar props en caliente).
  valor?: string;
  // Se llama SOLO cuando el texto de hora:minutos es válido Y ya se elegió
  // AM/PM, con el resultado ya convertido a "HH:mm" de 24h.
  onChange: (valor24h: string) => void;
}

// Formato que acepta el campo de texto: hora de 1 a 12 (con o sin cero a la
// izquierda: "7:30" y "07:30" son igual de válidos) y minutos de 00 a 59.
// Grupo 1 = hora tal como se escribió (para poder mostrarla igual al
// convertir), grupo 2 = minutos (siempre de 2 dígitos por la regex).
const PATRON_HORA_TEXTO = /^(0?[1-9]|1[0-2]):([0-5][0-9])$/;

// Intenta interpretar el texto escrito como una hora de 12h válida. Se usa
// tanto para validar en pantalla como para la conversión a 24h: si no
// calza con el patrón (ej. "25:99", "abc", "7" a secas sin minutos), se
// considera inválido y se devuelve null.
function parsearHoraTexto(texto: string): { hora: string; minutos: string } | null {
  const coincidencia = PATRON_HORA_TEXTO.exec(texto.trim());
  if (!coincidencia) return null;
  return { hora: coincidencia[1], minutos: coincidencia[2] };
}

// --- Conversión 24h -> texto 12h + AM/PM (para inicializar el campo) ---
// Caso especial de "12": la hora 24h "0" (medianoche) se muestra como
// "12:xx AM", y la hora 24h "12" (mediodía) se muestra como "12:xx PM" — en
// ambos casos el número visual es 12, aunque en 24h uno es 0 y el otro 12.
function formato24AComponentes(valor24h: string): { horaTexto: string; periodo: "AM" | "PM" | "" } {
  if (!valor24h) return { horaTexto: "", periodo: "" };

  const [horaStr, minutosStr] = valor24h.split(":");
  const hora24 = Number(horaStr);

  const periodo: "AM" | "PM" = hora24 >= 12 ? "PM" : "AM";
  // "% 12" convierte 0 y 12 en 0; el "|| 12" los vuelve a mostrar como 12
  // (el número que de verdad se ve en un reloj de 12h para esas dos horas).
  const hora12 = hora24 % 12 || 12;

  return { horaTexto: `${hora12}:${minutosStr}`, periodo };
}

// --- Conversión hora12+minutos (ya separados por parsearHoraTexto) + AM/PM
//     -> 24h (lo que se manda al backend) ---
// Es la conversión donde es más fácil equivocarse:
// - 12:00 AM (medianoche) debe dar "00:00", NO "12:00".
// - 12:00 PM (mediodía) debe dar "12:00" (se queda igual).
// - Cualquier otra hora PM (1-11) suma 12 (ej. 6 PM -> 18).
// - Cualquier hora AM (1-11) se manda tal cual (ej. 6 AM -> 06).
function componentesAFormato24(hora12: string, minutos: string, periodo: "AM" | "PM"): string {
  // "% 12" es la pieza clave: convierte el 12 de "12 AM"/"12 PM" en 0, que
  // es la base correcta para ambos casos especiales de arriba.
  let hora24 = Number(hora12) % 12;
  if (periodo === "PM") hora24 += 12;

  return `${String(hora24).padStart(2, "0")}:${minutos}`;
}

// Estilo del campo de texto: consistente con el resto del formulario. Sin
// fondo propio ("bg-transparent", antes "bg-background-surface"): así se
// mezcla con el fondo base de la página en vez de verse como un bloque más
// claro/oscuro que el resto de la sección (mismo criterio que el resto de
// los inputs de FormularioReserva.tsx). Se resalta en rojo si el texto
// escrito ya fue validado y no calza con el formato esperado.
function estiloInput(formatoInvalido: boolean): string {
  const base = "rounded-lg border bg-transparent px-3 py-2 text-foreground outline-none";
  return formatoInvalido
    ? `${base} border-red-500/60 focus:border-red-400`
    : `${base} border-white/10 focus:border-brand-purple`;
}

export default function SelectorHora({ valor, onChange }: SelectorHoraProps) {
  // Estado local, inicializado a partir del valor 24h recibido (si el campo
  // ya tenía una hora, ej. al reabrir un formulario con datos precargados).
  const inicial = formato24AComponentes(valor ?? "");
  const [horaTexto, setHoraTexto] = useState(inicial.horaTexto);
  const [periodo, setPeriodo] = useState<"AM" | "PM" | "">(inicial.periodo);

  // El error de formato solo se muestra después de que el usuario interactuó
  // con el campo al menos una vez (perdió el foco): así no se le muestra un
  // "inválido" mientras apenas empieza a escribir (ej. tras el primer
  // carácter "7"). Una vez mostrado, se recalcula en cada tecleo (más abajo,
  // vía "formatoInvalido"), así que desaparece solo en cuanto el usuario lo
  // corrige, sin necesidad de volver a salir del campo.
  const [tocado, setTocado] = useState(false);

  // Notifica al padre el "HH:mm" de 24h SOLO si, con el cambio recién
  // aplicado, el texto ya es una hora válida y además ya se eligió AM/PM.
  // Si falta cualquiera de las dos cosas, no se llama a onChange: el valor
  // del padre se queda como estaba, igual que un campo todavía sin completar.
  function notificarSiValido(textoActual: string, periodoActual: "AM" | "PM" | "") {
    const parseado = parsearHoraTexto(textoActual);
    if (parseado && periodoActual) {
      onChange(componentesAFormato24(parseado.hora, parseado.minutos, periodoActual));
    }
  }

  function manejarCambioTexto(nuevoTexto: string) {
    setHoraTexto(nuevoTexto);
    notificarSiValido(nuevoTexto, periodo);
  }

  function manejarCambioPeriodo(nuevoPeriodo: "AM" | "PM") {
    setPeriodo(nuevoPeriodo);
    notificarSiValido(horaTexto, nuevoPeriodo);
  }

  // Un campo vacío no es "inválido" (todavía no se ha escrito nada, es el
  // mismo caso que un input vacío); solo se considera inválido cuando HAY
  // texto pero no calza con el patrón "H:mm"/"HH:mm" esperado.
  const formatoInvalido = horaTexto.trim() !== "" && parsearHoraTexto(horaTexto) === null;
  const mostrarError = tocado && formatoInvalido;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {/* --- Hora y minutos en un solo campo de texto libre --- */}
        <input
          type="text"
          inputMode="numeric"
          value={horaTexto}
          onChange={(e) => manejarCambioTexto(e.target.value)}
          onBlur={() => setTocado(true)}
          placeholder="7:30"
          aria-label="Hora"
          aria-invalid={mostrarError}
          className={`${estiloInput(mostrarError)} w-24`}
        />

        {/* --- AM/PM: toggle de dos botones, para que se note de un vistazo
            cuál está activo (se mantiene igual que antes, solo se migra el
            color del estado activo del cian original al morado de marca) --- */}
        <div className="flex overflow-hidden rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => manejarCambioPeriodo("AM")}
            aria-pressed={periodo === "AM"}
            className={`border-r border-white/10 px-3 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
              periodo === "AM" ? "bg-brand-purple text-white" : "bg-background-surface text-muted hover:text-foreground"
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => manejarCambioPeriodo("PM")}
            aria-pressed={periodo === "PM"}
            className={`px-3 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
              periodo === "PM" ? "bg-brand-purple text-white" : "bg-background-surface text-muted hover:text-foreground"
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {mostrarError && (
        <p className="text-xs text-red-300">
          {'Formato inválido. Escribe la hora como "H:mm" (ej. "7:30"), con hora entre 1 y 12 y minutos entre 00 y 59.'}
        </p>
      )}
    </div>
  );
}
