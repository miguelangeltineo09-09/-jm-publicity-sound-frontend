// ==========================================
// Constantes de estilo reutilizables: el "hover interactivo estándar" del
// sitio.
//
// Antes, cada componente escribía su propia clase de transición (algunos
// "transition-colors" solo, otros "transition-all", casi ninguno con una
// duración explícita) — Tailwind aplica 150ms por defecto en esos casos,
// que se siente brusco/instantáneo. Estas constantes centralizan el
// TIMING estándar (300ms) en un solo lugar: cualquier componente nuevo
// debe usar una de estas en vez de escribir "transition-colors" o
// "transition-all" sueltos, para que todo el sitio se sienta igual de
// fluido y, si el timing cambia algún día, alcance con editarlo acá.
//
// El COLOR de destino del hover sigue siendo responsabilidad de cada
// componente (varía: rosa en la navegación, degradado en el botón
// primario, morado claro en el secundario, etc.) — estas constantes solo
// estandarizan la transición en sí, no a qué color/tamaño se llega.
// ==========================================

// Para hovers que solo cambian color/fondo/borde (el caso más común: links
// de navegación, texto de botones, filas de tabla).
export const TRANSICION_HOVER = "transition-colors duration-300";

// Para hovers que además animan otras propiedades a la vez (transform,
// box-shadow, opacidad) — ej. una tarjeta que se eleva Y cambia de borde.
export const TRANSICION_HOVER_COMPLETA = "transition-all duration-300";

// Para hovers que SOLO animan transform (ej. el zoom sutil de una imagen).
// Separado de "TRANSICION_HOVER_COMPLETA" porque animar únicamente
// "transform" es más liviano que "all" cuando no hace falta nada más.
export const TRANSICION_HOVER_TRANSFORM = "transition-transform duration-300";
