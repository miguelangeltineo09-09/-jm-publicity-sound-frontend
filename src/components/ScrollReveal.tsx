// ==========================================
// PARTE DEL SISTEMA DE ANIMACIÓN ESTÁNDAR DEL SITIO.
// Cualquier sección o elemento nuevo que se agregue de acá en adelante
// (catálogo, detalle de equipo, panel admin, lo que sea) y que deba
// "aparecer" al entrar en pantalla debe envolverse con ESTE componente en
// vez de crear una animación de entrada distinta — así toda la web se
// siente consistente y el timing/easing se controla desde un solo lugar.
//
// Qué hace: envuelve el contenido que recibe y lo anima de
// opacidad 0 + un leve desplazamiento hacia abajo (invisible) a
// opacidad 1 + su posición normal, la primera vez que entra en el
// viewport (usa useEnVistaUnaVez, ver ese hook para el porqué de
// Intersection Observer en vez de un listener de scroll).
// ==========================================

"use client";

import type { ReactNode } from "react";
import { useEnVistaUnaVez } from "@/hooks/useEnVistaUnaVez";

interface ScrollRevealProps {
  children: ReactNode;
  // Retraso (en ms) antes de que arranque la transición, una vez que el
  // elemento ya entró en pantalla: permite escalonar varios ScrollReveal
  // que aparecen juntos (ej. las tarjetas de categorías, una tras otra)
  // sin tener que montar cada uno por separado con su propio observer.
  delay?: number;
  // Clases adicionales para el <div> envoltorio (ej. si el elemento hijo
  // necesita que el wrapper también sea "w-full" o participe de un grid).
  className?: string;
}

export default function ScrollReveal({ children, delay = 0, className = "" }: ScrollRevealProps) {
  const { ref, visible } = useEnVistaUnaVez<HTMLDivElement>();

  return (
    <div
      ref={ref}
      // "duration-700 ease-out": transición suave y no brusca (dentro del
      // rango de 500-700ms pedido). Antes de que "visible" sea true, el
      // contenido está invisible y 20px más abajo (translate-y-5); al
      // activarse, vuelve a su lugar con opacidad completa.
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
