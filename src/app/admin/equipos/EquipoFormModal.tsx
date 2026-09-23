// ==========================================
// Modal de creación/edición de un equipo.
// Se usa para las dos operaciones (si "equipo" es null, crea uno nuevo; si
// no, edita el que se pasó) porque el formulario es idéntico en ambos
// casos — evita mantener dos componentes casi iguales.
// ==========================================

"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import SelectorPersonalizado from "@/components/SelectorPersonalizado";
import { crearEquipo, crearItemIncluido, editarEquipo } from "@/lib/api";
import type { Categoria, Equipo } from "@/types";
import ItemsIncluidosEditor from "./ItemsIncluidosEditor";

interface EquipoFormModalProps {
  // null = formulario de alta; un Equipo = se está editando ese equipo.
  equipo: Equipo | null;
  categorias: Categoria[];
  token: string;
  onGuardado: (equipo: Equipo) => void;
  onCerrar: () => void;
}

export default function EquipoFormModal({
  equipo,
  categorias,
  token,
  onGuardado,
  onCerrar,
}: EquipoFormModalProps) {
  // Campos del formulario, precargados con los datos del equipo si se está editando.
  const [nombre, setNombre] = useState(equipo?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(equipo?.descripcion ?? "");
  const [precio, setPrecio] = useState(equipo?.precio ?? "");
  const [categoriaId, setCategoriaId] = useState<number | "">(
    equipo?.categoriaId ?? categorias[0]?.id ?? ""
  );
  const [disponible, setDisponible] = useState(equipo?.disponibleParaAlquiler ?? true);

  // Imagen: "archivoImagen" solo se llena si el admin elige un archivo nuevo;
  // "previewUrl" es lo que se muestra (el archivo nuevo, o la imagen actual
  // del equipo si no se cambió nada, o null si nunca tuvo una).
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(equipo?.imagenUrl ?? null);

  // Ítems incluidos: solo se usa en modo "equipo nuevo" (equipo === null).
  // Al editar un equipo existente, ItemsIncluidosEditor maneja su propia
  // lista directamente contra el backend y este estado queda sin usar.
  const [itemsTemporales, setItemsTemporales] = useState<string[]>([]);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El preview de un archivo nuevo se genera con un object URL local (no
  // hace falta subir nada para poder mostrarlo); hay que liberarlo cuando
  // ya no se usa para no acumular memoria en el navegador.
  useEffect(() => {
    return () => {
      if (archivoImagen && previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [archivoImagen, previewUrl]);

  function manejarSeleccionImagen(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0] ?? null;
    setArchivoImagen(archivo);
    setPreviewUrl(archivo ? URL.createObjectURL(archivo) : (equipo?.imagenUrl ?? null));
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    // --- Validación en el cliente ---
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!descripcion.trim()) {
      setError("La descripción es obligatoria.");
      return;
    }
    const precioNumerico = Number(precio);
    if (precio === "" || Number.isNaN(precioNumerico) || precioNumerico <= 0) {
      setError("El precio debe ser un número mayor a 0.");
      return;
    }
    if (categoriaId === "") {
      setError("Elige una categoría.");
      return;
    }

    setError(null);
    setEnviando(true);

    // Se usa para distinguir, si algo falla, si el equipo ya llegó a
    // crearse (y solo fallaron los ítems) o si el problema fue antes de eso.
    let equipoYaCreado = false;
    try {
      const datos = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio: precioNumerico,
        categoriaId: Number(categoriaId),
        disponibleParaAlquiler: disponible,
        imagen: archivoImagen,
      };

      const resultado = equipo
        ? await editarEquipo(equipo.id, datos, token)
        : await crearEquipo(datos, token);
      equipoYaCreado = true;

      // Equipo NUEVO: los ítems temporales (ver ItemsIncluidosEditor) se
      // mandan uno por uno, ya con el id recién generado. Uno por uno (no
      // en paralelo con Promise.all) para que cada POST vea el "orden" que
      // dejó el anterior y así conserven el mismo orden en que el admin
      // los escribió — en paralelo podrían llegar al backend en cualquier
      // orden y calcular el mismo "siguiente orden" por una carrera entre ellos.
      if (!equipo) {
        for (const descripcionItem of itemsTemporales) {
          await crearItemIncluido(resultado.id, descripcionItem, token);
        }
      }

      onGuardado(resultado);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo guardar el equipo.";
      setError(
        equipoYaCreado
          ? `El equipo se creó, pero hubo un problema guardando los ítems incluidos: ${mensaje} Recarga la página y edita el equipo para volver a intentarlo.`
          : mensaje
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    // BUG CORREGIDO: el modal se desbordaba (contenido cortado arriba, se
    // transparentaba el fondo). Causa: ni el overlay ni la caja del modal
    // tenían un límite de alto propio — el overlay solo centraba con
    // "overflow-y-auto" en SÍ MISMO, que es justo el patrón que rompe con
    // contenido más alto que la pantalla (centrar con "items-center" un
    // hijo que no entra en el contenedor deja parte de ese hijo en un
    // espacio "negativo" que muchos navegadores no permiten scrollear).
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      {/* "max-h-[90vh]" + "flex flex-col" + "overflow-hidden": esta caja
          (no el overlay) es la que ahora limita su propio alto al 90% del
          viewport. "overflow-hidden" acá (en vez de "overflow-y-auto") es
          a propósito: el que scrollea es el DIV DE ADENTRO de más abajo,
          así el título y los botones "Cancelar"/"Guardar" quedan siempre
          visibles arriba y abajo, sin importar cuánto se scrollee el
          medio (relevante ahora que el formulario puede ser largo, con la
          lista de "¿Qué incluye este equipo?" de ItemsIncluidosEditor). */}
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/10 bg-background-surface">
        {/* "min-h-0" en el <form>: sin esto, un hijo flex con contenido
            largo se niega a encogerse por debajo de su alto de contenido
            (el comportamiento por defecto de flexbox es "min-height:
            auto"), lo que anularía el límite de alto de la caja de arriba
            y volvería a desbordar la pantalla igual que antes. */}
        <form onSubmit={manejarEnvio} className="flex min-h-0 flex-1 flex-col">
          {/* Todo el contenido del formulario scrollea acá adentro; el
              título va DENTRO de esta zona (no fijo arriba) porque no
              hace falta que quede pegado — lo único que debe quedar fijo
              son los botones de acción, ver el footer más abajo. */}
          <div className="overflow-y-auto p-6">
            <h2 className="text-lg font-bold">{equipo ? "Editar equipo" : "Nuevo equipo"}</h2>

            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Nombre
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="rounded-lg border border-white/10 bg-background px-3 py-2 text-foreground outline-none focus:border-brand-purple"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Descripción
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  className="rounded-lg border border-white/10 bg-background px-3 py-2 text-foreground outline-none focus:border-brand-purple"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  Precio
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="rounded-lg border border-white/10 bg-background px-3 py-2 text-foreground outline-none focus:border-brand-purple"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Categoría
                  {/* Dropdown personalizado (no un <select> nativo): mismo
                      motivo que el selector de Provincia del formulario
                      público (ver SelectorPersonalizado.tsx) — la lista de un
                      <select> nativo se veía casi ilegible sobre este modal
                      oscuro. */}
                  <SelectorPersonalizado
                    opciones={categorias.map((categoria) => ({ valor: categoria.id, etiqueta: categoria.nombre }))}
                    valor={categoriaId}
                    onChange={setCategoriaId}
                    className="rounded-lg border border-white/10 bg-background px-3 py-2 text-foreground outline-none focus:border-brand-purple"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={disponible}
                  onChange={(e) => setDisponible(e.target.checked)}
                  // "accent-*" es la utilidad de Tailwind para el accent-color
                  // nativo del checkbox (el tilde/casilla que dibuja el propio
                  // navegador): se migra del acento cian original al morado de marca.
                  className="h-4 w-4 accent-brand-purple"
                />
                Disponible para alquiler
              </label>

              <div>
                <p className="mb-2 text-sm">Imagen</p>
                <div className="flex items-center gap-4">
                  {/* <img> normal en vez de next/image: el preview de un archivo
                      recién elegido es un object URL (blob:), que next/image no
                      puede optimizar al no ser una URL http(s) real. */}
                  <div className="h-20 w-20 overflow-hidden rounded-lg bg-background">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted">Sin imagen</div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={manejarSeleccionImagen}
                    className="text-sm text-muted"
                  />
                </div>
              </div>

              {/* --- "¿Qué incluye este equipo?": ítems como "4 monitores",
                  "1 planta eléctrica". Se edita independiente del resto del
                  formulario (ver el comentario al inicio de
                  ItemsIncluidosEditor.tsx sobre los dos modos). --- */}
              <ItemsIncluidosEditor
                equipoId={equipo?.id ?? null}
                token={token}
                itemsTemporales={itemsTemporales}
                onCambiarItemsTemporales={setItemsTemporales}
              />

              {error && <ErrorMessage message={error} />}
            </div>
          </div>

          {/* Footer fijo (fuera del div con scroll de arriba): los
              botones de acción siempre quedan visibles, sin importar
              cuánto se scrollee el formulario. */}
          <div className="flex justify-end gap-3 border-t border-white/10 p-6 pt-4">
            <Button type="button" variant="secondary" onClick={onCerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
