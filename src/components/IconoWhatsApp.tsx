// ==========================================
// Ícono de WhatsApp (SVG inline, sin depender de ninguna librería de
// iconos, mismo criterio que el resto del sitio). Se centraliza acá
// (antes vivía duplicado en BotonWhatsApp.tsx y en la página de
// Contacto) porque, con el botón nuevo de "alternativas" en la ficha de
// un equipo no disponible, ya son TRES lugares distintos usando
// exactamente el mismo trazado — a partir de ahí conviene un solo
// componente en vez de repetir el mismo path SVG largo en cada archivo.
// ==========================================

interface IconoWhatsAppProps {
  className?: string;
}

export default function IconoWhatsApp({ className = "h-5 w-5" }: IconoWhatsAppProps) {
  return (
    <svg viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M380.9 97.1C339 55.1 283.2 32 224.1 32c-122.8 0-222.7 99.9-222.7 222.7 0 39.3 10.3 77.7 29.8 111.4L1.1 480l115.2-30.3c32.3 17.6 68.6 26.9 105.6 26.9h.1c122.8 0 222.7-99.9 222.7-222.7 0-59.1-23.1-114.6-65.1-156.6zM224.1 438.1c-32.3 0-64-8.7-91.6-25.1l-6.6-3.9-68.1 17.9 18.2-66.4-4.3-6.8c-18-28.6-27.5-61.7-27.5-95.5 0-99.1 80.7-179.8 179.9-179.8 48.1 0 93.3 18.7 127.3 52.7s52.7 79.2 52.7 127.3c0 99.1-80.7 179.8-179.8 179.8zm102.9-134.5c-5.6-2.8-33.3-16.4-38.5-18.3-5.2-1.9-8.9-2.8-12.7 2.8-3.8 5.6-14.5 18.3-17.8 22-3.3 3.7-6.6 4.2-12.2 1.4-32.9-16.4-54.4-29.3-76-66.4-5.7-9.8 5.7-9.1 16.4-30.3 1.8-3.7 .9-6.9-.9-9.7-1.8-2.8-8.9-21.5-12.2-29.4-3.3-7.9-6.6-6.8-9-6.9-2.4-.1-5.2-.1-8-.1-2.8 0-7.3 1-11.1 5.1-3.8 4.1-14.7 14.4-14.7 35.1 0 20.7 15 40.7 17.1 43.5 2.1 2.8 29.1 44.4 70.5 60.4 41.4 16 41.4 10.7 55.1 10 13.7-.7 44.4-18.1 50.6-35.6 6.2-17.5 6.2-32.5 4.3-35.6-1.9-3.1-5.6-4.4-11.2-7.2z" />
    </svg>
  );
}
