// ==========================================
// Formulario para que un cliente deje su propia reseña de un equipo.
// Client Component: valida en el navegador antes de llamar al backend, y
// maneja los estados de envío/éxito/error (incluyendo el 429 del
// antispam, si ese mismo nombre ya reseñó este equipo hace muy poco).
// A diferencia de FormularioReserva.tsx (que reemplaza todo el formulario
// por un panel de confirmación), acá el formulario se LIMPIA y queda
// visible tras un envío exitoso: nada impide que el mismo cliente quiera
// dejar otra reseña más adelante, y no hay nada más que "confirmar" en
// esta pantalla.
// ==========================================

"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import EstrellasCalificacion from "@/components/EstrellasCalificacion";
import { ApiError, crearResena } from "@/lib/api";

interface FormularioResenaProps {
  equipoId: number;
}

export default function FormularioResena({ equipoId }: FormularioResenaProps) {
  const [nombreCliente, setNombreCliente] = useState("");
  // 0 = todavía no eligió ninguna estrella (no es una calificación válida).
  const [calificacion, setCalificacion] = useState(0);
  const [comentario, setComentario] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    // Evita un doble envío si alcanza a hacer clic/Enter dos veces antes
    // de que React desactive el botón.
    if (enviando) return;

    setErrorEnvio(null);
    setMensajeExito(null);

    // --- Validación en el cliente, antes de tocar la red ---
    if (!nombreCliente.trim()) {
      setErrorValidacion("Tu nombre completo es obligatorio.");
      return;
    }
    if (calificacion < 1 || calificacion > 5) {
      setErrorValidacion("Selecciona una calificación de 1 a 5 estrellas.");
      return;
    }
    setErrorValidacion(null);

    setEnviando(true);
    try {
      const respuesta = await crearResena({
        equipoId,
        nombreCliente: nombreCliente.trim(),
        calificacion,
        comentario: comentario.trim() || undefined,
      });

      // El mensaje ya viene del backend aclarando que falta la revisión
      // del admin; se usa tal cual en vez de inventar uno propio, para no
      // desincronizarse si ese texto cambia del lado del servidor.
      setMensajeExito(respuesta.mensaje);
      setNombreCliente("");
      setCalificacion(0);
      setComentario("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        // Antispam del backend: mismo nombre, mismo equipo, hace muy
        // poco. El mensaje del backend ya es claro, se muestra tal cual.
        setErrorEnvio(err.message);
      } else {
        setErrorEnvio(err instanceof Error ? err.message : "No se pudo enviar tu reseña.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-4 rounded-xl border border-white/10 bg-background-surface p-6">
      <h3 className="text-lg font-semibold">Déjanos tu reseña</h3>

      {mensajeExito && (
        <div
          role="status"
          className="rounded-lg border border-brand-purple/30 bg-brand-purple/10 px-4 py-3 text-sm text-foreground"
        >
          {mensajeExito}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Nombre completo *
        <input
          type="text"
          value={nombreCliente}
          onChange={(e) => setNombreCliente(e.target.value)}
          required
          className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-foreground outline-none focus:border-brand-purple"
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <span>Calificación *</span>
        <EstrellasCalificacion
          valor={calificacion}
          interactivo
          onCambio={setCalificacion}
          tamanoTexto="text-3xl"
        />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Comentario (opcional)
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          placeholder="Cuéntanos cómo te fue con este equipo..."
          className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-foreground outline-none focus:border-brand-purple"
        />
      </label>

      {errorValidacion && <ErrorMessage message={errorValidacion} />}
      {errorEnvio && <ErrorMessage message={errorEnvio} />}

      <Button type="submit" disabled={enviando} className="w-full sm:w-fit">
        {enviando ? "Enviando..." : "Enviar reseña"}
      </Button>
    </form>
  );
}
