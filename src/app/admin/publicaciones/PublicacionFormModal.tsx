// ==========================================
// Modal para crear una publicación de evento (foto o video).
// A diferencia de EquipoFormModal.tsx, este SOLO crea (el backend no
// permite editar el contenido multimedia por PATCH — solo título,
// comentario y destacado, que ya se pueden cambiar directo desde la
// lista, ver page.tsx): por eso no recibe una publicación existente ni
// distingue alta/edición.
// ==========================================

"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import SelectorPersonalizado from "@/components/SelectorPersonalizado";
import { crearPublicacion } from "@/lib/api";
import { TRANSICION_HOVER } from "@/lib/estilos";
import type { Equipo, TipoPublicacion } from "@/types";

interface PublicacionFormModalProps {
  equipos: Equipo[];
  token: string;
  // No se manda la publicación creada: el backend no la devuelve con el
  // equipo incluido, así que quien llama simplemente vuelve a pedir la
  // lista completa (ver cargarDatos() en page.tsx).
  onGuardado: () => void;
  onCerrar: () => void;
}

// Una foto ya elegida, junto con su preview local. Se guarda el par
// (archivo + URL de preview) en vez de generar la URL al vuelo en el
// render: así se genera una sola vez por archivo, y se puede revocar de
// forma precisa al quitar esa foto puntual o al cerrar el modal.
interface FotoConPreview {
  archivo: File;
  previewUrl: string;
}

export default function PublicacionFormModal({
  equipos,
  token,
  onGuardado,
  onCerrar,
}: PublicacionFormModalProps) {
  const [titulo, setTitulo] = useState("");
  const [comentario, setComentario] = useState("");
  const [equipoId, setEquipoId] = useState<number | "">(equipos[0]?.id ?? "");
  const [destacado, setDestacado] = useState(false);
  const [tipo, setTipo] = useState<TipoPublicacion>("FOTO");

  // --- Archivo de video (solo aplica si tipo === "VIDEO") ---
  const [videoArchivo, setVideoArchivo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // --- Álbum de fotos (solo aplica si tipo === "FOTO") ---
  const [fotos, setFotos] = useState<FotoConPreview[]>([]);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Libera TODOS los object URLs creados (video + fotos) al desmontar el
  // modal, sin importar cómo se cerró, para no acumular memoria en el
  // navegador. No depende de "fotos"/"videoPreviewUrl" a propósito (solo
  // debe correr al desmontar, no en cada cambio de selección — eso ya lo
  // maneja cada handler de abajo).
  useEffect(() => {
    return () => {
      fotos.forEach((foto) => URL.revokeObjectURL(foto.previewUrl));
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambiar de tipo invalida los archivos ya elegidos del OTRO tipo (solo
  // uno de los dos se manda al backend): se limpian y se revocan sus
  // previews, para no dejar selecciones "fantasma" ni fugas de memoria.
  function manejarCambioTipo(nuevoTipo: TipoPublicacion) {
    setTipo(nuevoTipo);
    if (nuevoTipo === "VIDEO") {
      fotos.forEach((foto) => URL.revokeObjectURL(foto.previewUrl));
      setFotos([]);
    } else {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setVideoArchivo(null);
      setVideoPreviewUrl(null);
    }
  }

  function manejarSeleccionVideo(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0] ?? null;
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoArchivo(archivo);
    setVideoPreviewUrl(archivo ? URL.createObjectURL(archivo) : null);
  }

  function manejarSeleccionFotos(evento: ChangeEvent<HTMLInputElement>) {
    const archivosElegidos = Array.from(evento.target.files ?? []);
    const nuevasFotos = archivosElegidos.map((archivo) => ({
      archivo,
      previewUrl: URL.createObjectURL(archivo),
    }));
    // Se AGREGAN a lo ya elegido (no se reemplaza): así el admin puede ir
    // sumando fotos en varias selecciones distintas sin perder las
    // anteriores. Se limpia el input después para poder volver a elegir
    // el mismo archivo si lo quita y se arrepiente.
    setFotos((actual) => [...actual, ...nuevasFotos]);
    evento.target.value = "";
  }

  function quitarFoto(indice: number) {
    setFotos((actual) => {
      const objetivo = actual[indice];
      if (objetivo) URL.revokeObjectURL(objetivo.previewUrl);
      return actual.filter((_, i) => i !== indice);
    });
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    // --- Validación en el cliente ---
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (equipoId === "") {
      setError("Elige un equipo.");
      return;
    }
    if (tipo === "VIDEO" && !videoArchivo) {
      setError("Selecciona un archivo de video.");
      return;
    }
    if (tipo === "FOTO" && fotos.length === 0) {
      setError("Selecciona al menos una imagen.");
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      await crearPublicacion(
        {
          titulo: titulo.trim(),
          comentario: comentario.trim() || undefined,
          equipoId: Number(equipoId),
          destacado,
          tipo,
          video: tipo === "VIDEO" ? (videoArchivo ?? undefined) : undefined,
          imagenes: tipo === "FOTO" ? fotos.map((foto) => foto.archivo) : undefined,
        },
        token
      );
      onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la publicación.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    // Mismo fix de contención que EquipoFormModal.tsx (ver el comentario
    // largo ahí): el overlay solo centra (sin límite de alto propio), y
    // es la CAJA del modal la que limita su alto a "max-h-[90vh]" y
    // scrollea por dentro — así el título y los botones de acción quedan
    // siempre visibles, sin cortarse ni desbordar la pantalla (relevante
    // acá especialmente con el álbum de fotos, que puede crecer bastante).
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-white/10 bg-background-surface">
        {/* "min-h-0": ver el comentario en EquipoFormModal.tsx — sin esto
            el <form> se niega a encogerse por debajo de su contenido y el
            límite de alto de la caja de arriba deja de tener efecto. */}
        <form onSubmit={manejarEnvio} className="flex min-h-0 flex-1 flex-col">
          <div className="overflow-y-auto p-6">
            <h2 className="text-lg font-bold">Nueva publicación</h2>

            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Título
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder='Ej. "Boda en Jarabacoa"'
                  className="rounded-lg border border-white/10 bg-background px-3 py-2 text-foreground outline-none focus:border-brand-purple"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Comentario (opcional)
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  placeholder="Ej. menciona al artista, al cliente, o cualquier detalle del evento..."
                  className="rounded-lg border border-white/10 bg-background px-3 py-2 text-foreground outline-none focus:border-brand-purple"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Equipo protagonista
                {/* Dropdown personalizado (no un <select> nativo): mismo
                    motivo que el selector de Provincia del formulario público
                    (ver SelectorPersonalizado.tsx). */}
                <SelectorPersonalizado
                  opciones={equipos.map((equipo) => ({ valor: equipo.id, etiqueta: equipo.nombre }))}
                  valor={equipoId}
                  onChange={setEquipoId}
                  className="rounded-lg border border-white/10 bg-background px-3 py-2 text-foreground outline-none focus:border-brand-purple"
                />
              </label>

              {/* --- Tipo: FOTO o VIDEO, mismo toggle de dos botones que ya usa
                  SelectorHora.tsx para AM/PM. --- */}
              <div>
                <p className="mb-1 text-sm">Tipo de publicación</p>
                <div className="flex overflow-hidden rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => manejarCambioTipo("FOTO")}
                    aria-pressed={tipo === "FOTO"}
                    className={`flex-1 border-r border-white/10 px-3 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
                      tipo === "FOTO" ? "bg-brand-purple text-white" : "bg-background text-muted hover:text-foreground"
                    }`}
                  >
                    Álbum de fotos
                  </button>
                  <button
                    type="button"
                    onClick={() => manejarCambioTipo("VIDEO")}
                    aria-pressed={tipo === "VIDEO"}
                    className={`flex-1 px-3 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
                      tipo === "VIDEO" ? "bg-brand-purple text-white" : "bg-background text-muted hover:text-foreground"
                    }`}
                  >
                    Video
                  </button>
                </div>
              </div>

              {/* --- Archivo de video + preview, solo si tipo === "VIDEO" --- */}
              {tipo === "VIDEO" && (
                <div>
                  <p className="mb-2 text-sm">Video</p>
                  {videoPreviewUrl && (
                    // El preview reproduce el archivo elegido directo desde el
                    // navegador (object URL local): confirma que se eligió el
                    // archivo correcto antes de gastar tiempo subiéndolo.
                    <video
                      src={videoPreviewUrl}
                      controls
                      className="mb-3 max-h-52 w-full rounded-lg bg-background"
                    />
                  )}
                  <input type="file" accept="video/*" onChange={manejarSeleccionVideo} className="text-sm text-muted" />
                </div>
              )}

              {/* --- Álbum de fotos + previews con opción de quitar, solo si
                  tipo === "FOTO" --- */}
              {tipo === "FOTO" && (
                <div>
                  <p className="mb-2 text-sm">Imágenes (selecciona una o varias)</p>
                  {fotos.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-3">
                      {fotos.map((foto, indice) => (
                        <div key={indice} className="relative h-20 w-20 overflow-hidden rounded-lg bg-background">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={foto.previewUrl}
                            alt={`Foto ${indice + 1} del álbum`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => quitarFoto(indice)}
                            aria-label={`Quitar foto ${indice + 1}`}
                            className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white transition-colors hover:bg-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={manejarSeleccionFotos}
                    className="text-sm text-muted"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={destacado}
                  onChange={(e) => setDestacado(e.target.checked)}
                  className="h-4 w-4 accent-brand-purple"
                />
                Destacado (aparece en el adelanto del Home)
              </label>

              {error && <ErrorMessage message={error} />}

              {/* Spinner mientras sube: especialmente útil con video o varias
                  fotos a la vez, donde la subida a Cloudinary puede tardar más
                  que una petición JSON normal. */}
              {enviando && <LoadingSpinner label="Subiendo publicación..." />}
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
              {enviando ? "Subiendo..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
