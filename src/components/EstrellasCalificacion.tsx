// ==========================================
// Calificación en estrellas, reutilizable en dos modos:
// - "lectura": muestra un valor (puede ser decimal, ej. 4.3) sin
//   interacción — se usa para el promedio general y la calificación de
//   cada reseña individual en el detalle de equipo.
// - "interactivo": el visitante hace clic en una de las 5 estrellas para
//   elegir su calificación (siempre un entero de 1 a 5) al dejar una
//   reseña nueva, con vista previa al pasar el mouse antes de confirmar.
//
// Es Client Component porque el modo interactivo necesita estado propio
// (la estrella sobre la que está el mouse); el modo lectura no lo
// necesita, pero como es el MISMO componente para ambos casos, toda la
// pieza queda marcada "use client".
// ==========================================

"use client";

import { useState } from "react";
import { TRANSICION_HOVER_COMPLETA } from "@/lib/estilos";

interface EstrellasCalificacionProps {
  // En modo lectura: el promedio o la calificación a mostrar (0 a 5,
  // puede tener decimales). En modo interactivo: la calificación ya
  // elegida (0 = todavía ninguna).
  valor: number;
  interactivo?: boolean;
  // Solo se usa en modo interactivo: se dispara con un entero de 1 a 5 al
  // hacer clic en una estrella.
  onCambio?: (nuevoValor: number) => void;
  // Clase de tamaño de fuente de Tailwind (ej. "text-xl"): cada estrella
  // es un carácter, así que su tamaño se controla vía font-size.
  tamanoTexto?: string;
  className?: string;
}

const TOTAL_ESTRELLAS = 5;

export default function EstrellasCalificacion({
  valor,
  interactivo = false,
  onCambio,
  tamanoTexto = "text-2xl",
  className = "",
}: EstrellasCalificacionProps) {
  // Solo aplica en modo interactivo: la estrella bajo el cursor, para
  // mostrar la vista previa de la selección ANTES de confirmar el clic.
  // "null" significa que no hay hover activo, así que se muestra "valor"
  // (la selección real) tal cual.
  const [valorHover, setValorHover] = useState<number | null>(null);

  if (interactivo) {
    const valorMostrado = valorHover ?? valor;

    return (
      <div
        className={`inline-flex gap-1 ${className}`}
        onMouseLeave={() => setValorHover(null)}
        role="radiogroup"
        aria-label="Calificación de 1 a 5 estrellas"
      >
        {Array.from({ length: TOTAL_ESTRELLAS }, (_, indice) => {
          const numeroEstrella = indice + 1;
          const llena = numeroEstrella <= valorMostrado;
          return (
            <button
              key={numeroEstrella}
              type="button"
              onMouseEnter={() => setValorHover(numeroEstrella)}
              onClick={() => onCambio?.(numeroEstrella)}
              aria-label={`${numeroEstrella} de 5 estrellas`}
              aria-pressed={numeroEstrella === valor}
              className={`${tamanoTexto} leading-none ${TRANSICION_HOVER_COMPLETA} hover:scale-110 ${
                llena ? "text-amber-400" : "text-white/20"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>
    );
  }

  // --- Modo lectura ---
  // Cada estrella se dibuja con relleno PARCIAL exacto (no solo
  // llena/vacía/media): una estrella ámbar se superpone sobre una gris de
  // fondo, recortada por ancho según qué tan llena debe verse. Así, por
  // ejemplo, un promedio de 4.3 se ve como 4 estrellas llenas más una al
  // 30% de relleno, en vez de aproximarse a 4 o a 4.5.
  return (
    <div className={`inline-flex gap-1 ${className}`} role="img" aria-label={`${valor} de 5 estrellas`}>
      {Array.from({ length: TOTAL_ESTRELLAS }, (_, indice) => {
        const fraccionLlena = Math.max(0, Math.min(1, valor - indice));
        return (
          <span key={indice} className={`relative inline-block ${tamanoTexto} leading-none text-white/20`}>
            ★
            <span
              className="absolute inset-0 overflow-hidden whitespace-nowrap text-amber-400"
              style={{ width: `${fraccionLlena * 100}%` }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}
