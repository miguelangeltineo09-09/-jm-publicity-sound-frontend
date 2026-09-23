// ==========================================
// Gestión de Categorías ("/admin/categorias").
// Client Component: necesita el token de sesión (useAuth) para las
// operaciones protegidas (crear/editar/eliminar) y estado local para la
// tabla, el formulario de alta y la edición inline por fila.
// ==========================================

"use client";

import { useEffect, useState, type FormEvent } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import {
  ApiError,
  crearCategoria,
  editarCategoria,
  eliminarCategoria,
  getCategorias,
} from "@/lib/api";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { Categoria } from "@/types";

export default function CategoriasAdminPage() {
  const { token } = useAuth();

  // --- Listado ---
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargarCategorias() {
    setCargando(true);
    setError(null);
    try {
      setCategorias(await getCategorias());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las categorías.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // Sincroniza el estado con un sistema externo (el backend) al montar:
    // el caso de uso que un efecto debe cubrir. No hay forma de derivarlo
    // sin un efecto (es exactamente el patrón que recomienda react.dev
    // para "fetch de datos al montar" en un Client Component).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarCategorias();
  }, []);

  // --- Alta de categoría ---
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  async function manejarCrear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!token || creando) return;

    if (!nuevoNombre.trim()) {
      setErrorCrear("El nombre es obligatorio.");
      return;
    }

    setCreando(true);
    setErrorCrear(null);
    try {
      const categoria = await crearCategoria(nuevoNombre.trim(), token);
      setCategorias((actual) => [...actual, categoria].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setNuevoNombre("");
    } catch (err) {
      setErrorCrear(err instanceof Error ? err.message : "No se pudo crear la categoría.");
    } finally {
      setCreando(false);
    }
  }

  // --- Edición inline (renombrar) ---
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

  function iniciarEdicion(categoria: Categoria) {
    setIdEditando(categoria.id);
    setNombreEditado(categoria.nombre);
    setErrorEditar(null);
  }

  function cancelarEdicion() {
    setIdEditando(null);
    setErrorEditar(null);
  }

  async function guardarEdicion() {
    if (!token || idEditando === null || guardando) return;

    if (!nombreEditado.trim()) {
      setErrorEditar("El nombre es obligatorio.");
      return;
    }

    setGuardando(true);
    setErrorEditar(null);
    try {
      const actualizada = await editarCategoria(idEditando, nombreEditado.trim(), token);
      setCategorias((actual) => actual.map((c) => (c.id === actualizada.id ? actualizada : c)));
      setIdEditando(null);
    } catch (err) {
      setErrorEditar(err instanceof Error ? err.message : "No se pudo renombrar la categoría.");
    } finally {
      setGuardando(false);
    }
  }

  // --- Eliminación (con confirmación) ---
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<Categoria | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function confirmarEliminar() {
    if (!token || !categoriaAEliminar || eliminando) return;

    setEliminando(true);
    setErrorEliminar(null);
    try {
      await eliminarCategoria(categoriaAEliminar.id, token);
      setCategorias((actual) => actual.filter((c) => c.id !== categoriaAEliminar.id));
      setCategoriaAEliminar(null);
    } catch (err) {
      // Acá llega, por ejemplo, el 400 de "tiene equipos asociados": se
      // muestra dentro del propio diálogo, sin cerrarlo, para que el admin
      // entienda por qué no se pudo borrar.
      setErrorEliminar(
        err instanceof ApiError ? err.message : "No se pudo eliminar la categoría."
      );
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
      <p className="mt-1 text-muted">Organizan el catálogo de equipos (ej. Bocinas, Luces).</p>

      {/* --- Formulario de alta --- */}
      <form onSubmit={manejarCrear} className="mt-6 flex flex-wrap items-start gap-3">
        <input
          type="text"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Nombre de la nueva categoría"
          className="w-64 rounded-lg border border-white/10 bg-background-surface px-4 py-2 text-foreground outline-none focus:border-brand-purple"
        />
        <Button type="submit" disabled={creando}>
          {creando ? "Creando..." : "Crear categoría"}
        </Button>
      </form>
      {errorCrear && (
        <div className="mt-3 max-w-md">
          <ErrorMessage message={errorCrear} />
        </div>
      )}

      {/* --- Tabla --- */}
      <div className="mt-8">
        {cargando && <LoadingSpinner label="Cargando categorías..." />}
        {!cargando && error && <ErrorMessage message={error} />}

        {!cargando && !error && (
          <table className="w-full max-w-2xl border-separate border-spacing-y-2 text-left text-sm">
            {/* Mismo tratamiento de encabezado "sobrio" que el resto de las
                tablas del panel (Equipos, Reservas). */}
            <thead>
              <tr className="bg-background-surface text-xs font-semibold uppercase tracking-wide text-muted">
                <th className="rounded-l-lg px-3 py-3">Nombre</th>
                <th className="rounded-r-lg px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((categoria) => (
                <tr key={categoria.id} className={`rounded-lg bg-background-surface hover:bg-brand-purple/10 ${TRANSICION_HOVER}`}>
                  <td className="rounded-l-lg px-3 py-3">
                    {idEditando === categoria.id ? (
                      <input
                        type="text"
                        value={nombreEditado}
                        onChange={(e) => setNombreEditado(e.target.value)}
                        autoFocus
                        // Input de edición inline: el borde morado de marca
                        // (antes cian) es su propio indicador de "en edición".
                        className="w-full rounded-lg border border-brand-purple bg-background px-2 py-1 text-foreground outline-none"
                      />
                    ) : (
                      categoria.nombre
                    )}
                  </td>
                  <td className="rounded-r-lg px-3 py-3">
                    {idEditando === categoria.id ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={guardarEdicion}
                          disabled={guardando}
                          className={`text-brand-purple-light hover:text-brand-pink disabled:opacity-50 ${TRANSICION_HOVER}`}
                        >
                          {guardando ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelarEdicion}
                          disabled={guardando}
                          className={`text-muted hover:text-foreground disabled:opacity-50 ${TRANSICION_HOVER}`}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(categoria)}
                          className={`text-brand-purple-light hover:text-brand-pink ${TRANSICION_HOVER}`}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoriaAEliminar(categoria)}
                          className={`text-red-300 hover:text-red-400 ${TRANSICION_HOVER}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {categorias.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-muted">
                    Todavía no hay categorías.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {idEditando !== null && errorEditar && (
          <div className="mt-3 max-w-md">
            <ErrorMessage message={errorEditar} />
          </div>
        )}
      </div>

      <ConfirmDialog
        abierto={categoriaAEliminar !== null}
        titulo="Eliminar categoría"
        mensaje={`¿Seguro que quieres eliminar "${categoriaAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
        cargando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={() => {
          setCategoriaAEliminar(null);
          setErrorEliminar(null);
        }}
      />
    </div>
  );
}
