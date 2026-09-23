// ==========================================
// Botón flotante de WhatsApp, visible en todo el sitio PÚBLICO (se incluye
// desde src/app/(site)/layout.tsx, que es el layout que agrupa Home,
// catálogo, detalle, reservar, eventos y nosotros — nunca desde el
// layout de /admin/*, así que no aparece en el panel).
//
// Es un <a> normal apuntando a wa.me: no necesita JavaScript ni estado
// (por eso no es "use client"), el navegador ya sabe abrir un enlace en
// una pestaña nueva solo con target="_blank". Fijo en la esquina inferior
// derecha, por encima de todo el contenido, sin importar el scroll.
// ==========================================

import IconoWhatsApp from "@/components/IconoWhatsApp";
import { TRANSICION_HOVER_TRANSFORM } from "@/lib/estilos";

// Número de WhatsApp del negocio en formato internacional (código de país
// "1" de República Dominicana + 8296450922, sin espacios ni signos: es el
// formato exacto que exige la URL de wa.me).
const NUMERO_WHATSAPP_INTERNACIONAL = "18296450922";

// Arma un enlace de wa.me con un mensaje predefinido cualquiera, ya
// codificado como querystring. Se exporta (no queda solo interno de este
// archivo) para que cualquier botón de WhatsApp del sitio con un mensaje
// DISTINTO al de este botón flotante pueda armar su propio enlace sin
// repetir el número suelto — ver, por ejemplo, el botón de "alternativas"
// en la ficha de un equipo no disponible
// (src/app/(site)/catalogo/[id]/page.tsx) o el botón del cuerpo de la
// página de Contacto (src/app/(site)/contacto/page.tsx).
//
// "encodeURIComponent" se aplica UNA sola vez, sobre el mensaje YA
// armado completo (no sobre pedazos sueltos que después se concatenan
// codificados): si algo como un nombre de equipo ya viniera codificado
// antes de interpolarlo en el mensaje, este segundo "encodeURIComponent"
// volvería a codificar esos "%20"/"%C3%B3" ya generados (quedarían como
// "%2520"/"%25C3%25B3"), rompiendo la URL en vez de armarla bien.
export function construirEnlaceWhatsApp(mensaje: string): string {
  return `https://wa.me/${NUMERO_WHATSAPP_INTERNACIONAL}?text=${encodeURIComponent(mensaje)}`;
}

// Mensaje predefinido de este botón flotante (genérico, no depende de
// ningún dato puntual): así el cliente no tiene que escribir desde cero.
export const ENLACE_WHATSAPP = construirEnlaceWhatsApp(
  "Hola, quiero información sobre alquiler de equipos de sonido"
);

export default function BotonWhatsApp() {
  return (
    <a
      href={ENLACE_WHATSAPP}
      target="_blank"
      // "noopener noreferrer": la pestaña nueva no puede acceder a
      // "window.opener" para redirigir esta pestaña original (buena
      // práctica de seguridad estándar para cualquier target="_blank").
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      // "fixed bottom-6 right-6": esquina inferior derecha con 24px de
      // margen, fijo respecto al viewport (no al documento), así que
      // sigue visible sin importar cuánto se scrollee la página.
      // "z-50": mismo nivel que el resto de los elementos que ya flotan
      // por encima de todo en el sitio (el Header fijo, los modales del
      // admin), para no quedar tapado por ningún otro contenido.
      // "whatsapp-pulso" (ver globals.css): el latido lento y sutil que
      // llama la atención sin ser molesto, y que respeta
      // prefers-reduced-motion deteniéndose por completo si el visitante
      // tiene esa preferencia activada.
      // "[clip-path:circle(50%)]": "rounded-full" solo redondea la parte
      // VISUAL del botón — el cuadrado invisible de 56x56 que hay detrás
      // sigue completo a efectos de clics/toques. En un celular, este
      // botón queda fijo en la esquina inferior derecha por encima de
      // TODO el contenido (z-50): al recorrer una página larga (ej. la
      // grilla de publicaciones o el formulario de reserva), ese cuadrado
      // invisible puede terminar tapando la esquina de un botón real (ej.
      // "Reservar este equipo") sin que se note visualmente, robándole el
      // toque aunque el usuario vea el fondo de la página ahí, no el
      // círculo verde. "clip-path" (a diferencia de "border-radius") SÍ
      // recorta también el área de clic/toque, no solo lo que se pinta en
      // pantalla: así solo el círculo verde que el usuario realmente VE
      // sigue siendo clickeable, y las cuatro esquinas invisibles dejan
      // pasar el toque al contenido de abajo.
      className={`whatsapp-pulso fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/40 hover:scale-110 hover:shadow-xl [clip-path:circle(50%)] ${TRANSICION_HOVER_TRANSFORM}`}
    >
      {/* Ícono de WhatsApp: acá SÍ se usa el verde oficial de la marca
          (#25D366, en el fondo del botón) en vez de la paleta
          morado/rosa/naranja del sitio, porque un ícono de WhatsApp en
          otro color deja de ser reconocible de un vistazo. */}
      <IconoWhatsApp className="h-7 w-7" />
    </a>
  );
}
