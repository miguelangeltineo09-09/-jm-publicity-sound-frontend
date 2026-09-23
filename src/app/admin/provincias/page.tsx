// ==========================================
// Gestión de Provincias ("/admin/provincias").
// Client Component: lista las 32 provincias (fijas, no se crean ni
// eliminan) y permite editar el precioViaje de cada una en línea. Cada
// fila se guarda al instante contra el backend al perder el foco del
// input (mismo patrón simple ya usado en ItemsIncluidosEditor.tsx), sin
// necesitar un botón de "Guardar" aparte por fila.
// ==========================================

"use client";

import { useEffect, useState } from "react";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { editarPrecioProvincia, getProvincias } from "@/lib/api";
import { formatearMoneda } from "@/lib/formato";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { Provincia } from "@/types";

// Cuánto tiempo (ms) se muestra el check de "guardado" junto a una fila
// antes de desaparecer solo. Lo bastante breve para no estorbar, lo
// bastante largo para que el admin lo note.
const DURACION_CHECK_GUARDADO_MS = 1500;

export default function ProvinciasAdminPage() {
  const { token } = useAuth();

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscador de texto simple: son 32 provincias, ayuda a encontrar rápido
  // sin necesitar paginación ni nada más elaborado.
  const [busqueda, setBusqueda] = useState("");

  async function cargarProvincias() {
    setCargando(true);
    setError(null);
    try {
      // Público: no hace falta token para listar (ver src/lib/api.ts). Ya
      // vienen ordenadas alfabéticamente desde el backend.
      setProvincias(await getProvincias());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las provincias.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // Fetch de datos al montar: el caso de uso que un efecto debe cubrir.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarProvincias();
  }, []);

  // --- Guardar el precio de una fila al perder el foco ---
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  // Id de la última provincia guardada con éxito: dispara el check
  // momentáneo junto a esa fila (ver DURACION_CHECK_GUARDADO_MS arriba).
  const [guardadoId, setGuardadoId] = useState<number | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  async function manejarGuardarPrecio(provincia: Provincia, valorTexto: string) {
    if (!token || guardandoId !== null) return;

    const nuevoPrecio = Number(valorTexto);
    if (Number.isNaN(nuevoPrecio) || nuevoPrecio < 0) {
      setErrorGuardado(`El precio de viaje de "${provincia.nombre}" debe ser un número mayor o igual a 0.`);
      return;
    }

    // Sin cambios reales: no hace falta llamar al backend.
    if (nuevoPrecio === Number(provincia.precioViaje)) return;

    setErrorGuardado(null);
    setGuardandoId(provincia.id);
    try {
      const actualizada = await editarPrecioProvincia(provincia.id, nuevoPrecio, token);
      setProvincias((actual) => actual.map((p) => (p.id === provincia.id ? actualizada : p)));

      setGuardadoId(provincia.id);
      setTimeout(() => {
        // Solo limpia si sigue siendo la última guardada (evita que un
        // guardado más reciente desaparezca antes de tiempo por el
        // timeout de uno anterior).
        setGuardadoId((actual) => (actual === provincia.id ? null : actual));
      }, DURACION_CHECK_GUARDADO_MS);
    } catch (err) {
      setErrorGuardado(err instanceof Error ? err.message : "No se pudo guardar el precio.");
    } finally {
      setGuardandoId(null);
    }
  }

  // Filtro de texto por nombre, sin distinguir mayúsculas/minúsculas.
  const provinciasFiltradas = provincias.filter((provincia) =>
    provincia.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Provincias</h1>
      <p className="mt-1 text-muted">
        Precio de viaje (ya incluye la dieta) por provincia, usado para cotizar cada reserva.
      </p>

      {/* --- Buscador --- */}
      <div className="mt-6">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar provincia..."
          className="w-full max-w-xs rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-purple"
        />
      </div>

      {errorGuardado && (
        <div className="mt-4">
          <ErrorMessage message={errorGuardado} />
        </div>
      )}

      <div className="mt-6">
        {cargando && <LoadingSpinner label="Cargando provincias..." />}
        {!cargando && error && <ErrorMessage message={error} />}

        {!cargando && !error && (
          // Mismo patrón responsivo de scroll horizontal contenido que el
          // resto de las tablas del panel (ver el comentario largo en
          // admin/equipos/page.tsx). Acá es especialmente necesario: la
          // columna de precio junta un input numérico + la etiqueta con el
          // monto formateado + el texto de "Guardando.../✓ Guardado", que
          // no entra de ninguna forma razonable en 320-375px de ancho.
          <div>
            <p className="mb-2 text-xs text-muted sm:hidden">← Desliza para ver toda la tabla →</p>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[480px] border-separate border-spacing-y-2 text-left text-sm">
                {/* Mismo tratamiento de encabezado "sobrio" que el resto de las
                    tablas del panel (Equipos, Categorías, Reservas). */}
                <thead>
                  <tr className="bg-background-surface text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="rounded-l-lg px-3 py-3">Provincia</th>
                    <th className="rounded-r-lg px-3 py-3">Precio de viaje (RD$)</th>
                  </tr>
                </thead>
                <tbody>
              {provinciasFiltradas.map((provincia) => (
                <tr
                  key={provincia.id}
                  className={`bg-background-surface align-middle ${TRANSICION_HOVER} hover:bg-brand-purple/10`}
                >
                  <td className="rounded-l-lg px-3 py-3">{provincia.nombre}</td>
                  <td className="rounded-r-lg px-3 py-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={Number(provincia.precioViaje)}
                        onBlur={(e) => manejarGuardarPrecio(provincia, e.target.value)}
                        disabled={guardandoId === provincia.id}
                        className="w-32 rounded-lg border border-white/10 bg-background px-3 py-1.5 text-foreground outline-none focus:border-brand-purple disabled:opacity-50"
                      />
                      {/* El input queda como número plano editable (un
                          <input type="number"> no puede contener texto
                          como "RD$2,500"); esta etiqueta de al lado sí
                          muestra el valor YA GUARDADO con el formato de
                          moneda dominicano, para que se pueda leer de
                          un vistazo sin tener que hacer la cuenta. */}
                      <span className="text-xs text-muted">({formatearMoneda(Number(provincia.precioViaje))})</span>
                      {guardandoId === provincia.id && <span className="text-xs text-muted">Guardando...</span>}
                      {/* Check momentáneo de confirmación (ver
                          DURACION_CHECK_GUARDADO_MS): en verde, igual
                          tratamiento de color que el resto de las
                          confirmaciones positivas del panel. */}
                      {guardadoId === provincia.id && (
                        <span role="status" className="text-xs font-medium text-green-400">
                          ✓ Guardado
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {provinciasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-muted">
                    Ninguna provincia coincide con &quot;{busqueda}&quot;.
                  </td>
                </tr>
              )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
