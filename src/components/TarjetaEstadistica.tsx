// ==========================================
// PARTE DEL SISTEMA DE ANIMACIÓN ESTÁNDAR DEL SITIO.
// Tarjeta de estadística del Hero (ej. "+15 Años de experiencia"): cuenta
// desde 0 hasta su valor final con requestAnimationFrame la primera vez
// que entra en pantalla (reutiliza useEnVistaUnaVez, el mismo hook de
// ScrollReveal.tsx, para saber CUÁNDO arrancar), y tiene un leve efecto
// de inclinación 3D que sigue el mouse al pasar por encima.
//
// Cualquier otra tarjeta con un número destacado que se agregue más
// adelante (ej. estadísticas del panel admin) puede reutilizar este mismo
// componente en vez de reimplementar el conteo o el efecto de inclinación.
// ==========================================

"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useEnVistaUnaVez } from "@/hooks/useEnVistaUnaVez";

interface TarjetaEstadisticaProps {
  valorFinal: number;
  etiqueta: string;
  // Prefijo antes del número (ej. "+"), no se anima, es texto fijo.
  prefijo?: string;
  // Duración del conteo en milisegundos.
  duracionMs?: number;
}

// Inclinación máxima del efecto "tilt", en grados. Se mantiene chica (5°)
// a propósito: el pedido es un efecto SUTIL, no una tarjeta que se
// bambolea de forma exagerada.
const INCLINACION_MAXIMA_GRADOS = 5;

export default function TarjetaEstadistica({
  valorFinal,
  etiqueta,
  prefijo = "+",
  duracionMs = 1500,
}: TarjetaEstadisticaProps) {
  const { ref, visible } = useEnVistaUnaVez<HTMLDivElement>();
  const [valorMostrado, setValorMostrado] = useState(0);
  // Inclinación actual de la tarjeta (grados en X e Y), recalculada en
  // cada movimiento del mouse dentro de ella; vuelve a 0 al salir.
  const [inclinacion, setInclinacion] = useState({ x: 0, y: 0 });

  // --- Conteo animado, arranca la primera vez que la tarjeta es visible ---
  useEffect(() => {
    if (!visible) return;

    // Accesibilidad: con "reducir movimiento" activado, se muestra el
    // valor final directo, sin la animación de conteo.
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefiereMenosMovimiento) {
      // Ver el mismo caso (y la misma justificación) en useEnVistaUnaVez.ts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValorMostrado(valorFinal);
      return;
    }

    let inicio: number | null = null;
    let idCuadro: number;

    function avanzarCuadro(ahora: number) {
      if (inicio === null) inicio = ahora;
      const progreso = Math.min((ahora - inicio) / duracionMs, 1);
      // easeOutQuad: arranca rápido y desacelera hacia el final — se ve
      // más natural en un contador que un incremento lineal parejo.
      const progresoSuavizado = 1 - (1 - progreso) * (1 - progreso);
      setValorMostrado(Math.round(progresoSuavizado * valorFinal));

      if (progreso < 1) {
        idCuadro = requestAnimationFrame(avanzarCuadro);
      }
    }

    idCuadro = requestAnimationFrame(avanzarCuadro);
    return () => cancelAnimationFrame(idCuadro);
  }, [visible, valorFinal, duracionMs]);

  // --- Efecto "tilt": inclina la tarjeta según dónde está el mouse dentro
  //     de ella (0,0 = esquina superior izquierda; 1,1 = inferior derecha) ---
  function manejarMovimientoMouse(evento: MouseEvent<HTMLDivElement>) {
    const caja = evento.currentTarget.getBoundingClientRect();
    const proporcionX = (evento.clientX - caja.left) / caja.width;
    const proporcionY = (evento.clientY - caja.top) / caja.height;

    setInclinacion({
      // Mouse arriba (proporcionY chico) -> inclina el borde de arriba
      // hacia el visitante (rotateX positivo); por eso el signo negativo.
      x: (proporcionY - 0.5) * -2 * INCLINACION_MAXIMA_GRADOS,
      y: (proporcionX - 0.5) * 2 * INCLINACION_MAXIMA_GRADOS,
    });
  }

  function manejarSalidaMouse() {
    setInclinacion({ x: 0, y: 0 });
  }

  return (
    <div
      ref={ref}
      onMouseMove={manejarMovimientoMouse}
      onMouseLeave={manejarSalidaMouse}
      // "perspective" en el propio elemento (no en un padre) porque cada
      // tarjeta se inclina de forma independiente: si el "perspective"
      // viviera en un contenedor compartido, ambas tarjetas se verían
      // deformadas juntas en vez de cada una por su cuenta.
      // Transición corta (150ms, no los 300ms del hover estándar del
      // resto del sitio): este "transform" se recalcula en cada
      // movimiento del mouse, y con 300ms la tarjeta se sentiría
      // "atrasada" respecto al cursor en vez de seguirlo con naturalidad.
      className="flex-1 rounded-2xl border border-white/10 bg-gradient-to-br from-background-surface to-background p-6 text-center shadow-xl shadow-black/40 transition-transform duration-150 ease-out"
      style={{
        transform: `perspective(700px) rotateX(${inclinacion.x}deg) rotateY(${inclinacion.y}deg)`,
      }}
    >
      <p className="text-gradient-brand text-4xl font-extrabold sm:text-5xl">
        {prefijo}
        {valorMostrado}
      </p>
      <p className="mt-2 text-sm text-muted">{etiqueta}</p>
    </div>
  );
}
