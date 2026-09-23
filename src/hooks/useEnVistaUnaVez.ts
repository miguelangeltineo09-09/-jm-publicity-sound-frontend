// ==========================================
// PARTE DEL SISTEMA DE ANIMACIÓN ESTÁNDAR DEL SITIO.
// Hook base compartido por ScrollReveal.tsx (aparecer al hacer scroll) y
// TarjetaEstadistica.tsx (arrancar el conteo animado): detecta, con
// Intersection Observer, el momento en que un elemento entra por primera
// vez en el viewport. Cualquier animación nueva que dependa de "cuándo
// aparece esto en pantalla" debe reutilizar este hook en vez de escribir
// su propio listener de scroll o su propio Intersection Observer suelto.
//
// Por qué Intersection Observer y no un listener de "scroll": el listener
// se dispara en cada pixel de scroll y obliga a recalcular posiciones a
// mano en el hilo principal; el observer corre de forma nativa/asíncrona
// en el navegador y solo avisa cuando el estado de intersección realmente
// cambia — mucho más liviano, especialmente con varios elementos
// observados a la vez (ej. las 4 tarjetas de categorías).
// ==========================================

"use client";

import { useEffect, useRef, useState } from "react";

export function useEnVistaUnaVez<T extends HTMLElement>(opciones?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;

    // Accesibilidad: si el visitante tiene activada la preferencia de
    // "reducir movimiento" en su sistema, no tiene sentido observar nada
    // ni animar la entrada — se marca como "visible" de una, así el
    // contenido aparece directo (sin el fade/translate ni, en el caso del
    // contador, sin la cuenta animada).
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento) {
      // Se lee una API del navegador (matchMedia) recién disponible en el
      // efecto (no existe en el servidor): no hay forma de derivar esto
      // durante el render, es un caso legítimo de sincronizar con un
      // sistema externo, igual que el resto de los "fetch al montar" del
      // proyecto (ver el mismo patrón en FiltroEquipos.tsx).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entradas) => {
        const [entrada] = entradas;
        if (entrada.isIntersecting) {
          setVisible(true);
          // Solo debe animarse la PRIMERA vez que aparece: una vez que ya
          // se marcó como visible, se desconecta el observer para que no
          // vuelva a dispararse si el visitante sube y baja con el scroll.
          observer.disconnect();
        }
      },
      // threshold 0.15 por defecto: no hace falta que el elemento esté
      // 100% visible para empezar a animar, alcanza con que ya se note.
      opciones ?? { threshold: 0.15 }
    );

    observer.observe(elemento);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, visible };
}
