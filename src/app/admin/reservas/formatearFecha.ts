// ==========================================
// Formatea la fecha del evento de una reserva para mostrarla en pantalla.
//
// "fechaEvento" llega del backend como ISO en UTC medianoche (ej.
// "2026-09-25T00:00:00.000Z"), representando el día 25 sin importar la
// zona horaria (ver la misma explicación en CalendarioDisponibilidad.tsx).
// Si se formateara con la zona horaria LOCAL del navegador, en una zona
// detrás de UTC se mostraría el día 24 en vez del 25. Por eso se fuerza
// timeZone: "UTC" al formatear, en vez de dejar que Intl use la del navegador.
// ==========================================

export function formatearFechaEvento(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

// "createdAt" sí es un instante real (cuándo se envió la solicitud): acá
// mostrarlo en la hora local del navegador es correcto, no hace falta
// forzar UTC como arriba.
export function formatearFechaCreacion(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
