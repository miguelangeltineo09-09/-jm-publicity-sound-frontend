// ==========================================
// Página de Contacto ("/contacto").
// Server Component: pide la configuración de contacto y las redes
// sociales al backend antes de enviar el HTML (primera carga sin
// spinner), mismo criterio que el resto de las páginas públicas.
//
// Vive dentro del route group "(site)" (src/app/(site)/contacto/) — NO
// directamente en src/app/contacto/ — para heredar el Header, el Footer
// y el botón flotante de WhatsApp que ya aplica ese layout a todas las
// páginas públicas (ver src/app/(site)/layout.tsx); una página fuera de
// ese grupo solo heredaría el layout raíz, sin ninguno de esos tres.
// ==========================================

import type { Metadata } from "next";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import { ENLACE_WHATSAPP } from "@/components/BotonWhatsApp";
import IconoRedSocial from "@/components/IconoRedSocial";
import IconoWhatsApp from "@/components/IconoWhatsApp";
import ScrollReveal from "@/components/ScrollReveal";
import { getConfiguracionContacto, getRedesSociales } from "@/lib/api";
import type { ConfiguracionContacto, RedSocial } from "@/types";

// SEO: título/descripción propios de la página de Contacto.
export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Llama o escríbenos por WhatsApp para cotizar el alquiler de equipos de sonido, luces y consolas para tu evento en República Dominicana.",
};

// Ícono de teléfono simple, SVG inline (mismo criterio que el resto del
// sitio: sin librería de iconos).
function IconoTelefono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
      <path d="M3 5a2 2 0 0 1 2-2h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 12l5 2v3a2 2 0 0 1-2 2h-1C9.163 19 5 14.837 5 9V8" />
    </svg>
  );
}

function IconoEmail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function IconoReloj() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function IconoMapa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
      <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}


export default async function ContactoPage() {
  // Tipados explícitamente (en vez de "let configuracion;" sin anotar):
  // así, más abajo, el "return" temprano en caso de error deja que
  // TypeScript sepa con certeza que "configuracion" ya no puede ser
  // "null" en el resto de la función — la variante sin tipo ni valor
  // inicial no permite esa inferencia entre dos variables distintas
  // (el "error" y el "configuracion" no están relacionados para TS).
  let configuracion: ConfiguracionContacto | null = null;
  let redesSociales: RedSocial[] = [];
  let error: string | null = null;

  try {
    // No dependen entre sí: se piden en paralelo.
    [configuracion, redesSociales] = await Promise.all([getConfiguracionContacto(), getRedesSociales()]);
  } catch (err) {
    error = err instanceof Error ? err.message : "No se pudo cargar la información de contacto.";
  }

  // A diferencia de otras páginas (ej. el adelanto de publicaciones del
  // Home), esta información NO es decorativa: es el contenido central de
  // la página, así que si falla la consulta se muestra el error en vez
  // de ocultar la sección o mostrar una página vacía.
  if (error || !configuracion) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <ScrollReveal>
          <h1 className="text-gradient-brand text-center text-3xl font-bold tracking-tight sm:text-4xl">Contacto</h1>
        </ScrollReveal>
        <div className="mt-10">
          <ErrorMessage message={error ?? "No se pudo cargar la información de contacto."} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ScrollReveal>
        <h1 className="text-gradient-brand text-center text-3xl font-bold tracking-tight sm:text-4xl">Contacto</h1>
        <p className="mt-2 text-center text-muted">
          Escríbenos o llámanos, con gusto te ayudamos a cotizar tu evento.
        </p>
      </ScrollReveal>

      {/* --- Tarjeta principal de información: mismo tono "surface"
          (morado oscuro secundario) que el resto de las superficies
          elevadas del sitio (Home, Nosotros, detalle de equipo). --- */}
      <ScrollReveal delay={150}>
        <div className="mt-10 flex flex-col gap-6 rounded-2xl border border-white/10 bg-background-surface p-6 sm:p-8">
          {/* Teléfono: enlace "tel:" para que en un celular se pueda
              llamar directo con un toque, en vez de solo mostrar el
              número como texto plano. */}
          <a
            href={`tel:+1${configuracion.telefono}`}
            className="flex items-center gap-3 text-foreground transition-colors duration-300 hover:text-brand-pink"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white">
              <IconoTelefono />
            </span>
            <span className="font-medium">{configuracion.telefono}</span>
          </a>

          {/* Email: solo se muestra si ya está configurado (ver el
              comentario en schema.prisma/ConfiguracionContactoForm.tsx
              sobre por qué puede faltar por ahora). */}
          {configuracion.email && (
            <a
              href={`mailto:${configuracion.email}`}
              className="flex items-center gap-3 text-foreground transition-colors duration-300 hover:text-brand-pink"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white">
                <IconoEmail />
              </span>
              <span className="font-medium">{configuracion.email}</span>
            </a>
          )}

          <div className="flex items-center gap-3 text-foreground">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white">
              <IconoReloj />
            </span>
            <span>{configuracion.horarioAtencion}</span>
          </div>

          <div className="flex items-center gap-3 text-foreground">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white">
              <IconoMapa />
            </span>
            <span>{configuracion.mensajeCobertura}</span>
          </div>

          {/* Botón de WhatsApp en el CUERPO de la página (además del
              flotante de todo el sitio): mismo enlace exacto que
              BotonWhatsApp.tsx, reutilizado vía ENLACE_WHATSAPP en vez de
              duplicar el número/mensaje codificado. "target"/"rel": es un
              enlace externo (wa.me), debe abrir en una pestaña nueva en
              vez de navegar fuera del sitio en la misma pestaña — recién
              agregado a Button.tsx como prop (antes el componente los
              ignoraba en su rama de <Link>, un descuido que este mismo
              botón tenía desde que se creó). */}
          <Button href={ENLACE_WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-2 w-fit gap-2">
            <IconoWhatsApp />
            Escríbenos por WhatsApp
          </Button>
        </div>
      </ScrollReveal>

      {/* --- Redes sociales: solo se muestra si hay alguna cargada --- */}
      {redesSociales.length > 0 && (
        <ScrollReveal delay={300}>
          <div className="mt-10 text-center">
            <h2 className="mb-4 text-lg font-semibold">Síguenos</h2>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {redesSociales.map((red) => (
                <a
                  key={red.id}
                  href={red.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={red.nombre}
                  className="flex flex-col items-center gap-2 text-sm text-muted transition-colors duration-300 hover:text-foreground"
                >
                  <IconoRedSocial nombre={red.nombre} className="h-12 w-12" />
                  {red.nombre}
                </a>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
