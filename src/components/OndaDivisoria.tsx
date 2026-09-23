// ==========================================
// Franja ondulada decorativa, usada como separador visual entre secciones
// (ej. entre el Hero y "Categorías destacadas" en la home).
//
// Ahora animada para sentirse "viva", como un ecualizador de DJ en
// movimiento:
// 1. Las 3 capas de onda se desplazan horizontalmente en bucle infinito,
//    cada una a una velocidad distinta (parallax sutil) — ver las clases
//    ".onda-capa*" y su @keyframes en globals.css.
// 2. Una fila de barras verticales, superpuesta sobre la base sólida de la
//    onda, pulsa como una pista de audio real sonando.
//
// Sigue siendo un componente sin estado ni interactividad (no necesita
// "use client": toda la animación es CSS puro), y puramente decorativo
// (aria-hidden): no depende de audio real ni de ninguna librería.
// ==========================================

// Cantidad de barras del ecualizador. Dentro del rango pedido (20-40):
// ni tan pocas que se vean espaciadas, ni tantas que se vuelvan un bloque
// sólido en pantallas angostas.
const CANTIDAD_BARRAS = 32;

// Generador pseudoaleatorio DETERMINÍSTICO (mismo índice -> mismo valor
// siempre). Se usa en vez de Math.random() para variar la altura base, la
// duración y el delay de cada barra: con Math.random() cada re-render
// sacaría números distintos, y este componente puede evaluarse en el
// servidor (Server Component) — el resultado debe ser el mismo sin
// importar dónde se calcule. Devuelve un valor en [0, 1).
function pseudoAleatorio(semilla: number): number {
  const x = Math.sin(semilla * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Un solo path de onda, dibujado DOS veces dentro del mismo <g>: la
// segunda copia desplazada exactamente un ancho de viewport (1440) a la
// derecha. Es lo que permite animar el <g> completo con
// "translateX(-100%)" en bucle infinito sin que se note el reinicio (ver
// el comentario largo en globals.css, junto a "@keyframes
// onda-desplazamiento"): al terminar el recorrido, la copia duplicada ya
// está exactamente donde arrancó la original.
function CapaOnda({ d, opacidad, claseVelocidad }: { d: string; opacidad: number; claseVelocidad: string }) {
  return (
    <g className={`onda-capa ${claseVelocidad}`}>
      <path d={d} fill="url(#ondaDegradadoMarca)" opacity={opacidad} />
      <path d={d} fill="url(#ondaDegradadoMarca)" opacity={opacidad} transform="translate(1440 0)" />
    </g>
  );
}

export default function OndaDivisoria() {
  return (
    // Contenedor de la franja completa: la altura responsive (antes vivía
    // en el propio <svg>) ahora vive acá, porque el <svg> de las ondas y el
    // overlay de barras del ecualizador se superponen dentro de él con
    // "position: absolute".
    <div aria-hidden="true" className="relative h-24 w-full overflow-hidden sm:h-32 md:h-40">
      {/* --- Capas de onda animadas --- */}
      <svg viewBox="0 0 1440 240" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          {/* Un solo degradado, reutilizado por las 3 capas vía "url(#...)":
              así, si se ajusta el color de marca, solo hay que tocarlo acá. */}
          <linearGradient id="ondaDegradadoMarca" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="55%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>

        {/* Capa de atrás: la más tenue y la más lenta (sensación de estar
            más lejos). */}
        <CapaOnda
          d="M0,100 C120,70 240,130 360,100 C480,70 600,130 720,100 C840,70 960,130 1080,100 C1200,70 1320,130 1440,100 L1440,240 L0,240 Z"
          opacidad={0.22}
          claseVelocidad="onda-capa-atras"
        />

        {/* Capa intermedia: distinta fase/amplitud y velocidad media. */}
        <CapaOnda
          d="M0,150 C120,190 240,110 360,150 C480,190 600,110 720,150 C840,190 960,110 1080,150 C1200,190 1320,110 1440,150 L1440,240 L0,240 Z"
          opacidad={0.45}
          claseVelocidad="onda-capa-media"
        />

        {/* Capa del frente: la más opaca y la más rápida (sensación de
            estar más cerca) — define la silueta principal de la franja. */}
        <CapaOnda
          d="M0,180 C90,150 210,210 330,180 C450,150 570,210 690,180 C810,150 930,210 1050,180 C1170,150 1290,210 1410,180 L1440,182 L1440,240 L0,240 Z"
          opacidad={0.85}
          claseVelocidad="onda-capa-frente"
        />
      </svg>

      {/* --- Ecualizador: fila de barras superpuesta sobre la base sólida
          de la onda (la zona inferior, donde las 3 capas ya se ven
          completamente opacas). "items-end" + "bottom-0" anclan cada barra
          por abajo, para que crezcan hacia arriba como en un ecualizador
          real; "overflow-hidden" en el contenedor de arriba es la red de
          seguridad para que ninguna barra, en el peor de los casos, se
          salga de la franja. --- */}
      <div className="absolute inset-x-0 bottom-0 flex h-[45%] items-end gap-[3px] px-2 sm:gap-1">
        {Array.from({ length: CANTIDAD_BARRAS }, (_, indice) => {
          // Altura base distinta por barra (25%-80% del carril): sin esto,
          // todas las barras "descansarían" a la misma altura y solo se
          // notaría la animación, en vez de verse ya de entrada como una
          // pista de audio real (con picos y valles).
          const alturaBase = 25 + pseudoAleatorio(indice) * 55;
          // Duración y delay únicos por barra: junto con las 4 formas de
          // @keyframes (asignadas más abajo por "indice % 4"), esto es lo
          // que evita que se vean sincronizadas entre sí. El delay es
          // NEGATIVO a propósito: hace que la barra arranque ya a mitad de
          // su ciclo en vez de que las 32 arranquen desde cero al mismo
          // tiempo cuando carga la página.
          const duracion = 0.7 + pseudoAleatorio(indice * 3 + 1) * 0.9;
          const retraso = -pseudoAleatorio(indice * 7 + 5) * duracion;

          return (
            <span
              key={indice}
              className={`barra-ecualizador barra-ecualizador-${indice % 4} flex-1 rounded-full bg-white/35`}
              style={{
                height: `${alturaBase}%`,
                animationDuration: `${duracion.toFixed(2)}s`,
                animationDelay: `${retraso.toFixed(2)}s`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
