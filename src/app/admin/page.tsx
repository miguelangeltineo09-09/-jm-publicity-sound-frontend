// ==========================================
// Dashboard del admin ("/admin").
//
// Es Client Component (a diferencia de la versión anterior, que era un
// Server Component): "Reservas pendientes"/"Reseñas pendientes" necesitan
// endpoints PROTEGIDOS, y el token de sesión solo existe en el navegador
// (localStorage vía AuthContext) — no hay forma de leerlo en el servidor.
// Como ya no se puede fetchear todo en el servidor, se unifica todo el
// fetch de estadísticas acá, en el cliente, tras montar el componente.
// ==========================================

"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { getCategorias, getEquipos, getReservasCalendario, getResenas, getReservas } from "@/lib/api";

// Ícono de calendario, SVG inline simple (sin librería de iconos, mismo
// criterio que IconoAlerta más abajo), para la tarjeta de acceso directo
// al calendario mensual de reservas confirmadas.
function IconoCalendario() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 text-brand-orange"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

// Ícono de alerta (triángulo con "!"), SVG inline sin depender de ninguna
// librería de iconos: se reutiliza para "Reservas pendientes" y "Reseñas
// pendientes", las dos tarjetas que representan una acción pendiente del
// admin, cuando el conteo es mayor a 0.
function IconoAlerta() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      className="h-4 w-4 text-amber-400"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z"
      />
    </svg>
  );
}

// Tarjeta destacada para una estadística que representa ACCIÓN pendiente
// del admin (a diferencia de equipos/categorías, que son solo
// informativas): borde más marcado (border-2) y tono ámbar — la misma
// semántica de "advertencia" que ya usan los badges de estado — con el
// ícono de alerta cuando el conteo es mayor a 0.
function TarjetaPendiente({
  etiqueta,
  cantidad,
  href,
  textoBoton,
}: {
  etiqueta: string;
  cantidad: number | null;
  href: string;
  textoBoton: string;
}) {
  return (
    <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-6">
      <div className="flex items-center gap-2">
        {cantidad !== null && cantidad > 0 && <IconoAlerta />}
        <p className="text-sm text-amber-200">{etiqueta}</p>
      </div>
      {/* Color cálido (ámbar), coherente con la advertencia de la tarjeta,
          en vez del degradado "neutro" que usan las estadísticas informativas. */}
      <p className="mt-1 text-4xl font-bold text-amber-300">{cantidad ?? "—"}</p>
      <Button href={href} className="mt-4">
        {textoBoton}
      </Button>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { token } = useAuth();

  const [totalEquipos, setTotalEquipos] = useState<number | null>(null);
  const [totalCategorias, setTotalCategorias] = useState<number | null>(null);
  const [reservasPendientes, setReservasPendientes] = useState<number | null>(null);
  const [resenasPendientes, setResenasPendientes] = useState<number | null>(null);
  // Eventos CONFIRMADA del mes en curso (mismo mes/año que vería el admin
  // al entrar a /admin/calendario sin navegar a otro mes): un acceso
  // directo rápido, no reemplaza esa vista completa.
  const [confirmadasEsteMes, setConfirmadasEsteMes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    // Se captura en una constante propia: dentro de la función anidada de
    // abajo, TypeScript no puede garantizar que "token" siga sin ser null
    // (es una variable capturada por closure, no un valor ya angostado).
    const tokenActual = token;

    async function cargarEstadisticas() {
      setError(null);
      try {
        const ahora = new Date();
        // Equipos/categorías son endpoints públicos; reservas, reseñas
        // pendientes y el calendario requieren el token porque esos
        // endpoints están protegidos.
        const [equipos, categorias, pendientesReservas, pendientesResenas, confirmadasMes] = await Promise.all([
          getEquipos(),
          getCategorias(),
          getReservas({ estado: "PENDIENTE" }, tokenActual),
          getResenas({ estado: "PENDIENTE" }, tokenActual),
          getReservasCalendario(ahora.getMonth() + 1, ahora.getFullYear(), tokenActual),
        ]);
        setTotalEquipos(equipos.length);
        setTotalCategorias(categorias.length);
        setReservasPendientes(pendientesReservas.length);
        setResenasPendientes(pendientesResenas.length);
        setConfirmadasEsteMes(confirmadasMes.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las estadísticas.");
      }
    }

    cargarEstadisticas();
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Bienvenido al panel de administración</h1>
      <p className="mt-1 text-muted">Resumen general de JM Publicity Sound.</p>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {/* Las dos estadísticas que representan acción pendiente del admin,
          lado a lado (apiladas en móvil), con el mismo tratamiento visual. */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TarjetaPendiente
          etiqueta="Reservas pendientes"
          cantidad={reservasPendientes}
          href="/admin/reservas"
          textoBoton="Ver solicitudes pendientes"
        />
        <TarjetaPendiente
          etiqueta="Reseñas pendientes"
          cantidad={resenasPendientes}
          href="/admin/resenas"
          textoBoton="Moderar reseñas"
        />
      </div>

      {/* Acceso directo al calendario mensual (ver /admin/calendario):
          mismo tratamiento de tarjeta destacada que "Reservas pendientes"/
          "Reseñas pendientes" de arriba (número grande + botón), pero con
          el acento cálido naranja (en vez de ámbar) — no es una acción
          pendiente que requiera atención urgente, sino información útil
          de un vistazo con acceso rápido a la vista completa. */}
      <div className="mt-4 rounded-xl border-2 border-brand-orange/40 bg-brand-orange/10 p-6">
        <div className="flex items-center gap-2">
          <IconoCalendario />
          <p className="text-sm text-orange-200">Eventos confirmados este mes</p>
        </div>
        <p className="mt-1 text-4xl font-bold text-brand-orange">{confirmadasEsteMes ?? "—"}</p>
        <Button href="/admin/calendario" className="mt-4">
          Ver calendario
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-background-surface p-6">
          <p className="text-sm text-muted">Total de equipos</p>
          {/* Dato destacado en degradado de marca: son estadísticas
              informativas, no una advertencia, así que usan el mismo
              tratamiento de los títulos destacados del resto del sitio. */}
          <p className="text-gradient-brand mt-2 text-3xl font-bold">{totalEquipos ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-background-surface p-6">
          <p className="text-sm text-muted">Categorías</p>
          <p className="text-gradient-brand mt-2 text-3xl font-bold">{totalCategorias ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
