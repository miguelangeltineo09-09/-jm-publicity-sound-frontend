// ==========================================
// Formulario de solicitud de reserva.
// Client Component: combina el calendario de disponibilidad con los datos
// de contacto del cliente, valida todo en el navegador antes de llamar al
// backend, y maneja los estados de envío/éxito/error (incluyendo el 409
// cuando alguien más confirmó esa fecha mientras el cliente llenaba el form).
//
// CAMBIO DE RELACIÓN CLAVE: antes este formulario reservaba UN equipo fijo
// (recibía "equipoId"/"precioEquipo" como props, ya conocidos por la
// página que lo renderizaba). Ahora una reserva puede incluir VARIOS
// equipos para el mismo evento — la lista de equipos elegidos viene del
// carrito de reserva (ver CarritoContext.tsx / src/app/(site)/reservar/page.tsx)
// y se recibe acá como "equipos" (el array completo, no solo sus ids): la
// cotización necesita el precio de CADA UNO para desglosarlos en líneas
// separadas, igual que antes se mostraba una sola línea de "Precio del equipo".
// ==========================================

"use client";

import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/Button";
import CalendarioDisponibilidad from "@/components/CalendarioDisponibilidad";
import ErrorMessage from "@/components/ErrorMessage";
import SelectorHora from "@/components/SelectorHora";
import SelectorPersonalizado from "@/components/SelectorPersonalizado";
import { useCarrito } from "@/context/CarritoContext";
import { ApiError, crearReserva, getProvincias } from "@/lib/api";
import { formatearMoneda } from "@/lib/formato";
import type { Equipo, Provincia } from "@/types";

interface FormularioReservaProps {
  // Todos los equipos elegidos para este evento (mínimo 1), tal como
  // quedaron en el carrito de reserva.
  equipos: Equipo[];
  // Se llama justo al confirmarse el envío exitoso, ANTES de vaciar el
  // carrito. Por qué hace falta: la página que renderiza este formulario
  // (src/app/(site)/reservar/page.tsx) decide qué mostrar mirando si el
  // carrito tiene equipos — pero este mismo componente vacía el carrito al
  // enviar con éxito (ver manejarEnvio), así que sin avisarle al padre,
  // ese carrito recién vaciado haría que la página piense que "no hay
  // nada que reservar" y reemplace esta pantalla de confirmación por el
  // aviso de "carrito vacío" antes de que el cliente llegue a verla.
  onExito?: () => void;
}

// Validación básica de teléfono: al menos 7 dígitos, y solo caracteres
// esperables en un número de teléfono (dígitos, espacios, +, -, paréntesis).
function telefonoValido(valor: string): boolean {
  const soloDigitos = valor.replace(/\D/g, "");
  return soloDigitos.length >= 7 && /^[\d\s()+-]+$/.test(valor);
}

// Validación básica de formato de email. El campo ahora es obligatorio (el
// backend lo exige para poder enviar la factura más adelante), así que esto
// se valida siempre, no solo cuando el campo viene lleno.
function emailValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

// Compara dos horas en formato "HH:mm" de 24h (lo que entrega SelectorHora,
// ya convertido internamente desde su formato visual de 12h+AM/PM) como
// strings: al tener ambas el mismo formato de ancho fijo, compararlas como
// texto ya da el orden cronológico correcto, sin necesidad de armar
// objetos Date.
function horaFinPosterior(horaInicio: string, horaFin: string): boolean {
  return horaFin > horaInicio;
}

// Convierte la fecha elegida en el calendario (un Date en horario LOCAL del
// navegador) a un string "YYYY-MM-DD". Importante: no se usa
// `fecha.toISOString()` porque esa función convierte a UTC, y eso puede
// correr la fecha un día para atrás en zonas horarias detrás de UTC (ej.
// México). Armar el string a mano con los componentes locales garantiza que
// el día que ve y elige el cliente sea exactamente el día que recibe el backend.
function formatearFechaISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

export default function FormularioReserva({ equipos, onExito }: FormularioReservaProps) {
  // Se usa para vaciar el carrito al enviar la solicitud con éxito (ver
  // manejarEnvio más abajo): esa selección ya se envió, no debe seguir
  // apareciendo como "pendiente de reservar" en el indicador del Header.
  const { limpiarCarrito } = useCarrito();
  const equipoIds = equipos.map((equipo) => equipo.id);

  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>(undefined);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [municipio, setMunicipio] = useState("");
  // "" = todavía no elige ninguna provincia (no es un id válido).
  const [provinciaId, setProvinciaId] = useState<number | "">("");
  const [notas, setNotas] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  // --- Provincias para el select y la cotización en tiempo real ---
  // Público (no hace falta token): cualquier visitante armando una
  // solicitud de reserva necesita esta lista.
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cargandoProvincias, setCargandoProvincias] = useState(true);

  useEffect(() => {
    let cancelado = false;
    getProvincias()
      .then((datos) => {
        if (!cancelado) setProvincias(datos);
      })
      .catch(() => {
        // Si falla, el select de provincia queda vacío: no bloquea el
        // resto del formulario (el cliente sigue pudiendo completar sus
        // datos), pero no podrá enviarlo sin elegir una — la validación
        // de más abajo ya lo exige.
      })
      .finally(() => {
        if (!cancelado) setCargandoProvincias(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Provincia elegida (objeto completo, para leer su precioViaje) y el
  // desglose de cotización, recalculado en cada render — no hace falta
  // memoizar algo tan liviano como sumar unos pocos números. Antes había
  // un solo "precioEquipoNumerico"; ahora se suma el precio de CADA equipo
  // del carrito (ver "equipos" en las props), uno por línea en el JSX de
  // más abajo.
  const provinciaSeleccionada = provincias.find((provincia) => provincia.id === provinciaId) ?? null;
  const precioViajeNumerico = provinciaSeleccionada ? Number(provinciaSeleccionada.precioViaje) : 0;
  const subtotalEquipos = equipos.reduce((suma, equipo) => suma + Number(equipo.precio), 0);
  const totalEstimado = subtotalEquipos + precioViajeNumerico;

  // Cambia cada vez que el backend rechaza por 409: al usarse como "key" del
  // calendario en el JSX, fuerza a React a desmontarlo y montarlo de nuevo,
  // lo que dispara un fetch fresco de disponibilidad (ver CalendarioDisponibilidad.tsx).
  const [intentosReserva, setIntentosReserva] = useState(0);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    // Evita un doble envío si el usuario alcanza a hacer clic/Enter dos veces
    // antes de que React desactive el botón.
    if (enviando) return;

    setErrorEnvio(null);

    // --- Validación en el cliente, antes de tocar la red ---
    if (!fechaSeleccionada) {
      setErrorValidacion("Elige una fecha disponible en el calendario.");
      return;
    }
    if (!clienteNombre.trim()) {
      setErrorValidacion("El nombre completo es obligatorio.");
      return;
    }
    if (!clienteTelefono.trim() || !telefonoValido(clienteTelefono.trim())) {
      setErrorValidacion("Ingresa un teléfono válido (mínimo 7 dígitos).");
      return;
    }
    if (!clienteEmail.trim() || !emailValido(clienteEmail.trim())) {
      setErrorValidacion("Ingresa un email válido: lo necesitamos para enviarte la factura.");
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
    // El precio del equipo NO incluye viaje ni dieta (ver la cotización más
    // abajo): sin provincia/municipio no se puede calcular ese costo, así
    // que ambos campos son obligatorios.
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
      await crearReserva({
        equipoIds,
        fechaEvento: formatearFechaISO(fechaSeleccionada),
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono.trim(),
        clienteEmail: clienteEmail.trim(),
        horaInicio,
        horaFin,
        municipio: municipio.trim(),
        provinciaId,
        notas: notas.trim() || undefined,
      });
      // Avisa al padre ANTES de vaciar el carrito (ver el comentario de
      // "onExito" en las props): así la página puede recordar que la
      // solicitud se envió con éxito y no reemplace esta confirmación por
      // el aviso de "carrito vacío" en cuanto limpiarCarrito() la deje sin
      // equipos.
      onExito?.();
      limpiarCarrito();
      setEnviado(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Alguien confirmó esa fecha mientras el cliente llenaba el formulario:
        // se limpia la selección y se refresca el calendario para que elija otra.
        setErrorEnvio(err.message);
        setFechaSeleccionada(undefined);
        setIntentosReserva((n) => n + 1);
      } else {
        setErrorEnvio(err instanceof Error ? err.message : "No se pudo enviar la solicitud.");
      }
    } finally {
      setEnviando(false);
    }
  }

  // --- Confirmación tras un envío exitoso: reemplaza todo el formulario ---
  // (borde morado de marca, antes cian, consistente con el resto del sitio)
  if (enviado) {
    return (
      <div role="status" className="rounded-xl border border-brand-purple/30 bg-background-surface p-8 text-center">
        <h2 className="text-xl font-bold">¡Solicitud enviada!</h2>
        <p className="mt-3 text-muted">
          Tu solicitud fue enviada, nos pondremos en contacto para confirmar tu reserva. Esto
          todavía <strong>no es una reserva confirmada</strong>: el equipo la revisa y te
          contactará para acordar los detalles.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={manejarEnvio} className="flex flex-col gap-8">
      {/* --- Calendario: elige la fecha del evento --- */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">1. Elige la fecha</h2>
        <CalendarioDisponibilidad
          key={intentosReserva}
          equipoIds={equipoIds}
          fechaSeleccionada={fechaSeleccionada}
          onFechaSeleccionada={setFechaSeleccionada}
        />
      </div>

      {/* --- Datos de contacto del cliente ---
          Los campos usan "bg-transparent" (antes "bg-background-surface"):
          la sección "1. Elige la fecha" de arriba no le pone ningún fondo
          propio al calendario, así que se ve tal cual el fondo base de la
          página (el degradado del <body>). Si los inputs de acá abajo
          llevan un fondo "surface" (un morado más claro, pensado para
          tarjetas elevadas), esta sección se lee como un bloque aparte,
          con un corte de color notorio contra el calendario. Dejándolos
          transparentes, ambas secciones se mezclan con la misma base y el
          borde ("border-white/10") sigue marcando el campo sin necesitar
          un fondo propio. --- */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">2. Tus datos</h2>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Nombre completo *
            <input
              type="text"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              required
              className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-foreground outline-none focus:border-brand-purple"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Teléfono *
            <input
              type="tel"
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
              required
              placeholder="Ej. 55 1234 5678"
              className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-foreground outline-none focus:border-brand-purple"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Email *
            <input
              type="email"
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
              required
              placeholder="tucorreo@ejemplo.com"
              className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-foreground outline-none focus:border-brand-purple"
            />
          </label>

          {/* Horario del evento: se usa SelectorHora (en vez de un input
              type="time" nativo) para que el formato visual (12h + AM/PM)
              sea siempre el mismo para cualquier visitante, sin depender de
              la configuración regional de su navegador. Cada selector sigue
              entregando la hora ya en "HH:mm" de 24h, igual que antes. */}
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

          {/* Ubicación del evento: la provincia decide el costo de viaje
              (ver la cotización más abajo), y el municipio es el dato
              puntual que necesita la logística de entrega/recogida. */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Provincia *
              {/* Dropdown personalizado (no un <select> nativo): así se
                  controla el 100% de los colores de la lista desplegable
                  (ver el comentario al inicio de SelectorPersonalizado.tsx). */}
              <SelectorPersonalizado
                opciones={provincias.map((provincia) => ({ valor: provincia.id, etiqueta: provincia.nombre }))}
                valor={provinciaId}
                onChange={setProvinciaId}
                placeholder={cargandoProvincias ? "Cargando provincias..." : "Selecciona una provincia"}
                disabled={cargandoProvincias}
                className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-foreground outline-none focus:border-brand-purple disabled:opacity-50"
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
                className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-foreground outline-none focus:border-brand-purple"
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
              className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-foreground outline-none focus:border-brand-purple"
            />
          </label>
        </div>
      </div>

      {/* --- Cotización estimada: resumen antes de enviar. Se recalcula en
          tiempo real conforme el cliente elige la provincia (ver
          provinciaSeleccionada/totalEstimado más arriba). Antes había una
          sola línea "Precio del equipo"; ahora se lista CADA equipo del
          carrito con su propio precio (mismo patrón visual, solo que en
          una lista en vez de una línea fija), y el costo de viaje se
          agrega una sola vez al final (es un cargo por evento, no por
          equipo). --- */}
      <div className="rounded-xl border border-white/10 bg-background-surface p-5">
        <h3 className="mb-3 text-sm font-semibold">Cotización estimada</h3>

        {/* "flex-wrap gap-x-2 gap-y-1" en cada fila (antes solo
            "justify-between"): con la etiqueta más larga ("Costo de viaje
            (incluye dieta)") y un monto de varias cifras, en un celular
            muy angosto (320px) ambos ya no entran en una sola línea; con
            "justify-between" a secas el monto quedaba pegado al borde
            derecho, a veces cortado visualmente. Con "flex-wrap" el monto
            simplemente pasa a su propia línea en vez de recortarse. */}
        <div className="flex flex-col gap-1.5 text-sm text-muted">
          {equipos.map((equipo) => (
            <div key={equipo.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span>{equipo.nombre}</span>
              <span>{formatearMoneda(Number(equipo.precio))}</span>
            </div>
          ))}

          {provinciaSeleccionada ? (
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span>Costo de viaje (incluye dieta)</span>
              <span>{formatearMoneda(precioViajeNumerico)}</span>
            </div>
          ) : (
            <p className="text-xs">Selecciona tu provincia para ver el total con viaje incluido.</p>
          )}
        </div>

        {/* Total destacado: degradado de marca, para que sea lo más
            visible del bloque (a diferencia de las líneas de arriba, en
            tono secundario). Mismo "flex-wrap" defensivo que las filas de
            arriba. */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-white/10 pt-3">
          <span className="font-semibold">Total estimado</span>
          <span className="text-gradient-brand text-xl font-bold">{formatearMoneda(totalEstimado)}</span>
        </div>

        <p className="mt-3 text-xs text-muted">
          Este total es solo un estimado: tu solicitud queda <strong>pendiente de revisión</strong>, no
          es una reserva confirmada todavía. El equipo puede ajustarlo al ponerse en contacto contigo.
        </p>
      </div>

      {/* --- Errores y envío --- */}
      {errorValidacion && <ErrorMessage message={errorValidacion} />}
      {errorEnvio && <ErrorMessage message={errorEnvio} />}

      <Button type="submit" disabled={enviando} className="w-full sm:w-fit">
        {enviando ? "Enviando..." : "Enviar solicitud"}
      </Button>
    </form>
  );
}
