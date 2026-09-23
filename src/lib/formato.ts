// ==========================================
// Utilidades de formato de números/moneda, compartidas por todo el
// frontend (sitio público y panel admin).
//
// Por qué existe: cada pantalla armaba su propio string de precio a mano
// (ej. `$${Number(equipo.precio).toFixed(2)}`), lo que mostraba
// "$45000.00" — punto de miles ausente y dos centavos de más. En
// República Dominicana el dinero se muestra con COMA como separador de
// miles y SIN centavos (ej. "RD$45,000"). Centralizar el formato en una
// sola función evita que cada pantalla repita (o se olvide de) esa regla.
// ==========================================

/**
 * Formatea un número como moneda de República Dominicana: prefijo "RD$",
 * coma como separador de miles, sin decimales (si el valor trae
 * centavos, se redondea antes de formatear). Ej: formatearMoneda(45000.5)
 * -> "RD$45,001".
 *
 * Se usa la configuración regional "en-US" a propósito (no la del
 * navegador de quien visita el sitio): es la que agrupa los miles con
 * coma y los decimales con punto, que es exactamente el formato de
 * moneda dominicano pedido acá — así el resultado es siempre el mismo
 * sin importar el idioma/región configurado en el dispositivo de cada visitante.
 */
export function formatearMoneda(valor: number): string {
  const redondeado = Math.round(valor);
  return `RD$${redondeado.toLocaleString("en-US")}`;
}
