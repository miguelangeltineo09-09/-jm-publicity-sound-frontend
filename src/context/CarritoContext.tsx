// ==========================================
// Contexto del "carrito de reserva" del sitio público.
//
// POR QUÉ EXISTE: el backend ahora permite que una reserva incluya VARIOS
// equipos para el mismo evento (una sola fecha/horario, ver el comentario
// de ReservaEquipo en src/types/index.ts), en vez de la relación anterior
// de "un equipo por reserva". Antes de este cambio, el cliente reservaba
// un equipo a la vez desde su propia página de detalle
// (/catalogo/[id]/reservar); ahora necesita poder ir eligiendo equipos
// desde el catálogo y la ficha de cada uno ANTES de llenar el formulario
// de reserva, acumulándolos en una "solicitud" que se envía junta.
//
// Este contexto guarda esa selección en memoria (useState, para que React
// re-renderice el contador del Header y demás UI que dependa de ella) y en
// localStorage (para que sobreviva a un F5 mientras el cliente sigue
// navegando el catálogo) — mismo patrón y mismo razonamiento de por qué
// localStorage es válido aquí que AuthContext.tsx (esta es una app Next.js
// real corriendo en el propio navegador del cliente, no un artifact
// compartido).
//
// Se guarda el objeto Equipo COMPLETO (no solo su id) para poder mostrar
// nombre/precio/imagen en el indicador del Header y en la página "Mi
// solicitud" sin tener que volver a pedirle cada equipo al backend. El
// precio final siempre lo revalida el backend al crear la reserva (404 si
// un equipo ya no existe, 409 si ya está ocupado esa fecha), así que un
// dato ligeramente desactualizado en el carrito (ej. el admin cambió el
// precio mientras el equipo esperaba en el carrito) no genera una reserva
// incorrecta — solo una cotización estimada que el backend puede corregir.
// ==========================================

"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Equipo } from "@/types";

const CLAVE_STORAGE = "jm-publicity-sound:carrito-reserva";

interface CarritoContextValue {
  equipos: Equipo[];
  // true solo durante el primer render, mientras se revisa localStorage
  // (mismo patrón que "cargandoSesion" en AuthContext) — evita que la UI
  // muestre "carrito vacío" por un instante antes de saber si en realidad
  // ya había equipos guardados de una visita anterior.
  cargandoCarrito: boolean;
  agregarEquipo: (equipo: Equipo) => void;
  quitarEquipo: (equipoId: number) => void;
  limpiarCarrito: () => void;
  estaEnCarrito: (equipoId: number) => boolean;
}

const CarritoContext = createContext<CarritoContextValue | undefined>(undefined);

// Lee el carrito guardado de una visita anterior. Envuelto en try/catch
// porque localStorage puede no estar disponible (ej. modo privado con
// storage bloqueado) o el JSON guardado puede estar corrupto — en
// cualquiera de esos casos, se arranca con un carrito vacío en vez de
// romper la carga de la página.
function leerCarritoGuardado(): Equipo[] {
  try {
    const crudo = localStorage.getItem(CLAVE_STORAGE);
    return crudo ? JSON.parse(crudo) : [];
  } catch {
    return [];
  }
}

function guardarCarrito(equipos: Equipo[]): void {
  try {
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(equipos));
  } catch {
    // Si falla (storage lleno o bloqueado), el carrito sigue funcionando
    // en memoria durante esta sesión; simplemente no persiste a un F5.
  }
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [cargandoCarrito, setCargandoCarrito] = useState(true);

  // Igual que AuthContext: leer localStorage debe pasar en un efecto (no en
  // el valor inicial de useState), porque no existe durante el renderizado
  // en el servidor y leerlo antes de la hidratación produciría un mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEquipos(leerCarritoGuardado());
    setCargandoCarrito(false);
  }, []);

  // Se escribe a localStorage DENTRO de cada acción (no en un efecto que
  // observe "equipos"): un efecto así se dispararía también en el montaje
  // inicial, antes de que el efecto de arriba termine de leer el valor
  // guardado, y sobrescribiría el carrito real con un array vacío — mismo
  // motivo por el que AuthContext.login/logout escriben directo en vez de
  // depender de un efecto sobre "token".
  const agregarEquipo = useCallback((equipo: Equipo) => {
    setEquipos((actual) => {
      if (actual.some((e) => e.id === equipo.id)) return actual;
      const nuevo = [...actual, equipo];
      guardarCarrito(nuevo);
      return nuevo;
    });
  }, []);

  const quitarEquipo = useCallback((equipoId: number) => {
    setEquipos((actual) => {
      const nuevo = actual.filter((e) => e.id !== equipoId);
      guardarCarrito(nuevo);
      return nuevo;
    });
  }, []);

  // Se llama al enviar con éxito una solicitud de reserva (ver
  // FormularioReserva.tsx): la selección ya se envió, no debe seguir
  // apareciendo como "pendiente de reservar".
  const limpiarCarrito = useCallback(() => {
    setEquipos([]);
    guardarCarrito([]);
  }, []);

  const estaEnCarrito = useCallback(
    (equipoId: number) => equipos.some((e) => e.id === equipoId),
    [equipos]
  );

  return (
    <CarritoContext.Provider
      value={{ equipos, cargandoCarrito, agregarEquipo, quitarEquipo, limpiarCarrito, estaEnCarrito }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito(): CarritoContextValue {
  const context = useContext(CarritoContext);
  if (!context) {
    throw new Error("useCarrito() debe usarse dentro de un <CarritoProvider>.");
  }
  return context;
}
