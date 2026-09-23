// ==========================================
// Página principal ("/").
// Server Component: las publicaciones destacadas se piden al backend en
// el servidor antes de enviar el HTML, así la primera carga ya llega con
// datos reales (sin spinner inicial en el navegador).
//
// Rediseño de identidad visual (inspirado en Pianity): Hero con título en
// degradado de marca y dos tarjetas de estadísticas animadas, franja
// ondulada animada como separador decorativo, y un adelanto de
// publicaciones destacadas (reemplaza las antiguas "Categorías
// destacadas": el catálogo ya tiene su propio filtro por categoría, así
// que mostrar trabajo real (fotos/videos de eventos) es más útil como
// primera impresión). Todo el contenido entra con ScrollReveal: cualquier
// sección nueva que se agregue de acá en adelante debe envolverse con
// ScrollReveal también, para mantener la misma animación en todo el sitio.
// ==========================================

import type { Metadata } from "next";
import Button from "@/components/Button";
import OndaDivisoria from "@/components/OndaDivisoria";
import ScrollReveal from "@/components/ScrollReveal";
import TarjetaEstadistica from "@/components/TarjetaEstadistica";
import TarjetaPublicacion from "@/components/TarjetaPublicacion";
import { getPublicaciones } from "@/lib/api";
import type { Publicacion } from "@/types";

// Delay (ms) entre la aparición de cada tarjeta del adelanto.
const DELAY_ESCALONADO_PUBLICACIONES_MS = 120;

// SEO de la home: título y descripción enfocados en la búsqueda local
// ("alquiler de equipos de sonido en República Dominicana"), la consulta
// que de verdad hace un cliente potencial en Google — no un genérico
// "Inicio" que no dice nada del negocio. El "title" pasa por la
// plantilla "%s | JM Publicity Sound" del layout raíz (ver
// src/app/layout.tsx), así que el resultado final en la pestaña/buscador
// queda "Alquiler de equipos de sonido en República Dominicana | JM
// Publicity Sound".
export const metadata: Metadata = {
  title: "Alquiler de equipos de sonido en República Dominicana",
  description:
    "Alquiler de equipos de sonido, luces y consolas para bodas, fiestas, conciertos y eventos en toda República Dominicana. Cotiza tu evento hoy mismo.",
};

export default async function Home() {
  // El adelanto del Home muestra ÚNICAMENTE las publicaciones marcadas
  // como "destacado" por el admin — nunca se completa con publicaciones
  // recientes sin marcar, sin importar cuántas destacadas haya (pueden
  // ser 1, 2, 3 o más: no hay tope). Si la consulta falla (ej. backend
  // caído) o simplemente no hay ninguna destacada todavía, la sección se
  // OCULTA por completo en vez de mostrar un título con una grilla vacía:
  // es contenido de "vidriera", no algo esencial para que el resto del
  // Home funcione.
  let publicacionesDestacadas: Publicacion[] = [];
  try {
    publicacionesDestacadas = await getPublicaciones({ destacado: true });
  } catch {
    publicacionesDestacadas = [];
  }

  return (
    <>
      {/* --- Hero: presentación del negocio, llamada a la acción principal,
          y dos tarjetas de estadísticas con conteo animado. Cada bloque
          entra escalonado (título -> texto -> botón -> tarjetas) vía
          ScrollReveal, para que el Hero se sienta como una secuencia, no
          como que todo aparece de golpe. --- */}
      {/* "px-4 sm:px-6" (antes "px-6" fijo): en un celular angosto (320px)
          24px de margen a cada lado le restaban espacio útil al título y a
          las tarjetas de estadísticas de abajo; desde "sm" se mantiene el
          mismo valor de siempre (px-6), así el diseño de escritorio/tablet
          no cambia.
          "py-12" en móvil (antes "py-20" fijo, igual que en escritorio): en
          altos de pantalla típicos de celular (ej. 375x667) ese padding
          vertical tan grande empujaba a la segunda tarjeta de estadísticas
          justo a la esquina inferior derecha de la pantalla, exactamente
          donde queda fijo el botón flotante de WhatsApp (z-index por
          encima de todo), y el botón terminaba superpuesto sobre la
          tarjeta. Con menos padding, el Hero completo (título + texto +
          botón + tarjetas) ocupa menos alto y las tarjetas quedan mejor
          ubicadas dentro de la pantalla, lejos de esa esquina. Desde "sm"
          se mantiene "py-20" (el valor de siempre), sin afectar el diseño
          de tablet/escritorio ya aprobado. */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <ScrollReveal>
            {/* Título con la utilidad de degradado de marca (morado -> rosa
                -> naranja) aplicada al TEXTO, no como fondo del bloque.
                "text-3xl" en el móvil más angosto (antes arrancaba directo
                en "text-4xl"): con este título largo, a 320-375px de ancho
                "text-4xl" ya se acerca al límite de ancho de línea y se
                nota apretado; se agrega además el paso intermedio
                "sm:text-5xl" para que el salto a "lg:text-6xl" en escritorio
                (el mismo tamaño final de antes) sea gradual. */}
            <h1 className="text-gradient-brand text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Alquiler de equipos de sonido para tu evento
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <p className="max-w-xl text-lg text-muted">
              Equipos de sonido, luces y consolas para que tu evento suene y se vea como se merece.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={300}>
            <Button href="/catalogo">Ver catálogo</Button>
          </ScrollReveal>
        </div>

        {/* Dos tarjetas de estadísticas (reemplazan la vitrina de equipos
            apilados): cada una cuenta de 0 a su valor final al entrar en
            pantalla (ver TarjetaEstadistica.tsx). Apiladas en móvil, lado a
            lado desde "sm". */}
        <ScrollReveal delay={450}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <TarjetaEstadistica valorFinal={15} etiqueta="Años de experiencia" />
            <TarjetaEstadistica valorFinal={600} etiqueta="Eventos realizados" />
          </div>
        </ScrollReveal>
      </section>

      {/* --- Separador decorativo: franja ondulada de marca (animada) entre
          el Hero y el adelanto de publicaciones. --- */}
      <OndaDivisoria />

      {/* --- Adelanto de publicaciones destacadas: SOLO las marcadas como
          "destacado" (nunca se completa con otras), fotos/videos reales
          de eventos ya realizados, con el mismo botón de "Reservar este
          equipo" que la galería completa. Toda la sección se oculta si
          no hay ninguna destacada (ver el comentario de más arriba). --- */}
      {publicacionesDestacadas.length > 0 && (
        <section className="px-4 py-24 sm:px-6">
          <ScrollReveal>
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Nuestro trabajo en acción</h2>
          </ScrollReveal>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publicacionesDestacadas.map((publicacion, indice) => (
              <ScrollReveal
                key={publicacion.id}
                delay={indice * DELAY_ESCALONADO_PUBLICACIONES_MS}
                className="h-full"
              >
                <TarjetaPublicacion publicacion={publicacion} />
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal
            delay={publicacionesDestacadas.length * DELAY_ESCALONADO_PUBLICACIONES_MS}
            className="mt-10 flex justify-center"
          >
            <Button href="/eventos" variant="secondary">
              Ver todos los eventos
            </Button>
          </ScrollReveal>
        </section>
      )}
    </>
  );
}
