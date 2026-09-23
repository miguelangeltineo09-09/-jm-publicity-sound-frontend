// ==========================================
// Página "Nosotros" ("/nosotros").
// Server Component: todo el contenido es texto estático (misión, visión y
// valores del negocio), no hace falta pedir nada al backend ni tener
// estado — por eso no es "use client" (a diferencia de ScrollReveal, que
// sí lo es, pero eso no obliga a que el padre también lo sea).
//
// Vive dentro del route group "(site)" (no aparece en la URL) para
// heredar el Header/Footer públicos, igual que el resto de las páginas
// del sitio (Home, catálogo, detalle, reserva) — así "Nosotros" se ve
// exactamente igual de "parte del sitio" que cualquier otra sección.
//
// Sin fondo propio en el contenedor: como en el resto del sitio, el
// degradado base vive en el <body> (globals.css); esta página solo agrega
// padding/ancho máximo, para que no haya ningún corte de color contra el
// header/footer ni entre sus propias secciones.
// ==========================================

import type { Metadata } from "next";
import AcordeonFaq from "@/components/AcordeonFaq";
import ScrollReveal from "@/components/ScrollReveal";
import { getPreguntasFrecuentes } from "@/lib/api";
import { TRANSICION_HOVER_COMPLETA } from "@/lib/estilos";
import type { PreguntaFrecuente } from "@/types";

// SEO: título/descripción propios de "Nosotros".
export const metadata: Metadata = {
  title: "Sobre nosotros - Misión, Visión y Valores",
  description:
    "Conoce la misión, visión y valores de JM Publicity Sound, empresa de alquiler de equipos de sonido en República Dominicana.",
};

// Los 6 valores del negocio, con su título corto y descripción de una
// línea. Vive como constante (no hardcodeado en el JSX) para que el
// ".map()" de abajo pueda además calcular el delay escalonado de cada
// tarjeta a partir de su índice.
const VALORES = [
  {
    titulo: "Puntualidad",
    descripcion: "Cumplimos con los horarios acordados, desde la entrega hasta la recogida del equipo.",
  },
  {
    titulo: "Compromiso con la calidad",
    descripcion: "Mantenemos nuestros equipos en óptimas condiciones para garantizar un sonido impecable en cada evento.",
  },
  {
    titulo: "Honestidad y transparencia",
    descripcion: "Precios claros y comunicación directa con nuestros clientes, sin sorpresas de último momento.",
  },
  {
    titulo: "Atención personalizada",
    descripcion: "Escuchamos las necesidades de cada evento para ofrecer la solución de sonido adecuada.",
  },
  {
    titulo: "Responsabilidad",
    descripcion: "Asumimos cada evento con la seriedad que merece, sin importar su tamaño.",
  },
  {
    titulo: "Innovación",
    descripcion: "Nos mantenemos actualizados con tecnología moderna de sonido e iluminación.",
  },
];

// Delay (ms) entre la aparición de cada tarjeta de valor: mismo criterio
// que las tarjetas de categoría del Home (una tras otra, no todas a la vez).
const DELAY_ESCALONADO_VALORES_MS = 100;

// Los 7 motivos de "¿Por Qué Elegirnos?": a diferencia de VALORES (título +
// descripción larga), acá cada punto es una frase corta con un ícono de
// check al lado, así que alcanza con un array de strings en vez de objetos.
const PORQUE_ELEGIRNOS = [
  "Equipos profesionales",
  "Transporte propio",
  "Planta eléctrica propia",
  "Servicio en todo el país",
  "Atención personalizada",
  "Puntualidad garantizada",
  "Personal capacitado",
];

// Delay (ms) entre la aparición de cada tarjeta de "¿Por Qué Elegirnos?".
const DELAY_ESCALONADO_PORQUE_MS = 100;

// Ícono de check simple, SVG inline sin depender de ninguna librería de
// iconos (mismo criterio que el ícono de play de TarjetaPublicacion.tsx o
// el de alerta del Dashboard del admin): un trazo simple, sin relleno.
function IconoCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default async function NosotrosPage() {
  // Preguntas frecuentes: contenido "de vidriera" igual que el adelanto
  // de publicaciones del Home — si la consulta falla (ej. backend caído)
  // o todavía no hay ninguna cargada, la sección entera se OCULTA (ver
  // más abajo) en vez de mostrar un título con una lista vacía o un error.
  let preguntasFrecuentes: PreguntaFrecuente[] = [];
  try {
    preguntasFrecuentes = await getPreguntasFrecuentes();
  } catch {
    preguntasFrecuentes = [];
  }

  return (
    // "px-4 sm:px-6" (antes "px-6" fijo): más espacio útil en un celular
    // angosto para las tarjetas de Misión/Visión/Valores; desde "sm" queda
    // igual que antes.
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <ScrollReveal>
        {/* Título con la misma utilidad de degradado de marca usada en el
            resto del sitio (Home, Catálogo). */}
        <h1 className="text-gradient-brand text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Sobre JM Publicity Sound
        </h1>
      </ScrollReveal>

      {/* --- Misión y Visión: dos tarjetas grandes lado a lado (apiladas en
          móvil), mismo fondo "surface" y borde sutil que el resto de las
          tarjetas del sitio. Sin ícono: el proyecto no tiene ninguna
          librería de iconos instalada todavía, así que se prioriza el
          texto en vez de agregar una dependencia nueva solo para esto. --- */}
      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <ScrollReveal delay={150} className="h-full">
          <div className="h-full rounded-2xl border border-white/10 bg-background-surface p-8">
            <h2 className="text-xl font-bold tracking-tight">Misión</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Brindar servicios de sonido profesional de alta calidad para todo tipo de eventos, ofreciendo
              equipos modernos, atención personalizada, puntualidad y soluciones confiables que garanticen
              experiencias memorables para nuestros clientes en cualquier lugar de la República Dominicana.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={300} className="h-full">
          <div className="h-full rounded-2xl border border-white/10 bg-background-surface p-8">
            <h2 className="text-xl font-bold tracking-tight">Visión</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Ser la empresa líder en alquiler de sonido profesional en la República Dominicana, reconocida
              por la excelencia de nuestros servicios, la innovación tecnológica, la responsabilidad en
              nuestras operaciones y la confianza que generamos en nuestros clientes, convirtiéndonos en la
              primera opción para eventos de cualquier magnitud.
            </p>
          </div>
        </ScrollReveal>
      </div>

      {/* --- Valores: misma tarjeta que "Categorías destacadas" del Home
          (fondo "surface", borde que se ilumina a rosa en hover con la
          transición estándar del sitio), pero con título + descripción en
          vez de solo un label centrado. --- */}
      <section className="mt-20">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Valores</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALORES.map((valor, indice) => (
            <ScrollReveal key={valor.titulo} delay={indice * DELAY_ESCALONADO_VALORES_MS} className="h-full">
              <div
                className={`h-full rounded-xl border border-white/10 bg-background-surface p-6 ${TRANSICION_HOVER_COMPLETA} hover:border-brand-pink hover:shadow-[0_0_24px_-6px_rgba(236,72,153,0.5)]`}
              >
                <h3 className="font-semibold text-foreground">{valor.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{valor.descripcion}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* --- ¿Por Qué Elegirnos?: mismo patrón visual que "Valores" (misma
          tarjeta "surface" con borde que se ilumina en hover), pero cada
          tarjeta es una frase corta con un ícono de check al lado en vez
          de título + descripción. Son 7 puntos (impar para una grilla de
          3 columnas): los primeros 6 llenan la grilla completa (2 filas
          de 3), y el 7º se dibuja aparte, centrado en su propia fila, en
          vez de dejarlo pegado a la izquierda con un hueco vacío al lado. --- */}
      <section className="mt-20">
        <h2 className="text-gradient-brand mb-8 text-center text-2xl font-bold tracking-tight">
          ¿Por Qué Elegirnos?
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PORQUE_ELEGIRNOS.slice(0, 6).map((punto, indice) => (
            <ScrollReveal key={punto} delay={indice * DELAY_ESCALONADO_PORQUE_MS} className="h-full">
              <div
                className={`flex h-full items-center gap-3 rounded-xl border border-white/10 bg-background-surface p-6 ${TRANSICION_HOVER_COMPLETA} hover:border-brand-pink hover:shadow-[0_0_24px_-6px_rgba(236,72,153,0.5)]`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white">
                  <IconoCheck />
                </span>
                <span className="font-semibold text-foreground">{punto}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* 7º punto, centrado y ancho acotado a "max-w-sm" para que se vea
            proporcional a una tarjeta de la grilla de arriba en vez de
            estirarse a todo el ancho del contenedor. */}
        <div className="mt-4 flex justify-center">
          <ScrollReveal delay={6 * DELAY_ESCALONADO_PORQUE_MS} className="w-full max-w-sm">
            <div
              className={`flex items-center gap-3 rounded-xl border border-white/10 bg-background-surface p-6 ${TRANSICION_HOVER_COMPLETA} hover:border-brand-pink hover:shadow-[0_0_24px_-6px_rgba(236,72,153,0.5)]`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white">
                <IconoCheck />
              </span>
              <span className="font-semibold text-foreground">{PORQUE_ELEGIRNOS[6]}</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* --- Preguntas frecuentes: acordeón editable desde el panel admin
          (/admin/faq). Se oculta por completo si todavía no hay ninguna
          cargada o si falló la consulta (ver el try/catch de arriba),
          mismo criterio que el adelanto de publicaciones del Home. --- */}
      {preguntasFrecuentes.length > 0 && (
        <section className="mt-20">
          <ScrollReveal>
            <h2 className="text-gradient-brand mb-8 text-center text-2xl font-bold tracking-tight">
              Preguntas frecuentes
            </h2>
          </ScrollReveal>

          {/* max-w-3xl centrado: un acordeón de ancho completo (max-w-6xl,
              el mismo que el resto de la página) se vería demasiado
              ancho para líneas de texto largas como estas respuestas. */}
          <div className="mx-auto max-w-3xl">
            <AcordeonFaq preguntas={preguntasFrecuentes} />
          </div>
        </section>
      )}
    </div>
  );
}
