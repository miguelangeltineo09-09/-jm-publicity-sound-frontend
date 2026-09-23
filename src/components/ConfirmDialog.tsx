// ==========================================
// Diálogo de confirmación reutilizable (ej. antes de eliminar algo).
// No usa window.confirm() nativo: se dibuja como un modal propio con el
// estilo oscuro/cian del proyecto, para que se vea consistente con el
// resto del panel admin.
// ==========================================

"use client";

import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";

interface ConfirmDialogProps {
  // Controla si el modal se muestra; si es false, el componente no dibuja nada.
  abierto: boolean;
  titulo: string;
  mensaje: string;
  // Mientras se procesa la confirmación (ej. esperando la respuesta del
  // backend), deshabilita ambos botones para evitar un doble clic.
  cargando?: boolean;
  // Error del backend a mostrar SIN cerrar el diálogo (ej. "tiene equipos
  // asociados"): así el admin ve por qué falló sin perder el contexto.
  error?: string | null;
  textoConfirmar?: string;
  // La mayoría de los usos son destructivos (eliminar: rojo), pero no todos
  // — ej. confirmar una reserva tiene una consecuencia real (bloquea la
  // fecha) pero no es "peligrosa" en el mismo sentido, así que se puede
  // pedir el acento cian en vez del rojo por defecto.
  variantConfirmar?: "danger" | "primary";
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function ConfirmDialog({
  abierto,
  titulo,
  mensaje,
  cargando = false,
  error = null,
  textoConfirmar = "Eliminar",
  variantConfirmar = "danger",
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  if (!abierto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-background-surface p-6">
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="mt-2 text-sm text-muted">{mensaje}</p>

        {error && (
          <div className="mt-4">
            <ErrorMessage message={error} />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancelar} disabled={cargando}>
            Cancelar
          </Button>
          <Button variant={variantConfirmar} onClick={onConfirmar} disabled={cargando}>
            {cargando ? "Procesando..." : textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
