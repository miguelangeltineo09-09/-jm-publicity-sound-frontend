// ==========================================
// Página de solicitud de reserva ("/reservar"), generalizada para trabajar
// sobre el carrito de reserva (ver CarritoContext.tsx) en vez de un único
// equipo fijo en la URL.
//
// CAMBIO DE RELACIÓN CLAVE: esta página reemplaza a la anterior
// "/catalogo/[id]/reservar" como el destino real del formulario — esa
// ruta anterior sigue existiendo, pero ahora es solo un ATAJO que agrega
// ESE equipo puntual al carrito y redirige acá (ver
// src/app/(site)/catalogo/[id]/reservar/page.tsx), para no romper los
// enlaces "Reservar este equipo" que ya existían en TarjetaPublicacion.tsx
// y en la ficha de detalle del equipo.
//
// Es Client Component (no Server Component, a diferencia de la página
// anterior): el carrito vive en memoria del navegador, así que la lista de
// equipos a reservar solo se conoce del lado del cliente.
// ==========================================

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/Button";
import FormularioReserva from "@/components/FormularioReserva";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useCarrito } from "@/context/CarritoContext";
import { formatearMoneda } from "@/lib/formato";

export default function ReservarPage() {
  const { equipos, cargandoCarrito } = useCarrito();

  // FormularioReserva vacía el carrito al enviar con éxito (para que el
  // indicador del Header deje de contar estos equipos); sin este flag, el
  // chequeo de "carrito vacío" de más abajo reemplazaría la pantalla de
  // "¡Solicitud enviada!" por el aviso de "no hay nada que reservar" antes
  // de que el cliente llegue a verla. Ver el comentario de "onExito" en
  // FormularioReserva.tsx.
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  if (cargandoCarrito) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <LoadingSpinner label="Cargando tu solicitud..." />
      </div>
    );
  }

  // Sin equipos elegidos no hay nada que reservar: se manda de vuelta a
  // "Mi solicitud" (que a su vez enlaza al catálogo) en vez de mostrar un
  // formulario vacío sin sentido. Salvo que el carrito esté vacío PORQUE
  // la solicitud ya se envió con éxito (ver "solicitudEnviada" arriba).
  if (equipos.length === 0 && !solicitudEnviada) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Tu solicitud está vacía</h1>
        <p className="mt-3 text-muted">
          Todavía no elegiste ningún equipo. Agrega equipos desde el catálogo para poder reservarlos.
        </p>
        <Button href="/catalogo" className="mt-6">
          Ver catálogo
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      {/* El link "Volver" y la tarjeta de contexto de equipos no tienen
          sentido una vez enviada la solicitud (el carrito ya está vacío,
          ver "solicitudEnviada" arriba): se ocultan para que solo quede
          visible la confirmación de FormularioReserva. */}
      {!solicitudEnviada && (
        <>
          <Link href="/mi-solicitud" className="mb-6 inline-block text-sm text-muted hover:text-foreground">
            ← Volver a mi solicitud
          </Link>

          {/* Contexto de TODOS los equipos que se están reservando (antes
              era una sola tarjeta con un único equipo fijo). */}
          <div className="mb-10 flex flex-col gap-3">
            {equipos.map((equipo) => (
              <div key={equipo.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-background-surface p-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background">
                  {equipo.imagenUrl ? (
                    <Image src={equipo.imagenUrl} alt={equipo.nombre} fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-muted">Sin imagen</div>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-brand-purple-light">{equipo.categoria.nombre}</p>
                  <h1 className="font-semibold">{equipo.nombre}</h1>
                  <p className="text-sm text-muted">{formatearMoneda(Number(equipo.precio))}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <FormularioReserva equipos={equipos} onExito={() => setSolicitudEnviada(true)} />
    </div>
  );
}
