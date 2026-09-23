// ==========================================
// Página de detalle individual de una publicación de evento
// ("/eventos/[id]"). Server Component: pide la publicación puntual al
// backend usando el id de la URL, mismo criterio que
// src/app/(site)/catalogo/[id]/page.tsx (el detalle de un equipo).
//
// Por qué existe esta página (antes las publicaciones solo se veían
// dentro de la grilla de "/eventos", sin URL propia): para poder
// COMPARTIR "esta publicación específica" (ver BotonCompartir.tsx) hace
// falta un enlace al que cualquiera pueda entrar directo y ver ESE
// contenido puntual — un enlace a "/eventos" a secas siempre muestra la
// grilla completa, nunca una publicación en particular.
//
// Vive dentro del route group "(site)" (src/app/(site)/eventos/[id]/) —
// no en src/app/eventos/[id]/ — para heredar el Header, el Footer y el
// botón flotante de WhatsApp del sitio público, mismo motivo ya
// documentado en src/app/(site)/contacto/page.tsx.
// ==========================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BotonCompartir from "@/components/BotonCompartir";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import ScrollReveal from "@/components/ScrollReveal";
import { ApiError, getPublicacionPorId } from "@/lib/api";
import VisorFotos from "./VisorFotos";

/**
 * SEO dinámica de la publicación, mismo patrón que
 * generateMetadata() en catalogo/[id]/page.tsx: título con el nombre
 * real de la publicación, consultando la misma publicación que ya pide
 * el componente de la página. Si el id no es válido o la publicación no
 * existe, se devuelve un objeto vacío y la 404 la decide el propio
 * componente de la página más abajo.
 */
export async function generateMetadata({ params }: PageProps<"/eventos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const publicacionId = Number(id);

  if (!Number.isInteger(publicacionId)) {
    return {};
  }

  try {
    const publicacion = await getPublicacionPorId(publicacionId);
    return {
      title: publicacion.titulo,
      description:
        publicacion.comentario?.trim() ||
        `Fotos y videos de "${publicacion.titulo}", uno de nuestros eventos realizados con ${publicacion.equipo.nombre}.`,
    };
  } catch {
    return {};
  }
}

export default async function DetallePublicacionPage({ params }: PageProps<"/eventos/[id]">) {
  const { id } = await params;
  const publicacionId = Number(id);

  if (!Number.isInteger(publicacionId)) {
    notFound();
  }

  let publicacion;
  try {
    publicacion = await getPublicacionPorId(publicacionId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    const mensaje = err instanceof Error ? err.message : "No se pudo cargar la publicación.";
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <ErrorMessage message={mensaje} />
      </div>
    );
  }

  // Ruta relativa de ESTA publicación puntual: la usa BotonCompartir
  // para armar tanto el share nativo como el enlace de WhatsApp/"Copiar
  // enlace" del menú de respaldo.
  const rutaDetalle = `/eventos/${publicacion.id}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link href="/eventos" className="mb-6 inline-block text-sm text-muted hover:text-foreground">
        ← Volver a eventos
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        {/* --- Contenido multimedia completo: video con controles nativos
            (a diferencia de la tarjeta de la grilla, en el detalle no
            hace falta el paso de "miniatura + clic para reproducir": ya
            es una página dedicada a ESTE contenido, así que se muestra
            directo, sin autoplay para no sorprender con sonido) o el
            carrusel grande de fotos (VisorFotos.tsx). --- */}
        <ScrollReveal>
          {publicacion.tipo === "VIDEO" ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-background-surface">
              <video
                src={publicacion.videoUrl ?? undefined}
                controls
                poster={publicacion.thumbnailUrl ?? undefined}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <VisorFotos imagenes={publicacion.imagenes} titulo={publicacion.titulo} />
          )}
        </ScrollReveal>

        {/* --- Título, comentario, equipo, botón de compartir prominente
            y el botón de reserva (mismo destino que en TarjetaPublicacion.tsx:
            "equipoId", no el id de la publicación). --- */}
        <ScrollReveal delay={150}>
          <div className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-background-surface p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold tracking-tight">{publicacion.titulo}</h1>
              {/* Acá SÍ con el texto "Compartir" visible (variante
                  "boton"): a diferencia del ícono chico de la tarjeta de
                  la grilla, en esta página dedicada a la publicación el
                  compartir es una acción de primer nivel, no un detalle
                  secundario en una esquina. */}
              <BotonCompartir titulo={publicacion.titulo} ruta={rutaDetalle} variante="boton" className="shrink-0" />
            </div>

            {publicacion.comentario && (
              <p className="leading-relaxed text-muted">{publicacion.comentario}</p>
            )}

            <p className="text-sm font-medium uppercase tracking-wide text-brand-purple-light">
              {publicacion.equipo.nombre}
            </p>

            <Button href={`/catalogo/${publicacion.equipoId}/reservar`} className="mt-auto w-fit">
              Reservar este equipo
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
