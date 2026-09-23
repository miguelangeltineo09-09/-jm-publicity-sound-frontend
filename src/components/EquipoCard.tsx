// ==========================================
// Tarjeta de equipo, reutilizable en el catálogo y en cualquier sección
// futura de "equipos relacionados".
//
// Rediseño de identidad visual: mismo lenguaje que el Home (fondo morado
// oscuro, borde que se ilumina a rosa en hover, precio en degradado de
// marca). El botón "Ver detalles" ahora es un <Button variant="secondary">
// real (antes era solo un texto con flecha) — por eso la tarjeta ya NO es
// un único <Link> como antes: un Button con href renderiza su propio <a>,
// y anidarlo dentro de otro <a> sería HTML inválido. En su lugar, la imagen
// y los datos quedan envueltos en un <Link> con "display: contents" (la
// clase "contents" de Tailwind), que hace clickeable esa zona SIN alterar
// el layout en flex-col (el Link desaparece de la caja, sus hijos pasan a
// ser directamente los hijos del contenedor flex), y el botón queda como
// hermano de ese Link, no anidado dentro de él.
//
// AGREGADO: el carrito de reserva (ver CarritoContext.tsx) permite elegir
// VARIOS equipos antes de reservar, no solo uno — por eso esta tarjeta es
// ahora Client Component ("use client"): necesita useCarrito() para saber
// si este equipo ya está en la solicitud y para agregarlo/quitarlo sin
// navegar a ningún lado. El botón "Ver detalles" y el resto del layout
// original no cambian.
// ==========================================

"use client";

import Image from "next/image";
import Link from "next/link";
import Button from "@/components/Button";
import { useCarrito } from "@/context/CarritoContext";
import { formatearMoneda } from "@/lib/formato";
import { TRANSICION_HOVER_COMPLETA, TRANSICION_HOVER_TRANSFORM } from "@/lib/estilos";
import type { Equipo } from "@/types";

interface EquipoCardProps {
  equipo: Equipo;
}

export default function EquipoCard({ equipo }: EquipoCardProps) {
  const disponible = equipo.disponibleParaAlquiler;
  const { agregarEquipo, quitarEquipo, estaEnCarrito } = useCarrito();
  const enCarrito = estaEnCarrito(equipo.id);

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-background-surface ${TRANSICION_HOVER_COMPLETA} hover:-translate-y-1 hover:border-brand-pink hover:shadow-[0_0_28px_-10px_rgba(236,72,153,0.45)] ${
        // Equipos no disponibles se ven "apagados", pero el link de la
        // imagen/datos y el botón siguen funcionando: el detalle explica
        // por qué no se pueden reservar.
        disponible ? "" : "opacity-60"
      }`}
    >
      <Link href={`/catalogo/${equipo.id}`} className="contents">
        {/* Imagen (o placeholder si el equipo todavía no tiene foto subida). */}
        <div className="relative aspect-[4/3] w-full bg-background">
          {equipo.imagenUrl ? (
            <Image
              src={equipo.imagenUrl}
              alt={equipo.nombre}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className={`object-cover ${TRANSICION_HOVER_TRANSFORM} group-hover:scale-105`}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">Sin imagen</div>
          )}

          {/* Etiqueta de no disponibilidad, superpuesta sobre la imagen. Gris
              cálido (no el cian/gris frío del resto del sitio): es una
              advertencia neutra, no un dato de marca. */}
          {!disponible && (
            <span className="absolute right-2 top-2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-stone-300">
              No disponible actualmente
            </span>
          )}

          {/* DECISIÓN: la tarjeta NO agrega acá un segundo botón de
              WhatsApp para los equipos no disponibles (ver el botón de
              "Preguntar por alternativas" en la ficha de detalle,
              src/app/(site)/catalogo/[id]/page.tsx). Dos motivos:
              1. Espacio/layout: esta tarjeta ya tiene un único botón
              ("Ver detalles") de ancho completo debajo; agregar un
              segundo botón solo en las tarjetas no disponibles las
              haría más altas que el resto de las tarjetas de la misma
              fila de la grilla, rompiendo la alineación uniforme entre
              todas (un problema que la ficha de detalle, una página
              completa para un solo equipo, no tiene).
              2. Contexto: desde la grilla el cliente todavía no vio la
              descripción completa, el precio detallado ni "Incluye:" —
              mandarlo directo a WhatsApp desde acá, sin ese contexto,
              da un mensaje predefinido más pobre que el de la ficha
              (que ya conoce el equipo puntual). Mantener "Ver detalles"
              como único paso desde la tarjeta es más simple y consistente
              con el resto de equipos (disponibles o no, la tarjeta se
              comporta igual), y la ficha de detalle es donde
              corresponde ofrecer la alternativa real. */}
        </div>

        {/* Datos principales del equipo. */}
        <div className="flex flex-1 flex-col gap-1 p-4 pb-0">
          <span className="text-xs font-medium uppercase tracking-wide text-brand-purple-light">
            {equipo.categoria.nombre}
          </span>
          <h3 className="font-semibold text-foreground">{equipo.nombre}</h3>
          {/* Precio en degradado de marca: es el dato que más debe resaltar
              de la tarjeta, por eso usa el mismo tratamiento que los
              títulos destacados del Home. */}
          <p className="text-gradient-brand mt-1 text-lg font-bold">{formatearMoneda(Number(equipo.precio))}</p>
        </div>
      </Link>

      {/* Botones reales (variantes ya definidas en Button.tsx), como
          hermanos del Link de arriba, no anidados dentro de él. */}
      <div className="flex flex-col gap-2 p-4 pt-3">
        <Button href={`/catalogo/${equipo.id}`} variant="secondary" className="w-full justify-center">
          Ver detalles
        </Button>

        {/* "Agregar a mi solicitud": suma este equipo al carrito SIN salir
            de la grilla, para poder seguir eligiendo más antes de reservar.
            Deshabilitado si el equipo no está disponible (no tendría
            sentido armar una solicitud con algo que no se puede alquilar) —
            mismo criterio de opacidad que el resto de la tarjeta. Cuando ya
            está en el carrito, se convierte en "Quitar" para poder
            deshacerlo sin ir hasta "Mi solicitud". */}
        <button
          type="button"
          disabled={!disponible}
          onClick={() => (enCarrito ? quitarEquipo(equipo.id) : agregarEquipo(equipo))}
          className={`w-full rounded-full px-6 py-3 text-sm font-semibold ${TRANSICION_HOVER_COMPLETA} disabled:cursor-not-allowed disabled:opacity-50 ${
            enCarrito
              ? "border border-red-400/40 text-red-300 hover:bg-red-500/10"
              : "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white hover:scale-[1.02] hover:opacity-90"
          }`}
        >
          {enCarrito ? "Quitar de mi solicitud" : "Agregar a mi solicitud"}
        </button>
      </div>
    </div>
  );
}
