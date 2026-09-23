// ==========================================
// Botón reutilizable de la marca.
// Si recibe "href" se renderiza como Link de Next (navegación interna);
// si no, como <button> normal (para acciones como enviar un formulario).
// Tres variantes: "primary" (degradado morado->rosa->naranja de marca),
// "secondary" (contorno morado claro) y "danger" (rojo, para confirmar
// acciones destructivas como eliminar).
// ==========================================

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { TRANSICION_HOVER_COMPLETA } from "@/lib/estilos";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
  // Si se define, el botón navega a esta ruta en vez de disparar un evento.
  href?: string;
  // Solo tienen efecto junto con "href" (se ignoran en el <button> normal,
  // que no navega a ningún lado): "target"/"rel" no son atributos válidos
  // de un <button> (por eso no vienen ya incluidos en
  // ButtonHTMLAttributes<HTMLButtonElement>, la interfaz de la que
  // extiende este componente), hay que declararlos a mano para poder usar
  // este mismo componente en enlaces EXTERNOS (ej. wa.me) que deben abrir
  // en una pestaña nueva en vez de navegar fuera del sitio en la misma pestaña.
  target?: string;
  rel?: string;
}

// Estilos base compartidos por las tres variantes (forma tipo píldora,
// tipografía, transición). Usa TRANSICION_HOVER_COMPLETA (el "hover
// interactivo estándar" del sitio, ver src/lib/estilos.ts) porque la
// variante primaria anima "transform" y "opacity" además de color, no
// solo colores.
const ESTILOS_BASE = `inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold ${TRANSICION_HOVER_COMPLETA} disabled:cursor-not-allowed disabled:opacity-50`;

const ESTILOS_POR_VARIANTE: Record<ButtonVariant, string> = {
  // Variante principal: degradado de marca (morado -> rosa -> naranja), la
  // acción más importante de la pantalla. El hover es sutil a propósito
  // (leve escala + opacidad): sigue siendo el mismo degradado, no cambia de
  // color, solo se "levanta" un poco al pasar el cursor.
  primary: "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white hover:scale-[1.02] hover:opacity-90",
  // Variante secundaria: solo contorno, para acciones de menor jerarquía.
  // Morado claro en vez del cian anterior, legible sobre el fondo oscuro
  // sin competir visualmente con el degradado de la variante primaria.
  secondary: "border border-brand-purple-light text-brand-purple-light hover:bg-brand-purple/10",
  // Variante de peligro: para confirmar una acción destructiva (eliminar).
  danger: "bg-red-500 text-white hover:bg-red-600",
};

export default function Button({
  variant = "primary",
  children,
  className = "",
  href,
  target,
  rel,
  ...props
}: ButtonProps) {
  const clases = `${ESTILOS_BASE} ${ESTILOS_POR_VARIANTE[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={clases} target={target} rel={rel}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={clases} {...props}>
      {children}
    </button>
  );
}
