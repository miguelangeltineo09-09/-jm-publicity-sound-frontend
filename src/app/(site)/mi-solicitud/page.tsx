// ==========================================
// Página "Mi solicitud" ("/mi-solicitud").
// Revisión del carrito de reserva (ver CarritoContext.tsx): el cliente ve
// los equipos que fue eligiendo desde el catálogo y las fichas de detalle,
// puede quitar alguno, y desde acá continúa a "/reservar" para completar
// la fecha y sus datos de contacto.
//
// Es Client Component (no puede ser Server Component como el resto de las
// páginas públicas simples): el carrito vive en memoria del navegador
// (Context + localStorage), no en el backend, así que solo existe del lado
// del cliente.
// ==========================================

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useCarrito } from "@/context/CarritoContext";
import { formatearMoneda } from "@/lib/formato";

export default function MiSolicitudPage() {
  const router = useRouter();
  const { equipos, cargandoCarrito, quitarEquipo } = useCarrito();

  // Subtotal de equipos: NO es el total final (falta el costo de viaje,
  // que depende de la provincia del evento — un dato que todavía no se
  // pide en esta pantalla, se pide en "/reservar"). Se muestra como
  // referencia rápida, con la nota de abajo aclarando que falta el viaje.
  const subtotalEquipos = equipos.reduce((suma, equipo) => suma + Number(equipo.precio), 0);

  if (cargandoCarrito) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <LoadingSpinner label="Cargando tu solicitud..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/catalogo" className="mb-6 inline-block text-sm text-muted hover:text-foreground">
        ← Seguir viendo el catálogo
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">Mi solicitud</h1>
      <p className="mt-2 text-muted">
        Estos son los equipos que elegiste para tu evento. Podés reservarlos juntos, en una sola
        solicitud, para la misma fecha y horario.
      </p>

      {/* --- Carrito vacío: invita a volver al catálogo --- */}
      {equipos.length === 0 ? (
        <div className="mt-10 rounded-xl border border-white/10 bg-background-surface p-8 text-center">
          <p className="text-muted">Todavía no agregaste ningún equipo a tu solicitud.</p>
          <Button href="/catalogo" className="mt-4">
            Ver catálogo
          </Button>
        </div>
      ) : (
        <>
          {/* --- Lista de equipos elegidos, con botón para quitar cada uno --- */}
          <div className="mt-8 flex flex-col gap-3">
            {equipos.map((equipo) => (
              <div
                key={equipo.id}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-background-surface p-4"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background">
                  {equipo.imagenUrl ? (
                    <Image src={equipo.imagenUrl} alt={equipo.nombre} fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-muted">Sin imagen</div>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wide text-brand-purple-light">
                    {equipo.categoria.nombre}
                  </p>
                  <h3 className="font-semibold">{equipo.nombre}</h3>
                  <p className="text-sm text-muted">{formatearMoneda(Number(equipo.precio))}</p>
                </div>

                <button
                  type="button"
                  onClick={() => quitarEquipo(equipo.id)}
                  className="shrink-0 text-sm text-red-300 hover:text-red-400"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          {/* --- Subtotal + aviso de que el viaje se agrega en el siguiente paso --- */}
          <div className="mt-6 rounded-xl border border-white/10 bg-background-surface p-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Subtotal de equipos</span>
              <span className="text-gradient-brand text-lg font-bold">{formatearMoneda(subtotalEquipos)}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              El costo de viaje se calcula en el siguiente paso, según la provincia de tu evento.
            </p>
          </div>

          <Button onClick={() => router.push("/reservar")} className="mt-6 w-full sm:w-fit">
            Continuar a reservar
          </Button>
        </>
      )}
    </div>
  );
}
