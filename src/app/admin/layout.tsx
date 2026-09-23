// ==========================================
// Layout de la zona de administración (/admin/*).
// Protege TODAS las rutas hijas excepto /admin/login: si no hay sesión,
// redirige al login; mientras se confirma si hay sesión guardada, muestra
// un spinner (evita el parpadeo de mostrar contenido protegido un instante
// antes de redirigir). Si hay sesión, dibuja el "shell" del admin
// (sidebar + botón de cerrar sesión) alrededor de la página pedida.
//
// RESPONSIVO (revisión completa del panel para móvil/tablet): el sidebar
// fijo de 224px (w-56) que antes se veía SIEMPRE, incluso en un celular de
// 320px, no cabía junto al contenido — quedaba comprimido o forzaba scroll
// horizontal de toda la página. Mismo patrón de menú hamburguesa que YA
// funciona en el sitio público (ver src/components/Header.tsx: un botón
// que alterna un estado "menuAbierto", con el mismo ícono de 3 líneas que
// se anima a una X): acá se adapta a un panel LATERAL deslizante en vez
// del panel apilado de Header.tsx, porque el sidebar tiene muchos más
// enlaces + el botón de cerrar sesión, y necesita poder entrar/salir con
// una transición suave (algo que un simple mostrar/ocultar condicional,
// como el de Header.tsx, no puede animar al CERRAR — un elemento que se
// desmonta de React no tiene "salida" que animar). El sidebar ahora es:
// - "md" (768px) en adelante: igual que antes, columna fija a la
//   izquierda, siempre visible — MISMO punto de corte que usa Header.tsx
//   para su propia navegación de escritorio ("sm:flex"/"sm:hidden" ahí es
//   640px porque esa navegación es más angosta; acá, con textos más
//   largos como "Preguntas frecuentes", 768px es el mínimo donde el
//   sidebar de 224px ya no aprieta el contenido).
// - Por debajo de "md" (incluye los 375-430px de un celular y buena parte
//   de una tablet en vertical): se convierte en un menú deslizante
//   ("drawer") que empieza oculto fuera de pantalla (a la izquierda) y se
//   abre con un botón hamburguesa en una barra superior propia de esta
//   zona, con un fondo oscuro semitransparente detrás que lo separa del
//   contenido y permite cerrarlo tocando fuera de él. El logo y "Cerrar
//   sesión" siguen viviendo DENTRO de este mismo panel (ver <aside> más
//   abajo): en escritorio se ven porque el panel está siempre abierto, en
//   móvil se ven en cuanto se abre el drawer — nunca dejan de ser
//   accesibles.
//
// Es Client Component porque depende de useAuth() (estado en memoria del
// navegador), de usePathname()/useRouter() para decidir y redirigir, y
// ahora también de un estado propio para el drawer móvil.
// ==========================================

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { TRANSICION_HOVER } from "@/lib/estilos";

// Enlaces del panel. Equipos/Categorías/Reservas todavía no existen como
// páginas (se construyen en las siguientes fases): se dejan enlazados desde
// ya, igual que se hizo con "Catálogo"/"Contacto" en el sitio público.
const ENLACES_ADMIN = [
  { href: "/admin", etiqueta: "Dashboard" },
  { href: "/admin/equipos", etiqueta: "Equipos" },
  { href: "/admin/categorias", etiqueta: "Categorías" },
  { href: "/admin/provincias", etiqueta: "Provincias" },
  { href: "/admin/reservas", etiqueta: "Reservas" },
  { href: "/admin/calendario", etiqueta: "Calendario" },
  { href: "/admin/publicaciones", etiqueta: "Publicaciones" },
  { href: "/admin/resenas", etiqueta: "Reseñas" },
  { href: "/admin/faq", etiqueta: "Preguntas frecuentes" },
  { href: "/admin/configuracion", etiqueta: "Configuración" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, cargandoSesion, logout } = useAuth();

  // Controla el drawer del sidebar por debajo de "lg" (ver el comentario
  // largo del encabezado del archivo). Sin efecto alguno en escritorio,
  // donde el sidebar ignora este estado y queda siempre visible.
  const [menuAbierto, setMenuAbierto] = useState(false);

  const esPaginaLogin = pathname === "/admin/login";

  // Cambiar de página (clic en un link del sidebar) debe cerrar el
  // drawer en móvil: sin esto, quedaría abierto tapando la pantalla
  // encima de la nueva página recién cargada.
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  useEffect(() => {
    // Todavía no se sabe si hay sesión guardada (localStorage se lee async
    // al montar): no decidir nada hasta que cargandoSesion sea false.
    if (cargandoSesion) return;

    if (!isAuthenticated && !esPaginaLogin) {
      router.replace("/admin/login");
    }

    // Si ya hay sesión y el admin visita /admin/login a mano, no tiene
    // sentido mostrarle el formulario de nuevo: se manda al dashboard.
    if (isAuthenticated && esPaginaLogin) {
      router.replace("/admin");
    }
  }, [cargandoSesion, isAuthenticated, esPaginaLogin, router]);

  // /admin/login tiene su propio diseño de página completa (sin sidebar);
  // este layout solo le aplica la lógica de arriba, no le agrega interfaz.
  if (esPaginaLogin) {
    return <>{children}</>;
  }

  // Mientras se resuelve si hay sesión, o si no hay y ya se disparó el
  // redirect (todavía no se completa la navegación), se muestra un spinner
  // en vez de dejar ver el contenido protegido ni una pantalla en blanco.
  if (cargandoSesion || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Verificando sesión..." />
      </div>
    );
  }

  function manejarCerrarSesion() {
    logout();
    router.push("/admin/login");
  }

  return (
    // El fondo (degradado sutil morado, igual que el sitio público) ya lo
    // pinta el <body> en globals.css: este contenedor no necesita el suyo
    // propio, así el área de contenido queda consistente con el resto del
    // sitio sin duplicar el estilo acá. "flex-col" en vez de "flex" fijo:
    // por debajo de "md" la barra superior móvil y el contenido se
    // apilan verticalmente; desde "md" se sobreescribe a fila (sidebar +
    // contenido lado a lado, el layout original).
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* --- Barra superior SOLO en móvil (oculta desde "md", donde el
          sidebar ya está siempre visible a la izquierda): logo chico +
          botón hamburguesa, mismo elemento y mismo comportamiento que el
          botón hamburguesa de Header.tsx. "sticky top-0" para que siga
          alcanzable sin importar cuánto se haya scrolleado el contenido
          de la página (ej. una tabla larga) — es el único punto de
          acceso al menú en este ancho, así que no puede desaparecer con
          el scroll. --- */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-background-surface px-4 py-3 md:hidden">
        <img src="/logo.svg" alt="JM Publicity Sound" className="h-8 w-auto" />
        <button
          type="button"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto((abierto) => !abierto)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5"
        >
          {/* Mismo ícono de hamburguesa/X animado, con la MISMA estructura
              (tres <span> que rotan/desaparecen) que el botón hamburguesa
              de Header.tsx (sitio público) — se copia tal cual para que el
              gesto se sienta idéntico en todo el sitio, panel admin incluido. */}
          <span
            className={`h-0.5 w-6 bg-foreground transition-transform ${menuAbierto ? "translate-y-2 rotate-45" : ""}`}
          />
          <span className={`h-0.5 w-6 bg-foreground transition-opacity ${menuAbierto ? "opacity-0" : ""}`} />
          <span
            className={`h-0.5 w-6 bg-foreground transition-transform ${menuAbierto ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </header>

      {/* --- Fondo oscuro detrás del drawer, solo en móvil y solo
          mientras está abierto: separa visualmente el menú del contenido
          y, al tocarlo, lo cierra (mismo gesto esperado que cualquier
          menú deslizante). --- */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar del panel: navegación entre secciones y cierre de sesión.
          Fondo "surface" (morado oscuro secundario): es una superficie
          elevada sobre el fondo base, igual criterio que cualquier tarjeta
          del resto del sitio.

          RESPONSIVO: por debajo de "md" este mismo <aside> deja de ser
          parte del flujo normal de la página ("fixed") y se convierte en
          un panel deslizante pegado al borde izquierdo de la PANTALLA
          (no del contenedor), oculto por defecto fuera de esa pantalla
          ("-translate-x-full") y que entra deslizándose
          ("translate-x-0") cuando "menuAbierto" es true — la transición
          suave (300ms, mismo timing estándar del sitio) es lo que da la
          sensación de "cajón que se abre", no un simple mostrar/ocultar
          abrupto (a diferencia del panel de Header.tsx, que se
          monta/desmonta entero: acá se necesita una salida animada, así
          que el elemento queda siempre montado y solo se le mueve la
          posición). Desde "md", "md:static" + "md:translate-x-0" anulan
          todo eso: vuelve a ser una columna fija normal, siempre visible,
          exactamente el comportamiento original de escritorio. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/10 bg-background-surface p-6 transition-transform duration-300 md:static md:z-auto md:w-56 md:translate-x-0 ${
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo compacto (en vez del nombre en texto plano de antes). Mismo
            criterio que en Header.tsx: un poco más grande que la primera
            versión, para que el ícono/ecualizador del propio logo.svg se
            distinga en vez de leerse como texto plano. */}
        <img src="/logo.svg" alt="JM Publicity Sound" className="mb-8 h-10 w-auto" />

        <nav className="flex flex-1 flex-col gap-1">
          {ENLACES_ADMIN.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              // La sección activa se destaca con el degradado de marca como
              // fondo (antes cian sólido); las inactivas quedan neutras.
              className={`rounded-lg px-3 py-2 text-sm font-medium ${TRANSICION_HOVER} ${
                pathname === enlace.href
                  ? "bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange text-white"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {enlace.etiqueta}
            </Link>
          ))}
        </nav>

        {/* Outline coherente con la nueva paleta en reposo (morado claro);
            el hover se mantiene en rojo a propósito, como aviso visual de
            que la acción termina la sesión. */}
        <button
          type="button"
          onClick={manejarCerrarSesion}
          className={`mt-6 rounded-lg border border-brand-purple-light/30 px-3 py-2 text-left text-sm font-medium text-brand-purple-light ${TRANSICION_HOVER} hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300`}
        >
          Cerrar sesión
        </button>
      </aside>

      {/* "p-4 sm:p-6 md:p-8" (antes "p-8" fijo): en un celular angosto,
          32px de padding a cada lado ya le robaban una porción notable de
          los 320-430px disponibles a cualquier tabla o formulario ancho.
          Se reduce progresivamente y solo vuelve al valor original desde
          "md", que es exactamente donde el sidebar deja de ser un drawer
          y empieza a ocupar espacio real de nuevo (ver el <aside> de
          arriba) — así el salto de padding coincide con el salto de
          layout, en vez de quedar desalineados. --- ADEMÁS: "w-full
          min-w-0" es lo que garantiza que este <main> nunca reserve
          espacio de más pensando en un sidebar que, por debajo de "md",
          ya no ocupa ancho real (es "fixed", fuera del flujo) — sin
          "min-w-0" un hijo de flex puede negarse a encogerse por debajo
          del ancho de su contenido (ej. una tabla ancha) y forzar scroll
          horizontal de TODA la página en vez de dejar que sea la tabla,
          con su propio "overflow-x-auto", la que scrollee por sí sola. */}
      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}
