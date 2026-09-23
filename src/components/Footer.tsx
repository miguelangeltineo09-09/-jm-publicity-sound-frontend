// ==========================================
// Pie de página del sitio.
// Muestra la marca, los datos de contacto REALES (teléfono, email si ya
// está configurado, redes sociales) y el año actual, calculado en cada
// render para no quedar desactualizado.
//
// Sigue sin necesitar interactividad propia (es un Server Component:
// pide los datos al backend antes de renderizar, no tiene estado ni
// manejadores de eventos), pero ahora es "async" porque esos datos
// vienen de la API en vez de estar escritos a mano. Aparece en TODAS las
// páginas públicas (ver src/app/(site)/layout.tsx): si el backend
// estuviera caído justo en ese momento, el resto del sitio no debe
// romperse por esto — se degrada a los valores de respaldo definidos
// abajo en vez de lanzar un error que tumbe la página completa.
// ==========================================

import IconoRedSocial from "@/components/IconoRedSocial";
import { getConfiguracionContacto, getRedesSociales } from "@/lib/api";
import type { ConfiguracionContacto, RedSocial } from "@/types";

// Valores de respaldo: solo se usan si la consulta al backend falla (ej.
// backend momentáneamente caído). No son el mismo placeholder de antes
// ("+52 55 0000 0000", un número mexicano que nunca fue real): son datos
// reales conocidos del negocio, para que ni siquiera en ese caso raro se
// muestre información inventada.
const TELEFONO_RESPALDO = "8296450922";
const MENSAJE_COBERTURA_RESPALDO = "Trabajamos a domicilio en toda República Dominicana";

export default async function Footer() {
  const anioActual = new Date().getFullYear();

  let configuracion: ConfiguracionContacto | null = null;
  let redesSociales: RedSocial[] = [];
  try {
    // No dependen entre sí: se piden en paralelo.
    [configuracion, redesSociales] = await Promise.all([getConfiguracionContacto(), getRedesSociales()]);
  } catch {
    // Se degrada a los valores de respaldo (ver arriba) en vez de dejar
    // que el error tumbe el Footer — y con él, cada página del sitio.
    configuracion = null;
    redesSociales = [];
  }

  const telefono = configuracion?.telefono ?? TELEFONO_RESPALDO;
  const mensajeCobertura = configuracion?.mensajeCobertura ?? MENSAJE_COBERTURA_RESPALDO;

  return (
    <footer className="border-t border-white/10 bg-background-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          {/* Marca y descripción breve del negocio. "Sound" usa el degradado
              de marca (morado -> rosa -> naranja) en vez del acento cian
              anterior, consistente con el resto de la identidad visual. */}
          <div>
            <p className="text-lg font-bold tracking-tight">
              JM Publicity <span className="text-gradient-brand">Sound</span>
            </p>
            <p className="mt-2 max-w-xs text-sm text-muted">
              Alquiler de equipos de sonido, luces y consolas para eventos y DJs.
            </p>
          </div>

          {/* Datos de contacto reales: teléfono con enlace "tel:" (toque
              directo para llamar en un celular), email solo si ya está
              configurado, y mensaje de cobertura. */}
          <div className="text-sm text-muted">
            <p>
              Tel:{" "}
              <a href={`tel:+1${telefono}`} className="hover:text-foreground">
                {telefono}
              </a>
            </p>
            {configuracion?.email && (
              <p>
                <a href={`mailto:${configuracion.email}`} className="hover:text-foreground">
                  {configuracion.email}
                </a>
              </p>
            )}
            <p className="mt-2">{mensajeCobertura}</p>

            {/* Redes sociales: insignias con ícono, enlazadas a la url
                real de cada una (antes era el texto plano "Instagram ·
                Facebook", sin enlazar a ningún lado). Se oculta la fila
                entera si todavía no hay ninguna cargada. */}
            {redesSociales.length > 0 && (
              <div className="mt-3 flex gap-2">
                {redesSociales.map((red) => (
                  <a key={red.id} href={red.url} target="_blank" rel="noopener noreferrer" aria-label={red.nombre}>
                    <IconoRedSocial nombre={red.nombre} className="h-8 w-8" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Línea final con el año dinámico: nunca hay que actualizarlo a mano.
            "pr-16" en móvil: el botón flotante de WhatsApp (BotonWhatsApp.tsx)
            queda fijo en la esquina inferior derecha de la PANTALLA, así que
            cuando el visitante llega al final de la página en un celular, el
            botón termina tapando visualmente el final de este texto (el
            párrafo ocupa el ancho completo y en pantallas angostas el texto
            llega justo hasta ese rincón). Este padding reserva ese espacio
            para que el texto pase a la línea siguiente antes de esa esquina,
            en vez de quedar tapado. Se quita en "sm:" porque desde ahí el
            texto nunca llega tan lejos hacia la derecha. */}
        <p className="mt-8 border-t border-white/10 pt-6 pr-16 text-xs text-muted sm:pr-0">
          © {anioActual} JM Publicity Sound. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
