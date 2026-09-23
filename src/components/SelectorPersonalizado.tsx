// ==========================================
// Reemplazo de un <select> nativo por un dropdown 100% estilizado con
// Tailwind, usando los colores de la paleta del sitio.
//
// Por qué existe: los navegadores no permiten estilizar por completo la
// lista desplegable interna de un <select> nativo — el <select> en sí se
// puede pintar con CSS normal, pero sus <option> abren un popup que cada
// navegador dibuja con SUS PROPIOS colores del sistema (típicamente fondo
// blanco y texto gris oscuro), ignorando en buena medida el CSS de la
// página. El resultado era una lista casi ilegible sobre el fondo oscuro
// del sitio. Este componente dibuja su propia lista (un <div>
// posicionado absoluto) en vez de depender del <select> del navegador,
// así el 100% de los colores quedan bajo nuestro control.
//
// No se usó ninguna librería (Radix UI, Headless UI, shadcn/ui): el
// proyecto no tiene ninguna instalada todavía (ver package.json), y
// agregar una dependencia nueva solo para este ajuste puntual sería
// desproporcionado — un dropdown de este tamaño es simple de armar a mano.
// ==========================================

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TRANSICION_HOVER } from "@/lib/estilos";

export interface OpcionSelectorPersonalizado<T extends string | number> {
  valor: T;
  etiqueta: string;
}

interface SelectorPersonalizadoProps<T extends string | number> {
  opciones: OpcionSelectorPersonalizado<T>[];
  valor: T;
  onChange: (valor: T) => void;
  placeholder?: string;
  disabled?: boolean;
  // Clases del botón disparador (el "input" visible): cada pantalla que
  // usa este componente pasa las mismas clases que ya usaba en su
  // <select> nativo (ej. "bg-background" en los modales del admin,
  // "bg-transparent" en el formulario público), para que se integre
  // exactamente igual que antes en su contexto.
  className?: string;
}

export default function SelectorPersonalizado<T extends string | number>({
  opciones,
  valor,
  onChange,
  placeholder = "Selecciona una opción",
  disabled = false,
  className = "",
}: SelectorPersonalizadoProps<T>) {
  // Id estable para enlazar el botón con su lista vía aria-controls (lo
  // exige el rol "combobox"), aunque la lista todavía no esté en el DOM
  // mientras el dropdown está cerrado.
  const idLista = useId();

  const [abierto, setAbierto] = useState(false);
  // Índice resaltado con el teclado (flechas arriba/abajo) o el mouse
  // (hover): no es necesariamente el ya seleccionado.
  const [indiceActivo, setIndiceActivo] = useState(0);

  const contenedorRef = useRef<HTMLDivElement>(null);
  // Referencias a cada <li> de la lista, para poder desplazarla
  // (scrollIntoView) hasta la opción resaltada al navegar con teclado.
  const refsOpciones = useRef<(HTMLLIElement | null)[]>([]);

  // Ver el comentario largo junto al botón, más abajo: se usa para
  // ignorar un "click" fantasma que Chromium dispara sobre el botón
  // justo después de elegir una opción con el mouse.
  const ignorarProximoClicBoton = useRef(false);

  const indiceSeleccionado = opciones.findIndex((opcion) => opcion.valor === valor);
  const opcionSeleccionada = indiceSeleccionado >= 0 ? opciones[indiceSeleccionado] : null;

  // Cierra el dropdown si se hace clic fuera de él. Solo se suscribe al
  // evento mientras está abierto (no en cada render), y se desuscribe al
  // cerrarse o desmontar el componente.
  useEffect(() => {
    if (!abierto) return;

    function manejarClicFuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }

    document.addEventListener("mousedown", manejarClicFuera);
    return () => document.removeEventListener("mousedown", manejarClicFuera);
  }, [abierto]);

  // Mantiene visible la opción resaltada dentro de la lista (que puede
  // scrollear, ej. las 32 provincias) al navegar con las flechas.
  useEffect(() => {
    if (abierto) {
      refsOpciones.current[indiceActivo]?.scrollIntoView({ block: "nearest" });
    }
  }, [indiceActivo, abierto]);

  function abrir() {
    if (disabled) return;
    // Al abrir, el resaltado arranca en la opción ya seleccionada (o la
    // primera, si todavía no hay ninguna) — no siempre en el índice 0.
    setIndiceActivo(indiceSeleccionado >= 0 ? indiceSeleccionado : 0);
    setAbierto(true);
  }

  function elegir(opcion: OpcionSelectorPersonalizado<T>) {
    onChange(opcion.valor);
    setAbierto(false);

    // Ver el comentario junto al botón: la próxima vez que el botón
    // reciba un "click", puede ser el fantasma que dispara el navegador
    // al restaurarle el foco, no un clic real del usuario.
    ignorarProximoClicBoton.current = true;
    // Red de seguridad: si el navegador NO dispara ese click fantasma
    // (ej. Firefox, donde este comportamiento no ocurre), la bandera se
    // limpia sola en el siguiente tick — así nunca se queda "pegada"
    // ignorando un clic real del usuario más adelante. setTimeout (no
    // una promesa/microtarea) porque el evento fantasma, si llega, lo
    // hace de forma sincrónica en la misma tanda de eventos del click
    // actual, ANTES de que el navegador procese los temporizadores.
    setTimeout(() => {
      ignorarProximoClicBoton.current = false;
    }, 0);
  }

  // Soporte de teclado básico: flechas para moverse, Enter/Espacio para
  // confirmar, Escape para cerrar sin cambiar nada — el mínimo esperable
  // de un <select>, sin intentar replicar cada atajo nativo.
  function manejarTecla(evento: React.KeyboardEvent<HTMLButtonElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      if (!abierto) {
        abrir();
      } else {
        setIndiceActivo((actual) => Math.min(actual + 1, opciones.length - 1));
      }
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      if (!abierto) {
        abrir();
      } else {
        setIndiceActivo((actual) => Math.max(actual - 1, 0));
      }
    } else if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      if (!abierto) {
        abrir();
      } else if (opciones[indiceActivo]) {
        elegir(opciones[indiceActivo]);
      }
    } else if (evento.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    // BUG CORREGIDO: el clic en una opción no seleccionaba nada (parecía
    // no hacer nada, o reabría el dropdown recién cerrado). Se encontraron
    // y corrigieron DOS causas encadenadas, confirmadas instrumentando los
    // eventos nativos del navegador uno por uno:
    //
    // 1. Este <div> tenía antes un "onBlur" pensado para cerrar el
    // dropdown si el foco salía del componente (ej. al presionar Tab). El
    // <li> de cada opción no es focuseable, así que al hacer clic sobre
    // él el navegador le quitaba el foco al botón — eso disparaba ese
    // "onBlur" ANTES de que el "click" de la opción llegara a procesarse,
    // cerrando el dropdown y desmontando el <li> a mitad de camino: el
    // "click" nunca llegaba a ejecutar elegir(). Se quitó ese "onBlur":
    // el listener de "clic afuera" (el useEffect de arriba, que escucha
    // "mousedown" en document) ya cubre el caso real que importa (cerrar
    // al hacer clic en cualquier otro lugar de la página), y Escape ya
    // cubre el cierre por teclado.
    //
    // 2. Al arreglar eso, apareció un segundo problema: Chromium, cuando
    // el elemento que el usuario clickeó (el <li>) se desmonta COMO
    // CONSECUENCIA de ese mismo click (porque elegir() cierra el
    // dropdown), le devuelve el foco al elemento focuseable más cercano
    // que sigue en pantalla (el botón) Y le dispara un "click" sintético
    // de cortesía — reabriendo el dropdown que se acababa de cerrar. La
    // bandera "ignorarProximoClicBoton" (ver elegir() y el onClick de
    // abajo) absorbe específicamente ese click fantasma sin afectar los
    // clics reales del usuario.
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (ignorarProximoClicBoton.current) {
            ignorarProximoClicBoton.current = false;
            return;
          }
          if (abierto) {
            setAbierto(false);
          } else {
            abrir();
          }
        }}
        onKeyDown={manejarTecla}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={idLista}
        className={`flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed ${className}`}
      >
        <span className={opcionSeleccionada ? "" : "text-muted"}>
          {opcionSeleccionada ? opcionSeleccionada.etiqueta : placeholder}
        </span>
        {/* Flecha simple (Unicode, sin librería de iconos, mismo criterio
            que el resto del sitio) que gira al abrir el dropdown. */}
        <span aria-hidden="true" className={`text-muted transition-transform ${abierto ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {abierto && (
        <ul
          id={idLista}
          role="listbox"
          // Fondo "surface" (morado oscuro secundario) + borde sutil,
          // igual tratamiento que cualquier tarjeta/superficie elevada
          // del sitio — esta es la lista que antes dibujaba el navegador
          // con sus propios colores (casi ilegibles sobre el fondo oscuro).
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-white/10 bg-background-surface py-1 shadow-lg shadow-black/40"
        >
          {opciones.map((opcion, indice) => (
            <li
              key={opcion.valor}
              ref={(el) => {
                refsOpciones.current[indice] = el;
              }}
              role="option"
              aria-selected={opcion.valor === valor}
              onClick={() => elegir(opcion)}
              onMouseEnter={() => setIndiceActivo(indice)}
              className={`cursor-pointer px-4 py-2 text-sm ${TRANSICION_HOVER} ${
                indice === indiceActivo
                  ? "bg-brand-purple/20 text-foreground"
                  : opcion.valor === valor
                    ? "text-brand-purple-light"
                    : "text-foreground"
              }`}
            >
              {opcion.etiqueta}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
