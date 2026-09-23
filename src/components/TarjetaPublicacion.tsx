// ==========================================
// Tarjeta de una publicación de evento (foto o video), reutilizable en la
// galería completa ("/eventos") y en el adelanto de destacadas del Home.
//
// Es Client Component porque necesita estado propio: si el video ya se
// puso a reproducir (VIDEO) o en qué foto del álbum está el carrusel
// (FOTO) — a diferencia de EquipoCard.tsx, que es un enlace estático sin
// interactividad.
//
// "enGaleria" distingue los DOS contextos donde vive esta misma tarjeta:
// - Adelanto del Home (enGaleria=false, el valor por defecto): clic en
//   el video lo reproduce INLINE ahí mismo, sin salir de la página — la
//   experiencia más rápida para una vidriera de "mira lo que hacemos".
// - Galería completa "/eventos" (enGaleria=true): clic en el título o en
//   el contenido multimedia lleva a la página de detalle individual de
//   esa publicación (/eventos/[id]) en vez de reproducir ahí mismo — es
//   justo la página que se necesita para poder COMPARTIR "esta
//   publicación específica" con una URL propia, y por eso ahí también
//   aparece el ícono de BotonCompartir en la esquina de la tarjeta (no
//   tendría sentido compartir el adelanto del Home, que no tiene su
//   propia URL por publicación). El carrusel de fotos (flechas/puntos)
//   sigue funcionando igual en ambos contextos: no "reproduce" nada,
//   solo permite hojear el álbum sin salir de la tarjeta.
// ==========================================

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BotonCompartir from "@/components/BotonCompartir";
import Button from "@/components/Button";
import { TRANSICION_HOVER, TRANSICION_HOVER_COMPLETA } from "@/lib/estilos";
import type { Publicacion } from "@/types";

interface TarjetaPublicacionProps {
  publicacion: Publicacion;
  enGaleria?: boolean;
}

// Ícono de "play", SVG inline simple (sin depender de ninguna librería de
// iconos, mismo criterio que el ícono de alerta del Dashboard del admin).
function IconoPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-6 w-6">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export default function TarjetaPublicacion({ publicacion, enGaleria = false }: TarjetaPublicacionProps) {
  // Ruta a la página de detalle individual de ESTA publicación: se
  // calcula una sola vez acá arriba porque la usan varios bloques del
  // JSX de más abajo (el Link del video, el de las fotos, el del título
  // y el BotonCompartir).
  const rutaDetalle = `/eventos/${publicacion.id}`;
  // Solo aplica si tipo === "VIDEO": mientras es false se ve la miniatura
  // con el botón de play; al hacer clic se reemplaza por el <video> real.
  // Reproducir inline (en vez de un modal/lightbox aparte) es el patrón
  // más simple de mantener acá: no hace falta un componente de overlay
  // nuevo, ni manejar su propio z-index/cierre con Escape, etc.
  const [reproduciendo, setReproduciendo] = useState(false);

  // Solo aplica si tipo === "FOTO": posición actual dentro del carrusel.
  const [indiceFoto, setIndiceFoto] = useState(0);
  const imagenes = publicacion.imagenes;

  function fotoAnterior() {
    setIndiceFoto((actual) => (actual - 1 + imagenes.length) % imagenes.length);
  }

  function fotoSiguiente() {
    setIndiceFoto((actual) => (actual + 1) % imagenes.length);
  }

  return (
    // "flex h-full flex-col": cuando esta tarjeta va dentro de una grilla
    // envuelta en ScrollReveal (ver page.tsx), el <div> de ScrollReveal es
    // el que realmente se estira a la altura de la fila — esta tarjeta
    // necesita su propio "h-full" para aprovechar ese alto en vez de
    // quedarse con el de su contenido, y "flex-col" + el "flex-1" de más
    // abajo empujan el botón de reservar siempre al fondo, sin importar
    // cuánto texto tenga el comentario de cada publicación.
    <div
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-background-surface ${TRANSICION_HOVER_COMPLETA} hover:border-brand-pink hover:shadow-[0_0_28px_-10px_rgba(236,72,153,0.45)]`}
    >
      {/* --- Contenido multimedia: video con miniatura+play, o carrusel de fotos --- */}
      <div className="relative aspect-[4/3] w-full bg-background">
        {publicacion.tipo === "VIDEO" ? (
          reproduciendo ? (
            // Se reemplaza la miniatura por el <video> real, ya reproduciendo
            // (autoPlay: el clic en el botón de play ya fue la intención
            // explícita del visitante, no autoplay "sorpresa" al cargar la página).
            // Solo alcanzable con enGaleria=false (Home): en la galería el
            // clic en el video directamente navega al detalle (ver abajo),
            // así que "reproduciendo" nunca llega a ponerse en true ahí.
            <video
              src={publicacion.videoUrl ?? undefined}
              controls
              autoPlay
              className="h-full w-full object-cover"
            />
          ) : enGaleria ? (
            // Galería completa: el clic en la miniatura lleva al detalle
            // (para poder compartirlo) en vez de reproducir el video ahí
            // mismo — mismo contenido visual (miniatura + ícono de play)
            // que la versión de abajo, solo cambia a dónde lleva el clic.
            <Link
              href={rutaDetalle}
              aria-label={`Ver publicación: ${publicacion.titulo}`}
              className="group relative block h-full w-full"
            >
              {publicacion.thumbnailUrl ? (
                <Image
                  src={publicacion.thumbnailUrl}
                  alt={publicacion.titulo}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">Sin miniatura</div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors duration-300 group-hover:bg-black/45">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-brand-purple">
                  <IconoPlay />
                </span>
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setReproduciendo(true)}
              aria-label={`Reproducir video: ${publicacion.titulo}`}
              className="group relative block h-full w-full"
            >
              {publicacion.thumbnailUrl ? (
                <Image
                  src={publicacion.thumbnailUrl}
                  alt={publicacion.titulo}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">Sin miniatura</div>
              )}
              {/* Ícono de play superpuesto sobre un velo oscuro, que se
                  intensifica levemente en hover para reforzar que es clickeable. */}
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors duration-300 group-hover:bg-black/45">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-brand-purple">
                  <IconoPlay />
                </span>
              </span>
            </button>
          )
        ) : imagenes.length > 0 ? (
          <>
            {/* En la galería, solo la IMAGEN en sí (no el contenedor
                completo) queda envuelta en el Link al detalle: las
                flechas y los puntos de más abajo son HERMANOS de este
                Link, no hijos suyos — así siguen siendo botones sueltos
                que hojean el álbum sin disparar la navegación, en vez de
                quedar anidados dentro de un <a> (HTML inválido: un
                enlace no puede contener otro elemento interactivo como
                un <button>). */}
            {enGaleria ? (
              <Link href={rutaDetalle} aria-label={`Ver publicación: ${publicacion.titulo}`} className="absolute inset-0">
                <Image
                  src={imagenes[indiceFoto].imagenUrl}
                  alt={`${publicacion.titulo} — foto ${indiceFoto + 1} de ${imagenes.length}`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </Link>
            ) : (
              <Image
                src={imagenes[indiceFoto].imagenUrl}
                alt={`${publicacion.titulo} — foto ${indiceFoto + 1} de ${imagenes.length}`}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            )}

            {/* Flechas e indicadores solo tienen sentido con más de 1 foto. */}
            {imagenes.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={fotoAnterior}
                  aria-label="Foto anterior"
                  className={`absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white ${TRANSICION_HOVER} hover:bg-black/70`}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={fotoSiguiente}
                  aria-label="Foto siguiente"
                  className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white ${TRANSICION_HOVER} hover:bg-black/70`}
                >
                  ›
                </button>

                {/* Puntos indicadores de posición dentro del carrusel. */}
                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {imagenes.map((imagen, indice) => (
                    <button
                      key={imagen.id}
                      type="button"
                      onClick={() => setIndiceFoto(indice)}
                      aria-label={`Ir a la foto ${indice + 1}`}
                      className={`h-1.5 w-1.5 rounded-full ${TRANSICION_HOVER} ${
                        indice === indiceFoto ? "bg-white" : "bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">Sin imágenes</div>
        )}

        {/* Ícono de compartir, solo en la galería completa (no tendría
            sentido en el adelanto del Home: esa vista no lleva a una URL
            propia por publicación). Esquina superior derecha: las
            flechas del carrusel y el ícono de play ya ocupan el centro y
            los bordes izquierdo/derecho a media altura, y los puntos el
            borde inferior — arriba a la derecha queda libre en los dos
            tipos de contenido, sin competir con nada de eso NI con el
            botón "Reservar este equipo" (que vive en otro bloque, más
            abajo en la tarjeta). "z-10" para quedar por encima de la
            imagen/el Link del video o las fotos. */}
        {enGaleria && (
          <div className="absolute right-2 top-2 z-10">
            <BotonCompartir titulo={publicacion.titulo} ruta={rutaDetalle} />
          </div>
        )}
      </div>

      {/* --- Título, comentario, equipo y el botón de reserva ---
          "flex-1" en el bloque de texto (y "mt-auto" en el botón) empujan
          el botón siempre al fondo de la tarjeta, para que todas las
          tarjetas de una fila terminen alineadas aunque el comentario de
          cada una tenga distinto largo. --- */}
      <div className="flex flex-1 flex-col gap-1 p-4">
        {/* En la galería, el título sigue siendo un <h3> (mantiene su
            semántica de encabezado para accesibilidad/SEO), pero con un
            enlace al detalle ADENTRO: un visitante leyendo el texto de
            la tarjeta espera poder hacer clic ahí mismo, no solo en la
            imagen. En el Home queda como texto plano, sin cambios
            respecto de antes. */}
        <h3 className="font-semibold text-foreground">
          {enGaleria ? (
            <Link href={rutaDetalle} className={`${TRANSICION_HOVER} hover:text-brand-pink`}>
              {publicacion.titulo}
            </Link>
          ) : (
            publicacion.titulo
          )}
        </h3>
        {publicacion.comentario && (
          <p className="line-clamp-3 text-sm text-muted">{publicacion.comentario}</p>
        )}
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-purple-light">
          {publicacion.equipo.nombre}
        </p>

        {/* El botón usa "equipoId" (no el id de la publicación): sin
            importar de qué publicación venga, siempre lleva a reservar
            EXACTAMENTE el equipo protagonista de esta tarjeta. */}
        <Button href={`/catalogo/${publicacion.equipoId}/reservar`} className="mt-auto w-full justify-center">
          Reservar este equipo
        </Button>
      </div>
    </div>
  );
}
