// ==========================================
// Modal "Nueva reserva" del panel de admin.
// Permite registrar a mano una reserva de un cliente que reservó en
// persona o por WhatsApp, en vez de pasar por el formulario público
// (src/components/FormularioReserva.tsx). Reutiliza los mismos
// componentes ya construidos para ese formulario (CalendarioDisponibilidad,
// SelectorHora, SelectorPersonalizado) en vez de duplicar su lógica —
// la única pieza que este modal agrega de más es el SELECTOR DE EQUIPOS,
// que en el flujo público no hace falta porque los equipos ya vienen del
// carrito de reserva (ver CarritoContext.tsx).
//
// CAMBIO DE RELACIÓN CLAVE: antes se elegía UN equipo (un
// SelectorPersonalizado, el mismo componente de un solo valor que usa
// Provincia). Ahora una reserva puede incluir VARIOS equipos para el
// mismo evento, así que el selector de equipo se reemplaza por una lista
// de CHECKBOXES (selección múltiple) — SelectorPersonalizado no sirve
// para esto, está pensado para un único valor elegido a la vez.
//
// Diferencia clave con el flujo público: el email del cliente es
// OPCIONAL aquí (el backend lo permite solo en este endpoint, ver
// crearReservaAdmin en src/lib/api.ts) — si se deja vacío, la reserva
// queda sin email y más adelante no se podrá enviar su factura por
// correo (sí se podrá seguir generando y descargando su PDF).
// ==========================================

"use client";

import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/Button";
import CalendarioDisponibilidad from "@/components/CalendarioDisponibilidad";
import ErrorMessage from "@/components/ErrorMessage";
import SelectorHora from "@/components/SelectorHora";
import SelectorPersonalizado from "@/components/SelectorPersonalizado";
import { ApiError, crearReservaAdmin, getEquipos, getProvincias } from "@/lib/api";
import type { Equipo, Provincia, Reserva } from "@/types";

interface NuevaReservaModalProps {
  token: string;
  onCerrar: () => void;
  // Se llama con la reserva ya creada (PENDIENTE): la pantalla que abre
  // este modal decide cómo incorporarla a la lista (ver page.tsx).
  onCreada: (reserva: Reserva) => void;
}

// Mismas validaciones básicas de teléfono/email que FormularioReserva.tsx
// (duplicadas a propósito, no importadas: son dos funciones de una línea,
// y crear un módulo compartido solo para esto sería más código que el
// que ahorra).
function telefonoValido(valor: string): boolean {
  const soloDigitos = valor.replace(/\D/g, "");
  return soloDigitos.length >= 7 && /^[\d\s()+-]+$/.test(valor);
}

function emailValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function horaFinPosterior(horaInicio: string, horaFin: string): boolean {
  return horaFin > horaInicio;
}

// Mismo criterio anti-desfase de zona horaria que FormularioReserva.tsx:
// se arma el string "YYYY-MM-DD" a mano con los componentes LOCALES de la
// fecha elegida en el calendario, en vez de "fecha.toISOString()" (que
// convierte a UTC y puede correr la fecha un día para atrás).
function formatearFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export default function NuevaReservaModal({ token, onCerrar, onCreada }: NuevaReservaModalProps) {
  // --- Equipos y provincias para los dos selectores nuevos ---
  // Ambos endpoints son públicos (no llevan token): son los mismos que ya
  // usa el catálogo y el formulario público, no hace falta un endpoint
  // aparte solo porque este formulario vive dentro del panel admin.
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([getEquipos(), getProvincias()])
      .then(([listaEquipos, listaProvincias]) => {
        if (!cancelado) {
          setEquipos(listaEquipos);
          setProvincias(listaProvincias);
        }
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorOpciones(err instanceof Error ? err.message : "No se pudieron cargar los equipos/provincias.");
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoOpciones(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // --- Campos del formulario ---
  // Antes "equipoId: number | ''" (un solo valor). Ahora es un array de
  // ids: el checklist de más abajo agrega/quita ids de este estado.
  const [equipoIds, setEquipoIds] = useState<number[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>(undefined);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  // Opcional: distinto del formulario público, ver el comentario del
  // encabezado del archivo.
  const [clienteEmail, setClienteEmail] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [provinciaId, setProvinciaId] = useState<number | "">("");
  const [notas, setNotas] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // Al cambiar la selección de equipos, la fecha elegida para la
  // combinación ANTERIOR ya no tiene sentido (cada combinación de equipos
  // tiene su propia disponibilidad cruzada, ver CalendarioDisponibilidad.tsx):
  // se limpia para no enviar por error una fecha que nunca se confirmó
  // para esta selección nueva.
  function alternarEquipo(equipoId: number) {
    setEquipoIds((actual) =>
      actual.includes(equipoId) ? actual.filter((id) => id !== equipoId) : [...actual, equipoId]
    );
    setFechaSeleccionada(undefined);
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    setErrorEnvio(null);

    // --- Validación en el cliente, mismo criterio que FormularioReserva.tsx ---
    if (equipoIds.length === 0) {
      setErrorValidacion("Elige al menos un equipo que se reservó.");
      return;
    }
    if (!fechaSeleccionada) {
      setErrorValidacion("Elige la fecha del evento en el calendario.");
      return;
    }
    if (!clienteNombre.trim()) {
      setErrorValidacion("El nombre completo del cliente es obligatorio.");
      return;
    }
    if (!clienteTelefono.trim() || !telefonoValido(clienteTelefono.trim())) {
      setErrorValidacion("Ingresa un teléfono válido (mínimo 7 dígitos).");
      return;
    }
    // Único campo con una validación DISTINTA a la del formulario público:
    // acá el email puede quedar vacío; si se escribe algo, sí debe tener
    // forma de email válido (no se guarda cualquier texto suelto).
    if (clienteEmail.trim() && !emailValido(clienteEmail.trim())) {
      setErrorValidacion("Si vas a registrar un email, debe tener un formato válido.");
      return;
    }
    if (!horaInicio || !horaFin) {
      setErrorValidacion("Elige la hora de inicio y la hora de fin del evento.");
      return;
    }
    if (!horaFinPosterior(horaInicio, horaFin)) {
      setErrorValidacion("La hora de fin debe ser posterior a la hora de inicio.");
      return;
    }
    if (!municipio.trim()) {
      setErrorValidacion("El municipio del evento es obligatorio.");
      return;
    }
    if (provinciaId === "") {
      setErrorValidacion("Elige la provincia del evento.");
      return;
    }
    setErrorValidacion(null);

    setEnviando(true);
    try {
      const reserva = await crearReservaAdmin(
        {
          equipoIds,
          fechaEvento: formatearFechaISO(fechaSeleccionada),
          clienteNombre: clienteNombre.trim(),
          clienteTelefono: clienteTelefono.trim(),
          // Se manda "undefined" (no un string vacío) cuando no se
          // escribió nada: así el backend lo trata como "no llegó" y la
          // reserva queda con clienteEmail = null, en vez de guardar un
          // string vacío.
          clienteEmail: clienteEmail.trim() || undefined,
          horaInicio,
          horaFin,
          municipio: municipio.trim(),
          provinciaId,
          notas: notas.trim() || undefined,
        },
        token
      );
      onCreada(reserva);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Ya hay una reserva CONFIRMADA de ese equipo para esa fecha: se
        // limpia la selección para que el admin elija otra, en vez de
        // dejar marcada una fecha que el backend ya rechazó.
        setErrorEnvio(err.message);
        setFechaSeleccionada(undefined);
      } else {
        setErrorEnvio(err instanceof Error ? err.message : "No se pudo crear la reserva.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* Mismo patrón de modal "sin cortes" que el resto del panel (ver
          EquipoFormModal.tsx / PublicacionFormModal.tsx / ReservaDetalleModal.tsx):
          la caja nunca excede el 90% del alto del viewport, el contenido
          largo scrollea POR DENTRO y el footer con los botones queda fijo. */}
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-white/10 bg-background-surface">
        <form onSubmit={manejarEnvio} className="flex min-h-0 flex-1 flex-col">
          <div className="overflow-y-auto p-6">
            <h2 className="text-lg font-bold">Nueva reserva</h2>
            <p className="mt-1 text-sm text-muted">
              Registra una reserva hecha en persona o por WhatsApp. Queda como PENDIENTE, igual que
              cualquier solicitud del sitio público.
            </p>

            {cargandoOpciones && <p className="mt-4 text-sm text-muted">Cargando equipos y provincias...</p>}
            {errorOpciones && (
              <div className="mt-4">
                <ErrorMessage message={errorOpciones} />
              </div>
            )}

            {!cargandoOpciones && !errorOpciones && (
              <div className="mt-4 flex flex-col gap-4">
                {/* --- Equipos: único campo que no existe en el formulario
                    público (ahí los equipos ya vienen del carrito, ver
                    CarritoContext.tsx). SELECCIÓN MÚLTIPLE (checkboxes):
                    una reserva ahora puede incluir varios equipos para el
                    mismo evento, así que ya no sirve un selector de un
                    solo valor como SelectorPersonalizado. --- */}
                <div>
                  <span className="text-sm">Equipos *</span>
                  <div className="mt-1 flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-white/10 bg-background p-2">
                    {equipos.map((equipo) => (
                      <label
                        key={equipo.id}
                        className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={equipoIds.includes(equipo.id)}
                          onChange={() => alternarEquipo(equipo.id)}
                          className="accent-brand-purple"
                        />
                        {equipo.nombre}
                      </label>
                    ))}
                  </div>
                </div>

                {/* --- Calendario: solo se puede elegir fecha una vez
                    elegida al menos un equipo (la combinación de equipos
                    tiene su propia disponibilidad cruzada). La "key" se
                    arma con los ids ordenados: fuerza a remontar el
                    calendario cada vez que cambia la SELECCIÓN de equipos
                    (agregar o quitar uno), para que pida de nuevo la
                    disponibilidad de esa combinación en vez de seguir
                    mostrando la anterior. --- */}
                <div>
                  <span className="text-sm">Fecha del evento *</span>
                  {equipoIds.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">Elige al menos un equipo para ver su disponibilidad.</p>
                  ) : (
                    <div className="mt-2">
                      <CalendarioDisponibilidad
                        key={equipoIds.slice().sort((a, b) => a - b).join(",")}
                        equipoIds={equipoIds}
                        fechaSeleccionada={fechaSeleccionada}
                        onFechaSeleccionada={setFechaSeleccionada}
                      />
                    </div>
                  )}
                </div>

                <label className="flex flex-col gap-1 text-sm">
                  Nombre completo del cliente *
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    required
                    className="rounded-lg border border-white/10 bg-background px-4 py-2 text-foreground outline-none focus:border-brand-purple"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Teléfono *
                  <input
                    type="tel"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    required
                    placeholder="Ej. 809 555 1234"
                    className="rounded-lg border border-white/10 bg-background px-4 py-2 text-foreground outline-none focus:border-brand-purple"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  Email (opcional)
                  <input
                    type="email"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="rounded-lg border border-white/10 bg-background px-4 py-2 text-foreground outline-none focus:border-brand-purple"
                  />
                  {/* Nota explícita del porqué: sin esto, un admin podría
                      no entender por qué después no puede enviar la
                      factura de esta reserva por correo. */}
                  <span className="text-xs text-muted">
                    Opcional, necesario solo si quieres enviarle factura por correo.
                  </span>
                </label>

                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="flex flex-1 flex-col gap-1 text-sm">
                    <span>Hora de inicio *</span>
                    <SelectorHora valor={horaInicio} onChange={setHoraInicio} />
                  </div>
                  <div className="flex flex-1 flex-col gap-1 text-sm">
                    <span>Hora de fin *</span>
                    <SelectorHora valor={horaFin} onChange={setHoraFin} />
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    Provincia *
                    <SelectorPersonalizado
                      opciones={provincias.map((provincia) => ({ valor: provincia.id, etiqueta: provincia.nombre }))}
                      valor={provinciaId}
                      onChange={setProvinciaId}
                      placeholder="Selecciona una provincia"
                      className="rounded-lg border border-white/10 bg-background px-4 py-2 text-foreground outline-none focus:border-brand-purple"
                    />
                  </label>

                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    Municipio *
                    <input
                      type="text"
                      value={municipio}
                      onChange={(e) => setMunicipio(e.target.value)}
                      required
                      placeholder="Ej. Boca Chica"
                      className="rounded-lg border border-white/10 bg-background px-4 py-2 text-foreground outline-none focus:border-brand-purple"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm">
                  Notas adicionales (opcional)
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                    placeholder="Ej. dirección, requerimientos especiales..."
                    className="rounded-lg border border-white/10 bg-background px-4 py-2 text-foreground outline-none focus:border-brand-purple"
                  />
                </label>

                {errorValidacion && <ErrorMessage message={errorValidacion} />}
                {errorEnvio && <ErrorMessage message={errorEnvio} />}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 p-6 pt-4">
            <Button type="button" variant="secondary" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando || cargandoOpciones}>
              {enviando ? "Creando..." : "Crear reserva"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
