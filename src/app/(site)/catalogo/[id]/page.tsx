// ==========================================
// Página de detalle de un equipo ("/catalogo/[id]").
// Server Component: pide el equipo puntual al backend usando el id de la
// URL. Si no existe (o el id no es válido), se muestra la 404 de Next.js
// en vez de una página de detalle vacía o rota.
// ==========================================

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BotonAgregarCarrito from "@/components/BotonAgregarCarrito";
import Button from "@/components/Button";
import { construirEnlaceWhatsApp } from "@/components/BotonWhatsApp";
import ErrorMessage from "@/components/ErrorMessage";
import EstrellasCalificacion from "@/components/EstrellasCalificacion";
import FormularioResena from "@/components/FormularioResena";
import IconoWhatsApp from "@/components/IconoWhatsApp";
import ScrollReveal from "@/components/ScrollReveal";
import { ApiError, getEquipoPorId, getResenasDeEquipo } from "@/lib/api";
import { formatearMoneda } from "@/lib/formato";
import type { ResenasDeEquipo } from "@/types";

// Largo máximo de la descripción SEO: los buscadores truncan alrededor
// de los 155-160 caracteres, así que se recorta a mano a ese límite en
// vez de mandar la descripción completa del equipo (que puede ser mucho
// más larga) y dejar que Google la corte de forma menos prolija.
const LARGO_MAXIMO_DESCRIPCION_SEO = 155;

function truncar(texto: string, largoMaximo: number): string {
  if (texto.length <= largoMaximo) return texto;
  return `${texto.slice(0, largoMaximo).trimEnd()}…`;
}

/**
 * SEO dinámica de la ficha de equipo: título y descripción usando el
 * nombre/descripción REAL del equipo (a diferencia del resto de las
 * páginas públicas, que tienen metadata fija) — se consulta el mismo
 * equipo que ya pide el componente de la página, vía generateMetadata()
 * de Next.js. Si el id no es válido o el equipo no existe, se devuelve
 * un objeto vacío: Next.js sigue mostrando la 404 (la decide el propio
 * componente de la página más abajo), sin un título/descripción SEO que
 * no correspondería a una página que en realidad no existe.
 */
export async function generateMetadata({ params }: PageProps<"/catalogo/[id]">): Promise<Metadata> {
  const { id } = await params;
  const equipoId = Number(id);

  if (!Number.isInteger(equipoId)) {
    return {};
  }

  try {
    const equipo = await getEquipoPorId(equipoId);
    return {
      title: `Alquiler de ${equipo.nombre}`,
      description: truncar(
        equipo.descripcion.trim() ||
          `Alquila ${equipo.nombre} para tu evento en República Dominicana. Cotiza tu solicitud hoy mismo.`,
        LARGO_MAXIMO_DESCRIPCION_SEO
      ),
    };
  } catch {
    return {};
  }
}

// "createdAt" de una reseña es un instante real (cuándo se envió): se
// muestra en la hora local del navegador, sin forzar UTC.
function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Ícono de check para cada ítem de "Incluye:", SVG inline simple (sin
// depender de ninguna librería de iconos, mismo criterio que el resto del
// sitio) en un tono cálido de la paleta (naranja), para diferenciarse del
// morado/rosa que ya predomina en el resto de la ficha del equipo.
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
      className="h-4 w-4 shrink-0 text-brand-orange"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

// Delay (ms) entre la aparición de cada reseña de la lista: una tras
// otra, mismo criterio que el resto de las listas del sitio.
const DELAY_ESCALONADO_RESENAS_MS = 100;

export default async function DetalleEquipoPage({ params }: PageProps<"/catalogo/[id]">) {
  const { id } = await params;
  const equipoId = Number(id);

  if (!Number.isInteger(equipoId)) {
    notFound();
  }

  let equipo;
  try {
    equipo = await getEquipoPorId(equipoId);
  } catch (err) {
    // 404 real del backend (el equipo no existe): se traduce a la 404 de Next.
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    // Cualquier otro fallo (ej. backend caído) se muestra como error, sin
    // romper la página con la pantalla de error genérica de Next.
    const mensaje = err instanceof Error ? err.message : "No se pudo cargar el equipo.";
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <ErrorMessage message={mensaje} />
      </div>
    );
  }

  const disponible = equipo.disponibleParaAlquiler;

  // Mensaje predefinido del botón de WhatsApp que aparece más abajo SOLO
  // si el equipo no está disponible: se arma con el nombre REAL de este
  // equipo puntual ya interpolado en el texto (comillas simples
  // alrededor, igual que lo pediría un cliente escribiendo a mano), y
  // recién ESE mensaje completo se codifica una sola vez dentro de
  // construirEnlaceWhatsApp (ver el comentario largo en
  // BotonWhatsApp.tsx sobre por qué no hay que codificar el nombre por
  // separado): así los espacios, tildes y demás caracteres especiales
  // del nombre del equipo (ej. "Consola Yamaha MG16 con Ecualizador")
  // quedan bien codificados en la URL final, sin doble-codificar nada.
  const enlaceWhatsAppAlternativas = construirEnlaceWhatsApp(
    `Hola, quiero preguntar por alternativas al equipo '${equipo.nombre}', vi que no está disponible.`
  );

  // Las reseñas son secundarias respecto al equipo: si esta consulta
  // falla (ej. backend momentáneamente lento), no tiene sentido tirar
  // abajo toda la ficha del equipo por eso — se degrada a "sin reseñas
  // cargadas" en vez de romper la página completa.
  let resenasDeEquipo: ResenasDeEquipo | null = null;
  try {
    resenasDeEquipo = await getResenasDeEquipo(equipoId);
  } catch {
    resenasDeEquipo = null;
  }

  return (
    // "px-4 sm:px-6" (antes "px-6" fijo): más espacio útil en un celular
    // angosto para la imagen, la ficha del equipo y las reseñas; desde
    // "sm" queda igual que antes.
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <Link href="/catalogo" className="mb-6 inline-block text-sm text-muted hover:text-foreground">
        ← Volver al catálogo
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Imagen grande del equipo (o placeholder si aún no tiene foto). */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-background-surface">
          {equipo.imagenUrl ? (
            <Image
              src={equipo.imagenUrl}
              alt={equipo.nombre}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">Sin imagen</div>
          )}
        </div>

        {/* Información del equipo: tarjeta en el tono "surface" (morado
            oscuro secundario), igual que el resto de las superficies
            elevadas del sitio, en vez de quedar sobre el fondo plano. */}
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-background-surface p-6 sm:p-8">
          <span className="text-sm font-medium uppercase tracking-wide text-brand-purple-light">
            {equipo.categoria.nombre}
          </span>
          <h1 className="text-3xl font-bold tracking-tight">{equipo.nombre}</h1>
          {/* Precio en degradado de marca, igual tratamiento que EquipoCard. */}
          <p className="text-gradient-brand text-2xl font-bold">{formatearMoneda(Number(equipo.precio))}</p>
          <p className="leading-relaxed text-muted">{equipo.descripcion}</p>

          {/* Según disponibilidad general del equipo: botones de reserva,
              o el aviso de no disponibilidad JUNTO A un botón de WhatsApp
              — antes el aviso se mostraba solo, sin ninguna alternativa
              real para el cliente, que se quedaba sin poder hacer nada
              más en esta página. El aviso en tono ámbar se mantiene
              (sigue siendo cierto que este equipo puntual no se puede
              reservar), pero ahora al lado hay una acción concreta:
              preguntar por alternativas directo por WhatsApp, con el
              nombre de ESTE equipo ya incluido en el mensaje para que el
              negocio sepa de entrada qué buscaba el cliente sin tener que
              volver a preguntarlo.

              Cuando SÍ está disponible, hay DOS botones (antes solo uno):
              "Solicitar cotización/reserva" sigue siendo el atajo directo
              de un solo equipo (agrega este equipo al carrito y lleva
              directo a "/reservar", ver ese archivo), y "Agregar a mi
              solicitud" (BotonAgregarCarrito.tsx, Client Component) suma
              este equipo al carrito SIN navegar, para poder seguir
              eligiendo más equipos del catálogo antes de reservar. */}
          {disponible ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button href={`/catalogo/${equipo.id}/reservar`} className="w-fit">
                Solicitar cotización/reserva
              </Button>
              <BotonAgregarCarrito equipo={equipo} />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <div
                role="alert"
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
              >
                Este equipo no está disponible actualmente para alquiler.
              </div>

              {/* Mismo estilo "primary" (degradado de marca) que el botón
                  de reserva de arriba, en vez del verde de WhatsApp del
                  botón flotante: en esta ficha ya hay un botón ámbar y
                  contenido morado/rosa alrededor, y mantener el MISMO
                  lenguaje visual de botón que el resto de la página se
                  ve más integrado que introducir un tercer color (verde)
                  puntual — el ícono de WhatsApp al lado del texto ya
                  identifica de sobra el canal, sin necesitar además el
                  color de marca de WhatsApp. */}
              <Button href={enlaceWhatsAppAlternativas} target="_blank" rel="noopener noreferrer" className="w-fit gap-2">
                <IconoWhatsApp className="h-4 w-4" />
                Preguntar por alternativas
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* --- "Incluye:": lista de ítems incluidos en el alquiler de este
          equipo (ej. "4 monitores", "1 planta eléctrica"), en el orden
          que definió el admin. Si el equipo todavía no tiene ningún ítem
          cargado, la sección entera no se dibuja (evita un título
          "Incluye:" seguido de una lista vacía sin sentido). --- */}
      {equipo.itemsIncluidos && equipo.itemsIncluidos.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-bold tracking-tight">Incluye:</h2>
          <ul className="flex flex-col gap-2">
            {equipo.itemsIncluidos.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-muted">
                <IconoCheck />
                <span>{item.descripcion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Reseñas de clientes ---
          Debajo de la info principal del equipo: promedio general +
          estrellas, lista de reseñas aprobadas (o el mensaje de "sé el
          primero" si todavía no hay ninguna), y el formulario para dejar
          una reseña nueva. */}
      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Reseñas de clientes</h2>

        {resenasDeEquipo && resenasDeEquipo.total > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <EstrellasCalificacion valor={resenasDeEquipo.promedio} />
            <span className="text-lg font-semibold">{resenasDeEquipo.promedio.toFixed(1)} de 5</span>
            <span className="text-sm text-muted">
              basado en {resenasDeEquipo.total} {resenasDeEquipo.total === 1 ? "reseña" : "reseñas"}
            </span>
          </div>
        )}

        <div className="grid gap-10 md:grid-cols-2">
          {/* Lista de reseñas aprobadas, o el mensaje de "sé el primero"
              cuando todavía no hay ninguna — nunca una sección vacía sin
              contexto. */}
          <div className="flex flex-col gap-4">
            {!resenasDeEquipo || resenasDeEquipo.total === 0 ? (
              <p className="text-muted">
                Este equipo todavía no tiene reseñas. Sé el primero en dejar una reseña de este equipo.
              </p>
            ) : (
              resenasDeEquipo.resenas.map((resena, indice) => (
                <ScrollReveal key={resena.id} delay={indice * DELAY_ESCALONADO_RESENAS_MS}>
                  <div className="rounded-xl border border-white/10 bg-background-surface p-4">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{resena.nombreCliente}</span>
                      <span className="text-xs text-muted">{formatearFecha(resena.createdAt)}</span>
                    </div>
                    <EstrellasCalificacion valor={resena.calificacion} tamanoTexto="text-lg" />
                    {resena.comentario && <p className="mt-2 text-sm leading-relaxed text-muted">{resena.comentario}</p>}
                  </div>
                </ScrollReveal>
              ))
            )}
          </div>

          {/* Formulario para dejar una reseña nueva, siempre visible junto
              a la lista (no solo cuando está vacía). */}
          <FormularioResena equipoId={equipo.id} />
        </div>
      </section>
    </div>
  );
}
