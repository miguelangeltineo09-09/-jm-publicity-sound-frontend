// ==========================================
// Insignia circular con el ícono de una red social, reutilizada en el
// Footer y en la página pública de Contacto.
//
// Reconoce por nombre (sin distinguir mayúsculas/acentos) las redes más
// comunes del negocio (Instagram, Facebook, TikTok) y les dibuja un
// glifo simple y reconocible con el color de marca de esa red. Para
// cualquier otro nombre (el admin puede agregar cualquier red desde el
// panel) se usa una insignia neutra con un ícono genérico de enlace, en
// vez de no mostrar nada o mostrar una insignia vacía.
//
// No se usa ninguna librería de iconos (mismo criterio que el resto del
// sitio): los glifos de Facebook/TikTok se dibujan con texto (la letra
// "f" y el símbolo "♪") en vez de un path SVG de la marca real, para no
// tener que reproducir de memoria el trazado exacto del logo — sigue
// siendo inmediatamente reconocible sobre el color de marca correcto.
// ==========================================

import type { ReactNode } from "react";

interface IconoRedSocialProps {
  nombre: string;
  // Clases del contenedor circular (tamaño, márgenes, etc.): cada lugar
  // que usa este componente pasa el tamaño que le conviene (ej. más chico
  // en el Footer, más grande en la página de Contacto).
  className?: string;
}

// Glifo de cámara simple (rectángulo redondeado + círculo del lente):
// no es el trazado exacto del logo de Instagram, pero con el degradado
// de marca de fondo es inmediatamente reconocible como tal.
function GlifoInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Ícono genérico de enlace (dos círculos superpuestos, como una cadena),
// para cualquier red que no se reconozca por nombre.
function GlifoEnlaceGenerico() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true" className="h-5 w-5">
      <circle cx="9" cy="12" r="4" />
      <circle cx="15" cy="12" r="4" />
    </svg>
  );
}

// Nombres reconocidos, normalizados (minúsculas, sin espacios) -> color
// de fondo de marca + contenido del glifo. Se busca con "includes" (no
// igualdad exacta) para que "Instagram", "instagram oficial" o similar
// también matcheen.
const REDES_RECONOCIDAS: { clave: string; colorFondo: string; contenido: ReactNode }[] = [
  { clave: "instagram", colorFondo: "bg-gradient-to-br from-brand-purple via-brand-pink to-brand-orange", contenido: <GlifoInstagram /> },
  { clave: "facebook", colorFondo: "bg-[#1877F2]", contenido: <span className="text-lg font-bold leading-none">f</span> },
  { clave: "tiktok", colorFondo: "bg-black", contenido: <span className="text-base leading-none">♪</span> },
];

export default function IconoRedSocial({ nombre, className = "h-9 w-9" }: IconoRedSocialProps) {
  const nombreNormalizado = nombre.trim().toLowerCase();
  const reconocida = REDES_RECONOCIDAS.find((red) => nombreNormalizado.includes(red.clave));

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-white ${
        reconocida ? reconocida.colorFondo : "border border-white/20 bg-background-surface text-muted"
      } ${className}`}
    >
      {reconocida ? reconocida.contenido : <GlifoEnlaceGenerico />}
    </span>
  );
}
