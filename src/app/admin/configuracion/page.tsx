// ==========================================
// Configuración del admin ("/admin/configuracion").
// Tres secciones independientes entre sí (cada una con su propio estado
// de carga/guardado): cambio de contraseña, datos de contacto del sitio
// (teléfono/email/horario/cobertura) y redes sociales. Las dos últimas
// viven en componentes propios (ConfiguracionContactoForm.tsx y
// RedesSocialesEditor.tsx) para que este archivo no se vuelva un
// monolito — mismo criterio que separar ReservaDetalleModal.tsx o
// ItemsIncluidosEditor.tsx del componente que los usa.
// ==========================================

"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import { useAuth } from "@/context/AuthContext";
import { cambiarPasswordAdmin } from "@/lib/api";
import ConfiguracionContactoForm from "./ConfiguracionContactoForm";
import RedesSocialesEditor from "./RedesSocialesEditor";

// Mínimo exigido también por el backend: se valida acá antes de llamar a la
// API para no gastar una petición en un error que ya se puede detectar en
// el navegador.
const LONGITUD_MINIMA_PASSWORD = 8;

export default function ConfiguracionPage() {
  const { token } = useAuth();

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!token || enviando) return;

    // --- Validación en el cliente, antes de tocar la red ---
    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (passwordNueva.length < LONGITUD_MINIMA_PASSWORD) {
      setError(`La nueva contraseña debe tener al menos ${LONGITUD_MINIMA_PASSWORD} caracteres.`);
      return;
    }
    if (passwordNueva !== passwordConfirmar) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setError(null);
    setMensajeExito(null);
    setEnviando(true);
    try {
      await cambiarPasswordAdmin(passwordActual, passwordNueva, token);
      setMensajeExito("Contraseña actualizada correctamente.");
      // Se limpia el formulario: no tiene sentido dejar las contraseñas
      // escritas en pantalla una vez que el cambio ya se aplicó.
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmar("");
    } catch (err) {
      // Acá llegan tal cual los mensajes del backend: "La contraseña actual
      // es incorrecta." (401) o "La nueva contraseña debe tener al menos 8
      // caracteres." (400, por si el navegador no tiene JS o se saltó la
      // validación de arriba de alguna forma).
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
      <p className="mt-1 text-muted">Contraseña de tu cuenta y datos de contacto del sitio público.</p>

      <h2 className="mt-10 text-lg font-bold tracking-tight">Contraseña</h2>

      <form onSubmit={manejarEnvio} className="mt-6 flex max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Contraseña actual
          <input
            type="password"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            className="rounded-lg border border-white/10 bg-background-surface px-3 py-2 text-foreground outline-none focus:border-brand-purple"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Nueva contraseña
          <input
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            className="rounded-lg border border-white/10 bg-background-surface px-3 py-2 text-foreground outline-none focus:border-brand-purple"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Confirmar nueva contraseña
          <input
            type="password"
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
            className="rounded-lg border border-white/10 bg-background-surface px-3 py-2 text-foreground outline-none focus:border-brand-purple"
          />
        </label>

        {error && <ErrorMessage message={error} />}
        {mensajeExito && (
          // Morado de marca (antes cian), consistente con el resto del panel.
          <p
            role="status"
            className="rounded-lg border border-brand-purple/30 bg-brand-purple/10 px-4 py-3 text-sm text-brand-purple-light"
          >
            {mensajeExito}
          </p>
        )}

        <Button type="submit" disabled={enviando} className="mt-2 w-fit">
          {enviando ? "Cambiando..." : "Cambiar contraseña"}
        </Button>
      </form>

      {/* --- Datos de contacto: teléfono, email, horario, cobertura ---
          Se muestran en el Footer y en la página pública de Contacto. --- */}
      <h2 className="mt-12 text-lg font-bold tracking-tight">Datos de contacto</h2>
      <p className="mt-1 text-muted">Se muestran en el Footer y en la página de Contacto del sitio público.</p>
      <div className="mt-6">
        {token && <ConfiguracionContactoForm token={token} />}
      </div>

      {/* --- Redes sociales: lista editable, con alta/edición/borrado y
          reordenamiento por flechas --- */}
      <h2 className="mt-12 text-lg font-bold tracking-tight">Redes sociales</h2>
      <div className="mt-6">
        {token && <RedesSocialesEditor token={token} />}
      </div>
    </div>
  );
}
