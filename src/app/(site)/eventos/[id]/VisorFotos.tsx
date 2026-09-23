// ==========================================
// Carrusel de fotos grande para la página de detalle de una publicación
// (src/app/(site)/eventos/[id]/page.tsx). Client Component porque
// necesita estado propio (qué foto del álbum está visible) — la propia
// página de detalle es un Server Component, así que este pedacito
// interactivo se separa en su propio archivo, mismo criterio que
// FiltroEquipos.tsx/FiltroPublicaciones.tsx junto a sus respectivos
// page.tsx.
//
// Es una versión más grande del mismo patrón de carrusel ya usado en
// TarjetaPublicacion.tsx (flechas + puntos), sin reutilizar ese
// componente directamente: acá no hace falta el título/comentario/botón
// de reserva que trae la tarjeta, solo el visor de fotos en sí, a un
// tamaño mucho mayor.
// ==========================================

"use client";

import { useState } from "react";
import Image from "next/image";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { ImagenPublicacion } from "@/types";

interface VisorFotosProps {
  imagenes: ImagenPublicacion[];
  titulo: string;
}

export default function VisorFotos({ imagenes, titulo }: VisorFotosProps) {
  const [indiceFoto, setIndiceFoto] = useState(0);

  function fotoAnterior() {
    setIndiceFoto((actual) => (actual - 1 + imagenes.length) % imagenes.length);
  }

  function fotoSiguiente() {
    setIndiceFoto((actual) => (actual + 1) % imagenes.length);
  }

  if (imagenes.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-background-surface text-muted">
        Sin imágenes
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-background-surface">
      <Image
        src={imagenes[indiceFoto].imagenUrl}
        alt={`${titulo} — foto ${indiceFoto + 1} de ${imagenes.length}`}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
        priority
      />

      {/* Flechas e indicadores solo tienen sentido con más de 1 foto —
          mismo criterio que TarjetaPublicacion.tsx. */}
      {imagenes.length > 1 && (
        <>
          <button
            type="button"
            onClick={fotoAnterior}
            aria-label="Foto anterior"
            className={`absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white ${TRANSICION_HOVER} hover:bg-black/70`}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={fotoSiguiente}
            aria-label="Foto siguiente"
            className={`absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-lg text-white ${TRANSICION_HOVER} hover:bg-black/70`}
          >
            ›
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {imagenes.map((imagen, indice) => (
              <button
                key={imagen.id}
                type="button"
                onClick={() => setIndiceFoto(indice)}
                aria-label={`Ir a la foto ${indice + 1}`}
                className={`h-2 w-2 rounded-full ${TRANSICION_HOVER} ${
                  indice === indiceFoto ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
