// ==========================================
// Atajo "Reservar este equipo" ("/catalogo/[id]/reservar").
//
// CAMBIO DE RELACIÓN CLAVE: esta ruta ANTES era la página real del
// formulario de reserva (con el calendario y los datos de contacto de UN
// equipo fijo). Ahora que una reserva puede incluir varios equipos, ese
// formulario vive en "/reservar" (ver src/app/(site)/reservar/page.tsx) y
// trabaja sobre el carrito de reserva (CarritoContext.tsx) en vez de un
// equipo fijo en la URL.
//
// Esta ruta se conserva como un ATAJO de un solo clic: agrega ESE equipo
// puntual al carrito y redirige de inmediato a "/reservar" — así los
// enlaces "Reservar este equipo" que ya existían (TarjetaPublicacion.tsx
// en la galería de eventos, y el botón "Solicitar cotización/reserva" de
// la ficha de detalle) siguen funcionando exactamente igual para el
// visitante, sin tener que tocar esos otros archivos.
//
// Es Client Component (antes era Server Component): agregar al carrito es
// una operación de memoria del navegador (Context + localStorage), así
// que no se puede hacer desde el servidor.
// ==========================================

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useCarrito } from "@/context/CarritoContext";
import { ApiError, getEquipoPorId } from "@/lib/api";

export default function AtajoReservarEquipoPage() {
  const router = useRouter();
  // useParams() (no la prop "params", que en Server Components llega como
  // Promise): es la forma soportada de leer segmentos dinámicos de la URL
  // desde un Client Component, sin tener que desenvolver una Promise con
  // el hook use() solo para esto.
  const params = useParams<{ id: string }>();
  const { agregarEquipo } = useCarrito();
  const [error, setError] = useState<string | null>(null);

  // Evita agregar el equipo dos veces si el efecto se re-ejecuta (ej. en
  // desarrollo, con el doble-montaje de Strict Mode: React monta, limpia y
  // vuelve a montar el MISMO componente para detectar efectos no
  // idempotentes, sin perder refs/estado entre esas dos pasadas).
  //
  // IMPORTANTE: a propósito NO hay un flag "cancelado" que la función de
  // limpieza del efecto ponga en true (el patrón habitual para descartar
  // una respuesta si el componente se desmonta a mitad de un fetch). Ese
  // patrón, combinado con el doble-montaje de Strict Mode, rompía este
  // atajo: la limpieza de la PRIMERA pasada se ejecuta de forma SÍNCRONA
  // apenas arranca la segunda pasada, mucho antes de que el fetch de
  // getEquipoPorId() (asíncrono) llegue a resolver — así que para cuando
  // la respuesta llegaba, "cancelado" ya estaba en true y la función
  // salía sin agregar el equipo ni redirigir, dejando la página trabada
  // en "Agregando equipo a tu solicitud...". El ref "yaProcesado" ya
  // garantiza que el fetch se dispare una sola vez de verdad; llamar a
  // agregarEquipo()/router.replace() después de un desmontaje real (el
  // único caso que el flag "cancelado" quería evitar) es inofensivo acá,
  // no un memory leak ni un warning en React 18.
  const yaProcesado = useRef(false);

  useEffect(() => {
    if (yaProcesado.current) return;
    yaProcesado.current = true;

    async function agregarYRedirigir() {
      const equipoId = Number(params.id);

      if (!Number.isInteger(equipoId)) {
        setError("El equipo indicado no es válido.");
        return;
      }

      try {
        const equipo = await getEquipoPorId(equipoId);

        // Un equipo no disponible no debería agregarse a una solicitud de
        // reserva: se manda de vuelta a su ficha, que ya explica por qué
        // no se puede reservar (mismo criterio que antes tenía esta página).
        if (!equipo.disponibleParaAlquiler) {
          router.replace(`/catalogo/${equipo.id}`);
          return;
        }

        agregarEquipo(equipo);
        router.replace("/reservar");
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError("Ese equipo no existe.");
        } else {
          setError(err instanceof Error ? err.message : "No se pudo agregar el equipo a tu solicitud.");
        }
      }
    }

    agregarYRedirigir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router, agregarEquipo]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      {error ? <ErrorMessage message={error} /> : <LoadingSpinner label="Agregando equipo a tu solicitud..." />}
    </div>
  );
}
