// ==========================================
// Formulario de "Datos de contacto" dentro de /admin/configuracion.
// Edita la única fila de ConfiguracionContacto (teléfono, email, horario
// de atención, mensaje de cobertura). Client Component: necesita el
// token de sesión y estado propio para los campos y el envío.
//
// Carga sus propios datos al montar (en vez de recibirlos ya cargados
// del padre) para que la página de configuración pueda mostrar el
// formulario de contraseña de inmediato sin esperar a esta consulta.
// ==========================================

"use client";

import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/Button";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { editarConfiguracionContacto, getConfiguracionContacto } from "@/lib/api";

interface ConfiguracionContactoFormProps {
  token: string;
}

export default function ConfiguracionContactoForm({ token }: ConfiguracionContactoFormProps) {
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Campos del formulario, inicializados vacíos y llenados al cargar la
  // configuración actual (ver el efecto de abajo).
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [horarioAtencion, setHorarioAtencion] = useState("");
  const [mensajeCobertura, setMensajeCobertura] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    getConfiguracionContacto()
      .then((configuracion) => {
        if (cancelado) return;
        setTelefono(configuracion.telefono);
        setEmail(configuracion.email ?? "");
        setHorarioAtencion(configuracion.horarioAtencion);
        setMensajeCobertura(configuracion.mensajeCobertura);
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorCarga(err instanceof Error ? err.message : "No se pudo cargar la configuración de contacto.");
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;

    if (!telefono.trim() || !horarioAtencion.trim() || !mensajeCobertura.trim()) {
      setErrorGuardar("Teléfono, horario de atención y mensaje de cobertura son obligatorios.");
      return;
    }

    setGuardando(true);
    setErrorGuardar(null);
    setMensajeExito(null);
    try {
      await editarConfiguracionContacto(
        {
          telefono: telefono.trim(),
          // Un campo vacío manda "null" a propósito (vacía el email
          // guardado); si tiene texto, se manda tal cual y el backend
          // valida el formato.
          email: email.trim() === "" ? null : email.trim(),
          horarioAtencion: horarioAtencion.trim(),
          mensajeCobertura: mensajeCobertura.trim(),
        },
        token
      );
      setMensajeExito("Datos de contacto actualizados correctamente.");
    } catch (err) {
      setErrorGuardar(err instanceof Error ? err.message : "No se pudo guardar la configuración de contacto.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <LoadingSpinner label="Cargando datos de contacto..." />;
  if (errorCarga) return <ErrorMessage message={errorCarga} />;

  return (
    <form onSubmit={manejarEnvio} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Teléfono
        <input
          type="text"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="rounded-lg border border-white/10 bg-background-surface px-3 py-2 text-foreground outline-none focus:border-brand-purple"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email (opcional)
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Aún sin dominio propio"
          className="rounded-lg border border-white/10 bg-background-surface px-3 py-2 text-foreground outline-none focus:border-brand-purple"
        />
        {/* Nota pedida explícitamente: explica por qué este campo puede
            quedar vacío, en vez de que el admin piense que es un error. */}
        <span className="text-xs text-muted">
          Se completará cuando tengan un dominio propio verificado en Resend.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Horario de atención
        <input
          type="text"
          value={horarioAtencion}
          onChange={(e) => setHorarioAtencion(e.target.value)}
          placeholder="Ej. Lunes a Domingo, 9:00 AM - 6:00 PM"
          className="rounded-lg border border-white/10 bg-background-surface px-3 py-2 text-foreground outline-none focus:border-brand-purple"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Mensaje de cobertura
        <textarea
          value={mensajeCobertura}
          onChange={(e) => setMensajeCobertura(e.target.value)}
          rows={2}
          placeholder="Ej. Trabajamos a domicilio en toda República Dominicana"
          className="rounded-lg border border-white/10 bg-background-surface px-3 py-2 text-foreground outline-none focus:border-brand-purple"
        />
      </label>

      {errorGuardar && <ErrorMessage message={errorGuardar} />}
      {mensajeExito && (
        <p
          role="status"
          className="rounded-lg border border-brand-purple/30 bg-brand-purple/10 px-4 py-3 text-sm text-brand-purple-light"
        >
          {mensajeExito}
        </p>
      )}

      <Button type="submit" disabled={guardando} className="mt-2 w-fit">
        {guardando ? "Guardando..." : "Guardar datos de contacto"}
      </Button>
    </form>
  );
}
