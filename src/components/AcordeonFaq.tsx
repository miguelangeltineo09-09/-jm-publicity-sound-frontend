// ==========================================
// Acordeón de "Preguntas frecuentes" del sitio público (usado en
// /nosotros, ver esa página). Client Component: necesita estado (qué
// preguntas están abiertas) e interactividad (clic para desplegar).
//
// Varias preguntas pueden estar abiertas a la vez (no se cierra la
// anterior al abrir otra): es el comportamiento más simple de
// implementar de forma confiable, sin tener que coordinar qué pregunta
// "le toca cerrarse" cuando el visitante abre una nueva.
// ==========================================

"use client";

import { useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { PreguntaFrecuente } from "@/types";

interface AcordeonFaqProps {
  preguntas: PreguntaFrecuente[];
}

// Delay (ms) entre la aparición de cada pregunta: mismo criterio que el
// resto de las listas del sitio (Valores, ¿Por Qué Elegirnos?, reseñas).
const DELAY_ESCALONADO_MS = 80;

// Ícono de flecha simple, SVG inline sin depender de ninguna librería de
// iconos (mismo criterio que el resto del sitio). Rota 180° cuando la
// pregunta está abierta, vía la clase "rotate-180" que aplica el padre.
function IconoChevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function AcordeonFaq({ preguntas }: AcordeonFaqProps) {
  // Conjunto de ids actualmente abiertos (no un solo id): permite varias
  // preguntas abiertas a la vez, ver el comentario del encabezado.
  const [idsAbiertos, setIdsAbiertos] = useState<Set<number>>(new Set());

  function alternar(id: number) {
    setIdsAbiertos((actual) => {
      const copia = new Set(actual);
      if (copia.has(id)) {
        copia.delete(id);
      } else {
        copia.add(id);
      }
      return copia;
    });
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      {preguntas.map((item, indice) => {
        const abierto = idsAbiertos.has(item.id);

        return (
          <ScrollReveal key={item.id} delay={indice * DELAY_ESCALONADO_MS}>
            {/* Tono de fondo secundario ya establecido en el resto del
                sitio (bg-background-surface + borde sutil), igual que
                cualquier tarjeta elevada. */}
            <div className="overflow-hidden rounded-xl border border-white/10 bg-background-surface">
              <button
                type="button"
                onClick={() => alternar(item.id)}
                aria-expanded={abierto}
                className={`flex w-full items-center justify-between gap-4 p-5 text-left font-semibold text-foreground sm:p-6 ${TRANSICION_HOVER} hover:text-brand-pink`}
              >
                <span>{item.pregunta}</span>
                <span className={`text-brand-purple-light transition-transform duration-300 ${abierto ? "rotate-180" : ""}`}>
                  <IconoChevron />
                </span>
              </button>

              {/* Truco de altura animada con CSS grid: el contenedor
                  exterior anima su única fila entre "0fr" (colapsada) y
                  "1fr" (la altura natural del contenido). Funciona sin
                  medir nada con JavaScript porque el hijo interior tiene
                  "overflow-hidden": con overflow distinto de "visible",
                  el tamaño mínimo automático de un ítem de grid se
                  resuelve como 0 en vez de basarse en el contenido, así
                  que la fila "0fr" sí puede colapsar a 0px de alto de
                  verdad (si no tuviera "overflow-hidden", el contenido
                  impediría que la fila bajara de su propia altura mínima). */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted sm:px-6 sm:pb-6">{item.respuesta}</p>
                </div>
              </div>
            </div>
          </ScrollReveal>
        );
      })}
    </div>
  );
}
