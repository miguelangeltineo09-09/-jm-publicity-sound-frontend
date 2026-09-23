// ==========================================
// Encabezado fijo del sitio.
// Muestra el logo/nombre de la marca y la navegación principal. En escritorio
// los links van en línea; en móvil se colapsan detrás de un botón hamburguesa.
// Es Client Component porque necesita estado (menú abierto/cerrado).
// ==========================================

"use client";

import Link from "next/link";
import { useState } from "react";
import { useCarrito } from "@/context/CarritoContext";
import { TRANSICION_HOVER } from "@/lib/estilos";

// Links de navegación principal, compartidos entre la versión de escritorio
// y la de móvil para no duplicar la lista.
const ENLACES_NAV = [
  { href: "/", etiqueta: "Inicio" },
  { href: "/catalogo", etiqueta: "Catálogo" },
  { href: "/eventos", etiqueta: "Eventos" },
  { href: "/nosotros", etiqueta: "Nosotros" },
  { href: "/contacto", etiqueta: "Contacto" },
];

// Ícono de carrito/solicitud, SVG inline simple (sin librería de iconos,
// mismo criterio que el resto del sitio).
function IconoCarrito() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

// Indicador flotante de "Mi solicitud": lleva a la página donde el cliente
// revisa los equipos que fue eligiendo desde el catálogo/fichas de detalle
// (ver CarritoContext.tsx) antes de reservarlos juntos. Se muestra siempre
// (incluso vacío, como un carrito de compras normal) para que el cliente
// sepa que la función existe; el contador solo aparece con al menos 1 equipo.
function IndicadorCarrito() {
  const { equipos } = useCarrito();

  return (
    <Link
      href="/mi-solicitud"
      aria-label={`Mi solicitud: ${equipos.length} equipo(s) elegido(s)`}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full text-muted ${TRANSICION_HOVER} hover:text-brand-pink`}
    >
      <IconoCarrito />
      {equipos.length > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange px-1 text-[10px] font-bold text-white">
          {equipos.length}
        </span>
      )}
    </Link>
  );
}

export default function Header() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/90 backdrop-blur">
      {/* Sin "max-w-6xl mx-auto" (a diferencia del resto de las secciones
          del sitio): ese límite de ancho centraba el logo y la navegación
          dentro de una columna angosta, dejándolos con un margen visible
          respecto al borde real de la pantalla en monitores anchos — se
          veía como si el logo estuviera "centrado" en vez de pegado a la
          esquina. Ahora la fila ocupa todo el ancho del header y
          "justify-between" empuja el logo a la izquierda y la navegación
          (o el botón hamburguesa, en móvil) a la derecha, contra los
          bordes reales de la pantalla — el estándar de un header web. */}
      <div className="flex h-16 items-center justify-between px-4 sm:px-8">
        {/* Logo: siempre visible, vuelve al inicio y cierra el menú móvil si
            estaba abierto. Se usa <img> (no next/image) porque es un SVG
            local de confianza: es el patrón más simple, sin tener que
            habilitar SVG en next.config.js. La altura fija (con ancho
            automático) mantiene la proporción original del archivo.
            Tamaño más grande que antes (h-12/h-14 en vez de h-10/h-12): el
            propio arte del logo (audífonos + ecualizador pequeño) apenas se
            distinguía a 40px de alto y se leía como texto plano; a este
            tamaño el ícono y las barritas ya se notan. */}
        <Link href="/" onClick={() => setMenuAbierto(false)}>
          <img src="/logo.svg" alt="JM Publicity Sound" className="h-12 w-auto sm:h-14" />
        </Link>

        {/* Navegación de escritorio: oculta en pantallas chicas (ver botón
            hamburguesa abajo). Hover estandarizado (TRANSICION_HOVER, 300ms,
            ver src/lib/estilos.ts) hacia un rosa cálido, con una línea
            inferior animada (el "after") que crece de 0 a todo el ancho:
            el subrayado opcional que sugiere el diseño de la navegación. */}
        <nav className="hidden items-center gap-8 sm:flex">
          {ENLACES_NAV.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={`relative text-sm font-medium text-muted ${TRANSICION_HOVER} hover:text-brand-pink after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-gradient-to-r after:from-brand-pink after:to-brand-orange after:transition-all after:duration-300 hover:after:w-full`}
            >
              {enlace.etiqueta}
            </Link>
          ))}
          {/* Indicador del carrito de reserva, al final de la navegación de
              escritorio (ver el comentario largo junto a IndicadorCarrito). */}
          <IndicadorCarrito />
        </nav>

        {/* En móvil, el indicador del carrito queda visible SIEMPRE junto al
            hamburguesa (no escondido dentro del panel que se despliega):
            así el cliente ve el contador de un vistazo sin tener que abrir
            el menú. */}
        <div className="flex items-center gap-2 sm:hidden">
          <IndicadorCarrito />

          {/* Botón hamburguesa: solo visible en móvil, alterna el panel de navegación. */}
          <button
            type="button"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5"
          >
            <span
              className={`h-0.5 w-6 bg-foreground transition-transform ${menuAbierto ? "translate-y-2 rotate-45" : ""}`}
            />
            <span className={`h-0.5 w-6 bg-foreground transition-opacity ${menuAbierto ? "opacity-0" : ""}`} />
            <span
              className={`h-0.5 w-6 bg-foreground transition-transform ${menuAbierto ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Panel de navegación móvil: solo se monta cuando el menú está abierto. */}
      {menuAbierto && (
        <nav className="flex flex-col gap-1 border-t border-white/10 bg-background px-4 py-4 sm:hidden">
          {ENLACES_NAV.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              onClick={() => setMenuAbierto(false)}
              className={`rounded-lg px-3 py-2 text-sm font-medium text-muted ${TRANSICION_HOVER} hover:bg-background-surface hover:text-brand-pink`}
            >
              {enlace.etiqueta}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
