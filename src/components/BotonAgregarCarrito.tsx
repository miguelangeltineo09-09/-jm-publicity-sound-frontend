// ==========================================
// Botón "Agregar a mi solicitud" / "Quitar de mi solicitud".
// Client Component chico, separado de la ficha de detalle del equipo
// (src/app/(site)/catalogo/[id]/page.tsx, un Server Component): es la
// única parte de esa página que necesita el carrito de reserva (ver
// CarritoContext.tsx), así que se aísla acá en vez de convertir toda la
// ficha en Client Component solo por este botón.
//
// Mismo comportamiento y estilos que el botón equivalente dentro de
// EquipoCard.tsx (ver ese archivo): se mantienen dos copias chicas en vez
// de una sola compartida porque cada una vive en un layout levemente
// distinto (acá es "w-fit", en la tarjeta es "w-full").
// ==========================================

"use client";

import { useCarrito } from "@/context/CarritoContext";
import { TRANSICION_HOVER_COMPLETA } from "@/lib/estilos";
import type { Equipo } from "@/types";

interface BotonAgregarCarritoProps {
  equipo: Equipo;
  className?: string;
}

export default function BotonAgregarCarrito({ equipo, className = "" }: BotonAgregarCarritoProps) {
  const { agregarEquipo, quitarEquipo, estaEnCarrito } = useCarrito();
  const enCarrito = estaEnCarrito(equipo.id);

  return (
    <button
      type="button"
      onClick={() => (enCarrito ? quitarEquipo(equipo.id) : agregarEquipo(equipo))}
      className={`rounded-full px-6 py-3 text-sm font-semibold ${TRANSICION_HOVER_COMPLETA} ${
        enCarrito
          ? "border border-red-400/40 text-red-300 hover:bg-red-500/10"
          : "border border-brand-purple-light text-brand-purple-light hover:bg-brand-purple/10"
      } ${className}`}
    >
      {enCarrito ? "Quitar de mi solicitud" : "Agregar a mi solicitud"}
    </button>
  );
}
