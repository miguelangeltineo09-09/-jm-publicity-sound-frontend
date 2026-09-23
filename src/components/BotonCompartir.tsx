// ==========================================
// Botón para compartir una publicación puntual (foto o video de un
// evento), usado en cada TarjetaPublicacion.tsx de la galería completa
// ("/eventos") y, de forma más prominente, en la página de detalle
// individual de esa publicación (src/app/(site)/eventos/[id]/page.tsx).
//
// PATRÓN HÍBRIDO (por qué): la Web Share API (navigator.share) es la
// mejor experiencia posible — abre el menú NATIVO de compartir del
// sistema/navegador, con TODAS las apps que el visitante ya tiene
// instaladas (WhatsApp, Instagram, Mail, Notas, etc.), no solo una
// alternativa fija. El problema es que todavía no la soportan todos los
// navegadores (históricamente, sobre todo en escritorio: ej. Firefox no
// la implementa). Por eso este componente la usa SOLO si
// "navigator.share" existe en tiempo de ejecución; si no existe, cae a
// un menú desplegable propio con las dos alternativas manuales más
// útiles: un enlace directo de WhatsApp y "Copiar enlace" — así el
// visitante SIEMPRE puede compartir la publicación, sin importar qué
// navegador use.
//
// Es Client Component porque depende de APIs del navegador
// (navigator.share/clipboard) y de estado propio (menú abierto,
// confirmación de "copiado").
// ==========================================

"use client";

import { useEffect, useRef, useState } from "react";
import { construirEnlaceWhatsApp } from "@/components/BotonWhatsApp";
import IconoWhatsApp from "@/components/IconoWhatsApp";
import { TRANSICION_HOVER } from "@/lib/estilos";

interface BotonCompartirProps {
  // Título de la publicación: se usa como texto del share nativo y
  // como parte del mensaje de WhatsApp del menú de respaldo.
  titulo: string;
  // Ruta RELATIVA a la página de detalle de esta publicación puntual
  // (ej. "/eventos/5"). Se resuelve a una URL ABSOLUTA recién en el
  // navegador (con "window.location.origin", ver más abajo) en vez de
  // con la URL fija del sitio (src/lib/seo.ts, la que SÍ corresponde
  // usar en metadata/sitemap): un enlace para COMPARTIR debe apuntar a
  // donde el sitio esté sirviéndose REALMENTE en este momento (ej.
  // localhost en desarrollo, o el dominio real ya en producción), no al
  // placeholder fijo de esa constante.
  ruta: string;
  // "icono" (por defecto): una insignia circular pequeña, pensada para
  // la esquina de una tarjeta sin competir con otros botones. "boton":
  // una versión con el texto "Compartir" al lado, para un lugar más
  // prominente como la página de detalle.
  variante?: "icono" | "boton";
  className?: string;
}

// Ícono de "compartir" reconocible (tres nodos conectados por líneas),
// SVG inline sin depender de ninguna librería de iconos, mismo criterio
// que el resto del sitio.
function IconoCompartir({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

// Cuánto tiempo queda visible la confirmación "¡Copiado!" antes de que
// el botón vuelva a mostrar "Copiar enlace".
const DURACION_CONFIRMACION_COPIADO_MS = 2000;

export default function BotonCompartir({ titulo, ruta, variante = "icono", className = "" }: BotonCompartirProps) {
  // Solo aplica al menú de respaldo (cuando no hay Web Share API): si
  // está abierto, y si ya se copió el enlace (para mostrar "¡Copiado!"
  // temporalmente en vez de "Copiar enlace").
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Cierra el menú de respaldo si se hace clic fuera de él — mismo
  // patrón que SelectorPersonalizado.tsx.
  useEffect(() => {
    if (!menuAbierto) return;

    function manejarClicFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setMenuAbierto(false);
      }
    }

    document.addEventListener("mousedown", manejarClicFuera);
    return () => document.removeEventListener("mousedown", manejarClicFuera);
  }, [menuAbierto]);

  // Al hacer clic en el botón principal: intenta primero el share
  // nativo; si no existe en este navegador, abre/cierra el menú de
  // respaldo. "stopPropagation" es importante: este botón vive dentro de
  // TarjetaPublicacion, que en la galería envuelve su imagen/título en un
  // <Link> a la página de detalle — sin esto, el clic en "compartir"
  // también dispararía esa navegación por encima.
  async function manejarClicPrincipal(evento: React.MouseEvent) {
    evento.preventDefault();
    evento.stopPropagation();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: titulo,
          url: `${window.location.origin}${ruta}`,
        });
      } catch {
        // El visitante cerró/canceló el menú nativo (DOMException
        // "AbortError") o el share falló por otro motivo: no es un
        // error real que haya que mostrarle, el sistema ya le mostró
        // (o cerró) su propio menú.
      }
      return;
    }

    setMenuAbierto((abierto) => !abierto);
  }

  async function manejarCopiar(evento: React.MouseEvent) {
    evento.preventDefault();
    evento.stopPropagation();

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${ruta}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), DURACION_CONFIRMACION_COPIADO_MS);
    } catch {
      // El portapapeles puede fallar (ej. permisos del navegador, o un
      // contexto no seguro sin HTTPS): no hay una alternativa razonable
      // que ofrecer automáticamente, el visitante puede copiar el
      // enlace de la barra de direcciones por su cuenta.
    }
  }

  return (
    <div ref={contenedorRef} className={`relative inline-block ${className}`}>
      {variante === "icono" ? (
        <button
          type="button"
          onClick={manejarClicPrincipal}
          aria-label={`Compartir "${titulo}"`}
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white ${TRANSICION_HOVER} hover:bg-black/70`}
        >
          <IconoCompartir />
        </button>
      ) : (
        // Variante "boton": mismo tratamiento visual que Button.tsx
        // variante "secondary" (solo contorno), para no competir con el
        // botón primary de "Reservar este equipo" que también aparece en
        // la página de detalle.
        <button
          type="button"
          onClick={manejarClicPrincipal}
          className={`inline-flex items-center gap-2 rounded-full border border-brand-purple-light px-6 py-3 text-sm font-semibold text-brand-purple-light ${TRANSICION_HOVER} hover:bg-brand-purple/10`}
        >
          <IconoCompartir className="h-4 w-4" />
          Compartir
        </button>
      )}

      {/* --- Menú de respaldo: solo se dibuja cuando el visitante lo abrió
          (navegador sin Web Share API) --- */}
      {menuAbierto && (
        <ul
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-white/10 bg-background-surface py-1 shadow-lg shadow-black/40"
        >
          <li role="none">
            {/* Enlace directo de WhatsApp (mismo patrón wa.me que
                BotonWhatsApp.tsx/construirEnlaceWhatsApp), con un
                mensaje que incluye el título de ESTA publicación y el
                link a SU página de detalle — se calcula acá adentro
                (no como prop) porque necesita "window.location.origin",
                que solo existe una vez montado en el navegador; este
                bloque nunca se renderiza durante el render inicial del
                servidor (arranca oculto, "menuAbierto" empieza en
                false), así que es seguro leerlo acá. */}
            <a
              role="menuitem"
              href={construirEnlaceWhatsApp(`${titulo} ${window.location.origin}${ruta}`)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuAbierto(false)}
              className={`flex items-center gap-2 px-4 py-2 text-sm text-foreground ${TRANSICION_HOVER} hover:bg-brand-purple/10`}
            >
              <IconoWhatsApp className="h-4 w-4 text-[#25D366]" />
              Compartir por WhatsApp
            </a>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={manejarCopiar}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground ${TRANSICION_HOVER} hover:bg-brand-purple/10`}
            >
              <IconoCompartir className="h-4 w-4" />
              {copiado ? "¡Copiado!" : "Copiar enlace"}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
